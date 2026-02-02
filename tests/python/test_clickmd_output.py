import sys
import importlib.util
from io import StringIO
from pathlib import Path

import clickmd
from click.testing import CliRunner
from clickmd.renderer import get_renderer

# Find the wrapper cli.py specifically
project_root = Path(__file__).parent.parent.parent
wrapper_cli_path = project_root / "reclapp" / "cli.py"

spec = importlib.util.spec_from_file_location("reclapp_wrapper_cli", str(wrapper_cli_path))
wrapper_cli = importlib.util.module_from_spec(spec)
sys.modules["reclapp_wrapper_cli"] = wrapper_cli
spec.loader.exec_module(wrapper_cli)

import reclapp_wrapper_cli as c


class _TTYStringIO(StringIO):
    def isatty(self):
        return True


def test_clickmd_renderer_renders_fenced_yaml_with_ansi():
    buf = _TTYStringIO()
    r = get_renderer(stream=buf, use_colors=True)
    r.render_markdown_with_fences("```yaml\nkey: value\n```")

    out = buf.getvalue()
    assert "```yaml" in out
    assert "key" in out
    assert "value" in out
    assert "\x1b[" in out


def test_clickmd_echo_detects_markdown_and_renders_to_file():
    buf = StringIO()
    clickmd.echo("```yaml\nkey: value\n```", file=buf)

    out = buf.getvalue()
    assert "```yaml" in out
    assert "key" in out
    assert "value" in out


def test_reclapp_prompt_starts_with_markdown_header(monkeypatch):
    # Mock the core implementation instead of the legacy evolve_command
    class MockCoreMain:
        @staticmethod
        async def cmd_evolve(args):
            import clickmd
            clickmd.echo("## RECLAPP FULL LIFECYCLE")
            clickmd.echo("```log\nStarting evolution...\n```")
            return 0

    def mock_get_core_main():
        return MockCoreMain()

    monkeypatch.setattr(c, "_get_core_main", mock_get_core_main)

    res = CliRunner().invoke(
        c.main,
        [
            "--prompt",
            "Create a CRM",
            "--output",
            "./tmp-out",
            "--port",
            "3000",
        ],
    )

    assert res.exit_code == 0
    assert "RECLAPP FULL LIFECYCLE" in res.output
    assert "```log" in res.output
