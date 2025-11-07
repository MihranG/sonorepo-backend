const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const PDFDocument = require('pdfkit');

// Get all report templates
router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM report_templates ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by procedure type
router.get('/templates/:procedureType', async (req, res) => {
  const { procedureType } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM report_templates WHERE procedure_type = $1',
      [procedureType]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Get all reports
router.get('/', async (req, res) => {
  const { patient_id, status } = req.query;
  
  try {
    let query = `
      SELECT 
        r.*,
        p.first_name,
        p.last_name,
        p.date_of_birth
      FROM reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (patient_id) {
      params.push(patient_id);
      query += ` AND r.patient_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    
    query += ' ORDER BY r.report_date DESC, r.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get report by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.phone,
        p.email
      FROM reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Create new report
router.post('/', async (req, res) => {
  const {
    patient_id,
    queue_id,
    procedure_type,
    doctor_name,
    findings,
    impression,
    recommendations,
    voice_transcript,
    measurements,
    images,
    status
  } = req.body;
  
  // Validate patient_id
  if (!patient_id || patient_id === '') {
    return res.status(400).json({ error: 'Patient ID is required' });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO reports (
        patient_id, queue_id, procedure_type, doctor_name,
        findings, impression, recommendations, voice_transcript,
        measurements, images, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      patient_id,
      queue_id || null,
      procedure_type,
      doctor_name,
      findings,
      impression,
      recommendations,
      voice_transcript,
      measurements ? JSON.stringify(measurements) : null,
      images ? JSON.stringify(images) : null,
      status || 'draft'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update report
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    procedure_type,
    doctor_name,
    findings,
    impression,
    recommendations,
    voice_transcript,
    measurements,
    images,
    status
  } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE reports 
      SET procedure_type = $1, doctor_name = $2, findings = $3,
          impression = $4, recommendations = $5, voice_transcript = $6,
          measurements = $7, images = $8, status = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      procedure_type,
      doctor_name,
      findings,
      impression,
      recommendations,
      voice_transcript,
      measurements ? JSON.stringify(measurements) : null,
      images ? JSON.stringify(images) : null,
      status,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Generate PDF for report
router.get('/:id/pdf', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.phone
      FROM reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const report = result.rows[0];
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${id}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('SONOGRAPHY REPORT', { align: 'center' });
    doc.moveDown();
    
    // Patient Info
    doc.fontSize(12).text('PATIENT INFORMATION', { underline: true });
    doc.fontSize(10);
    doc.text(`Name: ${report.first_name} ${report.last_name}`);
    doc.text(`Date of Birth: ${report.date_of_birth ? new Date(report.date_of_birth).toLocaleDateString() : 'N/A'}`);
    doc.text(`Phone: ${report.phone || 'N/A'}`);
    doc.text(`Report Date: ${new Date(report.report_date).toLocaleDateString()}`);
    doc.moveDown();
    
    // Procedure Type
    doc.fontSize(12).text('PROCEDURE', { underline: true });
    doc.fontSize(10).text(report.procedure_type || 'N/A');
    doc.moveDown();
    
    // Doctor
    if (report.doctor_name) {
      doc.fontSize(12).text('DOCTOR', { underline: true });
      doc.fontSize(10).text(report.doctor_name);
      doc.moveDown();
    }
    
    // Findings
    if (report.findings) {
      doc.fontSize(12).text('FINDINGS', { underline: true });
      doc.fontSize(10).text(report.findings, { align: 'left' });
      doc.moveDown();
    }
    
    // Impression
    if (report.impression) {
      doc.fontSize(12).text('IMPRESSION', { underline: true });
      doc.fontSize(10).text(report.impression);
      doc.moveDown();
    }
    
    // Recommendations
    if (report.recommendations) {
      doc.fontSize(12).text('RECOMMENDATIONS', { underline: true });
      doc.fontSize(10).text(report.recommendations);
      doc.moveDown();
    }
    
    // Measurements
    if (report.measurements) {
      doc.fontSize(12).text('MEASUREMENTS', { underline: true });
      doc.fontSize(10).text(JSON.stringify(report.measurements, null, 2));
      doc.moveDown();
    }
    
    doc.end();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Delete report
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;
