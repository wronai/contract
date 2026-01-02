"""
Code Generator

Generates application code from ContractAI using LLM.

Mirrors: src/core/contract-ai/code-generator/llm-generator.ts
@version 2.2.0
"""

import json
import re
import time
from pathlib import Path
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from ..llm import LLMProvider, GenerateOptions


# ============================================================================
# TYPES
# ============================================================================

class GeneratedFile(BaseModel):
    """A generated file"""
    path: str
    content: str
    language: str = "typescript"


class CodeGeneratorOptions(BaseModel):
    """Code generator options"""
    output_dir: str = Field(default="./generated", alias="outputDir")
    temperature: float = 0.7
    max_tokens: int = Field(default=4096, alias="maxTokens")
    verbose: bool = False
    dry_run: bool = Field(default=False, alias="dryRun")
    
    model_config = {"populate_by_name": True}


class CodeGenerationResult(BaseModel):
    """Result of code generation"""
    success: bool
    files: list[GeneratedFile] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    tokens_used: int = Field(default=0, alias="tokensUsed")
    time_ms: int = Field(default=0, alias="timeMs")
    
    model_config = {"populate_by_name": True}


# ============================================================================
# CODE GENERATOR
# ============================================================================

class CodeGenerator:
    """
    Code generator using LLM.
    
    Generates application code from ContractAI specification.
    
    Example:
        generator = CodeGenerator(verbose=True)
        generator.set_llm_client(ollama_client)
        
        result = await generator.generate(contract, output_dir="./my-app")
        if result.success:
            print(f"Generated {len(result.files)} files")
    """
    
    def __init__(self, options: Optional[CodeGeneratorOptions] = None):
        self.options = options or CodeGeneratorOptions()
        self._llm_client: Optional[LLMProvider] = None
    
    def set_llm_client(self, client: LLMProvider) -> None:
        """Set the LLM client for generation"""
        self._llm_client = client
    
    async def generate(
        self,
        contract: dict[str, Any],
        output_dir: Optional[str] = None
    ) -> CodeGenerationResult:
        """
        Generate application code from contract.
        
        Args:
            contract: ContractAI specification
            output_dir: Output directory (overrides options)
            
        Returns:
            CodeGenerationResult with generated files
        """
        start_time = time.time()
        tokens_used = 0
        files: list[GeneratedFile] = []
        errors: list[str] = []
        
        target_dir = output_dir or self.options.output_dir
        
        if self.options.verbose:
            print(f"\n🔨 Generating code to {target_dir}")
        
        try:
            # Extract info from contract
            definition = contract.get("definition", {})
            generation = contract.get("generation", {})
            app = definition.get("app", {})
            entities = definition.get("entities", [])
            api = definition.get("api", {})
            tech_stack = generation.get("techStack", {})
            backend = tech_stack.get("backend", {})
            
            app_name = app.get("name", "app")
            
            # Generate files based on tech stack
            language = backend.get("language", "typescript")
            framework = backend.get("framework", "express")
            
            if self.options.verbose:
                print(f"   Framework: {framework} ({language})")
                print(f"   Entities: {len(entities)}")
            
            # Try LLM generation first if client is available
            if self._llm_client:
                if self.options.verbose:
                    print(f"   🤖 Using LLM for code generation...")
                
                llm_result = await self._generate_with_llm(contract, target_dir)
                if llm_result.success and llm_result.files:
                    if self.options.verbose:
                        print(f"   ✅ LLM generated {len(llm_result.files)} files")
                    return llm_result
                elif self.options.verbose:
                    print(f"   ⚠️ LLM generation failed, using templates")
            
            # Generate package.json
            package_json = self._generate_package_json(app_name, backend)
            files.append(GeneratedFile(
                path="package.json",
                content=package_json,
                language="json"
            ))
            
            # Generate index.ts (entry point)
            index_file = await self._generate_index_file(contract, backend)
            tokens_used += self._estimate_tokens(index_file)
            files.append(GeneratedFile(
                path="src/index.ts" if language == "typescript" else "src/index.js",
                content=index_file,
                language=language
            ))
            
            # Generate entity models
            for entity in entities:
                entity_name = entity.get("name", "Entity")
                model_file = self._generate_entity_model(entity, language)
                files.append(GeneratedFile(
                    path=f"src/models/{entity_name.lower()}.ts",
                    content=model_file,
                    language=language
                ))
            
            # Generate routes
            for entity in entities:
                entity_name = entity.get("name", "Entity")
                route_file = await self._generate_route_file(entity, api, backend)
                tokens_used += self._estimate_tokens(route_file)
                files.append(GeneratedFile(
                    path=f"src/routes/{entity_name.lower()}.ts",
                    content=route_file,
                    language=language
                ))
            
            # Generate tsconfig if TypeScript
            if language == "typescript":
                tsconfig = self._generate_tsconfig()
                files.append(GeneratedFile(
                    path="tsconfig.json",
                    content=tsconfig,
                    language="json"
                ))
            
            # Write files if not dry run
            if not self.options.dry_run:
                self._write_files(files, target_dir)
            
            time_ms = int((time.time() - start_time) * 1000)
            
            if self.options.verbose:
                print(f"✅ Generated {len(files)} files in {time_ms}ms")
            
            return CodeGenerationResult(
                success=True,
                files=files,
                errors=[],
                tokens_used=tokens_used,
                time_ms=time_ms
            )
            
        except Exception as e:
            errors.append(str(e))
            time_ms = int((time.time() - start_time) * 1000)
            
            if self.options.verbose:
                print(f"❌ Error: {e}")
            
            return CodeGenerationResult(
                success=False,
                files=files,
                errors=errors,
                tokens_used=tokens_used,
                time_ms=time_ms
            )
    
    def _generate_package_json(self, app_name: str, backend: dict) -> str:
        """Generate package.json"""
        port = backend.get("port", 3000)
        
        package = {
            "name": app_name.lower().replace(" ", "-"),
            "version": "1.0.0",
            "main": "dist/index.js",
            "scripts": {
                "build": "tsc",
                "start": "node dist/index.js",
                "dev": "ts-node src/index.ts"
            },
            "dependencies": {
                "express": "^4.18.2",
                "cors": "^2.8.5",
                "uuid": "^9.0.0"
            },
            "devDependencies": {
                "typescript": "^5.0.0",
                "@types/express": "^4.17.17",
                "@types/cors": "^2.8.13",
                "@types/uuid": "^9.0.0",
                "ts-node": "^10.9.1"
            }
        }
        
        return json.dumps(package, indent=2)
    
    async def _generate_index_file(self, contract: dict, backend: dict) -> str:
        """Generate main index file"""
        port = backend.get("port", 3000)
        entities = contract.get("definition", {}).get("entities", [])
        
        imports = ["import express from 'express';", "import cors from 'cors';"]
        route_imports = []
        route_uses = []
        
        for entity in entities:
            name = entity.get("name", "Entity")
            lower_name = name.lower()
            route_imports.append(f"import {{ {lower_name}Router }} from './routes/{lower_name}';")
            route_uses.append(f"app.use('/api/{lower_name}s', {lower_name}Router);")
        
        return f"""{chr(10).join(imports)}
{chr(10).join(route_imports)}

const app = express();
const PORT = process.env.PORT || {port};

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {{
  res.json({{ status: 'ok', timestamp: new Date().toISOString() }});
}});

// Routes
{chr(10).join(route_uses)}

app.listen(PORT, () => {{
  console.log(`Server running on http://localhost:${{PORT}}`);
}});

export default app;
"""
    
    def _generate_entity_model(self, entity: dict, language: str) -> str:
        """Generate entity model file"""
        name = entity.get("name", "Entity")
        fields = entity.get("fields", [])
        
        # Generate interface
        field_lines = []
        for field in fields:
            field_name = field.get("name", "field")
            field_type = self._map_field_type(field.get("type", "String"))
            required = field.get("annotations", {}).get("required", False)
            optional = "?" if not required else ""
            field_lines.append(f"  {field_name}{optional}: {field_type};")
        
        return f"""export interface {name} {{
{chr(10).join(field_lines)}
}}

export type Create{name}Input = Omit<{name}, 'id' | 'createdAt' | 'updatedAt'>;
export type Update{name}Input = Partial<Create{name}Input>;
"""
    
    async def _generate_route_file(self, entity: dict, api: dict, backend: dict) -> str:
        """Generate route file for entity"""
        name = entity.get("name", "Entity")
        lower_name = name.lower()
        
        return f"""import {{ Router }} from 'express';
import {{ v4 as uuidv4 }} from 'uuid';
import {{ {name}, Create{name}Input }} from '../models/{lower_name}';

export const {lower_name}Router = Router();

// In-memory storage
const {lower_name}s: Map<string, {name}> = new Map();

// GET all
{lower_name}Router.get('/', (req, res) => {{
  res.json(Array.from({lower_name}s.values()));
}});

// GET by ID
{lower_name}Router.get('/:id', (req, res) => {{
  const item = {lower_name}s.get(req.params.id);
  if (!item) {{
    return res.status(404).json({{ error: '{name} not found' }});
  }}
  res.json(item);
}});

// POST create
{lower_name}Router.post('/', (req, res) => {{
  const input: Create{name}Input = req.body;
  const item: {name} = {{
    ...input,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }};
  {lower_name}s.set(item.id, item);
  res.status(201).json(item);
}});

// PUT update
{lower_name}Router.put('/:id', (req, res) => {{
  const item = {lower_name}s.get(req.params.id);
  if (!item) {{
    return res.status(404).json({{ error: '{name} not found' }});
  }}
  const updated: {name} = {{
    ...item,
    ...req.body,
    id: item.id,
    updatedAt: new Date(),
  }};
  {lower_name}s.set(item.id, updated);
  res.json(updated);
}});

// DELETE
{lower_name}Router.delete('/:id', (req, res) => {{
  if (!{lower_name}s.has(req.params.id)) {{
    return res.status(404).json({{ error: '{name} not found' }});
  }}
  {lower_name}s.delete(req.params.id);
  res.status(204).send();
}});
"""
    
    def _generate_tsconfig(self) -> str:
        """Generate tsconfig.json"""
        config = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "commonjs",
                "lib": ["ES2020"],
                "outDir": "./dist",
                "rootDir": "./src",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True,
                "resolveJsonModule": True
            },
            "include": ["src/**/*"],
            "exclude": ["node_modules", "dist"]
        }
        return json.dumps(config, indent=2)
    
    def _map_field_type(self, contract_type: str) -> str:
        """Map contract field type to TypeScript type"""
        type_map = {
            "String": "string",
            "Text": "string",
            "Int": "number",
            "Float": "number",
            "Boolean": "boolean",
            "UUID": "string",
            "DateTime": "Date",
            "Email": "string",
            "URL": "string",
            "JSON": "Record<string, unknown>",
        }
        return type_map.get(contract_type, "string")
    
    def _write_files(self, files: list[GeneratedFile], output_dir: str) -> None:
        """Write generated files to disk"""
        base_path = Path(output_dir)
        
        for file in files:
            file_path = base_path / file.path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(file.content)
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count"""
        return len(text) // 4
    
    async def _generate_with_llm(
        self,
        contract: dict[str, Any],
        output_dir: str
    ) -> CodeGenerationResult:
        """Generate code using LLM"""
        start_time = time.time()
        files: list[GeneratedFile] = []
        errors: list[str] = []
        tokens_used = 0
        
        try:
            # Build the prompt
            prompt = self._build_llm_prompt(contract)
            
            # Call LLM
            response = await self._llm_client.generate(GenerateOptions(
                system=self._get_system_prompt(),
                user=prompt,
                temperature=self.options.temperature,
                max_tokens=self.options.max_tokens
            ))
            
            # LLMResponse has content, not success flag
            if not response.content:
                return CodeGenerationResult(
                    success=False,
                    files=[],
                    errors=["LLM returned empty response"],
                    tokens_used=0,
                    time_ms=int((time.time() - start_time) * 1000)
                )
            
            tokens_used = response.tokens_used
            
            # Parse LLM response to extract files
            files = self._parse_llm_response(response.content)
            
            if not files:
                return CodeGenerationResult(
                    success=False,
                    files=[],
                    errors=["No files parsed from LLM response"],
                    tokens_used=tokens_used,
                    time_ms=int((time.time() - start_time) * 1000)
                )
            
            # Write files if not dry run
            if not self.options.dry_run:
                self._write_files(files, output_dir)
            
            return CodeGenerationResult(
                success=True,
                files=files,
                errors=[],
                tokens_used=tokens_used,
                time_ms=int((time.time() - start_time) * 1000)
            )
            
        except Exception as e:
            return CodeGenerationResult(
                success=False,
                files=[],
                errors=[str(e)],
                tokens_used=tokens_used,
                time_ms=int((time.time() - start_time) * 1000)
            )
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for LLM code generation"""
        return """You are an expert Node.js/Express developer specializing in TypeScript.
Your task is to generate production-ready API code based on the Contract AI specification.

## Key Requirements:

1. **TypeScript First**: All code must be properly typed. No "any" types except in error handlers.

2. **Error Handling**: Every route must have try-catch blocks with appropriate HTTP status codes:
   - 200: Success (GET, PUT)
   - 201: Created (POST)
   - 204: No Content (DELETE)
   - 400: Bad Request (validation errors)
   - 404: Not Found
   - 500: Internal Server Error

3. **Validation**: Validate all inputs before processing.

4. **Code Style**:
   - Use async/await, not callbacks
   - Use const for variables that don't change
   - Use meaningful variable names
   - Add minimal but useful comments

5. **File Structure**:
   - server.ts: Main entry point with Express setup
   - Each file should be complete and runnable

## OUTPUT FORMAT

Generate complete TypeScript code files. Each file MUST be in this EXACT format:

```typescript:api/src/server.ts
// code here
```

```json:api/package.json
{...}
```

```json:api/tsconfig.json
{...}
```

IMPORTANT: Use the exact format ```language:path/to/file.ext for each file block."""
    
    def _build_llm_prompt(self, contract: dict[str, Any]) -> str:
        """Build prompt for LLM code generation"""
        definition = contract.get("definition", {})
        generation = contract.get("generation", {})
        app = definition.get("app", {})
        entities = definition.get("entities", [])
        tech_stack = generation.get("techStack", {})
        backend = tech_stack.get("backend", {})
        
        entities_str = ""
        for entity in entities:
            name = entity.get("name", "Entity")
            fields = entity.get("fields", [])
            fields_str = "\n".join([
                f"  - {f.get('name')}: {f.get('type')}"
                for f in fields
            ])
            entities_str += f"\n### {name}\n{fields_str}\n"
        
        return f"""# CODE GENERATION TASK: API

## APPLICATION
Name: {app.get('name', 'App')}
Version: {app.get('version', '1.0.0')}
Description: {app.get('description', 'Generated API')}

## TECH STACK
Framework: {backend.get('framework', 'express')}
Language: {backend.get('language', 'typescript')}
Runtime: {backend.get('runtime', 'node')}
Port: {backend.get('port', 3000)}

## ENTITIES
{entities_str}

## REQUIRED FILES

Generate these files:
- api/src/server.ts - Main Express server with all CRUD routes
- api/package.json - NPM package file with dependencies
- api/tsconfig.json - TypeScript configuration

## REQUIREMENTS

1. Create a complete Express.js REST API
2. Include CRUD endpoints for all entities (GET list, GET by id, POST, PUT, DELETE)
3. Use in-memory Map for storage
4. Include /health endpoint
5. Use cors middleware
6. Port should be {backend.get('port', 3000)}
7. API prefix should be /api/v1

Generate ALL files listed above. Each file must be complete and runnable."""
    
    def _parse_llm_response(self, content: str) -> list[GeneratedFile]:
        """Parse LLM response to extract generated files"""
        files = []
        
        # Pattern to match ```language:path or ```language path/to/file
        patterns = [
            r'```(\w+):([^\n]+)\n(.*?)```',  # ```ts:path/file.ts
            r'```(\w+)\s+([^\n]+)\n(.*?)```',  # ```typescript path/file.ts
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.DOTALL)
            for lang, path, code in matches:
                path = path.strip()
                code = code.strip()
                
                # Skip if path looks like a comment or invalid
                if not path or path.startswith('//') or len(path) > 100:
                    continue
                
                # Normalize language
                lang_map = {"ts": "typescript", "js": "javascript", "tsx": "typescript"}
                language = lang_map.get(lang.lower(), lang.lower())
                
                files.append(GeneratedFile(
                    path=path,
                    content=code,
                    language=language
                ))
        
        return files
