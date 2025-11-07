const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all patients with search
router.get('/', async (req, res) => {
  const { search } = req.query;
  
  try {
    let query = 'SELECT * FROM patients';
    let params = [];
    
    if (search) {
      query += ` WHERE 
        LOWER(first_name) LIKE LOWER($1) OR 
        LOWER(last_name) LIKE LOWER($1) OR
        phone LIKE $1 OR
        email LIKE LOWER($1)
      `;
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY last_name, first_name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  const { first_name, last_name, date_of_birth, phone, email, insurance_info, medical_history } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO patients (first_name, last_name, date_of_birth, phone, email, insurance_info, medical_history)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [first_name, last_name, date_of_birth, phone, email, insurance_info, medical_history]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, date_of_birth, phone, email, insurance_info, medical_history } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE patients 
      SET first_name = $1, last_name = $2, date_of_birth = $3, phone = $4, 
          email = $5, insurance_info = $6, medical_history = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [first_name, last_name, date_of_birth, phone, email, insurance_info, medical_history, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Get patient's history (reports and appointments)
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;
  
  try {
    const reports = await pool.query(
      'SELECT * FROM reports WHERE patient_id = $1 ORDER BY report_date DESC, created_at DESC',
      [id]
    );
    
    const appointments = await pool.query(
      'SELECT * FROM queue WHERE patient_id = $1 ORDER BY checked_in_at DESC LIMIT 10',
      [id]
    );
    
    res.json({
      reports: reports.rows,
      appointments: appointments.rows
    });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
});

module.exports = router;
