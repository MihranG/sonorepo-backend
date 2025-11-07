# 🎤 Google Cloud Speech-to-Text Setup Guide

## Overview

SonoFlow uses Google Cloud Speech-to-Text API with the **medical_dictation** model for accurate real-time transcription of medical procedures.

## Setup Steps

### 1. Enable Google Cloud Speech-to-Text API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Speech-to-Text API: https://console.cloud.google.com/flows/enableapi?apiid=speech.googleapis.com

### 2. Create Service Account

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"Create Service Account"**
3. Fill in the details:
   - **Name**: `sonoflow-speech`
   - **Description**: `Service account for SonoFlow voice recognition`
4. Click **"Create and Continue"**
5. Grant the role: **"Cloud Speech Client"** or **"Cloud Speech Administrator"**
6. Click **"Done"**

### 3. Generate Credentials

1. Click on the service account you just created
2. Go to the **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **JSON** format
5. Click **"Create"**
6. The JSON file will be downloaded to your computer
7. Save it to a secure location (e.g., `~/sonoflow-credentials.json`)

### 4. Configure Environment Variables

Update your `.env` file with the path to the JSON credentials:

```bash
# Google Cloud Speech-to-Text
GOOGLE_APPLICATION_CREDENTIALS=/Users/Mihran.Gasparyan/sonoflow-credentials.json
```

**Important**: Replace the path with the actual location where you saved the JSON file.

### 5. Test the Setup

Run the test script to verify everything is working:

```bash
node test-google-speech.js
```

You should see:
```
✅ Credentials path: /path/to/your-credentials.json
✅ Speech client created successfully
✅ Google Speech-to-Text API is accessible!
✅ Authentication successful!

🎉 You're all set! The medical dictation model is ready to use.
```

### 6. Try the Demo

1. Start your server:
   ```bash
   npm start
   # or for debugging
   npm run dev
   ```

2. Open the demo page in your browser:
   ```
   http://localhost:5000/voice-demo.html
   ```

3. Click **"Start Recording"** and speak!

## Features

### Medical Dictation Model
- ✅ Optimized for medical terminology
- ✅ Enhanced accuracy for clinical language
- ✅ Automatic punctuation
- ✅ Real-time streaming transcription

### API Configuration

The streaming is configured in `server.js`:

```javascript
const request = {
  config: {
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
    enableAutomaticPunctuation: true,
    model: 'medical_dictation', // Medical model!
    useEnhanced: true,
  },
  interimResults: true, // See results as you speak
};
```

### Supported Languages

You can change the language by modifying the `languageCode`:
- `en-US` - English (US)
- `en-GB` - English (UK)
- `es-ES` - Spanish
- `fr-FR` - French
- `de-DE` - German
- And many more...

## Troubleshooting

### Authentication Error
```
Error: Could not load the default credentials
```
**Solution**: Make sure `GOOGLE_APPLICATION_CREDENTIALS` path in `.env` is correct.

### Billing Not Enabled
```
Error: PROJECT_BILLING_NOT_ENABLED
```
**Solution**: Enable billing for your Google Cloud project.

### API Not Enabled
```
Error: PERMISSION_DENIED
```
**Solution**: Make sure Speech-to-Text API is enabled in your project.

### Microphone Access Denied (Browser)
**Solution**: Allow microphone access when prompted. Use HTTPS in production.

## Cost Estimate

Google Cloud Speech-to-Text pricing (as of 2024):
- Standard models: $0.006 per 15 seconds
- Enhanced models (medical_dictation): $0.009 per 15 seconds
- First 60 minutes per month: **FREE**

For a typical ultrasound practice:
- Average procedure: 5-10 minutes of dictation
- Cost per procedure: ~$0.03 - $0.06
- Monthly cost (50 procedures): ~$1.50 - $3.00

## Integration with Frontend

### Socket.IO Events

**Client → Server:**
- `start-streaming` - Start voice recognition
- `audio-chunk` - Send audio data
- `stop-streaming` - Stop voice recognition

**Server → Client:**
- `streaming-started` - Confirmation that streaming started
- `streaming-transcript` - Transcription results (interim and final)
- `streaming-error` - Error messages
- `streaming-stopped` - Confirmation that streaming stopped

### Example Client Code

```javascript
const socket = io('http://localhost:5000');

// Start recording
socket.emit('start-streaming', { language: 'en-US' });

// Send audio chunks
socket.emit('audio-chunk', audioBuffer);

// Receive transcripts
socket.on('streaming-transcript', ({ transcript, isFinal, confidence }) => {
  console.log(`${isFinal ? 'Final' : 'Interim'}: ${transcript}`);
  console.log(`Confidence: ${Math.round(confidence * 100)}%`);
});

// Stop recording
socket.emit('stop-streaming');
```

## Next Steps

1. ✅ Set up credentials
2. ✅ Test with the demo page
3. 🔄 Integrate with your React frontend
4. 🔄 Add field extraction for medical data
5. 🔄 Implement voice commands

## Resources

- [Google Cloud Speech-to-Text Documentation](https://cloud.google.com/speech-to-text/docs)
- [Medical Dictation Model](https://cloud.google.com/speech-to-text/docs/medical-model)
- [Best Practices](https://cloud.google.com/speech-to-text/docs/best-practices)
