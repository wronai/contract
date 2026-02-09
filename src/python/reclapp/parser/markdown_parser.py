"""Proxy module — re-exports from reclapp_contracts.parser.markdown_parser (canonical source)."""
# Re-export everything including private helpers used by tests
from reclapp_contracts.parser.markdown_parser import *  # noqa: F401,F403
from reclapp_contracts.parser.markdown_parser import (  # noqa: F401
    _extract_section,
    _extract_field,
    _extract_list_from_field,
    _parse_field_type,
    _parse_markdown_table,
)
