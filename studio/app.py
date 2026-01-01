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

# Configuration
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:7b-instruct-q4_0")
CODE_MODEL = os.environ.get("CODE_MODEL", "codellama:7b-instruct-q4_0")
PROJECTS_DIR = Path("projects")
EXAMPLES_DIR = Path("examples")

# Load system prompt
SYSTEM_PROMPT_PATH = Path("prompts/system.txt")
if SYSTEM_PROMPT_PATH.exists():
    SYSTEM_PROMPT = SYSTEM_PROMPT_PATH.read_text()
else:
    SYSTEM_PROMPT = """You are a contract designer for Reclapp.
Help users design application contracts using the Reclapp Mini-DSL format.
When the user says "generate", output the complete contract.rcl file."""


class ReclappStudio:
    def __init__(self):
        self.conversation_history = []
        self.current_contract = ""
        self.project_name = "my-app"

    async def chat(self, message: str, history: list) -> Generator[str, None, None]:
        """Chat with Ollama to design contract"""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for h in history:
            if isinstance(h, (list, tuple)) and len(h) >= 2:
                messages.append({"role": "user", "content": h[0]})
                if h[1]:
                    messages.append({"role": "assistant", "content": h[1]})

        messages.append({"role": "user", "content": message})

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{OLLAMA_HOST}/api/chat",
                    json={
                        "model": OLLAMA_MODEL,
                        "messages": messages,
                        "stream": True
                    },
                    timeout=120.0
                )

                full_response = ""
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

                # Check if this looks like a contract
                if "entity " in full_response or "app " in full_response:
                    self.current_contract = self.extract_contract(full_response)

        except httpx.ConnectError:
            yield "❌ Cannot connect to Ollama. Make sure it's running at " + OLLAMA_HOST
        except Exception as e:
            yield f"❌ Error: {str(e)}"

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

            # Normalize history for broad Gradio compatibility (list[tuple[str, str]])
            normalized_history = []
            for h in history:
                if isinstance(h, (list, tuple)) and len(h) >= 2:
                    normalized_history.append((h[0], h[1]))

            response = ""
            async for chunk in studio.chat(message, normalized_history):
                response = chunk
                yield normalized_history + [(message, response)], studio.current_contract or ""
            
            # Update contract preview if we have a contract
            if studio.current_contract:
                yield normalized_history + [(message, response)], studio.current_contract

        def clear_chat():
            studio.current_contract = ""
            return [], ""

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
        server_name="0.0.0.0",
        server_port=7860,
        theme=gr.themes.Soft(),
        css="""
        .container { max-width: 1200px; margin: auto; }
        .code-preview { font-family: monospace; }
        """,
        share=False
    )
