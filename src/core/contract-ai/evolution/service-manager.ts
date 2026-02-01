/**
 * Service Manager
 * 
 * Manages service lifecycle: start, stop, restart, health checks.
 * 
 * @version 2.4.1
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceManagerOptions {
  outputDir: string;
  port: number;
  verbose: boolean;
  healthCheckInterval: number;
  autoRestart: boolean;
}

export interface ServiceStatus {
  running: boolean;
  pid?: number;
  port: number;
  healthy: boolean;
  lastCheck: Date;
}

export type LogCallback = (level: 'info' | 'error', message: string, source: string) => void;

// ============================================================================
// SERVICE MANAGER CLASS
// ============================================================================

export class ServiceManager {
  private options: ServiceManagerOptions;
  private serviceProcess: ChildProcess | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private onLog: LogCallback | null = null;

  constructor(options: ServiceManagerOptions) {
    this.options = options;
  }

  /**
   * Set log callback
   */
  setLogCallback(callback: LogCallback): void {
    this.onLog = callback;
  }

  /**
   * Get current service status
   */
  getStatus(): ServiceStatus {
    return {
      running: this.serviceProcess !== null,
      pid: this.serviceProcess?.pid,
      port: this.options.port,
      healthy: false,
      lastCheck: new Date()
    };
  }

  /**
   * Start service
   */
  async start(): Promise<boolean> {
    const apiDir = path.join(this.options.outputDir, 'api');
    
    if (!fs.existsSync(path.join(apiDir, 'package.json'))) {
      if (this.options.verbose) {
        console.log('   ⚠️ No package.json, skipping service start');
      }
      return false;
    }

    // Install dependencies
    if (this.options.verbose) {
      console.log('\n📦 Installing dependencies...');
    }

    await this.runCommand('npm', ['install'], apiDir);

    // Start server
    if (this.options.verbose) {
      console.log(`\n🚀 Starting service on port ${this.options.port}...`);
    }

    // Kill any existing process on the port first
    await this.killProcessOnPort(this.options.port);

    const env = this.getNodeEnv();
    env.PORT = String(this.options.port);
    
    this.serviceProcess = spawn('npx', ['ts-node', 'src/server.ts'], {
      cwd: apiDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Capture logs
    this.serviceProcess.stdout?.on('data', (data) => {
      const message = data.toString().trim();
      this.onLog?.('info', message, 'service');
      if (this.options.verbose) {
        console.log(`   [service] ${message}`);
      }
    });

    this.serviceProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      this.onLog?.('error', message, 'service');
      if (this.options.verbose) {
        console.log(`   [error] ${message}`);
      }
    });

    this.serviceProcess.on('exit', (code, signal) => {
      if (this.options.verbose) {
        if (signal) {
          console.log(`   Service stopped (signal: ${signal})`);
        } else if (code === 0 || code === null) {
          console.log(`   Service exited normally`);
        } else {
          console.log(`   ⚠️ Service exited with code ${code}`);
        }
      }
    });

    // Wait for service to be ready
    return await this.waitForHealth();
  }

  /**
   * Stop service
   */
  async stop(): Promise<void> {
    if (this.serviceProcess) {
      this.serviceProcess.kill();
      this.serviceProcess = null;
      
      if (this.options.verbose) {
        console.log('   🛑 Service stopped');
      }
    }
  }

  /**
   * Restart service
   */
  async restart(): Promise<boolean> {
    if (this.options.verbose) {
      console.log('\n🔄 Restarting service...');
    }
    
    await this.stop();
    return await this.start();
  }

  /**
   * Check health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.options.port}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Wait for service to become healthy
   */
  async waitForHealth(maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const healthy = await this.checkHealth();
      if (healthy) {
        if (this.options.verbose) {
          console.log('   ✅ Service is healthy');
        }
        return true;
      }
      await this.sleep(1000);
    }
    return false;
  }

  /**
   * Start health monitoring
   */
  startMonitoring(onUnhealthy?: () => Promise<void>): void {
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.checkHealth();
      if (!healthy && this.options.autoRestart && onUnhealthy) {
        await onUnhealthy();
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Run a command and wait for completion
   */
  private async runCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * Kill process on port
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get Node environment
   */
  private getNodeEnv(): NodeJS.ProcessEnv {
    return { ...process.env, NODE_ENV: 'development' };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ServiceManager;
