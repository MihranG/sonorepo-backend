/**
 * Test file for Medical Enhancement Service
 * Run with: npx tsx services/medicalEnhancement.test.ts
 */

import { medicalEnhancement } from './medicalEnhancement';

console.log('🧪 Testing Medical Enhancement Service\n');

// Test 1: English medical terms
console.log('Test 1: English Medical Terms');
console.log('Input: "Patient has left ventricle ejection fraction 55%, mitral valve normal"');
const test1 = medicalEnhancement.enhanceTranscript({
  transcript: 'Patient has left ventricle ejection fraction 55%, mitral valve normal',
  procedureType: 'echocardiogram',
  language: 'en-US'
});
console.log('Output:', JSON.stringify(test1, null, 2));
console.log('\n---\n');

// Test 2: Russian medical terms
console.log('Test 2: Russian Medical Terms');
console.log('Input: "левый желудочек фракция выброса 60 процентов, митральный клапан в норме"');
const test2 = medicalEnhancement.enhanceTranscript({
  transcript: 'левый желудочек фракция выброса 60 процентов, митральный клапан в норме',
  procedureType: 'echocardiogram',
  language: 'ru-RU'
});
console.log('Output:', JSON.stringify(test2, null, 2));
console.log('\n---\n');

// Test 3: Armenian medical terms
console.log('Test 3: Armenian Medical Terms');
console.log('Input: "ձախ փորոք աորտալ փական նормալ է"');
const test3 = medicalEnhancement.enhanceTranscript({
  transcript: 'ձախ փորոք աորտալ փական նормալ է',
  procedureType: 'echocardiogram',
  language: 'hy-AM'
});
console.log('Output:', JSON.stringify(test3, null, 2));
console.log('\n---\n');

// Test 4: Measurement extraction only
console.log('Test 4: Measurement Extraction');
console.log('Input: "EF 55%, BPD 8.5 cm, GA 32 weeks, HR 140 bpm"');
const test4 = medicalEnhancement.extractMeasurements(
  'EF 55%, BPD 8.5 cm, GA 32 weeks, HR 140 bpm'
);
console.log('Output:', JSON.stringify(test4, null, 2));
console.log('\n---\n');

// Test 5: Section classification
console.log('Test 5: Section Classification');
const testSections = [
  'left ventricle appears dilated',
  'mitral valve regurgitation',
  'pericardium has small effusion',
  'right atrium is enlarged'
];
testSections.forEach(text => {
  const section = medicalEnhancement.classifySection(text, 'echocardiogram');
  console.log(`"${text}" → ${section}`);
});
console.log('\n---\n');

// Test 6: Term standardization
console.log('Test 6: Term Standardization');
const testTerms = [
  'Patient has left ventricle ejection fraction normal',
  'левый желудочек и правый желудочек',
  'митральный клапан и аортальный клапан'
];
testTerms.forEach(text => {
  const standardized = medicalEnhancement.standardizeTerms(text);
  console.log(`"${text}"\n → "${standardized}"`);
});
console.log('\n---\n');

// Test 7: Finding detection
console.log('Test 7: Finding Detection');
const testFindings = [
  'Everything appears normal and within normal limits',
  'Abnormal findings with dilated left ventricle',
  'No evidence of pericardial effusion',
  'нормальные показатели, патологии не выявлено'
];
testFindings.forEach(text => {
  const findings = medicalEnhancement.detectFindings(text);
  console.log(`"${text}"`);
  console.log(`→ Normal: ${findings.normal}, Abnormal: ${findings.abnormal}, No Evidence: ${findings.noEvidence}`);
  console.log(`→ Findings: ${findings.findings.join(', ')}`);
});
console.log('\n---\n');

console.log('✅ All tests completed!');
console.log('\nTo use in your API:');
console.log('POST /api/voice/extract-fields');
console.log(JSON.stringify({
  transcript: 'левый желудочек фракция выброса 55 процентов',
  procedure_type: 'echocardiogram',
  language: 'ru-RU'
}, null, 2));
