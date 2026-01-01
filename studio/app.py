#!/usr/bin/env python3
"""
Reclapp Studio - Conversational Contract Designer

Web UI for designing Reclapp contracts using natural language
with local LLM (Ollama) support.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Generator, Optional

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
    ) as app:
        gr.Markdown("""
        # 🚀 Reclapp Studio
        
        Design application contracts using natural language. 
        Describe what you want to build, and I'll generate the Mini-DSL contract.
        
        **Examples:** "Create a CRM with contacts and deals" | "Build an e-commerce system" | "Design a project management app"
        """)

        with gr.Row():
            with gr.Column(scale=1):
                chatbot = gr.Chatbot(
                    label="Conversation",
                    height=500
                )

                msg = gr.Textbox(
                    label="Your message",
                    placeholder="Describe what you want to build...",
                    lines=2
                )

                with gr.Row():
                    send_btn = gr.Button("Send", variant="primary")
                    clear_btn = gr.Button("Clear")

            with gr.Column(scale=1):
                with gr.Tab("Contract Preview"):
                    contract_preview = gr.Code(
                        label="Generated Contract",
                        language="typescript",
                        lines=25
                    )

                with gr.Tab("Examples"):
                    example_dropdown = gr.Dropdown(
                        choices=studio.list_examples(),
                        label="Load Example"
                    )
                    load_btn = gr.Button("Load")
                    example_preview = gr.Code(
                        label="Example Contract",
                        language="typescript",
                        lines=20
                    )

                with gr.Row():
                    project_name = gr.Textbox(
                        label="Project Name",
                        value="my-app",
                        scale=2
                    )
                    save_btn = gr.Button("💾 Save", scale=1)
                    
                save_status = gr.Textbox(label="Status", interactive=False)

        # Event handlers
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

        # Connect events
        msg.submit(respond, [msg, chatbot], [chatbot, contract_preview])
        send_btn.click(respond, [msg, chatbot], [chatbot, contract_preview])
        clear_btn.click(clear_chat, None, [chatbot, contract_preview])
        load_btn.click(load_example, [example_dropdown], [example_preview])
        save_btn.click(save_contract, [project_name, contract_preview], [save_status])

        gr.Markdown("""
        ---
        **Tips:**
        - Say "generate" to get the full contract
        - Use "add entity X with fields a, b, c" to add entities
        - Say "add alerts for high-risk scenarios"
        - Request specific features: "add real-time dashboard"
        """)

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
