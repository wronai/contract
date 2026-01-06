import re
from typing import Any, Optional

import click as _click

from .renderer import get_renderer, render_markdown


group = _click.group
command = _click.command
option = _click.option
argument = _click.argument
pass_context = _click.pass_context
Choice = _click.Choice
Path = _click.Path
Context = _click.Context


_MD_HINT_RE = re.compile(r"(^|\n)\s*#{1,6}\s|```|\*\*|\[[^\]]+\]\([^)]+\)")


def echo(
    message: Optional[Any] = None,
    file=None,
    nl: bool = True,
    err: bool = False,
    color: Optional[bool] = None,
) -> None:
    if message is None:
        _click.echo(message, file=file, nl=nl, err=err, color=color)
        return

    text = str(message)
    if _MD_HINT_RE.search(text):
        stream = None
        if file is not None:
            stream = file
        elif err:
            import sys

            stream = sys.stderr
        r = get_renderer(stream=stream, use_colors=True)
        r.render_markdown_with_fences(text)
        return

    _click.echo(message, file=file, nl=nl, err=err, color=color)


def md(text: str) -> None:
    render_markdown(text)


__all__ = [
    "group",
    "command",
    "option",
    "argument",
    "pass_context",
    "Choice",
    "Path",
    "Context",
    "echo",
    "md",
]
