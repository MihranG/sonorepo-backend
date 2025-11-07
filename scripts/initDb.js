require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default database first
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initDatabase = async () => {
  try {
    console.log('Creating database if not exists...');
    
    // Create database
    await pool.query(`
      SELECT 'CREATE DATABASE ${process.env.DB_NAME}'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${process.env.DB_NAME}')
    `).catch(() => {
      // Database might already exist
      console.log('Database already exists or error creating it');
    });

    // Close connection to postgres database
    await pool.end();

    // Connect to the new database
    const appPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('Creating tables...');

    // Create patients table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        phone VARCHAR(20),
        email VARCHAR(100),
        insurance_info TEXT,
        medical_history TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create queue table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS queue (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        appointment_type VARCHAR(50),
        procedure_type VARCHAR(100),
        status VARCHAR(20) DEFAULT 'waiting',
        priority INTEGER DEFAULT 0,
        queue_position INTEGER,
        estimated_duration INTEGER,
        notes TEXT,
        checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create reports table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        queue_id INTEGER REFERENCES queue(id) ON DELETE SET NULL,
        procedure_type VARCHAR(100) NOT NULL,
        doctor_name VARCHAR(100),
        findings TEXT,
        impression TEXT,
        recommendations TEXT,
        voice_transcript TEXT,
        measurements JSONB,
        images JSONB,
        status VARCHAR(20) DEFAULT 'draft',
        report_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create report templates table
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        procedure_type VARCHAR(100) NOT NULL,
        template_fields JSONB NOT NULL,
        default_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default templates
    await appPool.query(`
      INSERT INTO report_templates (name, procedure_type, template_fields, default_content)
      VALUES 
        ('Cardiac Echo', 'cardiac_echo', 
         '{"sections": ["Left Ventricle", "Right Ventricle", "Valves", "Pericardium"], "measurements": ["EF%", "LVEDD", "LVESD", "IVS", "LVPW"]}',
         'CARDIAC ECHOCARDIOGRAPHY\n\nLEFT VENTRICLE:\nSize: Normal\nFunction: Normal\nEjection Fraction: %\n\nRIGHT VENTRICLE:\nSize: Normal\nFunction: Normal\n\nVALVES:\nMitral Valve: Normal\nAortic Valve: Normal\nTricuspid Valve: Normal\nPulmonic Valve: Normal\n\nPERICARDIUM:\nNo effusion'),
        
        ('Abdominal Ultrasound', 'abdominal', 
         '{"sections": ["Liver", "Gallbladder", "Pancreas", "Spleen", "Kidneys"], "measurements": []}',
         'ABDOMINAL ULTRASOUND\n\nLIVER:\nSize: Normal\nEchotexture: Homogeneous\nNo focal lesions\n\nGALLBLADDER:\nNormal appearance\nNo stones or wall thickening\n\nPANCREAS:\nVisualized portions are normal\n\nSPLEEN:\nNormal size and echogenicity\n\nKIDNEYS:\nRight: Normal size, no hydronephrosis\nLeft: Normal size, no hydronephrosis'),
        
        ('Obstetric Ultrasound', 'obstetric', 
         '{"sections": ["Fetal Biometry", "Anatomy", "Placenta", "Amniotic Fluid"], "measurements": ["BPD", "HC", "AC", "FL", "EFW", "GA"]}',
         'OBSTETRIC ULTRASOUND\n\nFETAL BIOMETRY:\nBPD: \nHC: \nAC: \nFL: \nEstimated Fetal Weight: \nGestational Age: \n\nFETAL ANATOMY:\nHead: Normal\nSpine: Normal\nHeart: 4-chamber view normal\nAbdomen: Normal\nExtremities: Normal\n\nPLACENTA:\nPosition: \nGrade: \n\nAMNIOTIC FLUID:\nVolume: Normal'),
        
        ('Vascular Doppler', 'vascular', 
         '{"sections": ["Arterial", "Venous"], "measurements": ["PSV", "EDV", "RI"]}',
         'VASCULAR DOPPLER STUDY\n\nARTERIAL ASSESSMENT:\nCarotid arteries: Patent bilaterally\nFlow characteristics: Normal\n\nVENOUS ASSESSMENT:\nNo evidence of DVT\nCompressibility: Normal\nFlow: Phasic')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Database initialized successfully!');
    console.log('Tables created: patients, queue, reports, report_templates');
    
    await appPool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
};

initDatabase();
