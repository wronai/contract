"""
SDK TypeScript Generator - Generates TypeScript types, API client, and React hooks from ContractAI.

Port of: src/core/contract-ai/sdk/sdk-generator.ts (551 lines)

Features:
- TypeScript type definitions
- API client with CRUD methods
- React hooks for data fetching
- Zod validation schemas

@version 2.4.1
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel

from ..models import ContractAI, EntityDefinition, FieldDefinition


# ============================================================================
# TYPES
# ============================================================================

class SDKGeneratorOptions(BaseModel):
    """Options for SDK generation"""
    generate_hooks: bool = True
    generate_client: bool = True
    generate_zod_schemas: bool = True
    base_url: str = "http://localhost:3000"
    format: Literal["single-file", "multi-file"] = "multi-file"


class GeneratedSDK(BaseModel):
    """Generated SDK output"""
    types: str
    client: Optional[str] = None
    hooks: Optional[str] = None
    zod_schemas: Optional[str] = None
    files: Dict[str, str] = {}


# ============================================================================
# SDK GENERATOR
# ============================================================================

class SDKGenerator:
    """
    Generate TypeScript SDK from ContractAI specification.
    
    Generates:
    - types.ts: TypeScript interfaces for all entities
    - schemas.ts: Zod validation schemas
    - client.ts: API client with CRUD methods
    - hooks.ts: React hooks for data fetching
    - index.ts: Re-exports
    
    Example:
        generator = SDKGenerator(SDKGeneratorOptions(base_url="http://api.example.com"))
        sdk = generator.generate(contract)
        
        for filename, content in sdk.files.items():
            Path(f"sdk/{filename}").write_text(content)
    """
    
    def __init__(self, options: Optional[SDKGeneratorOptions] = None):
        self.options = options or SDKGeneratorOptions()
    
    def generate(self, contract: ContractAI) -> GeneratedSDK:
        """Generate complete SDK from contract"""
        files: Dict[str, str] = {}
        
        # Generate types
        types = self._generate_types(contract)
        files["types.ts"] = types
        
        # Generate Zod schemas
        zod_schemas: Optional[str] = None
        if self.options.generate_zod_schemas:
            zod_schemas = self._generate_zod_schemas(contract)
            files["schemas.ts"] = zod_schemas
        
        # Generate API client
        client: Optional[str] = None
        if self.options.generate_client:
            client = self._generate_client(contract)
            files["client.ts"] = client
        
        # Generate React hooks
        hooks: Optional[str] = None
        if self.options.generate_hooks:
            hooks = self._generate_hooks(contract)
            files["hooks.ts"] = hooks
        
        # Generate index file
        index = self._generate_index(contract)
        files["index.ts"] = index
        
        return GeneratedSDK(
            types=types,
            client=client,
            hooks=hooks,
            zod_schemas=zod_schemas,
            files=files
        )
    
    def _generate_types(self, contract: ContractAI) -> str:
        """Generate TypeScript type definitions"""
        lines = [
            "/**",
            f" * {contract.definition.app.name} - TypeScript Types",
            f" * Generated from Contract AI v{contract.definition.app.version}",
            " * ",
            " * DO NOT EDIT - This file is auto-generated from the contract.",
            " */",
            "",
        ]
        
        # Generate entity types
        for entity in contract.definition.entities:
            lines.extend(self._generate_entity_type(entity))
            lines.append("")
        
        # Generate input types
        for entity in contract.definition.entities:
            lines.extend(self._generate_input_types(entity))
            lines.append("")
        
        # Generate API response types
        lines.extend(self._generate_api_response_types(contract))
        
        return "\n".join(lines)
    
    def _generate_entity_type(self, entity: EntityDefinition) -> List[str]:
        """Generate type for a single entity"""
        lines = []
        
        if entity.description:
            lines.append(f"/** {entity.description} */")
        
        lines.append(f"export interface {entity.name} {{")
        
        for field in entity.fields:
            ts_type = self._field_type_to_ts(field)
            optional = "?" if field.annotations and field.annotations.required == False else ""
            comment = self._format_field_comment(field) if field.annotations else ""
            
            if comment:
                lines.append(f"  /** {comment} */")
            lines.append(f"  {field.name}{optional}: {ts_type};")
        
        lines.append("}")
        return lines
    
    def _generate_input_types(self, entity: EntityDefinition) -> List[str]:
        """Generate Create/Update input types"""
        lines = []
        
        # Create input (exclude generated fields)
        create_fields = [f for f in entity.fields 
                        if not (f.annotations and f.annotations.generated)]
        
        lines.append(f"/** Input for creating {entity.name} */")
        lines.append(f"export interface Create{entity.name}Input {{")
        
        for field in create_fields:
            ts_type = self._field_type_to_ts(field)
            optional = "?" if field.annotations and field.annotations.required == False else ""
            lines.append(f"  {field.name}{optional}: {ts_type};")
        
        lines.append("}")
        lines.append("")
        
        # Update input (all optional except id)
        lines.append(f"/** Input for updating {entity.name} */")
        lines.append(f"export interface Update{entity.name}Input {{")
        lines.append("  id: string;")
        
        for field in create_fields:
            if field.name != "id":
                ts_type = self._field_type_to_ts(field)
                lines.append(f"  {field.name}?: {ts_type};")
        
        lines.append("}")
        
        return lines
    
    def _generate_api_response_types(self, contract: ContractAI) -> List[str]:
        """Generate API response wrapper types"""
        lines = [
            "// API Response Types",
            "",
            "export interface ApiResponse<T> {",
            "  data: T;",
            "  success: boolean;",
            "  error?: string;",
            "}",
            "",
            "export interface PaginatedResponse<T> {",
            "  data: T[];",
            "  total: number;",
            "  page: number;",
            "  pageSize: number;",
            "  hasMore: boolean;",
            "}",
            "",
        ]
        
        for entity in contract.definition.entities:
            lines.append(f"export type {entity.name}ListResponse = PaginatedResponse<{entity.name}>;")
        
        return lines
    
    def _generate_zod_schemas(self, contract: ContractAI) -> str:
        """Generate Zod validation schemas"""
        lines = [
            "/**",
            f" * {contract.definition.app.name} - Zod Schemas",
            " * Generated from Contract AI",
            " */",
            "",
            "import { z } from 'zod';",
            "",
        ]
        
        for entity in contract.definition.entities:
            lines.extend(self._generate_entity_schema(entity))
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_entity_schema(self, entity: EntityDefinition) -> List[str]:
        """Generate Zod schema for entity"""
        lines = []
        schema_name = f"{entity.name[0].lower()}{entity.name[1:]}Schema"
        
        lines.append(f"export const {schema_name} = z.object({{")
        
        for field in entity.fields:
            zod_type = self._field_type_to_zod(field)
            lines.append(f"  {field.name}: {zod_type},")
        
        lines.append("});")
        lines.append("")
        lines.append(f"export type {entity.name}Validated = z.infer<typeof {schema_name}>;")
        
        # Create input schema
        create_fields = [f for f in entity.fields
                        if not (f.annotations and f.annotations.generated)]
        create_schema_name = f"create{entity.name}Schema"
        
        lines.append("")
        lines.append(f"export const {create_schema_name} = z.object({{")
        
        for field in create_fields:
            zod_type = self._field_type_to_zod(field)
            lines.append(f"  {field.name}: {zod_type},")
        
        lines.append("});")
        
        return lines
    
    def _generate_client(self, contract: ContractAI) -> str:
        """Generate API client"""
        lines = [
            "/**",
            f" * {contract.definition.app.name} - API Client",
            " * Generated from Contract AI",
            " */",
            "",
            "import type {",
        ]
        
        # Import types
        for entity in contract.definition.entities:
            lines.append(f"  {entity.name},")
            lines.append(f"  Create{entity.name}Input,")
            lines.append(f"  Update{entity.name}Input,")
        
        lines.append("  ApiResponse,")
        lines.append("  PaginatedResponse,")
        lines.append("} from './types';")
        lines.append("")
        
        # Client class
        lines.append("export class ApiClient {")
        lines.append("  private baseUrl: string;")
        lines.append("")
        lines.append(f"  constructor(baseUrl: string = '{self.options.base_url}') {{")
        lines.append("    this.baseUrl = baseUrl;")
        lines.append("  }")
        lines.append("")
        
        # Generic fetch method
        lines.extend([
            "  private async fetch<T>(",
            "    endpoint: string,",
            "    options: RequestInit = {}",
            "  ): Promise<ApiResponse<T>> {",
            "    try {",
            "      const response = await fetch(`${this.baseUrl}${endpoint}`, {",
            "        headers: { 'Content-Type': 'application/json', ...options.headers },",
            "        ...options,",
            "      });",
            "      const data = await response.json();",
            "      return { data, success: response.ok };",
            "    } catch (error) {",
            "      return { data: null as T, success: false, error: String(error) };",
            "    }",
            "  }",
            "",
        ])
        
        # CRUD methods for each entity
        for entity in contract.definition.entities:
            lines.extend(self._generate_entity_client_methods(entity))
        
        lines.append("}")
        lines.append("")
        lines.append("export const apiClient = new ApiClient();")
        
        return "\n".join(lines)
    
    def _generate_entity_client_methods(self, entity: EntityDefinition) -> List[str]:
        """Generate CRUD methods for entity"""
        lines = []
        name = entity.name
        plural = self._pluralize(name.lower())
        
        lines.append(f"  // {name} CRUD")
        lines.append("")
        
        # List
        lines.extend([
            f"  async list{name}s(page = 1, pageSize = 20): Promise<PaginatedResponse<{name}>> {{",
            f"    const response = await this.fetch<PaginatedResponse<{name}>>(",
            f"      `/api/{plural}?page=${{page}}&pageSize=${{pageSize}}`",
            "    );",
            "    return response.data;",
            "  }",
            "",
        ])
        
        # Get by ID
        lines.extend([
            f"  async get{name}(id: string): Promise<{name} | null> {{",
            f"    const response = await this.fetch<{name}>(`/api/{plural}/${{id}}`);",
            "    return response.success ? response.data : null;",
            "  }",
            "",
        ])
        
        # Create
        lines.extend([
            f"  async create{name}(input: Create{name}Input): Promise<{name} | null> {{",
            f"    const response = await this.fetch<{name}>(`/api/{plural}`, {{",
            "      method: 'POST',",
            "      body: JSON.stringify(input),",
            "    });",
            "    return response.success ? response.data : null;",
            "  }",
            "",
        ])
        
        # Update
        lines.extend([
            f"  async update{name}(input: Update{name}Input): Promise<{name} | null> {{",
            f"    const response = await this.fetch<{name}>(`/api/{plural}/${{input.id}}`, {{",
            "      method: 'PUT',",
            "      body: JSON.stringify(input),",
            "    });",
            "    return response.success ? response.data : null;",
            "  }",
            "",
        ])
        
        # Delete
        lines.extend([
            f"  async delete{name}(id: string): Promise<boolean> {{",
            f"    const response = await this.fetch<void>(`/api/{plural}/${{id}}`, {{",
            "      method: 'DELETE',",
            "    });",
            "    return response.success;",
            "  }",
            "",
        ])
        
        return lines
    
    def _generate_hooks(self, contract: ContractAI) -> str:
        """Generate React hooks"""
        lines = [
            "/**",
            f" * {contract.definition.app.name} - React Hooks",
            " * Generated from Contract AI",
            " */",
            "",
            "import { useState, useEffect, useCallback } from 'react';",
            "import { apiClient } from './client';",
            "import type {",
        ]
        
        for entity in contract.definition.entities:
            lines.append(f"  {entity.name},")
            lines.append(f"  Create{entity.name}Input,")
            lines.append(f"  Update{entity.name}Input,")
        
        lines.append("} from './types';")
        lines.append("")
        
        # Generate hooks for each entity
        for entity in contract.definition.entities:
            lines.extend(self._generate_entity_hooks(entity))
        
        return "\n".join(lines)
    
    def _generate_entity_hooks(self, entity: EntityDefinition) -> List[str]:
        """Generate React hooks for entity"""
        lines = []
        name = entity.name
        name_lower = name[0].lower() + name[1:]
        
        # useList hook
        lines.extend([
            f"// {name} Hooks",
            "",
            f"export function use{name}List(initialPage = 1) {{",
            f"  const [data, setData] = useState<{name}[]>([]);",
            "  const [loading, setLoading] = useState(true);",
            "  const [error, setError] = useState<string | null>(null);",
            "  const [page, setPage] = useState(initialPage);",
            "  const [total, setTotal] = useState(0);",
            "",
            "  const fetch = useCallback(async () => {",
            "    setLoading(true);",
            "    try {",
            f"      const result = await apiClient.list{name}s(page);",
            "      setData(result.data);",
            "      setTotal(result.total);",
            "      setError(null);",
            "    } catch (e) {",
            "      setError(String(e));",
            "    } finally {",
            "      setLoading(false);",
            "    }",
            "  }, [page]);",
            "",
            "  useEffect(() => { fetch(); }, [fetch]);",
            "",
            "  return { data, loading, error, page, setPage, total, refetch: fetch };",
            "}",
            "",
        ])
        
        # useItem hook
        lines.extend([
            f"export function use{name}(id: string | null) {{",
            f"  const [data, setData] = useState<{name} | null>(null);",
            "  const [loading, setLoading] = useState(false);",
            "  const [error, setError] = useState<string | null>(null);",
            "",
            "  useEffect(() => {",
            "    if (!id) return;",
            "    setLoading(true);",
            f"    apiClient.get{name}(id)",
            "      .then(setData)",
            "      .catch(e => setError(String(e)))",
            "      .finally(() => setLoading(false));",
            "  }, [id]);",
            "",
            "  return { data, loading, error };",
            "}",
            "",
        ])
        
        # useMutation hook
        lines.extend([
            f"export function use{name}Mutations() {{",
            "  const [loading, setLoading] = useState(false);",
            "  const [error, setError] = useState<string | null>(null);",
            "",
            f"  const create = async (input: Create{name}Input) => {{",
            "    setLoading(true);",
            "    try {",
            f"      const result = await apiClient.create{name}(input);",
            "      setError(null);",
            "      return result;",
            "    } catch (e) {",
            "      setError(String(e));",
            "      return null;",
            "    } finally {",
            "      setLoading(false);",
            "    }",
            "  };",
            "",
            f"  const update = async (input: Update{name}Input) => {{",
            "    setLoading(true);",
            "    try {",
            f"      const result = await apiClient.update{name}(input);",
            "      setError(null);",
            "      return result;",
            "    } catch (e) {",
            "      setError(String(e));",
            "      return null;",
            "    } finally {",
            "      setLoading(false);",
            "    }",
            "  };",
            "",
            "  const remove = async (id: string) => {",
            "    setLoading(true);",
            "    try {",
            f"      const result = await apiClient.delete{name}(id);",
            "      setError(null);",
            "      return result;",
            "    } catch (e) {",
            "      setError(String(e));",
            "      return false;",
            "    } finally {",
            "      setLoading(false);",
            "    }",
            "  };",
            "",
            "  return { create, update, remove, loading, error };",
            "}",
            "",
        ])
        
        return lines
    
    def _generate_index(self, contract: ContractAI) -> str:
        """Generate index file"""
        lines = [
            "/**",
            f" * {contract.definition.app.name} SDK",
            " * Generated from Contract AI",
            " */",
            "",
            "export * from './types';",
        ]
        
        if self.options.generate_zod_schemas:
            lines.append("export * from './schemas';")
        
        if self.options.generate_client:
            lines.append("export * from './client';")
        
        if self.options.generate_hooks:
            lines.append("export * from './hooks';")
        
        return "\n".join(lines)
    
    def _field_type_to_ts(self, field: FieldDefinition) -> str:
        """Map field type to TypeScript type"""
        type_map = {
            "string": "string",
            "number": "number",
            "integer": "number",
            "float": "number",
            "boolean": "boolean",
            "date": "Date",
            "datetime": "Date",
            "uuid": "string",
            "email": "string",
            "url": "string",
            "json": "Record<string, any>",
            "array": "any[]",
            "object": "Record<string, any>",
        }
        
        base_type = type_map.get(str(field.type), "any")
        
        # Handle array types
        if field.annotations and hasattr(field.annotations, "items"):
            item_type = type_map.get(field.annotations.items, "any")
            return f"{item_type}[]"
        
        return base_type
    
    def _field_type_to_zod(self, field: FieldDefinition) -> str:
        """Map field type to Zod schema"""
        type_map = {
            "string": "z.string()",
            "number": "z.number()",
            "integer": "z.number().int()",
            "float": "z.number()",
            "boolean": "z.boolean()",
            "date": "z.date()",
            "datetime": "z.date()",
            "uuid": "z.string().uuid()",
            "email": "z.string().email()",
            "url": "z.string().url()",
            "json": "z.record(z.any())",
            "array": "z.array(z.any())",
            "object": "z.record(z.any())",
        }
        
        base_type = type_map.get(str(field.type), "z.any()")
        
        # Handle optional
        if field.annotations and field.annotations.required == False:
            return f"{base_type}.optional()"
        
        return base_type
    
    def _format_field_comment(self, field: FieldDefinition) -> str:
        """Format field annotations as comment"""
        parts = []
        
        if field.annotations:
            if field.annotations.min is not None:
                parts.append(f"min: {field.annotations.min}")
            if field.annotations.max is not None:
                parts.append(f"max: {field.annotations.max}")
            if field.annotations.pattern:
                parts.append(f"pattern: {field.annotations.pattern}")
            if field.annotations.unique:
                parts.append("unique")
            if field.annotations.generated:
                parts.append("auto-generated")
        
        return ", ".join(parts)
    
    def _pluralize(self, word: str) -> str:
        """Simple pluralization"""
        if word.endswith("y"):
            return word[:-1] + "ies"
        elif word.endswith(("s", "x", "z", "ch", "sh")):
            return word + "es"
        else:
            return word + "s"
