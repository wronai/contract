/**
 * Ollama LLM Client
 * 
 * Implementacja LLMClient dla lokalnego Ollama.
 * 
 * @version 2.2.0
 */

import * as http from 'http';
import * as https from 'https';

// ============================================================================
// TYPES
// ============================================================================

// Re-use LLMClient from generator module
import { LLMClient } from '../generator/contract-generator';
export { LLMClient };

export interface GenerateOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface OllamaConfig {
  host: string;
  model: string;
  timeout: number;
  retries: number;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

// ============================================================================
// OLLAMA CLIENT
// ============================================================================

export class OllamaClient implements LLMClient {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = {
      host: process.env.OLLAMA_HOST || config?.host || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || config?.model || 'qwen2.5-coder:14b',
      timeout: config?.timeout || 120000,
      retries: config?.retries || 3
    };
  }

  /**
   * Sprawdza czy Ollama jest dostępna
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.httpGet('/api/tags');
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  /**
   * Sprawdza czy model jest dostępny
   */
  async hasModel(modelName?: string): Promise<boolean> {
    try {
      const response = await this.httpGet('/api/tags');
      if (response.statusCode !== 200) return false;
      
      const data = JSON.parse(response.body);
      const model = modelName || this.config.model;
      return data.models?.some((m: any) => m.name.startsWith(model)) || false;
    } catch {
      return false;
    }
  }

  /**
   * Generuje odpowiedź LLM
   */
  async generate(opts: GenerateOptions): Promise<string> {
    const { system, user, temperature = 0.7, maxTokens = 4096 } = opts;

    const request: OllamaGenerateRequest = {
      model: this.config.model,
      prompt: user,
      system: system,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.httpPost('/api/generate', request);
        
        if (response.statusCode === 200) {
          const data: OllamaGenerateResponse = JSON.parse(response.body);
          return data.response;
        }

        if (response.statusCode === 404) {
          throw new Error(
            `Model '${this.config.model}' not found. Pull with: ollama pull ${this.config.model}`
          );
        }

        throw new Error(`Ollama error: ${response.statusCode} - ${response.body}`);
      } catch (error: any) {
        lastError = error;

        if (error.code === 'ECONNREFUSED') {
          throw new Error(
            'Ollama not running. Start with: ollama serve'
          );
        }

        // Retry with exponential backoff
        if (attempt < this.config.retries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to generate response');
  }

  /**
   * HTTP GET request
   */
  private httpGet(path: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.host);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.get(url, { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * HTTP POST request
   */
  private httpPost(path: string, data: any): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.host);
      const client = url.protocol === 'https:' ? https : http;
      const payload = JSON.stringify(data);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: this.config.timeout
      };

      const req = client.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(payload);
      req.end();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Zwraca informacje o konfiguracji
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createOllamaClient(config?: Partial<OllamaConfig>): OllamaClient {
  return new OllamaClient(config);
}

/**
 * Sprawdza czy Ollama jest dostępna (helper)
 */
export async function checkOllamaAvailable(host?: string): Promise<boolean> {
  const client = new OllamaClient({ host });
  return client.isAvailable();
}
