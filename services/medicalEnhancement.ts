/**
 * Medical Transcription Enhancement Service
 * Enhances speech-to-text with medical domain knowledge
 * This is a simplified, directly-callable version (not MCP protocol)
 */

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
  'левый желудочек': 'left ventricle (LV)',
  'правый желудочек': 'right ventricle (RV)',
  'левое предсердие': 'left atrium (LA)',
  'правое предсердие': 'right atrium (RA)',
  'митральный клапан': 'mitral valve (MV)',
  'аортальный клапан': 'aortic valve (AV)',
  'трикуспидальный клапан': 'tricuspid valve (TV)',
  'фракция выброса': 'ejection fraction (EF)',
  
  // Armenian → English medical terms
  'ձախ փորոք': 'left ventricle (LV)',
  'աջ փորոք': 'right ventricle (RV)',
  'ձախ ականջնակ': 'left atrium (LA)',
  'աջ ականջնակ': 'right atrium (RA)',
  'միտրալ փական': 'mitral valve (MV)',
  'աորտալ փական': 'aortic valve (AV)',
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
    'Tricuspid Valve',
    'Pulmonary Valve',
    'Pericardium',
    'Overall Assessment',
  ],
  'obstetric-ultrasound': [
    'Fetal Biometry',
    'Amniotic Fluid',
    'Placenta',
    'Fetal Anatomy',
    'Doppler Studies',
    'Fetal Position',
  ],
  'abdominal-ultrasound': [
    'Liver',
    'Gallbladder',
    'Kidneys',
    'Spleen',
    'Pancreas',
    'Aorta',
  ],
};

interface MeasurementResult {
  ejection_fraction?: number;
  biparietal_diameter?: number;
  gestational_age?: number;
  heart_rate?: number;
  [key: string]: number | undefined;
}

/**
 * Extract measurements from transcript
 */
export function extractMeasurements(transcript: string): MeasurementResult {
  const measurements: MeasurementResult = {};
  
  // EF pattern: "ejection fraction 55%" or "EF 55%" or "ФВ 55%"
  const efMatch = transcript.match(/(?:ejection fraction|EF|ФВ|фракция выброса)[\s:]*(\d+)%?/i);
  if (efMatch) {
    measurements.ejection_fraction = parseInt(efMatch[1]);
  }
  
  // BPD pattern: "BPD 8.5 cm" or "biparietal diameter 85mm"
  const bpdMatch = transcript.match(/(?:BPD|biparietal diameter|БПР)[\s:]*(\d+\.?\d*)\s*(?:mm|cm)?/i);
  if (bpdMatch) {
    measurements.biparietal_diameter = parseFloat(bpdMatch[1]);
  }
  
  // GA pattern: "gestational age 32 weeks" or "GA 32"
  const gaMatch = transcript.match(/(?:gestational age|GA|срок беременности)[\s:]*(\d+)\s*(?:weeks?|недел)?/i);
  if (gaMatch) {
    measurements.gestational_age = parseInt(gaMatch[1]);
  }
  
  // Heart rate: "heart rate 140 bpm" or "HR 140" or "ЧСС 140"
  const hrMatch = transcript.match(/(?:heart rate|HR|ЧСС)[\s:]*(\d+)\s*(?:bpm|уд\/мин)?/i);
  if (hrMatch) {
    measurements.heart_rate = parseInt(hrMatch[1]);
  }
  
  return measurements;
}

/**
 * Classify text into appropriate section
 */
export function classifySection(text: string, procedureType: string): string | null {
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
  
  // Check for Russian/Armenian terms
  if (lowerText.includes('левый желудочек') || lowerText.includes('ձախ փորոք')) {
    return 'Left Ventricle';
  }
  if (lowerText.includes('правый желудочек') || lowerText.includes('աջ փորոք')) {
    return 'Right Ventricle';
  }
  if (lowerText.includes('митральный') || lowerText.includes('միտրալ')) {
    return 'Mitral Valve';
  }
  
  return null;
}

/**
 * Standardize medical terminology
 */
export function standardizeTerms(transcript: string): string {
  let standardized = transcript;
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedTerms = Object.entries(MEDICAL_TERMS).sort(
    ([a], [b]) => b.length - a.length
  );
  
  for (const [term, standard] of sortedTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    standardized = standardized.replace(regex, standard);
  }
  
  return standardized;
}

/**
 * Detect findings keywords
 */
export function detectFindings(transcript: string): {
  normal: boolean;
  abnormal: boolean;
  noEvidence: boolean;
  findings: string[];
} {
  const findings: string[] = [];
  
  const normalPattern = /normal|unremarkable|within normal limits|нормальн|в норме/i;
  const abnormalPattern = /abnormal|concerning|dilated|enlarged|thickened|патолог|расширен|увеличен/i;
  const noEvidencePattern = /no evidence of|absence of|negative for|не выявлено|отсутств/i;
  
  const normal = normalPattern.test(transcript);
  const abnormal = abnormalPattern.test(transcript);
  const noEvidence = noEvidencePattern.test(transcript);
  
  if (normal) findings.push('Normal findings');
  if (abnormal) findings.push('Abnormal findings detected');
  if (noEvidence) findings.push('No significant pathology');
  
  return { normal, abnormal, noEvidence, findings };
}

/**
 * Main enhancement function - combines all improvements
 */
export interface EnhancedTranscript {
  enhanced: string;
  measurements: MeasurementResult;
  detectedSection: string | null;
  standardized: string;
  findings: {
    normal: boolean;
    abnormal: boolean;
    noEvidence: boolean;
    findings: string[];
  };
  suggestions: string[];
}

export function enhanceTranscript(params: {
  transcript: string;
  procedureType?: string;
  language?: string;
}): EnhancedTranscript {
  const { transcript, procedureType = 'echocardiogram', language = 'en-US' } = params;
  
  // Step 1: Standardize medical terms
  const standardized = standardizeTerms(transcript);
  
  // Step 2: Extract measurements
  const measurements = extractMeasurements(standardized);
  
  // Step 3: Classify section
  const detectedSection = classifySection(standardized, procedureType);
  
  // Step 4: Detect findings
  const findings = detectFindings(standardized);
  
  // Step 5: Generate suggestions
  const suggestions: string[] = [];
  
  if (Object.keys(measurements).length > 0) {
    suggestions.push('✓ Measurements extracted automatically');
  }
  
  if (detectedSection) {
    suggestions.push(`✓ Classified as: ${detectedSection}`);
  }
  
  if (findings.abnormal) {
    suggestions.push('⚠ Abnormal findings detected - review carefully');
  }
  
  // Step 6: Enhance with context
  let enhanced = standardized;
  
  // Add section header if detected
  if (detectedSection) {
    enhanced = `[${detectedSection}]\n${enhanced}`;
  }
  
  // Add measurement annotations
  if (Object.keys(measurements).length > 0) {
    const measurementStr = Object.entries(measurements)
      .map(([key, value]) => `${key.replace('_', ' ')}: ${value}`)
      .join(', ');
    enhanced += `\n\n📊 Detected measurements: ${measurementStr}`;
  }
  
  // Add finding indicators
  if (findings.findings.length > 0) {
    enhanced += `\n\n📋 ${findings.findings.join(', ')}`;
  }
  
  return {
    enhanced,
    measurements,
    detectedSection,
    standardized,
    findings,
    suggestions,
  };
}

// Export all functions
export const medicalEnhancement = {
  enhanceTranscript,
  extractMeasurements,
  classifySection,
  standardizeTerms,
  detectFindings,
};
