"""
Contract Validator for Reclapp Studio
Validates LLM-generated contracts and provides feedback for correction
"""

import re
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    valid: bool
    contract: str = ""
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    parsed_json: Optional[Dict] = None
    summary: Optional[Dict] = None


class ContractValidator:
    """Validates RCL contracts and extracts structured data"""
    
    # Valid RCL keywords
    KEYWORDS = {'app', 'entity', 'enum', 'event', 'alert', 'dashboard', 'pipeline', 'source', 'config', 'workflow'}
    
    # Valid field types
    BASIC_TYPES = {'text', 'email', 'phone', 'url', 'int', 'float', 'decimal', 'bool', 
                   'date', 'datetime', 'uuid', 'json'}
    
    # Valid modifiers
    MODIFIERS = {'@unique', '@required', '@generated', '@index', '@auto'}
    
    def __init__(self):
        self.entities = []
        self.enums = []
        self.events = []
    
    def extract_json_from_response(self, response: str) -> Tuple[Optional[Dict], str]:
        """Extract JSON from LLM response"""
        # Try to find JSON block
        json_patterns = [
            r'```json\s*([\s\S]*?)\s*```',  # ```json ... ```
            r'```\s*({\s*"thinking"[\s\S]*?})\s*```',  # ``` { "thinking": ... } ```
            r'(\{[\s\S]*"contract"[\s\S]*\})',  # Raw JSON with contract key
        ]
        
        for pattern in json_patterns:
            match = re.search(pattern, response, re.MULTILINE)
            if match:
                try:
                    json_str = match.group(1).strip()
                    return json.loads(json_str), ""
                except json.JSONDecodeError as e:
                    return None, f"JSON parse error: {e}"
        
        # No JSON found - try to extract contract directly
        contract = self.extract_contract_from_text(response)
        if contract:
            return {"contract": contract, "thinking": "", "summary": {}}, ""
        
        return None, "No valid JSON or contract found in response"
    
    def extract_contract_from_text(self, text: str) -> str:
        """Extract RCL contract from plain text response"""
        lines = []
        in_code_block = False
        code_block_content = []
        
        for line in text.split('\n'):
            stripped = line.strip()
            
            # Handle code blocks
            if stripped.startswith('```'):
                if in_code_block:
                    # End of code block
                    if code_block_content:
                        lines.extend(code_block_content)
                    code_block_content = []
                in_code_block = not in_code_block
                continue
            
            if in_code_block:
                code_block_content.append(line)
                continue
            
            # Check for RCL keywords
            if any(stripped.startswith(kw + ' ') or stripped.startswith(kw + '"') 
                   for kw in self.KEYWORDS):
                lines.append(line)
            elif lines and (stripped.startswith('{') or stripped.startswith('}') or 
                           stripped.endswith('{') or ':' in stripped or
                           stripped.startswith('@') or stripped.startswith('->')):
                lines.append(line)
        
        return '\n'.join(lines).strip()
    
    def validate(self, response: str) -> ValidationResult:
        """Validate LLM response and extract contract"""
        result = ValidationResult(valid=False)
        
        # Extract JSON
        parsed, error = self.extract_json_from_response(response)
        if error:
            result.errors.append(error)
            # Try plain text extraction as fallback
            contract = self.extract_contract_from_text(response)
            if contract:
                result.contract = contract
                result.errors.clear()
            else:
                return result
        else:
            result.parsed_json = parsed
            result.contract = parsed.get('contract', '')
            result.summary = parsed.get('summary', {})
        
        if not result.contract:
            result.errors.append("Empty contract")
            return result
        
        # Validate contract structure
        self._validate_structure(result)
        
        # Check for common issues
        self._check_common_issues(result)
        
        result.valid = len(result.errors) == 0
        return result
    
    def _validate_structure(self, result: ValidationResult):
        """Validate basic contract structure"""
        contract = result.contract
        
        # Must have app declaration
        if not re.search(r'app\s+["\']', contract):
            result.errors.append("Missing app declaration. Contract must start with: app \"Name\" { ... }")
        
        # Check for entities
        entity_matches = re.findall(r'entity\s+(\w+)\s*\{', contract)
        if not entity_matches:
            result.warnings.append("No entities defined. Consider adding entities.")
        else:
            self.entities = entity_matches
        
        # Check for balanced braces
        open_braces = contract.count('{')
        close_braces = contract.count('}')
        if open_braces != close_braces:
            result.errors.append(f"Unbalanced braces: {open_braces} opening, {close_braces} closing")
        
        # Check enum definitions
        enum_matches = re.findall(r'enum\s+(\w+)\s*\{', contract)
        self.enums = enum_matches
        
        # Check event definitions
        event_matches = re.findall(r'event\s+(\w+)\s*\{', contract)
        self.events = event_matches
    
    def _check_common_issues(self, result: ValidationResult):
        """Check for common LLM mistakes"""
        contract = result.contract
        
        # Check for TypeScript-style syntax (common LLM mistake)
        if re.search(r':\s*string\b', contract, re.IGNORECASE):
            result.errors.append("Invalid type 'string'. Use 'text' instead.")
        
        if re.search(r':\s*number\b', contract, re.IGNORECASE):
            result.errors.append("Invalid type 'number'. Use 'int', 'float', or 'decimal' instead.")
        
        if re.search(r':\s*boolean\b', contract, re.IGNORECASE):
            result.errors.append("Invalid type 'boolean'. Use 'bool' instead.")
        
        # Check for JavaScript/TypeScript patterns
        if 'interface ' in contract or 'type ' in contract:
            result.errors.append("Found TypeScript syntax (interface/type). Use RCL entity syntax instead.")
        
        if 'const ' in contract or 'let ' in contract or 'var ' in contract:
            result.errors.append("Found JavaScript variables. Use RCL declarative syntax.")
        
        # Check for common field issues
        if re.search(r'id\s+\w+(?!\s*@)', contract):
            result.warnings.append("ID fields should typically have @unique @generated modifiers")
        
        # Check for timestamps without @generated
        if re.search(r'(createdAt|updatedAt|created_at|updated_at)\s+datetime(?!\s*@generated)', contract):
            result.warnings.append("Timestamp fields (createdAt, updatedAt) should have @generated modifier")
    
    def generate_error_feedback(self, result: ValidationResult) -> str:
        """Generate feedback message for LLM to fix errors"""
        if result.valid:
            return ""
        
        feedback = ["## Validation Errors - Please Fix:\n"]
        
        for error in result.errors:
            feedback.append(f"❌ ERROR: {error}")
        
        for warning in result.warnings:
            feedback.append(f"⚠️ WARNING: {warning}")
        
        feedback.append("\nPlease regenerate the contract fixing these issues.")
        feedback.append("Remember to output valid JSON with the exact structure specified.")
        
        return '\n'.join(feedback)
    
    def format_contract(self, contract: str) -> str:
        """Format contract with proper indentation"""
        lines = []
        indent = 0
        
        for line in contract.split('\n'):
            stripped = line.strip()
            if not stripped:
                continue
            
            # Decrease indent for closing braces
            if stripped.startswith('}'):
                indent = max(0, indent - 1)
            
            # Add line with current indent
            lines.append('  ' * indent + stripped)
            
            # Increase indent after opening braces
            if stripped.endswith('{'):
                indent += 1
        
        return '\n'.join(lines)


def validate_contract(response: str) -> ValidationResult:
    """Convenience function to validate a contract"""
    validator = ContractValidator()
    return validator.validate(response)


def extract_and_validate(response: str) -> Tuple[str, List[str], List[str]]:
    """Extract contract from response and validate it"""
    validator = ContractValidator()
    result = validator.validate(response)
    
    if result.valid:
        formatted = validator.format_contract(result.contract)
        return formatted, [], result.warnings
    else:
        return result.contract, result.errors, result.warnings


# Test
if __name__ == '__main__':
    test_response = '''
```json
{
  "thinking": "Creating a CRM system",
  "contract": "app \\"CRM\\" {\\n  version: \\"1.0.0\\"\\n}\\n\\nentity Contact {\\n  id uuid @unique @generated\\n  name text @required\\n}",
  "summary": {"entities": ["Contact"]}
}
```
'''
    result = validate_contract(test_response)
    print(f"Valid: {result.valid}")
    print(f"Contract: {result.contract}")
    print(f"Errors: {result.errors}")
    print(f"Warnings: {result.warnings}")
