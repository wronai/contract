/**
 * LLM Module
 * 
 * Multi-provider LLM support with:
 * - Local: Ollama
 * - Remote: LiteLLM, OpenRouter, Windsurf Free Models
 * - Context-based generation
 * 
 * @version 2.4.1
 */

export * from './ollama-client';
export * from './pydantic-validator';

// New multi-provider architecture
export * from './llm-provider';
export * from './llm-manager';
export * from './llm-config';
export * from './context-generator';
export * from './parallel-executor';
