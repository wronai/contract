import os
import subprocess
import sys
from pathlib import Path


def _run_snippet(snippet: str) -> subprocess.CompletedProcess[str]:
    repo_root = Path(__file__).resolve().parents[2]
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{repo_root}:{repo_root / 'src' / 'python'}"

    return subprocess.run(
        [sys.executable, "-c", snippet],
        cwd=str(repo_root),
        env=env,
        capture_output=True,
        text=True,
    )


def test_click_wrapper_evolve_python_does_not_fallback_to_node():
    snippet = r'''
import sys
from click.testing import CliRunner

import reclapp.cli as c
import reclapp.evolve_command as ec

# If the wrapper tried to fallback to Node, it would call find_node / subprocess.run.

def bad_find_node():
    raise AssertionError("find_node() called (Node fallback attempted)")

c.find_node = bad_find_node


def bad_run(*args, **kwargs):
    raise AssertionError(f"subprocess.run() called from wrapper: {args}")

c.subprocess.run = bad_run


def fake_evolve_sync(**kwargs):
    return 0

ec.evolve_sync = fake_evolve_sync

res = CliRunner().invoke(c.main, [
    "evolve",
    "--prompt", "x",
    "--output", "./tmp-out",
    "--engine", "python",
])

print(res.exit_code)
print(res.output)

sys.exit(0 if res.exit_code == 0 else 1)
'''

    proc = _run_snippet(snippet)
    assert proc.returncode == 0, proc.stdout + "\n" + proc.stderr


def test_click_wrapper_generate_python_markdown_does_not_fallback_to_node():
    snippet = r'''
import sys
from click.testing import CliRunner

import reclapp.cli as c
import reclapp.generate_command as gc


def bad_find_node():
    raise AssertionError("find_node() called (Node fallback attempted)")

c.find_node = bad_find_node


def bad_run(*args, **kwargs):
    raise AssertionError(f"subprocess.run() called from wrapper: {args}")

c.subprocess.run = bad_run


def fake_generate_sync(**kwargs):
    return 0

gc.generate_sync = fake_generate_sync

res = CliRunner().invoke(c.main, [
    "generate",
    "x.md",
    "--output", "./tmp-out",
    "--engine", "python",
])

print(res.exit_code)
print(res.output)

sys.exit(0 if res.exit_code == 0 else 1)
'''

    proc = _run_snippet(snippet)
    assert proc.returncode == 0, proc.stdout + "\n" + proc.stderr


def test_click_wrapper_lifecycle_runs_python_engine_not_bash_or_node():
    snippet = r'''
import sys
from click.testing import CliRunner

import reclapp.cli as c
import reclapp.evolve_command as ec


def bad_find_node():
    raise AssertionError("find_node() called (Node fallback attempted)")

c.find_node = bad_find_node


def bad_run(*args, **kwargs):
    raise AssertionError(f"subprocess.run() called from wrapper: {args}")

c.subprocess.run = bad_run


def fake_evolve_sync(**kwargs):
    return 0

ec.evolve_sync = fake_evolve_sync

res = CliRunner().invoke(c.main, [
    "lifecycle",
    "--prompt", "x",
    "--output", "./tmp-out",
    "--port", "3000",
])

print(res.exit_code)
print(res.output)

sys.exit(0 if res.exit_code == 0 else 1)
'''

    proc = _run_snippet(snippet)
    assert proc.returncode == 0, proc.stdout + "\n" + proc.stderr
