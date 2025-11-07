// Type definitions for SonoFlow

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: Date | string;
  gender?: string;
  phone?: string;
  email?: string;
  insurance_info?: string;
  medical_history?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Queue {
  id: number;
  patient_id: number;
  appointment_type?: string;
  procedure_type?: string;
  status: string;
  priority: number;
  queue_position?: number;
  estimated_duration?: number;
  notes?: string;
  checked_in_at: Date;
  started_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface Report {
  id: number;
  patient_id: number;
  queue_id?: number;
  procedure_type: string;
  doctor_name?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  voice_transcript?: string;
  measurements?: Record<string, any>;
  images?: Record<string, any>;
  status: string;
  report_date: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface ReportTemplate {
  id: number;
  name: string;
  procedure_type: string;
  template_fields: {
    sections?: string[];
    measurements?: string[];
  };
  default_content?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface VoiceConfig {
  language: string;
  sampleRate?: number;
}

export interface StreamingTranscript {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}
