"""
Markdown Contract Parser (.rcl.md) for Python/Gradio
Parses .rcl.md files to IR (Intermediate Representation)
"""

import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


@dataclass
class Message:
    role: str  # 'user' | 'assistant'
    timestamp: str
    content: str


@dataclass
class ParseResult:
    success: bool
    ir: Optional[Dict[str, Any]] = None
    errors: List[Dict[str, Any]] = field(default_factory=list)
    conversation: List[Message] = field(default_factory=list)


# Regex patterns
PATTERNS = {
    'title': re.compile(r'^# (.+)$', re.MULTILINE),
    'description': re.compile(r'^> (.+)$', re.MULTILINE),
    'meta_row': re.compile(r'\| (.+?) \| (.+?) \|'),
    'yaml_block': re.compile(
        r'```yaml\n# (entity|enum|event|alert|pipeline|dashboard|api|deployment|env|source|workflow|config): ?(.+)?\n([\s\S]*?)```',
        re.MULTILINE
    ),
    'user_message': re.compile(
        r'### 🧑 User \((.+?)\)\n\n([\s\S]*?)(?=\n###|\n---|\n##|$)'
    ),
    'assistant_message': re.compile(
        r'### 🤖 Assistant \((.+?)\)\n\n([\s\S]*?)(?=\n###|\n---|\n##|$)'
    ),
}


def parse_markdown(content: str) -> ParseResult:
    """Parse .rcl.md file to IR"""
    try:
        ir = {
            'app': parse_header(content),
            'entities': [],
            'enums': [],
            'events': [],
            'alerts': [],
            'pipelines': [],
            'dashboards': [],
            'sources': [],
            'workflows': [],
            'api': None,
            'deployment': None,
            'env': [],
            'config': {}
        }

        # Parse YAML blocks
        for match in PATTERNS['yaml_block'].finditer(content):
            block_type, name, body = match.groups()
            name = name or ''

            if block_type == 'entity':
                ir['entities'].append(parse_entity(name, body))
            elif block_type == 'enum':
                ir['enums'].append(parse_enum(name, body))
            elif block_type == 'event':
                ir['events'].append(parse_event(name, body))
            elif block_type == 'alert':
                ir['alerts'].append(parse_alert(name, body))
            elif block_type == 'pipeline':
                ir['pipelines'].append(parse_pipeline(name, body))
            elif block_type == 'dashboard':
                ir['dashboards'].append(parse_dashboard(name, body))
            elif block_type == 'source':
                ir['sources'].append(parse_source(name, body))
            elif block_type == 'workflow':
                ir['workflows'].append(parse_workflow(name, body))
            elif block_type == 'api':
                ir['api'] = parse_api(body)
            elif block_type == 'deployment':
                ir['deployment'] = parse_deployment(body)
            elif block_type == 'env':
                ir['env'] = parse_env(body)
            elif block_type == 'config':
                ir['config'] = parse_config(name, body)

        # Parse conversation
        conversation = parse_conversation(content)

        return ParseResult(
            success=True,
            ir=ir,
            conversation=conversation
        )

    except Exception as e:
        return ParseResult(
            success=False,
            errors=[{'line': 0, 'message': str(e)}]
        )


def parse_header(content: str) -> Dict[str, str]:
    """Parse document header"""
    header = {'name': 'Unnamed', 'version': '1.0.0'}

    # Title
    title_match = PATTERNS['title'].search(content)
    if title_match:
        header['name'] = title_match.group(1)

    # Description
    desc_match = PATTERNS['description'].search(content)
    if desc_match:
        header['description'] = desc_match.group(1)

    # Metadata table
    for match in PATTERNS['meta_row'].finditer(content):
        key, value = match.groups()
        key_lower = key.lower().strip()

        if key_lower in ('wersja', 'version'):
            header['version'] = value.strip()
        elif key_lower in ('autor', 'author'):
            header['author'] = value.strip()
        elif key_lower in ('licencja', 'license'):
            header['license'] = value.strip()

    return header


def parse_entity(name: str, body: str) -> Dict[str, Any]:
    """Parse entity definition"""
    fields = []

    for line in body.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        # Format: fieldName : type # @modifiers - description
        match = re.match(r'^(\w+)\s*:\s*([^#]+?)(?:\s*#\s*(.*))?$', line)
        if match:
            field_name, type_str, comment = match.groups()
            comment = comment or ''

            field = {
                'name': field_name,
                'type': type_str.strip(),
                'required': '@required' in comment,
                'unique': '@unique' in comment,
                'auto': '@auto' in comment or '@generated' in comment,
                'nullable': type_str.strip().endswith('?') or '@required' not in comment
            }

            # Default value
            default_match = re.search(r'=\s*(\S+)', comment)
            if default_match:
                field['defaultValue'] = default_match.group(1)

            # Description
            desc_match = re.search(r'-\s*(.+)$', comment)
            if desc_match:
                field['description'] = desc_match.group(1).strip()

            fields.append(field)

    return {'name': name, 'fields': fields}


def parse_enum(name: str, body: str) -> Dict[str, Any]:
    """Parse enum definition"""
    values = []

    for line in body.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        match = re.match(r'^-\s*(\w+)(?:\s*#\s*(.*))?$', line)
        if match:
            values.append({
                'name': match.group(1),
                'description': match.group(2).strip() if match.group(2) else None
            })

    return {'name': name, 'values': values}


def parse_event(name: str, body: str) -> Dict[str, Any]:
    """Parse event definition"""
    fields = []

    for line in body.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        match = re.match(r'^(\w+)\s*:\s*(\S+)', line)
        if match:
            fields.append({
                'name': match.group(1),
                'type': match.group(2)
            })

    return {'name': name, 'fields': fields}


def parse_alert(name: str, body: str) -> Dict[str, Any]:
    """Parse alert definition"""
    alert = {'name': name, 'condition': '', 'targets': [], 'severity': 'medium'}

    for line in body.strip().split('\n'):
        line = line.strip()

        if line.startswith('entity:'):
            alert['entity'] = line[7:].strip()
        elif line.startswith('when:'):
            alert['condition'] = line[5:].strip()
        elif line.startswith('notify:'):
            targets = re.findall(r'\w+', line[7:])
            alert['targets'] = targets
        elif line.startswith('severity:'):
            alert['severity'] = line[9:].strip()
        elif line.startswith('message:'):
            msg = re.search(r'"(.+)"', line)
            if msg:
                alert['message'] = msg.group(1)

    return alert


def parse_pipeline(name: str, body: str) -> Dict[str, Any]:
    """Parse pipeline definition"""
    pipeline = {'name': name, 'input': [], 'output': ''}

    for line in body.strip().split('\n'):
        line = line.strip()

        if line.startswith('input:'):
            inputs = re.findall(r'[\w.*]+', line[6:])
            pipeline['input'] = inputs
        elif line.startswith('output:'):
            pipeline['output'] = line[7:].strip()
        elif line.startswith('schedule:'):
            schedule = re.search(r'"(.+)"', line)
            if schedule:
                pipeline['schedule'] = schedule.group(1)
        elif line.startswith('transform:'):
            transforms = re.findall(r'[\w]+', line[10:])
            pipeline['transform'] = transforms

    return pipeline


def parse_dashboard(name: str, body: str) -> Dict[str, Any]:
    """Parse dashboard definition"""
    dashboard = {'name': name, 'metrics': []}

    for line in body.strip().split('\n'):
        line = line.strip()

        if line.startswith('entity:'):
            dashboard['entity'] = line[7:].strip()
        elif line.startswith('metrics:'):
            metrics = re.findall(r'[\w.]+', line[8:])
            dashboard['metrics'] = metrics
        elif line.startswith('stream:'):
            dashboard['stream'] = line[7:].strip()
        elif line.startswith('layout:'):
            dashboard['layout'] = line[7:].strip()

    return dashboard


def parse_source(name: str, body: str) -> Dict[str, Any]:
    """Parse source definition"""
    source = {'name': name, 'type': 'rest'}

    for line in body.strip().split('\n'):
        line = line.strip()

        if line.startswith('type:'):
            source['type'] = line[5:].strip()
        elif line.startswith('url:'):
            url = re.search(r'"(.+)"', line)
            if url:
                source['url'] = url.group(1)
        elif line.startswith('auth:'):
            source['auth'] = line[5:].strip()
        elif line.startswith('cache:'):
            cache = re.search(r'"(.+)"', line)
            if cache:
                source['cache'] = cache.group(1)

    return source


def parse_workflow(name: str, body: str) -> Dict[str, Any]:
    """Parse workflow definition"""
    workflow = {'name': name, 'trigger': '', 'steps': []}

    for line in body.strip().split('\n'):
        line = line.strip()

        if line.startswith('trigger:'):
            workflow['trigger'] = line[8:].strip()
        elif line.startswith('steps:'):
            steps = re.findall(r'[\w]+', line[6:])
            workflow['steps'] = steps

    return workflow


def parse_api(body: str) -> Dict[str, Any]:
    """Parse API configuration"""
    api = {'prefix': '/api/v1', 'auth': 'jwt'}

    for line in body.strip().split('\n'):
        line = line.strip()

        if line.startswith('prefix:'):
            api['prefix'] = line[7:].strip()
        elif line.startswith('auth:'):
            api['auth'] = line[5:].strip()
        elif line.startswith('rateLimit:'):
            api['rateLimit'] = int(line[10:].strip())
        elif line.startswith('cors:'):
            api['cors'] = line[5:].strip()

    return api


def parse_deployment(body: str) -> Dict[str, Any]:
    """Parse deployment configuration"""
    deployment = {'type': 'docker', 'database': 'postgresql'}

    for line in body.strip().split('\n'):
        line = line.strip()

        if line.startswith('type:'):
            deployment['type'] = line[5:].strip()
        elif line.startswith('database:'):
            deployment['database'] = line[9:].strip()
        elif line.startswith('cache:'):
            deployment['cache'] = line[6:].strip()

    return deployment


def parse_env(body: str) -> List[Dict[str, Any]]:
    """Parse environment variables"""
    env_vars = []

    for line in body.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        match = re.match(r'^(\w+)\s*:\s*(\w+)(?:\s*#\s*(.*))?$', line)
        if match:
            name, type_str, comment = match.groups()
            comment = comment or ''

            var = {
                'name': name,
                'type': type_str,
                'required': '@required' in comment,
                'secret': type_str == 'secret'
            }

            default_match = re.search(r'=\s*"?([^"]+)"?', comment)
            if default_match:
                var['default'] = default_match.group(1)

            env_vars.append(var)

    return env_vars


def parse_config(name: str, body: str) -> Dict[str, Any]:
    """Parse config section"""
    config = {}

    for line in body.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        match = re.match(r'^(\w+)\s*:\s*(.+)$', line)
        if match:
            key, value = match.groups()
            value = value.strip()
            
            # Parse value type
            if value == 'true':
                config[key] = True
            elif value == 'false':
                config[key] = False
            elif value.isdigit():
                config[key] = int(value)
            elif re.match(r'^\d+\.\d+$', value):
                config[key] = float(value)
            else:
                config[key] = value.strip('"\'')

    return config


def parse_conversation(content: str) -> List[Message]:
    """Parse conversation from file"""
    messages = []

    # User messages
    for match in PATTERNS['user_message'].finditer(content):
        messages.append(Message(
            role='user',
            timestamp=match.group(1),
            content=match.group(2).strip()
        ))

    # Assistant messages
    for match in PATTERNS['assistant_message'].finditer(content):
        messages.append(Message(
            role='assistant',
            timestamp=match.group(1),
            content=match.group(2).strip()
        ))

    # Sort by timestamp
    messages.sort(key=lambda m: m.timestamp)

    return messages


def write_markdown(
    ir: Dict[str, Any],
    conversation: List[Message] = None,
    include_conversation: bool = True,
    language: str = 'pl'
) -> str:
    """Generate .rcl.md file from IR"""
    
    LABELS = {
        'pl': {
            'properties': 'Właściwość',
            'value': 'Wartość',
            'version': 'Wersja',
            'author': 'Autor',
            'license': 'Licencja',
            'created': 'Utworzono',
            'conversation': 'Rozmowa',
            'entities': 'Encje',
            'enums': 'Typy wyliczeniowe',
            'events': 'Zdarzenia',
            'alerts': 'Alerty',
            'pipelines': 'Przepływy danych',
            'dashboards': 'Panele',
            'sources': 'Źródła danych',
            'workflows': 'Przepływy pracy',
            'api': 'Konfiguracja API',
            'deployment': 'Deployment',
            'env': 'Zmienne środowiskowe',
            'generated_by': 'Wygenerowano przez Reclapp Studio',
        },
        'en': {
            'properties': 'Property',
            'value': 'Value',
            'version': 'Version',
            'author': 'Author',
            'license': 'License',
            'created': 'Created',
            'conversation': 'Conversation',
            'entities': 'Entities',
            'enums': 'Enums',
            'events': 'Events',
            'alerts': 'Alerts',
            'pipelines': 'Pipelines',
            'dashboards': 'Dashboards',
            'sources': 'Data Sources',
            'workflows': 'Workflows',
            'api': 'API Configuration',
            'deployment': 'Deployment',
            'env': 'Environment Variables',
            'generated_by': 'Generated by Reclapp Studio',
        }
    }
    
    L = LABELS.get(language, LABELS['en'])
    lines = []
    conversation = conversation or []

    # Header
    app = ir.get('app', {})
    lines.append(f"# {app.get('name', 'Unnamed')}")
    lines.append('')

    if app.get('description'):
        lines.append(f"> {app['description']}")
        lines.append('')

    # Metadata table
    lines.append(f"| {L['properties']} | {L['value']} |")
    lines.append('|------------|---------|')
    lines.append(f"| {L['version']} | {app.get('version', '1.0.0')} |")
    if app.get('author'):
        lines.append(f"| {L['author']} | {app['author']} |")
    if app.get('license'):
        lines.append(f"| {L['license']} | {app['license']} |")
    lines.append(f"| {L['created']} | {datetime.now().strftime('%Y-%m-%d')} |")
    lines.append('')
    lines.append('---')
    lines.append('')

    # Conversation
    if include_conversation and conversation:
        lines.append(f"## 💬 {L['conversation']}")
        lines.append('')

        for msg in conversation:
            emoji = '🧑' if msg.role == 'user' else '🤖'
            role = 'User' if msg.role == 'user' else 'Assistant'
            lines.append(f"### {emoji} {role} ({msg.timestamp})")
            lines.append('')
            lines.append(msg.content)
            lines.append('')

        lines.append('---')
        lines.append('')

    # Entities
    if ir.get('entities'):
        lines.append(f"## 📦 {L['entities']}")
        lines.append('')

        for entity in ir['entities']:
            lines.append(f"### {entity['name']}")
            lines.append('')
            lines.append('```yaml')
            lines.append(f"# entity: {entity['name']}")

            for field in entity.get('fields', []):
                modifiers = []
                if field.get('unique'):
                    modifiers.append('@unique')
                if field.get('required'):
                    modifiers.append('@required')
                if field.get('auto'):
                    modifiers.append('@auto')

                mod_str = ' '.join(modifiers)
                default_str = f" = {field['defaultValue']}" if field.get('defaultValue') else ''
                desc_str = f" - {field['description']}" if field.get('description') else ''

                comment = f"# {mod_str}{default_str}{desc_str}".strip()
                if comment == '#':
                    comment = ''

                type_str = field['type']
                lines.append(f"{field['name'].ljust(16)}: {type_str.ljust(20)} {comment}".rstrip())

            lines.append('```')
            lines.append('')

        lines.append('---')
        lines.append('')

    # Enums
    if ir.get('enums'):
        lines.append(f"## 🏷️ {L['enums']}")
        lines.append('')

        for enum in ir['enums']:
            lines.append('```yaml')
            lines.append(f"# enum: {enum['name']}")

            for value in enum.get('values', []):
                desc = f" # {value['description']}" if value.get('description') else ''
                lines.append(f"- {value['name']}{desc}")

            lines.append('```')
            lines.append('')

        lines.append('---')
        lines.append('')

    # Events
    if ir.get('events'):
        lines.append(f"## 📡 {L['events']}")
        lines.append('')

        for event in ir['events']:
            lines.append(f"### {event['name']}")
            lines.append('')
            lines.append('```yaml')
            lines.append(f"# event: {event['name']}")

            for field in event.get('fields', []):
                lines.append(f"{field['name'].ljust(16)}: {field['type']}")

            lines.append('```')
            lines.append('')

        lines.append('---')
        lines.append('')

    # Alerts
    if ir.get('alerts'):
        lines.append(f"## 🚨 {L['alerts']}")
        lines.append('')

        for alert in ir['alerts']:
            lines.append(f"### {alert['name']}")
            lines.append('')
            lines.append('```yaml')
            lines.append(f"# alert: {alert['name']}")
            if alert.get('entity'):
                lines.append(f"entity: {alert['entity']}")
            lines.append(f"when: {alert['condition']}")
            lines.append(f"notify: [{', '.join(alert['targets'])}]")
            lines.append(f"severity: {alert['severity']}")
            if alert.get('message'):
                lines.append(f'message: "{alert["message"]}"')
            lines.append('```')
            lines.append('')

        lines.append('---')
        lines.append('')

    # Footer
    lines.append(f"*{L['generated_by']}*")

    return '\n'.join(lines)


def parse_file(file_path: str) -> ParseResult:
    """Parse .rcl.md file from path"""
    path = Path(file_path)
    if not path.exists():
        return ParseResult(
            success=False,
            errors=[{'line': 0, 'message': f'File not found: {file_path}'}]
        )

    content = path.read_text(encoding='utf-8')
    return parse_markdown(content)


# For testing
if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        result = parse_file(sys.argv[1])
        if result.success:
            print(f"✅ Parsed: {result.ir['app']['name']}")
            print(f"   Entities: {len(result.ir['entities'])}")
            print(f"   Events: {len(result.ir['events'])}")
        else:
            print(f"❌ Error: {result.errors[0]['message']}")
