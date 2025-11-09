import express, { Request, Response, Router } from 'express';
import prisma from '../config/prisma';
const router: Router = express.Router();

// Get today's queue
router.get('/', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queue = await prisma.queue.findMany({
      where: {
        checkedInAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: [
        { queuePosition: 'asc' },
        { priority: 'desc' },
        { checkedInAt: 'asc' }
      ]
    });

    // Flatten the patient data to match expected format
    const formattedQueue = queue.map((q: any) => ({
      ...q,
      first_name: q.patient.firstName,
      last_name: q.patient.lastName,
      date_of_birth: q.patient.dateOfBirth,
      phone: q.patient.phone,
      email: q.patient.email,
      patient: undefined // Remove nested patient object
    }));

    res.json(formattedQueue);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const maxPosition = await prisma.queue.aggregate({
      where: {
        checkedInAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _max: {
        queuePosition: true
      }
    });

    const next_position = (maxPosition._max.queuePosition || 0) + 1;

    // Create queue item with patient info
    const queueItem = await prisma.queue.create({
      data: {
        patientId: parseInt(patient_id),
        appointmentType: appointment_type,
        procedureType: procedure_type,
        estimatedDuration: estimated_duration ? parseInt(estimated_duration) : null,
        notes,
        priority: priority || 0,
        queuePosition: next_position,
        status: 'waiting'
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            phone: true,
            email: true
          }
        }
      }
    });

    // Flatten the patient data
    const formattedItem = {
      ...queueItem,
      first_name: queueItem.patient?.firstName,
      last_name: queueItem.patient?.lastName,
      date_of_birth: queueItem.patient?.dateOfBirth,
      phone: queueItem.patient?.phone,
      email: queueItem.patient?.email,
      patient: undefined
    };

    res.status(201).json(formattedItem);
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
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'in_progress') {
      updateData.startedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    const queueItem = await prisma.queue.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    res.json(queueItem);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Reorder queue (drag and drop)
router.put('/reorder', async (req: Request, res: Response) => {
  const { items } = req.body; // Array of {id, queue_position}
  
  try {
    // Use Prisma transaction
    await prisma.$transaction(
      items.map((item: { id: number; queue_position: number }) =>
        prisma.queue.update({
          where: { id: item.id },
          data: {
            queuePosition: item.queue_position,
            updatedAt: new Date()
          }
        })
      )
    );
    
    res.json({ message: 'Queue reordered successfully' });
  } catch (error) {
    console.error('Error reordering queue:', error);
    res.status(500).json({ error: 'Failed to reorder queue' });
  }
});

// Delete queue item
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await prisma.queue.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Queue item deleted successfully' });
  } catch (error) {
    console.error('Error deleting queue item:', error);
    res.status(500).json({ error: 'Failed to delete queue item' });
  }
});

export default router;
