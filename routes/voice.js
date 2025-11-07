const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const speech = require('@google-cloud/speech');

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Transcribe audio using OpenAI Whisper API
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file' 
      });
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path));
    formData.append('model', 'whisper-1');
    
    // Optional: Add language parameter if provided
    if (req.body.language) {
      formData.append('language', req.body.language);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return res.status(response.status).json({ error: 'Transcription failed', details: error });
    }

    const data = await response.json();
    res.json({ transcript: data.text });

  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Smart field extraction from voice transcript
router.post('/extract-fields', async (req, res) => {
  const { transcript, procedure_type } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'No transcript provided' });
  }

  try {
    // Basic field extraction using pattern matching
    // In production, you could use GPT-4 for more intelligent extraction
    const fields = {};
    
    // Extract common measurements
    const efMatch = transcript.match(/(?:ejection fraction|EF)[\s:]*(\d+)%?/i);
    if (efMatch) fields.ejection_fraction = efMatch[1];
    
    const bpdMatch = transcript.match(/BPD[\s:]*(\d+\.?\d*)\s*(?:mm|centimeters|cm)?/i);
    if (bpdMatch) fields.biparietal_diameter = bpdMatch[1];
    
    const gaMatch = transcript.match(/(?:gestational age|GA)[\s:]*(\d+)\s*weeks?/i);
    if (gaMatch) fields.gestational_age = gaMatch[1];
    
    // Extract keywords for findings
    const keywords = {
      normal: /normal|unremarkable|within normal limits/i,
      abnormal: /abnormal|concerning|dilated|enlarged|thickened/i,
      noEvidence: /no evidence of|absence of|negative for/i
    };
    
    const findings = {};
    for (const [key, pattern] of Object.entries(keywords)) {
      if (pattern.test(transcript)) {
        findings[key] = true;
      }
    }
    
    res.json({ 
      fields,
      findings,
      raw_transcript: transcript
    });

  } catch (error) {
    console.error('Error extracting fields:', error);
    res.status(500).json({ error: 'Failed to extract fields' });
  }
});

// Get available transcription modes
router.get('/modes', (req, res) => {
  const modes = {
    batch: {
      name: 'Batch Processing',
      provider: 'OpenAI Whisper',
      available: !!process.env.OPENAI_API_KEY,
      description: 'Record complete audio, then transcribe (most accurate)'
    },
    streaming: {
      name: 'Real-time Streaming',
      provider: 'Google Speech-to-Text',
      available: !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_CLOUD_API_KEY,
      description: 'See transcription as you speak (live feedback)'
    }
  };
  
  res.json(modes);
});

module.exports = router;
