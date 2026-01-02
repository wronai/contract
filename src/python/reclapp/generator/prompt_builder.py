"""
Prompt Builder

Builds prompts for LLM-based code generation.

Mirrors: src/core/contract-ai/generator/prompt-builder.ts
@version 2.2.0
"""

from typing import Any, Optional

from pydantic import BaseModel


class PromptTemplate(BaseModel):
    """Prompt template definition"""
    name: str
    system: str
    user: str
    variables: list[str] = []


class PromptBuilder:
    """
    Builds prompts for LLM generation.
    
    Example:
        builder = PromptBuilder()
        prompt = builder.build_contract_prompt("Create a todo app")
    """
    
    def __init__(self):
        self._templates: dict[str, PromptTemplate] = {}
        self._register_default_templates()
    
    def _register_default_templates(self) -> None:
        """Register default prompt templates"""
        self._templates["contract"] = PromptTemplate(
            name="contract",
            system="""You are a Contract AI generator. Generate a valid ContractAI JSON structure.

The ContractAI has 3 layers:
1. definition - WHAT to implement (app, entities, api)
2. generation - HOW to generate (instructions, techStack)
3. validation - HOW to verify (assertions, tests)

Always include:
- App name and version
- At least one entity with id, createdAt fields
- CRUD API endpoints for each entity
- Express.js with TypeScript backend

Respond ONLY with valid JSON.""",
            user="Generate a ContractAI for: {prompt}",
            variables=["prompt"]
        )
        
        self._templates["code"] = PromptTemplate(
            name="code",
            system="""You are a code generator. Generate clean, production-ready code.

Follow these rules:
- Use TypeScript with strict mode
- Include proper error handling
- Add JSDoc comments
- Follow REST best practices

Respond with code only, no explanations.""",
            user="Generate {file_type} code for:\n{context}",
            variables=["file_type", "context"]
        )
        
        self._templates["fix"] = PromptTemplate(
            name="fix",
            system="""You are a code fixer. Fix the provided code based on the errors.

Rules:
- Preserve the overall structure
- Fix only the reported errors
- Don't add unnecessary changes

Respond with fixed code only.""",
            user="Fix this code:\n```\n{code}\n```\n\nErrors:\n{errors}",
            variables=["code", "errors"]
        )
    
    def register_template(self, template: PromptTemplate) -> None:
        """Register a custom template"""
        self._templates[template.name] = template
    
    def get_template(self, name: str) -> Optional[PromptTemplate]:
        """Get a template by name"""
        return self._templates.get(name)
    
    def build_contract_prompt(self, user_prompt: str) -> dict[str, str]:
        """Build prompt for contract generation"""
        template = self._templates["contract"]
        return {
            "system": template.system,
            "user": template.user.format(prompt=user_prompt)
        }
    
    def build_code_prompt(
        self,
        file_type: str,
        context: str
    ) -> dict[str, str]:
        """Build prompt for code generation"""
        template = self._templates["code"]
        return {
            "system": template.system,
            "user": template.user.format(file_type=file_type, context=context)
        }
    
    def build_fix_prompt(
        self,
        code: str,
        errors: list[str]
    ) -> dict[str, str]:
        """Build prompt for code fixing"""
        template = self._templates["fix"]
        error_list = "\n".join(f"- {e}" for e in errors)
        return {
            "system": template.system,
            "user": template.user.format(code=code, errors=error_list)
        }
    
    def build_from_template(
        self,
        template_name: str,
        variables: dict[str, Any]
    ) -> dict[str, str]:
        """Build prompt from named template with variables"""
        template = self._templates.get(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found")
        
        return {
            "system": template.system,
            "user": template.user.format(**variables)
        }
