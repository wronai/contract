/**
 * Git Analyzer
 * 
 * Analyzes Git repositories for state, tech stack detection, and contract generation.
 * 
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ContractAI } from '../types';
import { LLMClient } from '../generator/contract-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface GitState {
  isGitRepo: boolean;
  branch: string;
  lastCommit: { hash: string; message: string; date: string } | null;
  status: { modified: string[]; untracked: string[]; staged: string[] };
  remotes: string[];
  recentCommits: Array<{ hash: string; message: string; date: string }>;
  fileStructure: { path: string; type: 'file' | 'dir' }[];
  detectedStack: { language: string; framework: string; dependencies: string[] };
}

// ============================================================================
// GIT ANALYZER CLASS
// ============================================================================

export class GitAnalyzer {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  isGitRepo(): boolean {
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: this.cwd, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  getBranch(): string {
    try {
      return execSync('git branch --show-current', { cwd: this.cwd, encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getLastCommit(): { hash: string; message: string; date: string } | null {
    try {
      const log = execSync('git log -1 --format="%H|%s|%ci"', { cwd: this.cwd, encoding: 'utf-8' }).trim();
      const [hash, message, date] = log.split('|');
      return { hash: hash.substring(0, 8), message, date };
    } catch {
      return null;
    }
  }

  getRecentCommits(count = 5): Array<{ hash: string; message: string; date: string }> {
    try {
      const log = execSync(`git log -${count} --format="%H|%s|%ci"`, { cwd: this.cwd, encoding: 'utf-8' }).trim();
      return log.split('\n').filter(Boolean).map(line => {
        const [hash, message, date] = line.split('|');
        return { hash: hash.substring(0, 8), message, date };
      });
    } catch {
      return [];
    }
  }

  getStatus(): { modified: string[]; untracked: string[]; staged: string[] } {
    try {
      const status = execSync('git status --porcelain', { cwd: this.cwd, encoding: 'utf-8' });
      const modified: string[] = [];
      const untracked: string[] = [];
      const staged: string[] = [];

      for (const line of status.split('\n').filter(Boolean)) {
        const code = line.substring(0, 2);
        const file = line.substring(3);
        if (code.includes('M')) modified.push(file);
        if (code === '??') untracked.push(file);
        if (code[0] !== ' ' && code[0] !== '?') staged.push(file);
      }

      return { modified, untracked, staged };
    } catch {
      return { modified: [], untracked: [], staged: [] };
    }
  }

  getRemotes(): string[] {
    try {
      const remotes = execSync('git remote -v', { cwd: this.cwd, encoding: 'utf-8' });
      const urls = new Set<string>();
      for (const line of remotes.split('\n').filter(Boolean)) {
        const match = line.match(/\t(.+?)\s/);
        if (match) urls.add(match[1]);
      }
      return Array.from(urls);
    } catch {
      return [];
    }
  }

  getFileStructure(): { path: string; type: 'file' | 'dir' }[] {
    try {
      const files = execSync('git ls-files', { cwd: this.cwd, encoding: 'utf-8' });
      const structure: { path: string; type: 'file' | 'dir' }[] = [];
      const dirs = new Set<string>();

      for (const file of files.split('\n').filter(Boolean)) {
        structure.push({ path: file, type: 'file' });
        const parts = file.split('/');
        for (let i = 1; i < parts.length; i++) {
          const dir = parts.slice(0, i).join('/');
          if (!dirs.has(dir)) {
            dirs.add(dir);
            structure.push({ path: dir, type: 'dir' });
          }
        }
      }

      return structure.sort((a, b) => a.path.localeCompare(b.path));
    } catch {
      return [];
    }
  }

  detectStack(): { language: string; framework: string; dependencies: string[] } {
    const result = { language: 'unknown', framework: 'unknown', dependencies: [] as string[] };

    try {
      const files = execSync('git ls-files', { cwd: this.cwd, encoding: 'utf-8' }).split('\n');

      if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) result.language = 'typescript';
      else if (files.some(f => f.endsWith('.js') || f.endsWith('.jsx'))) result.language = 'javascript';
      else if (files.some(f => f.endsWith('.py'))) result.language = 'python';
      else if (files.some(f => f.endsWith('.go'))) result.language = 'go';
      else if (files.some(f => f.endsWith('.rs'))) result.language = 'rust';

      const pkgPath = path.join(this.cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        result.dependencies = Object.keys(deps);

        if (deps['next']) result.framework = 'nextjs';
        else if (deps['react']) result.framework = 'react';
        else if (deps['vue']) result.framework = 'vue';
        else if (deps['express']) result.framework = 'express';
        else if (deps['fastify']) result.framework = 'fastify';
        else if (deps['nestjs'] || deps['@nestjs/core']) result.framework = 'nestjs';
      }

      const reqPath = path.join(this.cwd, 'requirements.txt');
      if (fs.existsSync(reqPath)) {
        const reqs = fs.readFileSync(reqPath, 'utf-8').split('\n');
        result.dependencies = reqs.filter(Boolean).map(r => r.split('==')[0]);
        if (reqs.some(r => r.includes('django'))) result.framework = 'django';
        else if (reqs.some(r => r.includes('flask'))) result.framework = 'flask';
        else if (reqs.some(r => r.includes('fastapi'))) result.framework = 'fastapi';
      }
    } catch {
      // Ignore errors
    }

    return result;
  }

  getFullState(): GitState {
    return {
      isGitRepo: this.isGitRepo(),
      branch: this.getBranch(),
      lastCommit: this.getLastCommit(),
      status: this.getStatus(),
      remotes: this.getRemotes(),
      recentCommits: this.getRecentCommits(),
      fileStructure: this.getFileStructure(),
      detectedStack: this.detectStack()
    };
  }

  async generateContractFromCode(llmClient?: LLMClient): Promise<ContractAI | null> {
    if (!this.isGitRepo()) return null;

    const state = this.getFullState();
    const stack = state.detectedStack;

    const keyFiles: { path: string; content: string }[] = [];
    const interestingFiles = state.fileStructure
      .filter(f => f.type === 'file')
      .filter(f => 
        f.path.endsWith('.ts') || 
        f.path.endsWith('.js') || 
        f.path.includes('server') ||
        f.path.includes('model') ||
        f.path.includes('schema') ||
        f.path === 'package.json'
      )
      .slice(0, 10);

    for (const file of interestingFiles) {
      try {
        const content = fs.readFileSync(path.join(this.cwd, file.path), 'utf-8');
        keyFiles.push({ path: file.path, content: content.substring(0, 2000) });
      } catch {
        // Skip unreadable files
      }
    }

    if (llmClient && keyFiles.length > 0) {
      const prompt = `Analyze this existing codebase and generate a ContractAI JSON.

Tech Stack:
- Language: ${stack.language}
- Framework: ${stack.framework}
- Dependencies: ${stack.dependencies.slice(0, 20).join(', ')}

Key Files:
${keyFiles.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}

Generate a ContractAI with:
1. entities - data models found in the code
2. generation.instructions - what layers exist and their status

Output ONLY valid JSON matching ContractAI schema.`;

      try {
        const response = await llmClient.generate({
          system: 'You analyze codebases and generate ContractAI specifications. Output only valid JSON.',
          user: prompt,
          temperature: 0.2,
          maxTokens: 4000
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ContractAI;
        }
      } catch {
        // Fall through to basic contract
      }
    }

    return {
      definition: {
        app: {
          name: path.basename(this.cwd),
          version: '1.0.0',
          description: `Imported from existing ${stack.framework} project`
        },
        entities: [],
        events: [],
        api: {
          version: 'v1',
          prefix: '/api/v1',
          resources: []
        }
      },
      generation: {
        instructions: [
          {
            target: 'api',
            priority: 'must',
            instruction: `Existing ${stack.framework} API detected`
          }
        ],
        patterns: [],
        constraints: [],
        techStack: {
          backend: { framework: 'express', language: 'typescript', runtime: 'node', port: 3000 },
          database: { type: 'in-memory' }
        }
      },
      validation: {
        assertions: [],
        tests: [],
        staticRules: [],
        qualityGates: [],
        acceptance: {
          testsPass: true,
          minCoverage: 0,
          maxLintErrors: 0,
          maxResponseTime: 1000,
          securityChecks: [],
          custom: []
        }
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'imported'
      }
    };
  }
}

export default GitAnalyzer;
