import sys
from io import StringIO

import clickmd
from click.testing import CliRunner
from clickmd.renderer import get_renderer

sys.path.insert(0, "src/python")
sys.path.insert(0, ".")

import reclapp.cli as c


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
