/**
 * Dependency Checker
 * 
 * Detects missing dependencies and creates setup tasks for fresh installations.
 * Helps users configure their environment even without LLM available.
 * 
 * @version 2.4.1
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// TYPES
// ============================================================================

export type DependencyStatus = 'installed' | 'missing' | 'outdated' | 'error';
export type DependencyPriority = 'required' | 'recommended' | 'optional';

export interface Dependency {
  name: string;
  displayName: string;
  description: string;
  priority: DependencyPriority;
  category: 'runtime' | 'llm' | 'database' | 'container' | 'tool';
  checkCommand: string;
  versionCommand?: string;
  installGuide: InstallGuide;
  minVersion?: string;
  website?: string;
}

export interface InstallGuide {
  description: string;
  linux: string[];
  macos: string[];
  windows: string[];
  docker?: string;
  manual?: string;
}

export interface DependencyCheck {
  dependency: Dependency;
  status: DependencyStatus;
  version?: string;
  error?: string;
  installCommand?: string;
}

export interface SetupTask {
  id: string;
  name: string;
  description: string;
  priority: DependencyPriority;
  category: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  commands: string[];
  manual?: string;
  website?: string;
}

export interface EnvironmentReport {
  os: string;
  arch: string;
  nodeVersion: string;
  npmVersion?: string;
  dependencies: DependencyCheck[];
  setupTasks: SetupTask[];
  readyForDevelopment: boolean;
  missingRequired: string[];
  missingRecommended: string[];
}

// ============================================================================
// DEPENDENCY DEFINITIONS
// ============================================================================

export const DEPENDENCIES: Dependency[] = [
  // Runtime
  {
    name: 'node',
    displayName: 'Node.js',
    description: 'JavaScript runtime for running reclapp',
    priority: 'required',
    category: 'runtime',
    checkCommand: 'node --version',
    versionCommand: 'node --version',
    minVersion: '18.0.0',
    website: 'https://nodejs.org',
    installGuide: {
      description: 'Install Node.js 18+ LTS',
      linux: [
        'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
        'sudo apt-get install -y nodejs',
        '# Or use nvm:',
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash',
        'nvm install 20'
      ],
      macos: [
        'brew install node@20',
        '# Or use nvm:',
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash',
        'nvm install 20'
      ],
      windows: [
        'winget install OpenJS.NodeJS.LTS',
        '# Or download from https://nodejs.org'
      ]
    }
  },

  // LLM - Ollama
  {
    name: 'ollama',
    displayName: 'Ollama',
    description: 'Local LLM runtime for AI-powered code generation',
    priority: 'recommended',
    category: 'llm',
    checkCommand: 'ollama --version',
    versionCommand: 'ollama --version',
    website: 'https://ollama.ai',
    installGuide: {
      description: 'Install Ollama for local LLM support',
      linux: [
        'curl -fsSL https://ollama.ai/install.sh | sh',
        '# Start Ollama service:',
        'ollama serve &',
        '# Pull recommended model:',
        'ollama pull codellama:7b'
      ],
      macos: [
        'brew install ollama',
        '# Or download from https://ollama.ai/download',
        '# Start Ollama:',
        'ollama serve &',
        '# Pull recommended model:',
        'ollama pull codellama:7b'
      ],
      windows: [
        '# Download from https://ollama.ai/download',
        '# After installation, open terminal:',
        'ollama pull codellama:7b'
      ],
      docker: 'docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama'
    }
  },

  // Container - Docker
  {
    name: 'docker',
    displayName: 'Docker',
    description: 'Container runtime for isolated development environments',
    priority: 'recommended',
    category: 'container',
    checkCommand: 'docker --version',
    versionCommand: 'docker --version',
    website: 'https://docker.com',
    installGuide: {
      description: 'Install Docker for containerized deployments',
      linux: [
        'curl -fsSL https://get.docker.com | sh',
        'sudo usermod -aG docker $USER',
        '# Log out and back in, then:',
        'docker run hello-world'
      ],
      macos: [
        'brew install --cask docker',
        '# Or download Docker Desktop from https://docker.com/products/docker-desktop'
      ],
      windows: [
        'winget install Docker.DockerDesktop',
        '# Or download from https://docker.com/products/docker-desktop'
      ]
    }
  },

  // Docker Compose
  {
    name: 'docker-compose',
    displayName: 'Docker Compose',
    description: 'Multi-container orchestration tool',
    priority: 'optional',
    category: 'container',
    checkCommand: 'docker compose version || docker-compose --version',
    versionCommand: 'docker compose version',
    website: 'https://docs.docker.com/compose/',
    installGuide: {
      description: 'Docker Compose is included with Docker Desktop',
      linux: [
        '# Usually included with Docker, or:',
        'sudo apt-get install docker-compose-plugin'
      ],
      macos: ['# Included with Docker Desktop'],
      windows: ['# Included with Docker Desktop']
    }
  },

  // Git
  {
    name: 'git',
    displayName: 'Git',
    description: 'Version control system',
    priority: 'required',
    category: 'tool',
    checkCommand: 'git --version',
    versionCommand: 'git --version',
    website: 'https://git-scm.com',
    installGuide: {
      description: 'Install Git for version control',
      linux: ['sudo apt-get install git'],
      macos: ['brew install git', '# Or: xcode-select --install'],
      windows: ['winget install Git.Git']
    }
  },

  // TypeScript
  {
    name: 'typescript',
    displayName: 'TypeScript',
    description: 'TypeScript compiler for type-safe development',
    priority: 'required',
    category: 'tool',
    checkCommand: 'tsc --version || npx tsc --version',
    versionCommand: 'npx tsc --version',
    website: 'https://typescriptlang.org',
    installGuide: {
      description: 'TypeScript is installed via npm',
      linux: ['bash -c "source ~/.nvm/nvm.sh 2>/dev/null || true; npm install -g typescript"'],
      macos: ['npm install -g typescript'],
      windows: ['npm install -g typescript']
    }
  },

  // Database - PostgreSQL (optional)
  {
    name: 'postgresql',
    displayName: 'PostgreSQL',
    description: 'Relational database for persistent storage',
    priority: 'optional',
    category: 'database',
    checkCommand: 'psql --version',
    versionCommand: 'psql --version',
    website: 'https://postgresql.org',
    installGuide: {
      description: 'Install PostgreSQL for database support',
      linux: [
        'sudo apt-get install postgresql postgresql-contrib',
        'sudo systemctl start postgresql'
      ],
      macos: [
        'brew install postgresql@15',
        'brew services start postgresql@15'
      ],
      windows: ['winget install PostgreSQL.PostgreSQL'],
      docker: 'docker run -d --name postgres -e POSTGRES_PASSWORD=reclapp -p 5432:5432 postgres:15'
    }
  },

  // Redis (optional)
  {
    name: 'redis',
    displayName: 'Redis',
    description: 'In-memory cache and message broker',
    priority: 'optional',
    category: 'database',
    checkCommand: 'redis-cli --version',
    versionCommand: 'redis-cli --version',
    website: 'https://redis.io',
    installGuide: {
      description: 'Install Redis for caching',
      linux: [
        'sudo apt-get install redis-server',
        'sudo systemctl start redis'
      ],
      macos: [
        'brew install redis',
        'brew services start redis'
      ],
      windows: ['# Use Docker or WSL'],
      docker: 'docker run -d --name redis -p 6379:6379 redis:7'
    }
  },

  // Python (for some tools)
  {
    name: 'python',
    displayName: 'Python 3',
    description: 'Python runtime for additional tools and scripts',
    priority: 'optional',
    category: 'runtime',
    checkCommand: 'python3 --version || python --version',
    versionCommand: 'python3 --version',
    minVersion: '3.9.0',
    website: 'https://python.org',
    installGuide: {
      description: 'Install Python 3.9+',
      linux: ['sudo apt-get install python3 python3-pip'],
      macos: ['brew install python@3.11'],
      windows: ['winget install Python.Python.3.11']
    }
  }
];

// ============================================================================
// DEPENDENCY CHECKER
// ============================================================================

export class DependencyChecker {
  private platform: NodeJS.Platform;
  private checks: Map<string, DependencyCheck> = new Map();

  constructor() {
    this.platform = os.platform();
  }

  /**
   * Check single dependency
   */
  async checkDependency(dep: Dependency): Promise<DependencyCheck> {
    const check: DependencyCheck = {
      dependency: dep,
      status: 'missing'
    };

    try {
      execSync(dep.checkCommand, { stdio: 'pipe', timeout: 5000 });
      check.status = 'installed';

      // Get version if available
      if (dep.versionCommand) {
        try {
          const versionOutput = execSync(dep.versionCommand, { stdio: 'pipe', timeout: 5000 });
          const versionMatch = versionOutput.toString().match(/(\d+\.\d+\.\d+)/);
          if (versionMatch) {
            check.version = versionMatch[1];
            
            // Check minimum version
            if (dep.minVersion && this.compareVersions(check.version, dep.minVersion) < 0) {
              check.status = 'outdated';
            }
          }
        } catch {}
      }
    } catch (error) {
      check.status = 'missing';
      check.error = error instanceof Error ? error.message : 'Check failed';
    }

    // Add install command for current platform
    check.installCommand = this.getInstallCommand(dep);
    this.checks.set(dep.name, check);
    
    return check;
  }

  /**
   * Check all dependencies
   */
  async checkAll(): Promise<DependencyCheck[]> {
    const results: DependencyCheck[] = [];
    
    for (const dep of DEPENDENCIES) {
      const check = await this.checkDependency(dep);
      results.push(check);
    }
    
    return results;
  }

  /**
   * Generate environment report
   */
  async generateReport(): Promise<EnvironmentReport> {
    const checks = await this.checkAll();
    
    const missingRequired = checks
      .filter(c => c.status === 'missing' && c.dependency.priority === 'required')
      .map(c => c.dependency.displayName);
    
    const missingRecommended = checks
      .filter(c => c.status === 'missing' && c.dependency.priority === 'recommended')
      .map(c => c.dependency.displayName);

    const setupTasks = this.generateSetupTasks(checks);

    return {
      os: `${os.platform()} ${os.release()}`,
      arch: os.arch(),
      nodeVersion: process.version,
      npmVersion: this.getNpmVersion(),
      dependencies: checks,
      setupTasks,
      readyForDevelopment: missingRequired.length === 0,
      missingRequired,
      missingRecommended
    };
  }

  /**
   * Generate setup tasks from dependency checks
   */
  generateSetupTasks(checks: DependencyCheck[]): SetupTask[] {
    const tasks: SetupTask[] = [];
    
    for (const check of checks) {
      if (check.status === 'missing' || check.status === 'outdated') {
        const dep = check.dependency;
        const guide = dep.installGuide;
        
        const commands = this.platform === 'darwin' ? guide.macos :
                        this.platform === 'win32' ? guide.windows :
                        guide.linux;

        tasks.push({
          id: `install-${dep.name}`,
          name: `Install ${dep.displayName}`,
          description: guide.description,
          priority: dep.priority,
          category: dep.category,
          status: 'pending',
          commands,
          manual: guide.manual,
          website: dep.website
        });

        // Add model pull task for Ollama
        if (dep.name === 'ollama') {
          tasks.push({
            id: 'ollama-pull-model',
            name: 'Pull Ollama Model',
            description: 'Download codellama model for code generation',
            priority: 'recommended',
            category: 'llm',
            status: 'pending',
            commands: ['ollama pull codellama:7b']
          });
        }
      }
    }

    return tasks;
  }

  /**
   * Save setup tasks to project file
   */
  saveSetupTasks(outputDir: string, tasks: SetupTask[]): string {
    const tasksDir = path.join(outputDir, 'setup');
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    const tasksPath = path.join(tasksDir, 'setup-tasks.json');
    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');

    // Generate markdown guide
    const mdPath = path.join(tasksDir, 'SETUP.md');
    fs.writeFileSync(mdPath, this.generateSetupMarkdown(tasks), 'utf-8');

    return tasksPath;
  }

  /**
   * Generate setup markdown guide
   */
  generateSetupMarkdown(tasks: SetupTask[]): string {
    const platform = this.platform === 'darwin' ? 'macOS' :
                    this.platform === 'win32' ? 'Windows' : 'Linux';

    const requiredTasks = tasks.filter(t => t.priority === 'required');
    const recommendedTasks = tasks.filter(t => t.priority === 'recommended');
    const optionalTasks = tasks.filter(t => t.priority === 'optional');

    const formatTask = (task: SetupTask): string => {
      let md = `### ${task.name}\n\n`;
      md += `${task.description}\n\n`;
      
      if (task.commands.length > 0) {
        md += '```bash\n';
        md += task.commands.join('\n');
        md += '\n```\n\n';
      }
      
      if (task.website) {
        md += `📖 Documentation: ${task.website}\n\n`;
      }
      
      return md;
    };

    let md = `# Reclapp Setup Guide\n\n`;
    md += `Platform: **${platform}**\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `---\n\n`;

    if (requiredTasks.length > 0) {
      md += `## ⚠️ Required Dependencies\n\n`;
      md += `These must be installed before using reclapp:\n\n`;
      for (const task of requiredTasks) {
        md += formatTask(task);
      }
    }

    if (recommendedTasks.length > 0) {
      md += `## 📦 Recommended Dependencies\n\n`;
      md += `These are recommended for the best experience:\n\n`;
      for (const task of recommendedTasks) {
        md += formatTask(task);
      }
    }

    if (optionalTasks.length > 0) {
      md += `## 🔧 Optional Dependencies\n\n`;
      md += `These may be needed depending on your use case:\n\n`;
      for (const task of optionalTasks) {
        md += formatTask(task);
      }
    }

    if (tasks.length === 0) {
      md += `## ✅ All Dependencies Installed\n\n`;
      md += `Your environment is ready for development!\n\n`;
    }

    md += `---\n\n`;
    md += `## Quick Start\n\n`;
    md += '```bash\n';
    md += '# After installing dependencies:\n';
    md += 'reclapp evolve -p "Create a todo app" -o ./my-app\n';
    md += '```\n';

    return md;
  }

  /**
   * Print status to console
   */
  printStatus(report: EnvironmentReport): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          🔍 Reclapp Environment Check                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  OS: ${report.os.padEnd(52)}║`);
    console.log(`║  Node: ${report.nodeVersion.padEnd(50)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Dependencies:\n');
    
    for (const check of report.dependencies) {
      const icon = check.status === 'installed' ? '✅' :
                  check.status === 'outdated' ? '⚠️' : '❌';
      const version = check.version ? ` (${check.version})` : '';
      const priority = check.dependency.priority === 'required' ? ' [required]' :
                      check.dependency.priority === 'recommended' ? ' [recommended]' : '';
      
      console.log(`  ${icon} ${check.dependency.displayName}${version}${priority}`);
    }

    console.log('');

    if (report.missingRequired.length > 0) {
      console.log('⚠️  Missing required dependencies:');
      for (const dep of report.missingRequired) {
        console.log(`   - ${dep}`);
      }
      console.log('');
    }

    if (report.missingRecommended.length > 0) {
      console.log('📦 Missing recommended dependencies:');
      for (const dep of report.missingRecommended) {
        console.log(`   - ${dep}`);
      }
      console.log('');
    }

    if (report.readyForDevelopment) {
      console.log('✅ Environment ready for development!\n');
    } else {
      console.log('❌ Please install required dependencies first.\n');
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getInstallCommand(dep: Dependency): string {
    const guide = dep.installGuide;
    const commands = this.platform === 'darwin' ? guide.macos :
                    this.platform === 'win32' ? guide.windows :
                    guide.linux;
    return commands[0] || '';
  }

  private getNpmVersion(): string | undefined {
    try {
      return execSync('npm --version', { stdio: 'pipe' }).toString().trim();
    } catch {
      return undefined;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export async function checkEnvironment(): Promise<EnvironmentReport> {
  const checker = new DependencyChecker();
  return checker.generateReport();
}

export async function printEnvironmentStatus(): Promise<void> {
  const checker = new DependencyChecker();
  const report = await checker.generateReport();
  checker.printStatus(report);
}

export default DependencyChecker;
