import sys
from io import StringIO

from click.testing import CliRunner

import clickmd
from clickmd.renderer import get_renderer

sys.path.insert(0, "src/python")
sys.path.insert(0, ".")

import reclapp.cli as c
import reclapp.evolve_command as ec


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
    def fake_evolve_sync(**kwargs):
        return 0

    monkeypatch.setattr(ec, "evolve_sync", fake_evolve_sync)

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
