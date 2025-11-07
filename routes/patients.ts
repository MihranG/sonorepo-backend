import express, { Request, Response, Router } from 'express';
import prisma from '../config/prisma';
import { Patient } from '../types';

const router: Router = express.Router();

// Get all patients with search
router.get('/', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  
  try {
    const where = search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};
    
    const patients = await prisma.patient.findMany({
      where,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        email: true,
        insuranceInfo: true,
        medicalHistory: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    // Convert to snake_case for backwards compatibility
    const formattedPatients = patients.map((p: any) => ({
      id: p.id,
      first_name: p.firstName,
      last_name: p.lastName,
      date_of_birth: p.dateOfBirth,
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      insurance_info: p.insuranceInfo,
      medical_history: p.medicalHistory,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));
    
    res.json(formattedPatients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Convert to snake_case for backwards compatibility
    const formatted = {
      id: patient.id,
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      insurance_info: patient.insuranceInfo,
      medical_history: patient.medicalHistory,
      created_at: patient.createdAt,
      updated_at: patient.updatedAt,
    };
    
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create new patient
router.post('/', async (req: Request, res: Response) => {
  const { first_name, last_name, date_of_birth, gender, phone, email, insurance_info, medical_history } = req.body;
  
  try {
    const patient = await prisma.patient.create({
      data: {
        firstName: first_name,
        lastName: last_name,
        dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
        gender,
        phone,
        email,
        insuranceInfo: insurance_info,
        medicalHistory: medical_history,
      }
    });
    
    // Convert to snake_case for backwards compatibility
    const formatted = {
      id: patient.id,
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      insurance_info: patient.insuranceInfo,
      medical_history: patient.medicalHistory,
      created_at: patient.createdAt,
      updated_at: patient.updatedAt,
    };
    
    res.status(201).json(formatted);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { first_name, last_name, date_of_birth, gender, phone, email, insurance_info, medical_history } = req.body;
  
  try {
    const patient = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: {
        firstName: first_name,
        lastName: last_name,
        dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
        gender,
        phone,
        email,
        insuranceInfo: insurance_info,
        medicalHistory: medical_history,
      }
    });
    
    // Convert to snake_case for backwards compatibility
    const formatted = {
      id: patient.id,
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      insurance_info: patient.insuranceInfo,
      medical_history: patient.medicalHistory,
      created_at: patient.createdAt,
      updated_at: patient.updatedAt,
    };
    
    res.json(formatted);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Get patient's history (reports and appointments)
router.get('/:id/history', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const reports = await prisma.report.findMany({
      where: { patientId: parseInt(id) },
      orderBy: [
        { reportDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    const appointments = await prisma.queue.findMany({
      where: { patientId: parseInt(id) },
      orderBy: { checkedInAt: 'desc' },
      take: 10
    });
    
    res.json({
      reports,
      appointments
    });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
});

export default router;
