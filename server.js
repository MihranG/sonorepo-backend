require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (demo pages)
app.use(express.static('public'));

// Import routes
const patientsRouter = require('./routes/patients');
const queueRouter = require('./routes/queue');
const reportsRouter = require('./routes/reports');
const voiceRouter = require('./routes/voice');

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
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('queue-update', (data) => {
    // Broadcast queue updates to all connected clients
    socket.broadcast.emit('queue-updated', data);
  });
  
  socket.on('report-update', (data) => {
    // Broadcast report updates to all connected clients
    socket.broadcast.emit('report-updated', data);
  });
  
  // Real-time voice streaming with Google Speech-to-Text
  let recognizeStream = null;
  
  socket.on('start-streaming', async (config) => {
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
      
      const recognitionConfig = {
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
        .on('error', (error) => {
          console.error('Streaming error:', error);
          socket.emit('streaming-error', { error: error.message });
        })
        .on('data', (data) => {
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
    } catch (error) {
      console.error('Error starting stream:', error);
      socket.emit('streaming-error', { error: error.message });
    }
  });

  socket.on('audio-chunk', (audioData) => {
    if (recognizeStream) {
      try {
        recognizeStream.write(audioData);
      } catch (error) {
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
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
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
