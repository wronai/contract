/**
 * Evolution Module - Index
 * 
 * Exports for the evolution management system.
 * 
 * @version 2.5.0
 */

export * from './evolution-manager';
export * from './task-executor';
export * from './shell-renderer';
export * from './code-rag';
export * from './task-queue';
export * from './git-analyzer';
export * from './state-analyzer';
export * from './test-generator';
export * from './doc-generator';
export { ServiceManager } from './service-manager';
export type { ServiceStatus as ManagedServiceStatus, ServiceManagerOptions, LogCallback } from './service-manager';
export * from './llm-prompts';
export * from './fallback-templates';
