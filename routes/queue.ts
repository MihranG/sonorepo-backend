import express, { Request, Response, Router } from 'express';
const router: Router = express.Router();
import pool from '../config/database';

// Get today's queue
router.get('/', async (req: Request, res: Response) => {
  console.log('----')
  try {
    const result = await pool.query(`
      SELECT 
        q.*,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.phone,
        p.email
      FROM queue q
      JOIN patients p ON q.patient_id = p.id
      WHERE DATE(q.checked_in_at) = CURRENT_DATE
      ORDER BY q.queue_position ASC, q.priority DESC, q.checked_in_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Add patient to queue
router.post('/', async (req: Request, res: Response) => {
  const { patient_id, appointment_type, procedure_type, estimated_duration, notes, priority } = req.body;
  
  try {
    // Get max queue position for today
    const positionResult = await pool.query(`
      SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position
      FROM queue
      WHERE DATE(checked_in_at) = CURRENT_DATE
    `);
    const next_position = positionResult.rows[0].next_position;

    const result = await pool.query(`
      INSERT INTO queue (
        patient_id, appointment_type, procedure_type, 
        estimated_duration, notes, priority, queue_position, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'waiting')
      RETURNING *
    `, [patient_id, appointment_type, procedure_type, estimated_duration, notes, priority || 0, next_position]);

    // Get full patient info
    const fullResult = await pool.query(`
      SELECT 
        q.*,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.phone,
        p.email
      FROM queue q
      JOIN patients p ON q.patient_id = p.id
      WHERE q.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error adding to queue:', error);
    res.status(500).json({ error: 'Failed to add to queue' });
  }
});

// Update queue item status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    let updateQuery = 'UPDATE queue SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status];
    
    if (status === 'in_progress') {
      updateQuery += ', started_at = CURRENT_TIMESTAMP';
    } else if (status === 'completed') {
      updateQuery += ', completed_at = CURRENT_TIMESTAMP';
    }
    
    updateQuery += ' WHERE id = $2 RETURNING *';
    params.push(id);
    
    const result = await pool.query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Reorder queue (drag and drop)
router.put('/reorder', async (req: Request, res: Response) => {
  const { items } = req.body; // Array of {id, queue_position}
  
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const item of items) {
        await client.query(
          'UPDATE queue SET queue_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.queue_position, item.id]
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Queue reordered successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering queue:', error);
    res.status(500).json({ error: 'Failed to reorder queue' });
  }
});

// Delete queue item
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM queue WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    
    res.json({ message: 'Queue item deleted successfully' });
  } catch (error) {
    console.error('Error deleting queue item:', error);
    res.status(500).json({ error: 'Failed to delete queue item' });
  }
});

export default router;
