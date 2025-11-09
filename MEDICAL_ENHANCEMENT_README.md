# 🏥 Medical Transcription Enhancement Service

## Overview

This service enhances raw speech-to-text transcripts with medical domain intelligence:

- ✅ **Terminology Standardization**: Converts medical terms to standard abbreviations
- ✅ **Multi-language Support**: Russian, Armenian, English medical terms
- ✅ **Measurement Extraction**: Automatically extracts EF, BPD, GA, HR, etc.
- ✅ **Section Classification**: Determines which anatomical section is being described
- ✅ **Finding Detection**: Identifies normal/abnormal findings

---

## Architecture Decision: Direct Service vs MCP Server

### ✅ **We Created: Direct Service**
- Simple TypeScript module
- No extra processes
- Low latency
- Easy to maintain

### 🔄 **Also Available: MCP Server** (in `mcp-server/`)
- Standard protocol
- Can be used by other tools
- Reusable across projects
- Good for future AI agent integration

**For now, we use the direct service. The MCP server is there if you need it later.**

---

## How It Works

### Before (Raw Google Speech Output):
```
"Patient has left ventricle ejection fraction 55 percent, 
mitral valve appears normal"
```

### After (Enhanced):
```
[Left Ventricle]
Patient has LV ejection fraction 55 percent, MV appears normal

📊 Detected measurements: ejection fraction: 55
📋 Normal findings
```

**Plus extracted data:**
```json
{
  "measurements": { "ejection_fraction": 55 },
  "detectedSection": "Left Ventricle",
  "findings": {
    "normal": true,
    "abnormal": false,
    "findings": ["Normal findings"]
  },
  "suggestions": [
    "✓ Measurements extracted automatically",
    "✓ Classified as: Left Ventricle"
  ]
}
```

---

## API Usage

### Endpoint: `POST /api/voice/extract-fields`

**Request:**
```json
{
  "transcript": "левый желудочек фракция выброса 55 процентов",
  "procedure_type": "echocardiogram",
  "language": "ru-RU"
}
```

**Response:**
```json
{
  "enhanced_transcript": "[Left Ventricle]\nleft ventricle (LV) ejection fraction (EF) 55 percent\n\n📊 Detected measurements: ejection fraction: 55\n📋 Normal findings",
  "standardized": "left ventricle (LV) ejection fraction (EF) 55 percent",
  "measurements": {
    "ejection_fraction": 55
  },
  "detected_section": "Left Ventricle",
  "findings": {
    "normal": false,
    "abnormal": false,
    "noEvidence": false,
    "findings": []
  },
  "suggestions": [
    "✓ Measurements extracted automatically",
    "✓ Classified as: Left Ventricle"
  ],
  "raw_transcript": "левый желудочек фракция выброса 55 процентов"
}
```

---

## Supported Features

### 1. Medical Term Standardization

| Input (any language) | Output |
|---------------------|--------|
| "left ventricle" | "LV" |
| "левый желудочек" | "left ventricle (LV)" |
| "ձախ փորոք" | "left ventricle (LV)" |
| "ejection fraction" | "EF" |
| "фракция выброса" | "ejection fraction (EF)" |

### 2. Measurement Extraction

| Pattern | Extracts |
|---------|----------|
| "EF 55%" | `ejection_fraction: 55` |
| "BPD 8.5 cm" | `biparietal_diameter: 8.5` |
| "GA 32 weeks" | `gestational_age: 32` |
| "HR 140 bpm" | `heart_rate: 140` |

### 3. Section Classification

**Echocardiogram:**
- Left Ventricle, Right Ventricle
- Left Atrium, Right Atrium
- Mitral Valve, Aortic Valve
- Tricuspid Valve, Pulmonary Valve
- Pericardium

**Obstetric Ultrasound:**
- Fetal Biometry, Amniotic Fluid
- Placenta, Fetal Anatomy
- Doppler Studies

**Abdominal Ultrasound:**
- Liver, Gallbladder, Kidneys
- Spleen, Pancreas, Aorta

### 4. Finding Detection

- **Normal**: "normal", "unremarkable", "within normal limits", "нормальн", "в норме"
- **Abnormal**: "abnormal", "dilated", "enlarged", "патолог", "расширен"
- **No Evidence**: "no evidence of", "не выявлено", "отсутств"

---

## Direct Service Usage (in code)

```typescript
import { medicalEnhancement } from './services/medicalEnhancement';

// Full enhancement
const result = medicalEnhancement.enhanceTranscript({
  transcript: "Patient has LV EF 55%, MV normal",
  procedureType: "echocardiogram",
  language: "en-US"
});

// Just extract measurements
const measurements = medicalEnhancement.extractMeasurements(
  "EF 55%, HR 140 bpm"
);

// Just classify section
const section = medicalEnhancement.classifySection(
  "left ventricle appears normal",
  "echocardiogram"
);

// Just standardize terms
const standardized = medicalEnhancement.standardizeTerms(
  "левый желудочек"
);
```

---

## Integration with Real-time Streaming

```typescript
// In server.ts socket handler
socket.on('streaming-transcript', (data) => {
  if (data.isFinal) {
    // Enhance the transcript
    const enhanced = medicalEnhancement.enhanceTranscript({
      transcript: data.transcript,
      procedureType: currentProcedure,
      language: selectedLanguage
    });
    
    // Send enhanced version to client
    socket.emit('enhanced-transcript', {
      original: data.transcript,
      enhanced: enhanced.enhanced,
      measurements: enhanced.measurements,
      section: enhanced.detectedSection,
      suggestions: enhanced.suggestions
    });
  }
});
```

---

## Extending the Service

### Add New Medical Terms:
```typescript
// In medicalEnhancement.ts
const MEDICAL_TERMS: Record<string, string> = {
  // Add your terms
  'your term': 'abbreviation',
};
```

### Add New Measurement Patterns:
```typescript
// In extractMeasurements function
const customMatch = transcript.match(/your pattern/i);
if (customMatch) {
  measurements.your_field = parseFloat(customMatch[1]);
}
```

### Add New Procedure Sections:
```typescript
const PROCEDURE_SECTIONS: Record<string, string[]> = {
  'your-procedure': [
    'Section 1',
    'Section 2',
  ],
};
```

---

## Benefits Over Basic Speech-to-Text

| Feature | Google Speech Only | + Medical Enhancement |
|---------|-------------------|----------------------|
| **Raw text** | ✅ | ✅ |
| **Medical abbreviations** | ❌ | ✅ |
| **Multi-language medical terms** | ❌ | ✅ |
| **Auto measurement extraction** | ❌ | ✅ |
| **Section classification** | ❌ | ✅ |
| **Finding detection** | ❌ | ✅ |
| **Suggestions** | ❌ | ✅ |

---

## Future Enhancements (Optional)

1. **AI-Powered Enhancement**: Add OpenAI GPT-4 for even smarter processing
2. **Learning Mode**: Track which corrections doctors make to improve patterns
3. **Template Validation**: Check if all required sections are filled
4. **Confidence Scoring**: Rate how confident the enhancement is
5. **Custom Vocabularies**: Per-doctor or per-hospital terminology

---

## Testing

```bash
# Test with curl
curl -X POST http://localhost:5000/api/voice/extract-fields \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "левый желудочек фракция выброса 55 процентов",
    "procedure_type": "echocardiogram",
    "language": "ru-RU"
  }'
```

---

## Summary

**You now have:**
- ✅ Intelligent medical transcription enhancement
- ✅ Multi-language support (Russian, Armenian, English)
- ✅ Automatic measurement extraction
- ✅ Section classification
- ✅ Easy to extend and customize

**Google Speech does**: Audio → Text  
**Our service does**: Text → Medical Intelligence

**Together**: Audio → Text → Enhanced Medical Report 🎯
