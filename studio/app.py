#!/usr/bin/env python3
"""
Reclapp Studio - Conversational Contract Designer

Web UI for designing Reclapp contracts using natural language
with local LLM (Ollama) support.
"""

import os
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Generator, Optional, List, Dict
from datetime import datetime

import gradio as gr
import httpx

from contract_validator import ContractValidator, ValidationResult

# Configuration
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:7b-instruct-q4_0")
CODE_MODEL = os.environ.get("CODE_MODEL", "codellama:7b-instruct-q4_0")
STUDIO_HOST = os.environ.get("STUDIO_HOST", "0.0.0.0")
STUDIO_PORT = int(os.environ.get("STUDIO_PORT", "7860"))
PROJECTS_DIR = Path("projects")
EXAMPLES_DIR = Path("examples")
APPS_DIR = Path("apps")

# Mount paths for Docker (maps to host paths)
HOST_APPS_DIR = Path("/host/apps") if Path("/host/apps").exists() else APPS_DIR
HOST_EXAMPLES_DIR = Path("/host/examples") if Path("/host/examples").exists() else EXAMPLES_DIR

# Load system prompt (prefer v2 with structured output)
SYSTEM_PROMPT_V2_PATH = Path("prompts/system_v2.txt")
SYSTEM_PROMPT_PATH = Path("prompts/system.txt")

if SYSTEM_PROMPT_V2_PATH.exists():
    SYSTEM_PROMPT = SYSTEM_PROMPT_V2_PATH.read_text()
elif SYSTEM_PROMPT_PATH.exists():
    SYSTEM_PROMPT = SYSTEM_PROMPT_PATH.read_text()
else:
    SYSTEM_PROMPT = """You are a contract designer for Reclapp.
Help users design application contracts using the Reclapp Mini-DSL format.
When the user says "generate", output the complete contract.rcl file."""

# Validator for contract output
validator = ContractValidator()


class ProjectManager:
    """Manages projects from apps/ and examples/ directories"""
    
    @staticmethod
    def scan_projects() -> List[Dict]:
        """Scan all project directories and return project info"""
        projects = []
        
        # Scan apps/ directory
        for source_dir, source_name in [(APPS_DIR, "apps"), (EXAMPLES_DIR, "examples")]:
            if not source_dir.exists():
                continue
                
            for project_dir in source_dir.iterdir():
                if not project_dir.is_dir() or project_dir.name.startswith('.'):
                    continue
                    
                project = ProjectManager._analyze_project(project_dir, source_name)
                if project:
                    projects.append(project)
        
        return sorted(projects, key=lambda p: (p['source'], p['name']))
    
    @staticmethod
    def _analyze_project(project_dir: Path, source: str) -> Optional[Dict]:
        """Analyze a single project directory"""
        contracts_dir = project_dir / "contracts"
        target_dir = project_dir / "target"
        
        # Find contract files
        contract_files = {
            'rcl_md': None,
            'rcl': None,
            'ts': None
        }
        
        if contracts_dir.exists():
            for f in contracts_dir.iterdir():
                if f.suffix == '.md' or f.name.endswith('.rcl.md'):
                    contract_files['rcl_md'] = f
                elif f.name.endswith('.reclapp.rcl'):
                    contract_files['rcl'] = f
                elif f.name.endswith('.reclapp.ts'):
                    contract_files['ts'] = f
        
        # Check if any contract exists
        has_contract = any(contract_files.values())
        if not has_contract:
            return None
        
        # Determine status
        has_target = target_dir.exists() and any(target_dir.iterdir()) if target_dir.exists() else False
        
        # Get contract info
        contract_content = ""
        primary_contract = contract_files['rcl_md'] or contract_files['rcl'] or contract_files['ts']
        if primary_contract and primary_contract.exists():
            try:
                contract_content = primary_contract.read_text()[:500]  # First 500 chars
            except:
                pass
        
        # Extract app name and version from contract
        app_name = project_dir.name
        app_version = "1.0.0"
        
        import re
        name_match = re.search(r'app\s+["\']([^"\']+)["\']', contract_content)
        if name_match:
            app_name = name_match.group(1)
        
        version_match = re.search(r'version:\s*["\']?([0-9.]+)["\']?', contract_content)
        if version_match:
            app_version = version_match.group(1)
        
        return {
            'name': app_name,
            'folder': project_dir.name,
            'source': source,
            'path': str(project_dir),
            'version': app_version,
            'has_rcl_md': contract_files['rcl_md'] is not None,
            'has_rcl': contract_files['rcl'] is not None,
            'has_ts': contract_files['ts'] is not None,
            'has_target': has_target,
            'status': 'ready' if has_target else 'not_built',
            'contract_path': str(primary_contract) if primary_contract else None
        }
    
    @staticmethod
    def get_contract_content(project_path: str, format: str = 'rcl_md') -> str:
        """Get contract content in specified format"""
        project_dir = Path(project_path)
        contracts_dir = project_dir / "contracts"
        
        if not contracts_dir.exists():
            return "❌ No contracts directory found"
        
        # Find contract file
        for f in contracts_dir.iterdir():
            if format == 'rcl_md' and (f.suffix == '.md' or f.name.endswith('.rcl.md')):
                return f.read_text()
            elif format == 'rcl' and f.name.endswith('.reclapp.rcl'):
                return f.read_text()
            elif format == 'ts' and f.name.endswith('.reclapp.ts'):
                return f.read_text()
        
        # Fallback to any available format
        for f in contracts_dir.iterdir():
            if f.suffix in ['.md', '.rcl', '.ts']:
                return f.read_text()
        
        return "❌ No contract file found"
    
    @staticmethod
    def validate_project(project_path: str) -> str:
        """Validate project contract using .ts or .rcl format"""
        project_dir = Path(project_path)
        contracts_dir = project_dir / "contracts"
        
        if not contracts_dir.exists():
            return "❌ No contracts directory"
        
        # Prefer .ts for validation, fallback to .rcl
        contract_file = None
        for f in contracts_dir.iterdir():
            if f.name.endswith('.reclapp.ts'):
                contract_file = f
                break
            elif f.name.endswith('.reclapp.rcl'):
                contract_file = f
        
        if not contract_file:
            return "❌ No validatable contract (.ts or .rcl)"
        
        try:
            content = contract_file.read_text()
            result = validator.validate(content)
            
            if result.valid or result.contract:
                entities = len(re.findall(r'entity\s+\w+', content))
                events = len(re.findall(r'event\s+\w+', content))
                return f"✅ Valid! Entities: {entities}, Events: {events}"
            else:
                errors = result.errors[:3] if result.errors else ["Unknown error"]
                return f"⚠️ Issues: {'; '.join(errors)}"
                
        except Exception as e:
            return f"❌ Error: {str(e)}"
    
    @staticmethod
    def generate_project(project_path: str) -> str:
        """Generate project target from contract"""
        try:
            project_dir = Path(project_path)
            contracts_dir = project_dir / "contracts"
            target_dir = project_dir / "target"
            
            # Find contract file
            contract_file = None
            for f in contracts_dir.iterdir():
                if f.name.endswith('.reclapp.rcl') or f.name.endswith('.reclapp.ts'):
                    contract_file = f
                    break
            
            if not contract_file:
                return "❌ No contract file found"
            
            # This would call the reclapp CLI - for now return instructions
            return f"🚀 To generate: ./bin/reclapp generate {contract_file} -o {target_dir}"
            
        except Exception as e:
            return f"❌ Error: {str(e)}"
    
    @staticmethod
    def get_projects_dataframe() -> List[List]:
        """Get projects as list of lists for Gradio Dataframe"""
        projects = ProjectManager.scan_projects()
        
        rows = []
        for p in projects:
            status_emoji = "✅" if p['has_target'] else "📝"
            formats = []
            if p['has_rcl_md']: formats.append("MD")
            if p['has_rcl']: formats.append("RCL")
            if p['has_ts']: formats.append("TS")
            
            rows.append([
                p['name'],
                p['source'],
                p['version'],
                ", ".join(formats),
                f"{status_emoji} {'Built' if p['has_target'] else 'Not Built'}",
                p['path']
            ])
        
        return rows


class ReclappStudio:
    def __init__(self):
        self.conversation_history = []
        self.current_contract = ""
        self.project_name = "my-app"
        self.validation_errors = []
        self.max_retries = 2  # Max validation retries

    async def chat(self, message: str, history: list) -> Generator[str, None, None]:
        """Chat with Ollama to design contract with validation loop"""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for h in history:
            if isinstance(h, (list, tuple)) and len(h) >= 2:
                messages.append({"role": "user", "content": h[0]})
                if h[1]:
                    messages.append({"role": "assistant", "content": h[1]})

        messages.append({"role": "user", "content": message})
        
        retry_count = 0
        while retry_count <= self.max_retries:
            try:
                full_response = ""
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{OLLAMA_HOST}/api/chat",
                        json={
                            "model": OLLAMA_MODEL,
                            "messages": messages,
                            "stream": True,
                            "options": {"temperature": 0.7}
                        },
                        timeout=120.0
                    )

                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if "message" in data:
                                    chunk = data["message"].get("content", "")
                                    full_response += chunk
                                    yield full_response
                            except json.JSONDecodeError:
                                continue

                # Validate contract if response looks like it contains one
                if "entity " in full_response or "app " in full_response or '"contract"' in full_response:
                    validation = validator.validate(full_response)
                    
                    if validation.valid:
                        # Success - format and store contract
                        self.current_contract = validator.format_contract(validation.contract)
                        self.validation_errors = []
                        
                        # Add summary to response if available
                        if validation.summary:
                            summary_text = f"\n\n✅ **Contract validated successfully!**\n"
                            if validation.summary.get('entities'):
                                summary_text += f"- Entities: {', '.join(validation.summary['entities'])}\n"
                            if validation.summary.get('events'):
                                summary_text += f"- Events: {', '.join(validation.summary['events'])}\n"
                            yield full_response + summary_text
                        return
                    else:
                        # Validation failed - store errors
                        self.validation_errors = validation.errors + validation.warnings
                        
                        # Try to use partial contract if available
                        if validation.contract:
                            self.current_contract = validation.contract
                        
                        # If we have retries left, ask LLM to fix
                        if retry_count < self.max_retries and validation.errors:
                            error_feedback = validator.generate_error_feedback(validation)
                            messages.append({"role": "assistant", "content": full_response})
                            messages.append({"role": "user", "content": error_feedback})
                            
                            yield full_response + f"\n\n⚠️ **Validation issues found, retrying ({retry_count + 1}/{self.max_retries})...**\n" + '\n'.join(f"- {e}" for e in validation.errors)
                            retry_count += 1
                            continue
                        else:
                            # No more retries or just warnings
                            warning_text = ""
                            if validation.errors:
                                warning_text = "\n\n⚠️ **Contract has issues:**\n" + '\n'.join(f"- {e}" for e in validation.errors)
                            if validation.warnings:
                                warning_text += "\n\n💡 **Suggestions:**\n" + '\n'.join(f"- {w}" for w in validation.warnings)
                            yield full_response + warning_text
                            return
                else:
                    # No contract in response - just return as-is
                    return

            except httpx.ConnectError:
                yield "❌ Cannot connect to Ollama. Make sure it's running at " + OLLAMA_HOST
                return
            except Exception as e:
                yield f"❌ Error: {str(e)}"
                return

    def extract_contract(self, text: str) -> str:
        """Extract RCL contract from response"""
        lines = []
        in_code_block = False
        
        for line in text.split('\n'):
            if line.strip().startswith('```'):
                in_code_block = not in_code_block
                continue
            if in_code_block or any(kw in line for kw in ['app ', 'entity ', 'enum ', 'event ', 'pipeline ', 'alert ', 'dashboard ', 'source ', 'config ']):
                lines.append(line)
        
        return '\n'.join(lines) if lines else text

    def save_contract(self, project_name: str, contract_content: str) -> str:
        """Save contract to project directory"""
        if not contract_content.strip():
            return "❌ No contract to save"
        
        project_dir = PROJECTS_DIR / project_name / "contracts"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        contract_path = project_dir / "main.reclapp.rcl"
        contract_path.write_text(contract_content)
        
        return f"✅ Saved to {contract_path}"

    def load_example(self, example_name: str) -> str:
        """Load example contract"""
        example_paths = [
            EXAMPLES_DIR / example_name / "contracts" / "main.reclapp.rcl",
            EXAMPLES_DIR / example_name / "contracts" / f"{example_name}.reclapp.rcl",
        ]
        
        for path in example_paths:
            if path.exists():
                return path.read_text()
        
        return f"❌ Example not found: {example_name}"

    def list_examples(self) -> list:
        """List available examples"""
        examples = []
        if EXAMPLES_DIR.exists():
            for item in EXAMPLES_DIR.iterdir():
                if item.is_dir():
                    contracts_dir = item / "contracts"
                    if contracts_dir.exists():
                        for contract in contracts_dir.glob("*.rcl"):
                            examples.append(f"{item.name}/{contract.stem}")
        return examples


# Initialize studio
studio = ReclappStudio()


def create_ui():
    """Create Gradio UI"""
    with gr.Blocks(
        title="Reclapp Studio",
        elem_id="reclapp-studio",
        js="""
        function() {
            // Handle URL tab parameter
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            
            if (tab) {
                // Wait for Gradio to load, then select tab
                setTimeout(() => {
                    const tabMap = {
                        'welcome': 0,
                        'projects': 1,
                        'chat': 2,
                        'examples': 3
                    };
                    const tabIndex = tabMap[tab.toLowerCase()];
                    if (tabIndex !== undefined) {
                        const tabs = document.querySelectorAll('[role="tab"]');
                        if (tabs[tabIndex]) {
                            tabs[tabIndex].click();
                        }
                    }
                }, 500);
            }
            
            // Update URL when tab changes
            document.addEventListener('click', (e) => {
                const tab = e.target.closest('[role="tab"]');
                if (tab) {
                    const tabText = tab.textContent.toLowerCase();
                    let tabName = 'welcome';
                    if (tabText.includes('projects')) tabName = 'projects';
                    else if (tabText.includes('chat')) tabName = 'chat';
                    else if (tabText.includes('examples')) tabName = 'examples';
                    
                    const url = new URL(window.location);
                    url.searchParams.set('tab', tabName);
                    window.history.replaceState({}, '', url);
                }
            });
        }
        """
    ) as app:
        
        # Main Tabs
        with gr.Tabs(elem_id="main-tabs") as main_tabs:
            # Welcome/Login Tab
            with gr.Tab("🏠 Welcome", id="welcome"):
                gr.Markdown("""
                # 🚀 Reclapp Studio
                
                **AI-Native Contract Designer** - Build applications using natural language
                
                ---
                """)
                
                with gr.Row():
                    with gr.Column(scale=1):
                        gr.Markdown("""
                        ### 📂 Load Contract (.rcl.md)
                        
                        Upload an existing contract in Markdown format:
                        """)
                        
                        file_upload = gr.File(
                            label="Upload .rcl.md file",
                            file_types=[".md", ".rcl.md"],
                            type="filepath",
                            elem_id="file-upload-rcl-md"
                        )
                        
                        load_file_btn = gr.Button("📥 Load Contract", variant="primary", elem_id="btn-load-contract")
                        load_status = gr.Textbox(label="Status", interactive=False, elem_id="status-load-contract")
                        
                    with gr.Column(scale=1):
                        gr.Markdown("""
                        ### 🎯 Quick Start
                        
                        - **Chat Tab**: Design contracts with AI
                        - **Examples Tab**: Load pre-built examples
                        - **Export**: Save as `.rcl.md` format
                        
                        ### 📋 Supported Formats
                        
                        | Format | Extension | Description |
                        |--------|-----------|-------------|
                        | Markdown | `.rcl.md` | Human-readable, AI-friendly |
                        | Mini-DSL | `.reclapp.rcl` | Concise declarative |
                        | TypeScript | `.reclapp.ts` | Fully typed |
                        """)
                
                gr.Markdown("---")
                
                with gr.Row():
                    with gr.Column():
                        gr.Markdown("""
                        ### 💡 Example Prompts
                        
                        ```
                        "Create a CRM with contacts and deals"
                        "Build an e-commerce system with products and orders"
                        "Design a project management app with tasks"
                        "Add alerts for high-risk customers"
                        ```
                        """)
                    
                    with gr.Column():
                        gr.Markdown("""
                        ### 🔧 Configuration
                        
                        - **LLM Model**: `deepseek-coder:6.7b`
                        - **Ollama Host**: `http://localhost:11434`
                        
                        Change in `studio/.env`
                        """)
            
            # Projects Tab
            with gr.Tab("📁 Projects", id="projects"):
                gr.Markdown("""
                ### 📁 Project Manager
                
                Browse and manage projects from `apps/` and `examples/` directories.
                """)
                
                with gr.Row():
                    refresh_projects_btn = gr.Button("🔄 Refresh", variant="secondary", elem_id="btn-refresh-projects")
                    project_action_status = gr.Textbox(label="Status", interactive=False, scale=3, elem_id="status-project-action")
                
                # Projects table
                projects_table = gr.Dataframe(
                    headers=["Name", "Source", "Version", "Formats", "Status", "Path"],
                    datatype=["str", "str", "str", "str", "str", "str"],
                    value=ProjectManager.get_projects_dataframe(),
                    interactive=False,
                    wrap=True,
                    row_count=(10, "dynamic"),
                    col_count=(6, "fixed"),
                    elem_id="projects-table"
                )
                
                gr.Markdown("---")
                
                with gr.Row():
                    with gr.Column(scale=1):
                        gr.Markdown("### 🎯 Actions")
                        
                        selected_project = gr.Textbox(
                            label="Selected Project Path",
                            placeholder="Select a project from table or enter path...",
                            interactive=True,
                            elem_id="selected-project-path"
                        )
                        
                        with gr.Row():
                            view_contract_btn = gr.Button("📄 View .rcl.md", variant="primary", elem_id="btn-view-rcl-md")
                            validate_btn = gr.Button("✅ Validate", variant="secondary", elem_id="btn-validate")
                        
                        with gr.Row():
                            generate_btn = gr.Button("🚀 Generate", variant="primary", elem_id="btn-generate")
                            view_ts_btn = gr.Button("📝 View .ts", variant="secondary", elem_id="btn-view-ts")
                    
                    with gr.Column(scale=2):
                        gr.Markdown("### 📋 Contract Preview")
                        project_contract_preview = gr.Code(
                            label="Contract Content",
                            language="typescript",
                            lines=20,
                            elem_id="project-contract-preview"
                        )
                
                gr.Markdown("""
                ---
                
                **Workflow:**
                1. Select project from table (copy path)
                2. **View .rcl.md** - Human-readable contract format
                3. **Validate** - Check contract using typed .rcl.ts format
                4. **Generate** - Build application to `target/` folder
                """)
            
            # Chat Tab
            with gr.Tab("💬 Chat", id="chat"):
                gr.Markdown("""
                ### Design Contract with AI
                
                Describe what you want to build and I'll generate the Mini-DSL contract.
                """)

                with gr.Row():
                    with gr.Column(scale=1):
                        chatbot = gr.Chatbot(
                            label="Conversation",
                            height=450,
                            elem_id="chatbot"
                        )

                        msg = gr.Textbox(
                            label="Your message",
                            placeholder="Describe what you want to build...",
                            lines=2,
                            elem_id="chat-message"
                        )

                        with gr.Row():
                            send_btn = gr.Button("Send", variant="primary", elem_id="btn-send")
                            clear_btn = gr.Button("Clear", elem_id="btn-clear")

                    with gr.Column(scale=1):
                        contract_preview = gr.Code(
                            label="Generated Contract (RCL)",
                            language="typescript",
                            lines=20,
                            elem_id="generated-contract"
                        )
                        
                        with gr.Row():
                            project_name = gr.Textbox(
                                label="Project Name",
                                value="my-app",
                                scale=2,
                                elem_id="project-name"
                            )
                            save_btn = gr.Button("💾 Save RCL", scale=1, elem_id="btn-save-rcl")
                            save_md_btn = gr.Button("📄 Save .rcl.md", scale=1, elem_id="btn-save-rcl-md")
                            
                        save_status = gr.Textbox(label="Status", interactive=False, elem_id="status-save")

            # Examples Tab  
            with gr.Tab("📚 Examples", id="examples"):
                gr.Markdown("### Load Example Contracts")
                
                with gr.Row():
                    with gr.Column(scale=1):
                        example_dropdown = gr.Dropdown(
                            choices=studio.list_examples(),
                            label="Select Example",
                            elem_id="example-dropdown"
                        )
                        load_btn = gr.Button("Load Example", variant="primary", elem_id="btn-load-example")
                        use_example_btn = gr.Button("📋 Use in Chat", variant="secondary", elem_id="btn-use-example")
                        example_status = gr.Textbox(label="Status", interactive=False, visible=True, elem_id="status-example")
                        
                    with gr.Column(scale=2):
                        example_preview = gr.Code(
                            label="Example Contract",
                            language="typescript",
                            lines=25,
                            elem_id="example-preview"
                        )

        # Event handlers
        def load_rcl_md_file(file_path):
            """Load .rcl.md file and parse to RCL"""
            if not file_path:
                return "❌ No file selected", ""
            
            try:
                from contract_validator import ContractValidator
                
                content = Path(file_path).read_text()
                
                # Extract contract from markdown
                validator = ContractValidator()
                result = validator.validate(content)
                
                if result.contract:
                    studio.current_contract = result.contract
                    return f"✅ Loaded: {Path(file_path).name}", result.contract
                else:
                    # Try to extract directly from code blocks
                    import re
                    code_match = re.search(r'```(?:yaml|rcl)?\n([\s\S]*?)```', content)
                    if code_match:
                        studio.current_contract = code_match.group(1).strip()
                        return f"✅ Loaded from code block", studio.current_contract
                    
                    return "⚠️ No contract found in file", content
                    
            except Exception as e:
                return f"❌ Error: {str(e)}", ""
        
        def save_as_rcl_md(project_name, contract_content):
            """Save contract as .rcl.md format"""
            if not contract_content.strip():
                return "❌ No contract to save"
            
            try:
                project_dir = PROJECTS_DIR / project_name / "contracts"
                project_dir.mkdir(parents=True, exist_ok=True)
                
                # Create .rcl.md content
                md_content = f"""# {project_name}

> Generated by Reclapp Studio

| Property | Value |
|----------|-------|
| Version | 1.0.0 |
| Created | {__import__('datetime').datetime.now().strftime('%Y-%m-%d')} |

---

## 📦 Contract

```rcl
{contract_content}
```

---

*Generated by Reclapp Studio*
"""
                
                contract_path = project_dir / "main.rcl.md"
                contract_path.write_text(md_content)
                
                return f"✅ Saved to {contract_path}"
                
            except Exception as e:
                return f"❌ Error: {str(e)}"
        
        def use_example_in_chat(example_content):
            """Copy example to chat contract preview"""
            if example_content and example_content.strip():
                studio.current_contract = example_content
                return example_content, "✅ Contract copied to Chat tab! Switch to 💬 Chat to continue."
            return "", "❌ No example loaded. First load an example."
        
        def save_session_log(history, contract, project_name="session"):
            """Save chat session as .rcl.md log file"""
            try:
                from datetime import datetime
                
                log_dir = PROJECTS_DIR / "logs"
                log_dir.mkdir(parents=True, exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                log_path = log_dir / f"{project_name}_{timestamp}.rcl.md"
                
                # Build .rcl.md content
                md_lines = [
                    f"# Reclapp Studio Session",
                    f"",
                    f"> Session log from {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                    f"",
                    f"| Property | Value |",
                    f"|----------|-------|",
                    f"| Project | {project_name} |",
                    f"| Created | {datetime.now().strftime('%Y-%m-%d')} |",
                    f"| Messages | {len(history)} |",
                    f"",
                    f"---",
                    f"",
                    f"## 💬 Conversation",
                    f""
                ]
                
                for i, (user_msg, assistant_msg) in enumerate(history, 1):
                    md_lines.append(f"### 🧑 User ({i})")
                    md_lines.append(f"")
                    md_lines.append(user_msg or "")
                    md_lines.append(f"")
                    md_lines.append(f"### 🤖 Assistant ({i})")
                    md_lines.append(f"")
                    md_lines.append(assistant_msg or "")
                    md_lines.append(f"")
                
                if contract:
                    md_lines.extend([
                        f"---",
                        f"",
                        f"## 📦 Generated Contract",
                        f"",
                        f"```rcl",
                        contract,
                        f"```",
                        f""
                    ])
                
                md_lines.append(f"---")
                md_lines.append(f"")
                md_lines.append(f"*Generated by Reclapp Studio*")
                
                log_path.write_text("\n".join(md_lines))
                return str(log_path)
                
            except Exception as e:
                return None
        
        async def respond(message, history):
            history = history or []

            # Normalize history to list of tuples
            normalized_history = []
            for h in history:
                if isinstance(h, (list, tuple)) and len(h) >= 2:
                    normalized_history.append((str(h[0]) if h[0] else "", str(h[1]) if h[1] else ""))

            response = ""
            async for chunk in studio.chat(message, normalized_history):
                response = chunk
                # Yield tuple format (user_msg, assistant_msg)
                yield normalized_history + [(message, response)], studio.current_contract or ""
            
            # Final yield with contract
            if studio.current_contract:
                yield normalized_history + [(message, response)], studio.current_contract
            
            # Auto-save session log in .rcl.md format
            final_history = normalized_history + [(message, response)]
            save_session_log(final_history, studio.current_contract, studio.project_name)

        def clear_chat():
            studio.current_contract = ""
            return [], ""

        def on_message_submit(message, history):
            """Clear input after submit"""
            return ""

        def load_example(name):
            if name:
                return studio.load_example(name.split('/')[0])
            return ""

        def save_contract(name, content):
            return studio.save_contract(name, content)

        # Project management handlers
        def refresh_projects():
            """Refresh projects table"""
            return ProjectManager.get_projects_dataframe(), "🔄 Projects refreshed"
        
        def view_project_contract(project_path, format='rcl_md'):
            """View contract in specified format"""
            if not project_path or not project_path.strip():
                return "❌ No project selected", ""
            content = ProjectManager.get_contract_content(project_path.strip(), format)
            return f"📄 Loaded contract from {project_path}", content
        
        def validate_project(project_path):
            """Validate project contract"""
            if not project_path or not project_path.strip():
                return "❌ No project selected"
            return ProjectManager.validate_project(project_path.strip())
        
        def generate_project(project_path):
            """Generate project target"""
            if not project_path or not project_path.strip():
                return "❌ No project selected"
            return ProjectManager.generate_project(project_path.strip())
        
        def on_project_select(evt: gr.SelectData, dataframe):
            """Handle project table row selection"""
            if evt.index is not None and len(evt.index) >= 1:
                row_idx = evt.index[0]
                if row_idx < len(dataframe):
                    # Get path from last column
                    return dataframe[row_idx][-1]
            return ""
        
        # Connect events
        # Welcome tab
        load_file_btn.click(load_rcl_md_file, [file_upload], [load_status, contract_preview])
        
        # Projects tab
        refresh_projects_btn.click(refresh_projects, None, [projects_table, project_action_status])
        projects_table.select(on_project_select, [projects_table], [selected_project])
        view_contract_btn.click(
            lambda p: view_project_contract(p, 'rcl_md'), 
            [selected_project], 
            [project_action_status, project_contract_preview]
        )
        view_ts_btn.click(
            lambda p: view_project_contract(p, 'ts'), 
            [selected_project], 
            [project_action_status, project_contract_preview]
        )
        validate_btn.click(validate_project, [selected_project], [project_action_status])
        generate_btn.click(generate_project, [selected_project], [project_action_status])
        
        # Chat tab
        msg.submit(respond, [msg, chatbot], [chatbot, contract_preview])
        send_btn.click(respond, [msg, chatbot], [chatbot, contract_preview])
        clear_btn.click(clear_chat, None, [chatbot, contract_preview])
        save_btn.click(save_contract, [project_name, contract_preview], [save_status])
        save_md_btn.click(save_as_rcl_md, [project_name, contract_preview], [save_status])
        
        # Examples tab
        load_btn.click(load_example, [example_dropdown], [example_preview])
        use_example_btn.click(use_example_in_chat, [example_preview], [contract_preview, example_status])

    return app


if __name__ == "__main__":
    app = create_ui()
    app.launch(
        server_name=STUDIO_HOST,
        server_port=STUDIO_PORT,
        theme=gr.themes.Soft(),
        css="""
        .container { max-width: 1200px; margin: auto; }
        .code-preview { font-family: monospace; }
        """,
        share=False
    )
