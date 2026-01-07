#!/usr/bin/env python3

import argparse
import html
import os
import re
from pathlib import Path


_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def _inline_md_to_html(text: str) -> str:
    escaped = html.escape(text)

    def _bold(m: re.Match[str]) -> str:
        return f"<strong>{html.escape(m.group(1))}</strong>"

    def _link(m: re.Match[str]) -> str:
        label = html.escape(m.group(1))
        url = html.escape(m.group(2), quote=True)
        return f'<a href="{url}">{label}</a>'

    # Apply on unescaped source to preserve patterns, then escape pieces safely.
    # We therefore re-run on original and rebuild.
    # For simplicity, do patterns on escaped string (works because [ ] ( ) and * survive escaping).
    escaped = _BOLD_RE.sub(lambda m: f"<strong>{m.group(1)}</strong>", escaped)
    escaped = _LINK_RE.sub(lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', escaped)
    return escaped


def markdown_to_html(markdown_text: str, title: str) -> str:
    lines = (markdown_text or "").splitlines()

    out: list[str] = []

    in_code = False
    code_lang = ""
    code_buf: list[str] = []

    def flush_code() -> None:
        nonlocal in_code, code_lang, code_buf
        if not in_code:
            return
        code = "\n".join(code_buf)
        out.append(
            f"<pre><code class=\"language-{html.escape(code_lang)}\">{html.escape(code)}</code></pre>"
        )
        in_code = False
        code_lang = ""
        code_buf = []

    def start_code(lang: str) -> None:
        nonlocal in_code, code_lang, code_buf
        in_code = True
        code_lang = (lang or "").strip() or "text"
        code_buf = []

    out.append("<!doctype html>")
    out.append("<html lang=\"en\">")
    out.append("<head>")
    out.append("  <meta charset=\"utf-8\" />")
    out.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />")
    out.append(f"  <title>{html.escape(title)}</title>")
    out.append(
        "  <style>\n"
        "    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; max-width: 980px; margin: 0 auto; }\n"
        "    h1, h2, h3, h4, h5, h6 { margin: 24px 0 12px; }\n"
        "    p { line-height: 1.5; margin: 10px 0; }\n"
        "    pre { background: #0b1020; color: #e6edf3; padding: 14px; border-radius: 10px; overflow-x: auto; }\n"
        "    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; }\n"
        "    a { color: #2563eb; text-decoration: none; }\n"
        "    a:hover { text-decoration: underline; }\n"
        "    table { border-collapse: collapse; width: 100%; margin: 12px 0; }\n"
        "    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }\n"
        "    th { background: #f3f4f6; }\n"
        "  </style>"
    )
    out.append("</head>")
    out.append("<body>")

    paragraph: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if not paragraph:
            return
        text = " ".join([p.strip() for p in paragraph if p.strip()])
        if text:
            out.append(f"<p>{_inline_md_to_html(text)}</p>")
        paragraph = []

    # very small table support (GitHub-style pipes)
    def is_table_row(s: str) -> bool:
        t = s.strip()
        return t.startswith("|") and t.endswith("|") and "|" in t[1:-1]

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.rstrip("\n")

        fence = re.match(r"^(`{3,})(.*)$", stripped.strip())
        if fence:
            flush_paragraph()
            if not in_code:
                start_code(fence.group(2))
            else:
                flush_code()
            i += 1
            continue

        if in_code:
            code_buf.append(stripped)
            i += 1
            continue

        # Headings
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            flush_paragraph()
            level = len(m.group(1))
            out.append(f"<h{level}>{_inline_md_to_html(m.group(2).strip())}</h{level}>")
            i += 1
            continue

        # Tables (simple)
        if is_table_row(stripped) and i + 1 < len(lines) and re.match(r"^\|\s*[:-]-+.*\|$", lines[i + 1].strip()):
            flush_paragraph()
            header = [c.strip() for c in stripped.strip()[1:-1].split("|")]
            i += 2
            rows: list[list[str]] = []
            while i < len(lines) and is_table_row(lines[i]):
                row = [c.strip() for c in lines[i].strip()[1:-1].split("|")]
                rows.append(row)
                i += 1
            out.append("<table>")
            out.append("<thead><tr>" + "".join([f"<th>{_inline_md_to_html(c)}</th>" for c in header]) + "</tr></thead>")
            out.append("<tbody>")
            for row in rows:
                out.append("<tr>" + "".join([f"<td>{_inline_md_to_html(c)}</td>" for c in row]) + "</tr>")
            out.append("</tbody></table>")
            continue

        # Blank line ends paragraph
        if not stripped.strip():
            flush_paragraph()
            i += 1
            continue

        paragraph.append(stripped)
        i += 1

    flush_paragraph()
    flush_code()

    out.append("</body>")
    out.append("</html>")

    return "\n".join(out)


def convert_directory(md_dir: Path) -> None:
    for md_path in sorted(md_dir.glob("*.md")):
        title = md_path.stem
        html_path = md_path.with_suffix(".html")
        md_text = md_path.read_text(encoding="utf-8")
        html_text = markdown_to_html(md_text, title=title)
        html_path.write_text(html_text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("md_dir", help="Directory containing *.md files")
    args = parser.parse_args()

    md_dir = Path(args.md_dir)
    if not md_dir.exists() or not md_dir.is_dir():
        raise SystemExit(f"Not a directory: {md_dir}")

    convert_directory(md_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
