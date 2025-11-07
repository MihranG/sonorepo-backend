import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import patientsRouter from './routes/patients';
import queueRouter from './routes/queue';
import reportsRouter from './routes/reports';
import voiceRouter from './routes/voice';
import { VoiceConfig, StreamingTranscript } from './types';

const app: Express = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (demo pages)
app.use(express.static('public'));

// API Routes
app.use('/api/patients', patientsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/voice', voiceRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SonoFlow API is running' });
});

// Socket.IO for real-time updates
io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('queue-update', (data: any) => {
    // Broadcast queue updates to all connected clients
    socket.broadcast.emit('queue-updated', data);
  });
  
  socket.on('report-update', (data: any) => {
    // Broadcast report updates to all connected clients
    socket.broadcast.emit('report-updated', data);
  });
  
  // Real-time voice streaming with Google Speech-to-Text
  let recognizeStream: any = null;
  
  socket.on('start-streaming', async (config: VoiceConfig) => {
    try {
      // Check if Google credentials are configured
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_API_KEY) {
        socket.emit('streaming-error', { 
          error: 'Google Cloud credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_API_KEY' 
        });
        return;
      }

      const speech = require('@google-cloud/speech');
      const client = new speech.SpeechClient();

      // Medical model is only available for en-US
      const languageCode = config.language || 'en-US';
      const useMedicalModel = languageCode.startsWith('en-');
      
      const recognitionConfig: any = {
        encoding: 'LINEAR16',
        sampleRateHertz: config.sampleRate || 16000,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        useEnhanced: true,
      };
      
      // Only use medical model for English
      if (useMedicalModel) {
        recognitionConfig.model = 'medical_dictation';
      } else {
        // Use command_and_search for better accuracy in other languages
        recognitionConfig.model = 'command_and_search';
      }

      const request = {
        config: recognitionConfig,
        interimResults: true, // Get partial results as they come
      };

      recognizeStream = client
        .streamingRecognize(request)
        .on('error', (error: any) => {
          console.error('Streaming error:', error);
          socket.emit('streaming-error', { error: error.message });
        })
        .on('data', (data: any) => {
          const result = data.results[0];
          if (result && result.alternatives[0]) {
            const transcript = result.alternatives[0].transcript;
            const isFinal = result.isFinal;
            
            socket.emit('streaming-transcript', {
              transcript,
              isFinal,
              confidence: result.alternatives[0].confidence
            });
          }
        });

      socket.emit('streaming-started', { message: 'Streaming started successfully' });
      console.log('Voice streaming started for socket:', socket.id);
    } catch (error: any) {
      console.error('Error starting stream:', error);
      socket.emit('streaming-error', { error: error?.message || 'Unknown error' });
    }
  });

  socket.on('audio-chunk', (chunk: Buffer) => {
    if (recognizeStream) {
      try {
        recognizeStream.write(chunk);
      } catch (error: any) {
        console.error('Error writing audio chunk:', error);
      }
    }
  });

  socket.on('stop-streaming', () => {
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
      socket.emit('streaming-stopped', { message: 'Streaming stopped' });
      console.log('Voice streaming stopped for socket:', socket.id);
    }
  });
  
  socket.on('disconnect', () => {
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║       🏥 SonoFlow API Server         ║
║                                       ║
║  Server running on port ${PORT}         ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                       ║
║  API: http://localhost:${PORT}/api      ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
