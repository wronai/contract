/**
 * Shared Type Mappers for Code Generation
 *
 * Unified type mapping functions used by both Generator (DSL AST) and
 * ContractGenerator (ReclappContract). All lookups are normalized to lowercase.
 *
 * @version 2.4.1 - Extracted from generator.ts / contract-generator.ts (R05)
 */

// ---------------------------------------------------------------------------
// Internal lookup tables (lowercase keys)
// ---------------------------------------------------------------------------

const TS_TYPE_MAP: Record<string, string> = {
  string: 'string',
  text: 'string',
  int: 'number',
  integer: 'number',
  float: 'number',
  number: 'number',
  decimal: 'number',
  money: 'number',
  boolean: 'boolean',
  bool: 'boolean',
  date: 'string',
  datetime: 'string',
  timestamp: 'string',
  uuid: 'string',
  json: 'Record<string, any>',
  email: 'string',
  url: 'string',
};

const SQL_TYPE_MAP: Record<string, string> = {
  string: 'TEXT',
  text: 'TEXT',
  int: 'INTEGER',
  integer: 'INTEGER',
  float: 'DOUBLE PRECISION',
  number: 'NUMERIC',
  decimal: 'DECIMAL(10,2)',
  money: 'DECIMAL(12,2)',
  boolean: 'BOOLEAN',
  bool: 'BOOLEAN',
  date: 'DATE',
  datetime: 'TIMESTAMPTZ',
  timestamp: 'TIMESTAMPTZ',
  uuid: 'UUID',
  json: 'JSONB',
  email: 'VARCHAR(255)',
  url: 'TEXT',
};

const MONGOOSE_TYPE_MAP: Record<string, string> = {
  string: 'String',
  text: 'String',
  int: 'Number',
  integer: 'Number',
  float: 'Number',
  number: 'Number',
  decimal: 'Number',
  money: 'Number',
  boolean: 'Boolean',
  bool: 'Boolean',
  date: 'Date',
  datetime: 'Date',
  timestamp: 'Date',
  uuid: 'String',
  json: 'Object',
  email: 'String',
  url: 'String',
};

const ZOD_TYPE_MAP: Record<string, string> = {
  string: 'z.string()',
  text: 'z.string()',
  int: 'z.number().int()',
  integer: 'z.number().int()',
  float: 'z.number()',
  number: 'z.number()',
  decimal: 'z.number()',
  money: 'z.number()',
  boolean: 'z.boolean()',
  bool: 'z.boolean()',
  date: 'z.string()',
  datetime: 'z.string().datetime()',
  timestamp: 'z.string().datetime()',
  uuid: 'z.string().uuid()',
  json: 'z.unknown()',
  email: 'z.string().email()',
  url: 'z.string().url()',
};

const INPUT_TYPE_MAP: Record<string, string> = {
  string: 'text',
  text: 'text',
  int: 'number',
  integer: 'number',
  float: 'number',
  number: 'number',
  decimal: 'number',
  money: 'number',
  boolean: 'checkbox',
  bool: 'checkbox',
  date: 'date',
  datetime: 'datetime-local',
  timestamp: 'datetime-local',
  email: 'email',
  url: 'url',
};

// ---------------------------------------------------------------------------
// Public API — all accept raw type string (any casing) and normalize internally
// ---------------------------------------------------------------------------

/** Normalize a type identifier to lowercase lookup key */
function norm(type: string): string {
  return (type || '').trim().toLowerCase();
}

export function fieldTypeToTs(type: string, isArray = false): string {
  const tsType = TS_TYPE_MAP[norm(type)] || 'any';
  return isArray ? `${tsType}[]` : tsType;
}

export function fieldTypeToSql(type: string): string {
  return SQL_TYPE_MAP[norm(type)] || 'TEXT';
}

export function fieldTypeToMongoose(type: string): string {
  return MONGOOSE_TYPE_MAP[norm(type)] || 'String';
}

export function fieldTypeToZod(type: string, isArray = false): string {
  const zodType = ZOD_TYPE_MAP[norm(type)] || 'z.unknown()';
  return isArray ? `z.array(${zodType})` : zodType;
}

export function getInputType(type: string): string {
  return INPUT_TYPE_MAP[norm(type)] || 'text';
}

export function isSystemFieldName(name: string): boolean {
  return name === 'id' || name === 'createdAt' || name === 'updatedAt';
}

export function sqlDefault(value: any, _type: string): string {
  if (typeof value === 'string') return `'${value}'`;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}
