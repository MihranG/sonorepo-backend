import express, { Request, Response, Router } from 'express';
import prisma from '../config/prisma';
const router: Router = express.Router();
const PDFDocument = require('pdfkit');

// Get all report templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.reportTemplate.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by procedure type
router.get('/templates/:procedureType', async (req: Request, res: Response) => {
  const { procedureType } = req.params;
  
  try {
    const template = await prisma.reportTemplate.findFirst({
      where: { procedureType: procedureType }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Get all reports
router.get('/', async (req: Request, res: Response) => {
  const { patient_id, status } = req.query;
  
  try {
    const where: any = {};
    
    if (patient_id) {
      where.patientId = parseInt(patient_id as string);
    }
    
    if (status) {
      where.status = status as string;
    }
    
    const reports = await prisma.report.findMany({
      where,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true
          }
        }
      },
      orderBy: [
        { reportDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Flatten patient data
    const formattedReports = reports.map((r: any) => ({
      ...r,
      first_name: r.patient.firstName,
      last_name: r.patient.lastName,
      date_of_birth: r.patient.dateOfBirth,
      patient: undefined
    }));

    res.json(formattedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get report by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
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
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Flatten patient data
    const formattedReport = {
      ...report,
      first_name: report.patient?.firstName,
      last_name: report.patient?.lastName,
      date_of_birth: report.patient?.dateOfBirth,
      phone: report.patient?.phone,
      email: report.patient?.email,
      patient: undefined
    };
    
    res.json(formattedReport);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Create new report
router.post('/', async (req: Request, res: Response) => {
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
    const report = await prisma.report.create({
      data: {
        patientId: parseInt(patient_id),
        queueId: queue_id ? parseInt(queue_id) : null,
        procedureType: procedure_type,
        doctorName: doctor_name,
        findings,
        impression,
        recommendations,
        voiceTranscript: voice_transcript,
        measurements: measurements || null,
        images: images || null,
        status: status || 'draft'
      }
    });
    
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update report
router.put('/:id', async (req: Request, res: Response) => {
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
    const report = await prisma.report.update({
      where: { id: parseInt(id) },
      data: {
        procedureType: procedure_type,
        doctorName: doctor_name,
        findings,
        impression,
        recommendations,
        voiceTranscript: voice_transcript,
        measurements: measurements || null,
        images: images || null,
        status,
        updatedAt: new Date()
      }
    });
    
    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Generate PDF for report
router.get('/:id/pdf', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const reportData = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            phone: true
          }
        }
      }
    });
    
    if (!reportData) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Flatten for PDF generation
    const report: any = {
      ...reportData,
      first_name: reportData.patient?.firstName,
      last_name: reportData.patient?.lastName,
      date_of_birth: reportData.patient?.dateOfBirth,
      phone: reportData.patient?.phone
    };
    
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
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await prisma.report.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
