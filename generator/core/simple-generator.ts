/**
 * Simple Generator - Contract to Application Generator
 * 
 * Generates full-stack applications from ReclappContract definitions.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { ReclappContract } from '../../contracts/dsl-types';
import * as templates from '../templates';

export interface GeneratedFile {
  path: string;
  content: string;
}

export class SimpleGenerator {
  private contract: ReclappContract;
  private outputDir: string;
  private files: GeneratedFile[] = [];

  constructor(contract: ReclappContract, outputDir: string) {
    this.contract = contract;
    this.outputDir = outputDir;
  }

  generate(): GeneratedFile[] {
    console.log(`\n🚀 Generating ${this.contract.app.name} v${this.contract.app.version}...`);
    console.log(`📁 Output: ${this.outputDir}\n`);

    this.generateApi();
    this.generateFrontend();
    this.generateDatabase();
    this.generateDocker();
    this.generateProjectFiles();

    return this.files;
  }

  private addFile(relativePath: string, content: string): void {
    this.files.push({
      path: path.join(this.outputDir, relativePath),
      content
    });
  }

  private generateApi(): void {
    const entities = this.contract.entities || [];
    const api = this.contract.api;

    const authEnabled = !!api?.resources?.some(r => r.auth === 'required');
    const ctx: templates.TemplateContext = {
      appName: this.contract.app.name,
      appVersion: this.contract.app.version,
      entities: entities.map(e => ({
        name: e.name,
        fields: e.fields || []
      }))
    };

    // Server
    this.addFile('api/src/server.ts', templates.serverTemplate(ctx));

    if (authEnabled) {
      this.addFile('api/src/middleware/auth.ts', templates.authMiddlewareTemplate());
    }

    // Routes and Models
    for (const entity of entities) {
      const kebabName = templates.kebab(entity.name);
      const entityAuthRequired = !!api?.resources?.some(
        r => r.entity === entity.name && r.auth === 'required'
      );

      this.addFile(
        `api/src/routes/${kebabName}.ts`,
        templates.routeTemplate(entity.name, entity.fields || [], entityAuthRequired)
      );
      this.addFile(`api/src/models/${kebabName}.ts`, templates.modelTemplate(entity.name, entity.fields || []));
    }

    // Package files
    this.addFile(
      'api/package.json',
      templates.apiPackageJson(this.contract.app.name, this.contract.app.version, authEnabled)
    );
    this.addFile('api/tsconfig.json', templates.apiTsConfig());
  }

  private generateFrontend(): void {
    const entities = this.contract.entities || [];
    const ctx: templates.FrontendContext = {
      appName: this.contract.app.name,
      appVersion: this.contract.app.version,
      entities: entities.map(e => ({
        name: e.name,
        fields: e.fields || []
      }))
    };

    // Main app files
    this.addFile('frontend/src/App.tsx', templates.appTemplate(ctx));
    this.addFile('frontend/src/main.tsx', templates.mainTemplate());
    this.addFile('frontend/src/index.css', templates.indexCss());

    // Components
    for (const entity of entities) {
      this.addFile(
        `frontend/src/components/${entity.name}List.tsx`,
        templates.componentTemplate(entity.name, entity.fields || [])
      );
    }

    // Hooks
    this.addFile('frontend/src/hooks/useApi.ts', templates.hooksTemplate(entities));

    // Config files
    this.addFile('frontend/package.json', templates.frontendPackageJson(this.contract.app.name, this.contract.app.version));
    this.addFile('frontend/vite.config.ts', templates.viteConfig());
    this.addFile('frontend/index.html', templates.indexHtml(this.contract.app.name));
    this.addFile('frontend/tailwind.config.js', templates.tailwindConfig());
    this.addFile('frontend/postcss.config.js', templates.postcssConfig());
    this.addFile('frontend/tsconfig.json', templates.frontendTsConfig());
  }

  private generateDatabase(): void {
    const entities = this.contract.entities || [];
    this.addFile(
      'database/migrations/001_init.sql',
      templates.sqlMigration(this.contract.app.name, entities.map(e => ({
        name: e.name,
        fields: e.fields || []
      })))
    );
  }

  private generateDocker(): void {
    this.addFile('docker/Dockerfile.api', templates.apiDockerfile());
    this.addFile('docker/Dockerfile.frontend', templates.frontendDockerfile());
    this.addFile('frontend/nginx.conf', templates.nginxConfig());
    this.addFile('docker-compose.yml', templates.dockerCompose(this.contract.app.name));
  }

  private generateProjectFiles(): void {
    this.addFile('README.md', this.readmeTemplate());
    this.addFile('.env.example', templates.envExample(this.contract.app.name));
    this.addFile('.gitignore', templates.gitignore());
  }

  private readmeTemplate(): string {
    return `# ${this.contract.app.name}

${this.contract.app.description || ''}

## Quick Start

\`\`\`bash
cd api && npm install && npm run dev
cd frontend && npm install && npm run dev
\`\`\`

## Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## API Endpoints

${(this.contract.entities || []).map(e => `- \`/api/${templates.kebab(e.name)}s\` - ${e.name} CRUD`).join('\n')}

## Generated by Reclapp

This application was generated from a \`.reclapp.ts\` contract.
`;
  }

  /**
   * Write all generated files to disk
   */
  writeFiles(verbose: boolean = false): number {
    let written = 0;
    for (const file of this.files) {
      const dir = path.dirname(file.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file.path, file.content, 'utf-8');
      if (verbose) {
        const rel = path.relative(this.outputDir, file.path);
        console.log(`  ✓ ${rel}`);
      }
      written++;
    }
    
    // Write generation log
    this.writeGenerationLog(written);
    
    return written;
  }

  /**
   * Write detailed generation log to .rcl.md file
   */
  private writeGenerationLog(fileCount: number): void {
    const timestamp = new Date().toISOString();
    const logsDir = path.join(this.outputDir, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFileName = `generation_${timestamp.replace(/[:.]/g, '-')}.rcl.md`;
    const logPath = path.join(logsDir, logFileName);
    
    const entities = this.contract.entities || [];
    
    // Group files by category
    const apiFiles = this.files.filter(f => f.path.includes('/api/'));
    const frontendFiles = this.files.filter(f => f.path.includes('/frontend/'));
    const dockerFiles = this.files.filter(f => f.path.includes('/docker') || f.path.includes('docker-compose'));
    const otherFiles = this.files.filter(f => 
      !f.path.includes('/api/') && 
      !f.path.includes('/frontend/') && 
      !f.path.includes('/docker') &&
      !f.path.includes('docker-compose')
    );
    
    const log = `# Generation Log
> Generated by Reclapp Contract AI

## Metadata

| Field | Value |
|-------|-------|
| **Timestamp** | ${timestamp} |
| **Contract** | ${this.contract.app.name} |
| **Version** | ${this.contract.app.version} |
| **Output Directory** | \`${this.outputDir}\` |
| **Total Files** | ${fileCount} |

---

## Contract Summary

### Application
- **Name:** ${this.contract.app.name}
- **Version:** ${this.contract.app.version}
- **Description:** ${this.contract.app.description || 'N/A'}

### Entities (${entities.length})
${entities.map(e => `- **${e.name}** - ${(e.fields || []).length} fields`).join('\n')}

---

## Generation Steps

### Step 1: Parse Contract ✅
- Loaded contract: \`${this.contract.app.name}\`
- Entities detected: ${entities.length}
- Tech stack: Express.js + TypeScript (API), React + Vite (Frontend)

### Step 2: Generate API Layer ✅
- Files generated: ${apiFiles.length}
- Server entry: \`api/src/server.ts\`
- Routes: ${entities.map(e => `\`/api/${templates.kebab(e.name)}s\``).join(', ')}

### Step 3: Generate Frontend Layer ✅
- Files generated: ${frontendFiles.length}
- Framework: React 18 + Vite + Tailwind CSS
- Components: ${entities.map(e => `\`${e.name}List.tsx\``).join(', ')}

### Step 4: Generate Database Schema ✅
- Migration file: \`database/migrations/001_init.sql\`
- Tables: ${entities.map(e => templates.kebab(e.name) + 's').join(', ')}

### Step 5: Generate Docker Configuration ✅
- Files generated: ${dockerFiles.length}
- Dockerfile.api, Dockerfile.frontend
- docker-compose.yml ready

### Step 6: Write Files ✅
- Total files written: ${fileCount}

---

## Generated Files

### API Layer (${apiFiles.length} files)
${apiFiles.map(f => `- \`${path.relative(this.outputDir, f.path)}\``).join('\n')}

### Frontend Layer (${frontendFiles.length} files)
${frontendFiles.map(f => `- \`${path.relative(this.outputDir, f.path)}\``).join('\n')}

### Docker Configuration (${dockerFiles.length} files)
${dockerFiles.map(f => `- \`${path.relative(this.outputDir, f.path)}\``).join('\n')}

### Other Files (${otherFiles.length} files)
${otherFiles.map(f => `- \`${path.relative(this.outputDir, f.path)}\``).join('\n')}

---

## Next Steps

### Option 1: Run with npm (Development)
\`\`\`bash
cd ${this.outputDir}/api && npm install && npm run dev
cd ${this.outputDir}/frontend && npm install && npm run dev
\`\`\`

### Option 2: Run with Docker (Production)
\`\`\`bash
cd ${this.outputDir}
docker compose up -d
\`\`\`

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | \`/api/health\` | Health check |
${entities.map(e => {
  const kebab = templates.kebab(e.name);
  return `| GET | \`/api/${kebab}s\` | List all ${e.name}s |
| GET | \`/api/${kebab}s/:id\` | Get ${e.name} by ID |
| POST | \`/api/${kebab}s\` | Create ${e.name} |
| PUT | \`/api/${kebab}s/:id\` | Update ${e.name} |
| DELETE | \`/api/${kebab}s/:id\` | Delete ${e.name} |`;
}).join('\n')}

---

## Generation Complete ✅

**Generated ${fileCount} files in ${((Date.now() - new Date(timestamp).getTime()) / 1000).toFixed(2)}s**

To deploy with Docker:
\`\`\`bash
reclapp deploy ${this.contract.app.name}.contract.md
\`\`\`
`;

    fs.writeFileSync(logPath, log, 'utf-8');
    console.log(`\n📋 Generation log: ${path.relative(process.cwd(), logPath)}`);
  }
}

/**
 * Generate from contract - convenience function
 */
export async function generateFromContract(
  contract: ReclappContract,
  outputDir: string,
  options: { verbose?: boolean } = {}
): Promise<number> {
  const generator = new SimpleGenerator(contract, outputDir);
  generator.generate();
  return generator.writeFiles(options.verbose);
}
