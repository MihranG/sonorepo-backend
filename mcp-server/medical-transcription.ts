/**
 * Medical Transcription MCP Server
 * Enhances speech-to-text with medical domain knowledge
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Medical terminology mappings
const MEDICAL_TERMS: Record<string, string> = {
  // English → Medical Standard
  'left ventricle': 'LV',
  'right ventricle': 'RV',
  'left atrium': 'LA',
  'right atrium': 'RA',
  'ejection fraction': 'EF',
  'mitral valve': 'MV',
  'aortic valve': 'AV',
  'tricuspid valve': 'TV',
  'pulmonary valve': 'PV',
  
  // Russian → English medical terms
  'левый желудочек': 'left ventricle',
  'правый желудочек': 'right ventricle',
  'левое предсердие': 'left atrium',
  'правое предсердие': 'right atrium',
  'митральный клапан': 'mitral valve',
  'аортальный клапан': 'aortic valve',
  'трикуспидальный клапан': 'tricuspid valve',
  
  // Armenian → English medical terms
  'ձախ փորոք': 'left ventricle',
  'աջ փորոք': 'right ventricle',
  'միտրալ փական': 'mitral valve',
};

// Template sections for different procedures
const PROCEDURE_SECTIONS: Record<string, string[]> = {
  echocardiogram: [
    'Left Ventricle',
    'Right Ventricle',
    'Left Atrium',
    'Right Atrium',
    'Mitral Valve',
    'Aortic Valve',
    'Pericardium',
  ],
  'obstetric-ultrasound': [
    'Fetal Biometry',
    'Amniotic Fluid',
    'Placenta',
    'Fetal Anatomy',
    'Doppler Studies',
  ],
  'abdominal-ultrasound': [
    'Liver',
    'Gallbladder',
    'Kidneys',
    'Spleen',
    'Pancreas',
  ],
};

// Extract measurements from transcript
function extractMeasurements(transcript: string): Record<string, any> {
  const measurements: Record<string, any> = {};
  
  // EF pattern: "ejection fraction 55%" or "EF 55%"
  const efMatch = transcript.match(/(?:ejection fraction|EF)[\s:]*(\d+)%?/i);
  if (efMatch) {
    measurements.ejection_fraction = parseInt(efMatch[1]);
  }
  
  // BPD pattern: "BPD 8.5 cm" or "biparietal diameter 85mm"
  const bpdMatch = transcript.match(/(?:BPD|biparietal diameter)[\s:]*(\d+\.?\d*)\s*(?:mm|cm)?/i);
  if (bpdMatch) {
    measurements.biparietal_diameter = parseFloat(bpdMatch[1]);
  }
  
  // GA pattern: "gestational age 32 weeks" or "GA 32"
  const gaMatch = transcript.match(/(?:gestational age|GA)[\s:]*(\d+)\s*weeks?/i);
  if (gaMatch) {
    measurements.gestational_age = parseInt(gaMatch[1]);
  }
  
  // Heart rate: "heart rate 140 bpm" or "HR 140"
  const hrMatch = transcript.match(/(?:heart rate|HR)[\s:]*(\d+)\s*(?:bpm)?/i);
  if (hrMatch) {
    measurements.heart_rate = parseInt(hrMatch[1]);
  }
  
  return measurements;
}

// Classify text into appropriate section
function classifySection(text: string, procedureType: string): string | null {
  const sections = PROCEDURE_SECTIONS[procedureType];
  if (!sections) return null;
  
  const lowerText = text.toLowerCase();
  
  for (const section of sections) {
    const lowerSection = section.toLowerCase();
    // Check if text mentions this section
    if (lowerText.includes(lowerSection) || 
        lowerText.includes(lowerSection.replace(' ', ''))) {
      return section;
    }
  }
  
  return null;
}

// Standardize medical terminology
function standardizeTerms(transcript: string): string {
  let standardized = transcript;
  
  for (const [term, standard] of Object.entries(MEDICAL_TERMS)) {
    const regex = new RegExp(term, 'gi');
    standardized = standardized.replace(regex, standard);
  }
  
  return standardized;
}

// Enhanced transcript with all improvements
function enhanceTranscript(params: {
  transcript: string;
  procedureType?: string;
  language?: string;
}): {
  enhanced: string;
  measurements: Record<string, any>;
  detectedSection: string | null;
  standardized: string;
} {
  const { transcript, procedureType = 'echocardiogram', language = 'en-US' } = params;
  
  // Step 1: Standardize medical terms
  const standardized = standardizeTerms(transcript);
  
  // Step 2: Extract measurements
  const measurements = extractMeasurements(standardized);
  
  // Step 3: Classify section
  const detectedSection = classifySection(standardized, procedureType);
  
  // Step 4: Enhance with context
  let enhanced = standardized;
  
  // Add section header if detected
  if (detectedSection) {
    enhanced = `[${detectedSection}]\n${enhanced}`;
  }
  
  // Add measurement annotations
  if (Object.keys(measurements).length > 0) {
    const measurementStr = Object.entries(measurements)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    enhanced += `\n\n[Measurements: ${measurementStr}]`;
  }
  
  return {
    enhanced,
    measurements,
    detectedSection,
    standardized,
  };
}

// Initialize MCP Server
const server = new Server(
  {
    name: 'medical-transcription-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'enhance_medical_transcript',
        description: 'Enhance raw speech transcript with medical terminology, measurements extraction, and section classification',
        inputSchema: {
          type: 'object',
          properties: {
            transcript: {
              type: 'string',
              description: 'Raw transcript from speech-to-text',
            },
            procedureType: {
              type: 'string',
              description: 'Type of medical procedure (echocardiogram, obstetric-ultrasound, etc.)',
              enum: ['echocardiogram', 'obstetric-ultrasound', 'abdominal-ultrasound'],
            },
            language: {
              type: 'string',
              description: 'Language code (ru-RU, hy-AM, en-US, etc.)',
            },
          },
          required: ['transcript'],
        },
      },
      {
        name: 'extract_measurements',
        description: 'Extract medical measurements from transcript (EF, BPD, GA, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            transcript: {
              type: 'string',
              description: 'Medical transcript text',
            },
          },
          required: ['transcript'],
        },
      },
      {
        name: 'classify_section',
        description: 'Classify which anatomical section the text refers to',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to classify',
            },
            procedureType: {
              type: 'string',
              description: 'Type of medical procedure',
            },
          },
          required: ['text', 'procedureType'],
        },
      },
      {
        name: 'standardize_terms',
        description: 'Convert medical terms to standard abbreviations and English equivalents',
        inputSchema: {
          type: 'object',
          properties: {
            transcript: {
              type: 'string',
              description: 'Text with medical terms',
            },
          },
          required: ['transcript'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'enhance_medical_transcript': {
        const result = enhanceTranscript({
          transcript: args.transcript as string,
          procedureType: args.procedureType as string,
          language: args.language as string,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'extract_measurements': {
        const measurements = extractMeasurements(args.transcript as string);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(measurements, null, 2),
            },
          ],
        };
      }

      case 'classify_section': {
        const section = classifySection(
          args.text as string,
          args.procedureType as string
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ section }, null, 2),
            },
          ],
        };
      }

      case 'standardize_terms': {
        const standardized = standardizeTerms(args.transcript as string);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ standardized }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Tool execution failed: ${errorMessage}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Medical Transcription MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
