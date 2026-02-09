"""
Reclapp Parser Module

Re-exports from canonical package: reclapp-contracts (reclapp_contracts.parser).
Parses contract files into ContractAI models.

Mirrors: src/core/contract-ai/parser/
"""

from reclapp_contracts.parser import (
    parse_contract_markdown,
    validate_contract,
    ContractMarkdown,
    ContractFrontmatter,
    MarkdownEntityDefinition,
)

__all__ = [
    "parse_contract_markdown",
    "validate_contract",
    "ContractMarkdown",
    "ContractFrontmatter",
    "MarkdownEntityDefinition",
]
