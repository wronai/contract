/**
 * Reclapp Generator - Generate Applications from DSL Contracts
 * =============================================================
 * 
 * Generates full-stack applications from .reclapp DSL files including:
 * - API server (Express/Fastify)
 * - Frontend dashboard (React)
 * - Database schemas (PostgreSQL/MongoDB)
 * - Docker configuration
 * - Kubernetes manifests
 * - CI/CD pipelines
 * 
 * Usage:
 *   import { Generator } from './generator';
 *   const gen = new Generator(ast);
 *   await gen.generate({ target: 'full-stack', output: './dist' });
 */

export { Generator, GeneratorOptions, GeneratorResult } from './core/generator';
export { SimpleGenerator, generateFromContract, GeneratedFile } from './core/simple-generator';
export { ApiGenerator } from './targets/api';
export { FrontendGenerator } from './targets/frontend';
export { DockerGenerator } from './targets/docker';
export { KubernetesGenerator } from './targets/kubernetes';
export { DatabaseGenerator } from './targets/database';
export { CiCdGenerator } from './targets/cicd';

export * from './templates';
export * from './utils';
