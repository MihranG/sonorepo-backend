/**
 * MCP Client for Medical Transcription Enhancement
 * This wrapper makes it easy to use the MCP server from your application
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MedicalTranscriptionClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Spawn the MCP server process
      const serverPath = path.join(__dirname, 'medical-transcription.ts');
      const serverProcess = spawn('tsx', [serverPath], {
        stdio: ['pipe', 'pipe', 'inherit'],
      });

      // Create transport
      this.transport = new StdioClientTransport({
        reader: serverProcess.stdout,
        writer: serverProcess.stdin,
      });

      // Create client
      this.client = new Client(
        {
          name: 'medical-transcription-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log('✅ Connected to Medical Transcription MCP Server');
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.transport) {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from Medical Transcription MCP Server');
    }
  }

  /**
   * Enhance medical transcript with terminology, measurements, and sections
   */
  async enhanceTranscript(params: {
    transcript: string;
    procedureType?: string;
    language?: string;
  }): Promise<{
    enhanced: string;
    measurements: Record<string, any>;
    detectedSection: string | null;
    standardized: string;
  }> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    const result = await this.client!.callTool({
      name: 'enhance_medical_transcript',
      arguments: params,
    });

    const content = result.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }

    throw new Error('Unexpected response format');
  }

  /**
   * Extract measurements from transcript
   */
  async extractMeasurements(transcript: string): Promise<Record<string, any>> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    const result = await this.client!.callTool({
      name: 'extract_measurements',
      arguments: { transcript },
    });

    const content = result.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }

    throw new Error('Unexpected response format');
  }

  /**
   * Classify which section the text belongs to
   */
  async classifySection(text: string, procedureType: string): Promise<string | null> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    const result = await this.client!.callTool({
      name: 'classify_section',
      arguments: { text, procedureType },
    });

    const content = result.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      return parsed.section;
    }

    throw new Error('Unexpected response format');
  }

  /**
   * Standardize medical terms to abbreviations
   */
  async standardizeTerms(transcript: string): Promise<string> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }

    const result = await this.client!.callTool({
      name: 'standardize_terms',
      arguments: { transcript },
    });

    const content = result.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      return parsed.standardized;
    }

    throw new Error('Unexpected response format');
  }
}

// Export singleton instance
export const medicalMCP = new MedicalTranscriptionClient();
