/**
 * Generator Utilities
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function writeFile(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf-8');
}

export function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

export function parseJson<T>(content: string): T {
  return JSON.parse(content) as T;
}
