"""
Contract AI - Layer 2: Generation Types (HOW)

Defines HOW LLM should generate code - instructions, patterns, constraints.

Mirrors: src/core/contract-ai/types/generation.ts
"""

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ============================================================================
# INSTRUCTION TYPES
# ============================================================================

class InstructionPriority(str, Enum):
    """Instruction priority levels"""
    MUST = "must"
    SHOULD = "should"
    MAY = "may"
    MUST_NOT = "must-not"


class Instruction(BaseModel):
    """
    Generation instruction for LLM
    
    Example:
        instruction = Instruction(
            target="api",
            priority=InstructionPriority.MUST,
            instruction="Use Express.js with TypeScript"
        )
    """
    target: str
    priority: InstructionPriority
    instruction: str
    rationale: Optional[str] = None


# ============================================================================
# PATTERN TYPES
# ============================================================================

class PatternType(str, Enum):
    """Design pattern types"""
    REPOSITORY = "repository"
    SERVICE = "service"
    CONTROLLER = "controller"
    FACTORY = "factory"
    SINGLETON = "singleton"
    OBSERVER = "observer"
    STRATEGY = "strategy"
    DECORATOR = "decorator"


class Pattern(BaseModel):
    """
    Design pattern specification
    
    Example:
        pattern = Pattern(
            name="Repository Pattern",
            type=PatternType.REPOSITORY,
            description="Data access abstraction layer",
            applies_to=["entity"]
        )
    """
    name: str
    type: PatternType
    description: Optional[str] = None
    appliesTo: Optional[list[str]] = Field(default=None, alias="applies_to")
    template: Optional[str] = None
    
    model_config = {"populate_by_name": True}


# ============================================================================
# CONSTRAINT TYPES
# ============================================================================

class ConstraintType(str, Enum):
    """Constraint types"""
    SECURITY = "security"
    PERFORMANCE = "performance"
    COMPATIBILITY = "compatibility"
    STYLE = "style"
    ARCHITECTURE = "architecture"


class Constraint(BaseModel):
    """
    Generation constraint
    
    Example:
        constraint = Constraint(
            type=ConstraintType.SECURITY,
            name="Input Validation",
            description="All user inputs must be validated",
            enforcement="required"
        )
    """
    type: ConstraintType
    name: str
    description: Optional[str] = None
    enforcement: Literal["required", "recommended", "optional"] = "required"
    check: Optional[str] = None


# ============================================================================
# TECH STACK
# ============================================================================

class BackendTechStack(BaseModel):
    """Backend technology stack configuration"""
    runtime: str = "node"
    language: str = "typescript"
    framework: str = "express"
    port: int = 3000
    orm: Optional[str] = None
    
    
class FrontendTechStack(BaseModel):
    """Frontend technology stack configuration"""
    framework: str = "react"
    language: str = "typescript"
    styling: str = "tailwind"
    port: int = 5173
    

class DatabaseTechStack(BaseModel):
    """Database technology stack configuration"""
    type: Literal["postgresql", "mysql", "sqlite", "mongodb", "in-memory"] = "in-memory"
    host: Optional[str] = None
    port: Optional[int] = None
    name: Optional[str] = None


class TechStack(BaseModel):
    """
    Complete technology stack configuration
    
    Example:
        tech_stack = TechStack(
            backend=BackendTechStack(runtime="node", language="typescript", framework="express", port=3000),
            frontend=FrontendTechStack(framework="react", language="typescript"),
            database=DatabaseTechStack(type="postgresql")
        )
    """
    backend: BackendTechStack = Field(default_factory=BackendTechStack)
    frontend: Optional[FrontendTechStack] = None
    database: DatabaseTechStack = Field(default_factory=DatabaseTechStack)


# ============================================================================
# GENERATION LAYER
# ============================================================================

class GenerationLayer(BaseModel):
    """
    Layer 2: Generation - defines HOW LLM should generate code
    
    Example:
        generation = GenerationLayer(
            instructions=[
                Instruction(target="api", priority=InstructionPriority.MUST, instruction="Use Express.js with TypeScript"),
            ],
            patterns=[
                Pattern(name="Repository", type=PatternType.REPOSITORY, applies_to=["entity"]),
            ],
            constraints=[
                Constraint(type=ConstraintType.SECURITY, name="Input Validation", description="Validate all inputs"),
            ],
            techStack=TechStack(backend=BackendTechStack(port=3000))
        )
    """
    instructions: list[Instruction] = Field(default_factory=list)
    patterns: list[Pattern] = Field(default_factory=list)
    constraints: list[Constraint] = Field(default_factory=list)
    techStack: TechStack = Field(default_factory=TechStack, alias="tech_stack")
    
    model_config = {"populate_by_name": True}
