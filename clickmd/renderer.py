"""
clickmd.renderer - Markdown rendering with ANSI colors.

Core rendering engine for clickmd with support for:
- Headings, code blocks, syntax highlighting
- Tables (ASCII/Unicode)
- Panels/boxes with styles
- Blockquotes, horizontal rules
- Checklists, nested lists
"""

import os
import re
import shutil
import sys
from typing import Literal, Optional


_COLORS = {
    "reset": "\x1b[0m",
    "bold": "\x1b[1m",
    "dim": "\x1b[2m",
    "black": "\x1b[30m",
    "red": "\x1b[31m",
    "green": "\x1b[32m",
    "yellow": "\x1b[33m",
    "blue": "\x1b[34m",
    "magenta": "\x1b[35m",
    "cyan": "\x1b[36m",
    "white": "\x1b[37m",
    "gray": "\x1b[90m",
}


_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


class MarkdownRenderer:
    def __init__(self, use_colors: bool = True, stream=None):
        self._stream = stream if stream is not None else sys.stdout
        is_tty = True
        try:
            is_tty = self._stream.isatty()
        except Exception:
            is_tty = True
        self._use_colors = bool(use_colors) and is_tty

    def _c(self, color: str, text: str, bold: bool = False, dim: bool = False) -> str:
        if not self._use_colors:
            return text
        prefix = ""
        if bold:
            prefix += _COLORS["bold"]
        if dim:
            prefix += _COLORS["dim"]
        return f"{prefix}{_COLORS[color]}{text}{_COLORS['reset']}"
    
    def _get_terminal_width(self) -> int:
        """Get terminal width, default to 80 if unavailable."""
        try:
            return shutil.get_terminal_size().columns
        except Exception:
            return 80

    def _writeln(self, text: str) -> None:
        print(text, file=self._stream)

    def heading(self, level: int, text: str) -> None:
        prefix = "#" * max(1, int(level))
        self._writeln("")
        self._writeln(self._c("bold", self._c("cyan", f"{prefix} {text}")))
        self._writeln("")

    def codeblock(self, lang: str, content: str) -> None:
        lang = (lang or "text").split(":")[0].strip() or "text"
        self._writeln("")
        self._writeln(self._c("gray", f"```{lang}"))
        for line in (content or "").split("\n"):
            self._writeln(self._highlight_line(lang, line))
        self._writeln(self._c("gray", "```"))
        self._writeln("")

    def render_markdown_with_fences(self, markdown_text: str, text_lang: str = "markdown") -> None:
        lines = (markdown_text or "").split("\n")
        in_fence = False
        fence = "```"
        lang = "text"
        buf: list[str] = []

        def flush() -> None:
            nonlocal in_fence, fence, lang, buf
            if not in_fence:
                return
            self.codeblock(lang, "\n".join(buf))
            in_fence = False
            fence = "```"
            lang = "text"
            buf = []

        for line in lines:
            trimmed = line.rstrip()
            m = re.match(r"^(`{3,})(.*)$", trimmed)
            if not in_fence:
                if m:
                    in_fence = True
                    fence = m.group(1)
                    lang = (m.group(2) or "").strip() or "text"
                    buf = []
                else:
                    self._writeln(self._highlight_line(text_lang, line))
            else:
                if trimmed.strip() == fence:
                    flush()
                else:
                    buf.append(line)

        flush()

    def _highlight_line(self, lang: str, line: str) -> str:
        l = (lang or "text").lower()
        if l in ("yaml", "yml"):
            return self._highlight_yaml(line)
        if l == "json":
            return self._highlight_json(line)
        if l in ("bash", "sh", "shell", "zsh"):
            return self._highlight_bash(line)
        if l in ("typescript", "ts", "javascript", "js", "jsx", "tsx"):
            return self._highlight_js(line)
        if l in ("python", "py"):
            return self._highlight_python(line)
        if l in ("markdown", "md"):
            return self._highlight_markdown(line)
        if l in ("log",):
            return self._highlight_log(line)
        if l in ("html", "htm", "xml", "svg"):
            return self._highlight_html(line)
        if l in ("css", "scss", "sass", "less"):
            return self._highlight_css(line)
        if l in ("sql", "mysql", "postgresql", "sqlite"):
            return self._highlight_sql(line)
        if l in ("toml", "ini", "cfg", "conf"):
            return self._highlight_toml(line)
        if l in ("go", "golang"):
            return self._highlight_go(line)
        if l in ("rust", "rs"):
            return self._highlight_rust(line)
        if l in ("java", "kotlin", "kt", "scala"):
            return self._highlight_java(line)
        if l in ("c", "cpp", "c++", "h", "hpp", "cxx"):
            return self._highlight_c(line)
        if l in ("ruby", "rb"):
            return self._highlight_ruby(line)
        if l in ("php"):
            return self._highlight_php(line)
        if l in ("dockerfile", "docker"):
            return self._highlight_dockerfile(line)
        if l in ("diff", "patch"):
            return self._highlight_diff(line)
        return self._c("white", line)

    def _highlight_log(self, line: str) -> str:
        trimmed = line.strip()
        if trimmed.startswith("🛑"):
            return self._c("red", line)
        if trimmed.startswith("⚠️"):
            return self._c("yellow", line)
        if trimmed.startswith("🚀"):
            return self._c("green", line)
        if trimmed.startswith("📦") or trimmed.startswith("💬") or trimmed.startswith("🔄"):
            return self._c("cyan", line)
        if trimmed.startswith("🎫") or trimmed.startswith("📝"):
            return self._c("yellow", line)
        if trimmed.startswith("📊") or "📊 Progress" in trimmed:
            return self._c("magenta", line)
        if trimmed.startswith("## "):
            return self._c("cyan", line)
        if trimmed.startswith("→ "):
            return self._c("gray", line)
        if "✅" in line:
            return self._c("green", line)
        if "❌" in line or "Error" in line or "ERR_" in line or "Exception" in line:
            return self._c("red", line)
        if "⚠️" in line or "warning" in line.lower():
            return self._c("yellow", line)
        return self._c("white", line)

    def _highlight_markdown(self, line: str) -> str:
        if re.match(r"^#{1,6}\s", line):
            return self._c("cyan", line)

        def _bold(m: re.Match[str]) -> str:
            return self._c("bold", m.group(1))

        result = re.sub(r"\*\*([^*]+)\*\*", _bold, line)

        def _link(m: re.Match[str]) -> str:
            label = self._c("blue", f"[{m.group(1)}]")
            url = self._c("gray", m.group(2))
            return f"{label}({url})"

        result = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", _link, result)
        return result

    def _highlight_yaml(self, line: str) -> str:
        if line.strip().startswith("#"):
            return self._c("gray", line)

        m = re.match(r"^(\s*)([^:]+)(:)(.*)$", line)
        if m:
            indent, key, colon, value = m.groups()
            colored_key = self._c("cyan", key)
            colored_colon = self._c("white", colon)
            trimmed = value.strip()
            colored_value = value
            if trimmed in ("true", "false"):
                colored_value = self._c("yellow", value)
            elif re.match(r"^\d+$", trimmed):
                colored_value = self._c("magenta", value)
            elif trimmed.startswith('"') or trimmed.startswith("'"):
                colored_value = self._c("green", value)
            elif trimmed in ("null", "~"):
                colored_value = self._c("gray", value)
            elif trimmed:
                colored_value = self._c("green", value)
            return f"{indent}{colored_key}{colored_colon}{colored_value}"

        if line.strip().startswith("-"):
            m2 = re.match(r"^(\s*)(-)(.*)$", line)
            if m2:
                indent, dash, rest = m2.groups()
                return f"{indent}{self._c('white', dash)}{self._c('green', rest)}"

        return line

    def _highlight_json(self, line: str) -> str:
        result = line
        result = re.sub(r'"([^"]+)":', lambda m: f"{self._c('cyan', f'\"{m.group(1)}\"')}:" , result)
        result = re.sub(r':\s*"([^"]*)"', lambda m: f": {self._c('green', f'\"{m.group(1)}\"')}" , result)
        result = re.sub(r":\s*(\d+)", lambda m: f": {self._c('magenta', m.group(1))}" , result)
        result = re.sub(r":\s*(true|false)", lambda m: f": {self._c('yellow', m.group(1))}" , result)
        result = re.sub(r":\s*null", f": {self._c('gray', 'null')}", result)
        return result

    def _highlight_bash(self, line: str) -> str:
        if line.strip().startswith("#"):
            return self._c("gray", line)
        words = line.split(" ")
        if words and words[0]:
            cmd = words[0]
            args = " ".join(words[1:])
            if args:
                return f"{self._c('green', cmd)} {self._c('white', args)}"
            return self._c("green", cmd)
        return line

    def _highlight_js(self, line: str) -> str:
        if line.strip().startswith("//"):
            return self._c("gray", line)

        result = line

        keywords = [
            "const",
            "let",
            "var",
            "function",
            "async",
            "await",
            "return",
            "if",
            "else",
            "for",
            "while",
            "import",
            "export",
            "from",
            "class",
            "interface",
            "type",
        ]
        for kw in keywords:
            result = re.sub(rf"\b{re.escape(kw)}\b", self._c("magenta", kw), result)

        result = re.sub(r"'([^']*)'", lambda m: self._c("green", f"'{m.group(1)}'"), result)
        result = re.sub(r'"([^"]*)"', lambda m: self._c("green", f'"{m.group(1)}"'), result)
        result = re.sub(r"`([^`]*)`", lambda m: self._c("green", f"`{m.group(1)}`"), result)

        if "//" in result:
            parts = result.split("//", 1)
            result = parts[0] + self._c("gray", "//" + parts[1])

        return result

    def _highlight_python(self, line: str) -> str:
        # Comments
        if line.strip().startswith("#"):
            return self._c("gray", line)

        result = line

        # Keywords
        keywords = [
            "def", "class", "if", "elif", "else", "for", "while", "try", "except",
            "finally", "with", "as", "import", "from", "return", "yield", "raise",
            "pass", "break", "continue", "and", "or", "not", "in", "is", "lambda",
            "async", "await", "None", "True", "False", "global", "nonlocal",
        ]
        for kw in keywords:
            result = re.sub(rf"\b{re.escape(kw)}\b", self._c("magenta", kw), result)

        # Decorators
        result = re.sub(r"(@\w+)", lambda m: self._c("yellow", m.group(1)), result)

        # Strings (single and double quotes)
        result = re.sub(r'""".*?"""', lambda m: self._c("green", m.group(0)), result)
        result = re.sub(r"'''.*?'''", lambda m: self._c("green", m.group(0)), result)
        result = re.sub(r'"([^"\\]|\\.)*"', lambda m: self._c("green", m.group(0)), result)
        result = re.sub(r"'([^'\\]|\\.)*'", lambda m: self._c("green", m.group(0)), result)

        # f-strings (highlight the f prefix)
        result = re.sub(r'\bf(["\'])', lambda m: self._c("cyan", "f") + m.group(1), result)

        # Numbers
        result = re.sub(r"\b(\d+\.?\d*)\b", lambda m: self._c("cyan", m.group(1)), result)

        # Built-in functions
        builtins = ["print", "len", "range", "str", "int", "float", "list", "dict", "set", "tuple", "type", "isinstance", "hasattr", "getattr", "setattr", "open", "super", "self"]
        for bi in builtins:
            result = re.sub(rf"\b{re.escape(bi)}\b(?=\s*\()", lambda m, b=bi: self._c("blue", b), result)

        # Inline comments
        if "#" in result:
            parts = result.split("#", 1)
            result = parts[0] + self._c("gray", "#" + parts[1])

        return result

    def _highlight_html(self, line: str) -> str:
        """Highlight HTML/XML syntax."""
        if line.strip().startswith("<!--"):
            return self._c("gray", line)
        # Tags
        result = re.sub(r"(</?)([\w-]+)", lambda m: m.group(1) + self._c("magenta", m.group(2)), line)
        # Attributes
        result = re.sub(r'(\s)([\w-]+)(=)', lambda m: m.group(1) + self._c("cyan", m.group(2)) + m.group(3), result)
        # Attribute values
        result = re.sub(r'="([^"]*)"', lambda m: '="' + self._c("green", m.group(1)) + '"', result)
        return result

    def _highlight_css(self, line: str) -> str:
        """Highlight CSS syntax."""
        if line.strip().startswith("/*") or line.strip().startswith("//"):
            return self._c("gray", line)
        # Properties
        result = re.sub(r"([\w-]+)(\s*:)", lambda m: self._c("cyan", m.group(1)) + m.group(2), line)
        # Values with units
        result = re.sub(r":\s*([^;{]+)", lambda m: ": " + self._c("green", m.group(1).strip()), result)
        # Selectors
        result = re.sub(r"^(\s*)([\w.#\[\]=-]+)(\s*\{)", lambda m: m.group(1) + self._c("yellow", m.group(2)) + m.group(3), result)
        return result

    def _highlight_sql(self, line: str) -> str:
        """Highlight SQL syntax."""
        if line.strip().startswith("--"):
            return self._c("gray", line)
        result = line
        keywords = ["SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", 
                    "TABLE", "INDEX", "INTO", "VALUES", "SET", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER",
                    "ON", "AND", "OR", "NOT", "NULL", "IS", "IN", "LIKE", "ORDER", "BY", "GROUP", "HAVING",
                    "LIMIT", "OFFSET", "AS", "DISTINCT", "COUNT", "SUM", "AVG", "MAX", "MIN", "PRIMARY", "KEY",
                    "FOREIGN", "REFERENCES", "CASCADE", "CONSTRAINT", "DEFAULT", "AUTO_INCREMENT", "SERIAL"]
        for kw in keywords:
            result = re.sub(rf"\b{kw}\b", self._c("magenta", kw), result, flags=re.IGNORECASE)
        # Strings
        result = re.sub(r"'([^']*)'", lambda m: self._c("green", f"'{m.group(1)}'"), result)
        # Numbers
        result = re.sub(r"\b(\d+)\b", lambda m: self._c("cyan", m.group(1)), result)
        return result

    def _highlight_toml(self, line: str) -> str:
        """Highlight TOML/INI syntax."""
        if line.strip().startswith("#") or line.strip().startswith(";"):
            return self._c("gray", line)
        # Section headers
        if re.match(r"^\s*\[", line):
            return self._c("magenta", line)
        # Key-value
        m = re.match(r"^(\s*)([^=]+)(=)(.*)$", line)
        if m:
            indent, key, eq, value = m.groups()
            return f"{indent}{self._c('cyan', key.strip())}{eq}{self._c('green', value)}"
        return line

    def _highlight_go(self, line: str) -> str:
        """Highlight Go syntax."""
        if line.strip().startswith("//"):
            return self._c("gray", line)
        result = line
        keywords = ["func", "package", "import", "var", "const", "type", "struct", "interface",
                    "if", "else", "for", "range", "switch", "case", "default", "return", "defer",
                    "go", "chan", "select", "break", "continue", "fallthrough", "goto", "map", "make", "new"]
        for kw in keywords:
            result = re.sub(rf"\b{kw}\b", self._c("magenta", kw), result)
        # Strings
        result = re.sub(r'"([^"]*)"', lambda m: self._c("green", f'"{m.group(1)}"'), result)
        result = re.sub(r"`([^`]*)`", lambda m: self._c("green", f"`{m.group(1)}`"), result)
        return result

    def _highlight_rust(self, line: str) -> str:
        """Highlight Rust syntax."""
        if line.strip().startswith("//"):
            return self._c("gray", line)
        result = line
        keywords = ["fn", "let", "mut", "const", "static", "struct", "enum", "impl", "trait", "pub", "mod", "use",
                    "if", "else", "match", "for", "while", "loop", "return", "break", "continue",
                    "self", "Self", "super", "crate", "where", "async", "await", "move", "dyn", "ref", "type"]
        for kw in keywords:
            result = re.sub(rf"\b{kw}\b", self._c("magenta", kw), result)
        # Macros
        result = re.sub(r"(\w+)!", lambda m: self._c("yellow", m.group(1)) + "!", result)
        # Strings
        result = re.sub(r'"([^"]*)"', lambda m: self._c("green", f'"{m.group(1)}"'), result)
        return result

    def _highlight_java(self, line: str) -> str:
        """Highlight Java/Kotlin syntax."""
        if line.strip().startswith("//"):
            return self._c("gray", line)
        result = line
        keywords = ["public", "private", "protected", "static", "final", "abstract", "class", "interface",
                    "extends", "implements", "new", "this", "super", "return", "if", "else", "for", "while",
                    "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "throws",
                    "import", "package", "void", "int", "long", "double", "float", "boolean", "String",
                    "true", "false", "null", "fun", "val", "var", "override", "data", "object", "companion"]
        for kw in keywords:
            result = re.sub(rf"\b{kw}\b", self._c("magenta", kw), result)
        # Annotations
        result = re.sub(r"(@\w+)", lambda m: self._c("yellow", m.group(1)), result)
        # Strings
        result = re.sub(r'"([^"]*)"', lambda m: self._c("green", f'"{m.group(1)}"'), result)
        return result

    def _highlight_c(self, line: str) -> str:
        """Highlight C/C++ syntax."""
        if line.strip().startswith("//") or line.strip().startswith("/*"):
            return self._c("gray", line)
        result = line
        keywords = ["if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return",
                    "int", "char", "float", "double", "void", "long", "short", "unsigned", "signed",
                    "struct", "union", "enum", "typedef", "const", "static", "extern", "volatile",
                    "sizeof", "NULL", "nullptr", "true", "false", "class", "public", "private", "protected",
                    "virtual", "override", "template", "typename", "namespace", "using", "new", "delete",
                    "try", "catch", "throw", "auto", "constexpr", "inline", "explicit"]
        for kw in keywords:
            result = re.sub(rf"\b{kw}\b", self._c("magenta", kw), result)
        # Preprocessor
        result = re.sub(r"^(\s*#\w+)", lambda m: self._c("yellow", m.group(1)), result)
        # Strings
        result = re.sub(r'"([^"]*)"', lambda m: self._c("green", f'"{m.group(1)}"'), result)
        return result

    def _highlight_ruby(self, line: str) -> str:
        """Highlight Ruby syntax."""
        if line.strip().startswith("#"):
            return self._c("gray", line)
        result = line
        keywords = ["def", "end", "class", "module", "if", "elsif", "else", "unless", "case", "when",
                    "while", "until", "for", "do", "return", "yield", "break", "next", "redo", "retry",
                    "begin", "rescue", "ensure", "raise", "require", "include", "extend", "attr_accessor",
                    "attr_reader", "attr_writer", "private", "public", "protected", "self", "super",
                    "true", "false", "nil", "and", "or", "not", "in", "then", "lambda", "proc"]
        for kw in keywords:
            result = re.sub(rf"\b{kw}\b", self._c("magenta", kw), result)
        # Symbols
        result = re.sub(r"(:\w+)", lambda m: self._c("cyan", m.group(1)), result)
        # Strings
        result = re.sub(r'"([^"]*)"', lambda m: self._c("green", f'"{m.group(1)}"'), result)
        result = re.sub(r"'([^']*)'", lambda m: self._c("green", f"'{m.group(1)}'"), result)
        return result

    def _highlight_php(self, line: str) -> str:
        """Highlight PHP syntax."""
        if line.strip().startswith("//") or line.strip().startswith("#"):
            return self._c("gray", line)
        result = line
        keywords = ["function", "class", "interface", "trait", "extends", "implements", "public", "private",
                    "protected", "static", "final", "abstract", "const", "var", "new", "return", "if", "else",
                    "elseif", "switch", "case", "break", "continue", "for", "foreach", "while", "do",
                    "try", "catch", "finally", "throw", "use", "namespace", "require", "include", "echo",
                    "print", "true", "false", "null", "array", "callable", "iterable", "object", "string",
                    "int", "float", "bool", "void", "mixed", "self", "parent", "fn", "match"]
        for kw in keywords:
            result = re.sub(rf"\b{kw}\b", self._c("magenta", kw), result)
        # Variables
        result = re.sub(r"(\$\w+)", lambda m: self._c("cyan", m.group(1)), result)
        # Strings
        result = re.sub(r'"([^"]*)"', lambda m: self._c("green", f'"{m.group(1)}"'), result)
        result = re.sub(r"'([^']*)'", lambda m: self._c("green", f"'{m.group(1)}'"), result)
        return result

    def _highlight_dockerfile(self, line: str) -> str:
        """Highlight Dockerfile syntax."""
        if line.strip().startswith("#"):
            return self._c("gray", line)
        # Instructions
        instructions = ["FROM", "RUN", "CMD", "LABEL", "EXPOSE", "ENV", "ADD", "COPY", "ENTRYPOINT",
                        "VOLUME", "USER", "WORKDIR", "ARG", "ONBUILD", "STOPSIGNAL", "HEALTHCHECK", "SHELL"]
        for inst in instructions:
            if line.strip().upper().startswith(inst):
                parts = line.split(None, 1)
                if parts:
                    rest = parts[1] if len(parts) > 1 else ""
                    return self._c("magenta", parts[0]) + " " + self._c("white", rest)
        return line

    def _highlight_diff(self, line: str) -> str:
        """Highlight diff/patch syntax."""
        if line.startswith("+++") or line.startswith("---"):
            return self._c("white", line, bold=True)
        if line.startswith("@@"):
            return self._c("cyan", line)
        if line.startswith("+"):
            return self._c("green", line)
        if line.startswith("-"):
            return self._c("red", line)
        return self._c("gray", line)

    # =========================================================================
    # TABLES
    # =========================================================================
    
    def table(
        self,
        headers: list[str],
        rows: list[list[str]],
        style: Literal["ascii", "unicode", "minimal", "none"] = "unicode",
        align: Optional[list[Literal["left", "center", "right"]]] = None,
        markdown_safe: bool = True,
    ) -> None:
        """
        Render a table with configurable style.
        
        Args:
            headers: Column headers
            rows: Table rows (list of lists)
            style: Border style - "ascii", "unicode", "minimal", "none"
            align: Column alignment - list of "left", "center", "right"
            markdown_safe: Wrap in codeblock for markdown compatibility
        """
        if not headers and not rows:
            return
        
        # Calculate column widths
        num_cols = len(headers) if headers else (len(rows[0]) if rows else 0)
        widths = [0] * num_cols
        
        for i, h in enumerate(headers):
            if i < num_cols:
                widths[i] = max(widths[i], len(strip_ansi(str(h))))
        
        for row in rows:
            for i, cell in enumerate(row):
                if i < num_cols:
                    widths[i] = max(widths[i], len(strip_ansi(str(cell))))
        
        # Add padding
        widths = [w + 2 for w in widths]
        
        # Default alignment
        if align is None:
            align = ["left"] * num_cols
        
        # Style characters
        chars = self._get_table_chars(style)
        
        def align_cell(text: str, width: int, alignment: str) -> str:
            text_len = len(strip_ansi(text))
            padding = width - text_len
            if alignment == "center":
                left_pad = padding // 2
                right_pad = padding - left_pad
                return " " * left_pad + text + " " * right_pad
            elif alignment == "right":
                return " " * padding + text
            else:  # left
                return text + " " * padding
        
        # Start codeblock for markdown safety
        if markdown_safe:
            self._writeln("```")
        
        # Top border
        if chars["top_left"]:
            top = chars["top_left"] + chars["top_mid"].join(
                chars["horizontal"] * w for w in widths
            ) + chars["top_right"]
            self._writeln(self._c("gray", top))
        
        # Header
        if headers:
            header_cells = []
            for i, h in enumerate(headers):
                w = widths[i] if i < len(widths) else 10
                a = align[i] if i < len(align) else "left"
                colored = self._c("cyan", str(h), bold=True)
                header_cells.append(align_cell(colored, w, a))
            
            header_line = chars["vertical"] + chars["vertical"].join(header_cells) + chars["vertical"]
            self._writeln(header_line)
            
            # Header separator
            sep = chars["mid_left"] + chars["mid_mid"].join(
                chars["horizontal"] * w for w in widths
            ) + chars["mid_right"]
            self._writeln(self._c("gray", sep))
        
        # Rows
        for row in rows:
            row_cells = []
            for i in range(num_cols):
                cell = str(row[i]) if i < len(row) else ""
                w = widths[i] if i < len(widths) else 10
                a = align[i] if i < len(align) else "left"
                row_cells.append(align_cell(cell, w, a))
            
            row_line = chars["vertical"] + chars["vertical"].join(row_cells) + chars["vertical"]
            self._writeln(row_line)
        
        # Bottom border
        if chars["bottom_left"]:
            bottom = chars["bottom_left"] + chars["bottom_mid"].join(
                chars["horizontal"] * w for w in widths
            ) + chars["bottom_right"]
            self._writeln(self._c("gray", bottom))
        
        # End codeblock
        if markdown_safe:
            self._writeln("```")
    
    def _get_table_chars(self, style: str) -> dict[str, str]:
        """Get table border characters for style."""
        if style == "unicode":
            return {
                "horizontal": "─",
                "vertical": "│",
                "top_left": "┌",
                "top_right": "┐",
                "top_mid": "┬",
                "mid_left": "├",
                "mid_right": "┤",
                "mid_mid": "┼",
                "bottom_left": "└",
                "bottom_right": "┘",
                "bottom_mid": "┴",
            }
        elif style == "ascii":
            return {
                "horizontal": "-",
                "vertical": "|",
                "top_left": "+",
                "top_right": "+",
                "top_mid": "+",
                "mid_left": "+",
                "mid_right": "+",
                "mid_mid": "+",
                "bottom_left": "+",
                "bottom_right": "+",
                "bottom_mid": "+",
            }
        elif style == "minimal":
            return {
                "horizontal": "─",
                "vertical": " ",
                "top_left": "",
                "top_right": "",
                "top_mid": " ",
                "mid_left": "",
                "mid_right": "",
                "mid_mid": " ",
                "bottom_left": "",
                "bottom_right": "",
                "bottom_mid": " ",
            }
        else:  # none
            return {
                "horizontal": "",
                "vertical": " ",
                "top_left": "",
                "top_right": "",
                "top_mid": "",
                "mid_left": "",
                "mid_right": "",
                "mid_mid": "",
                "bottom_left": "",
                "bottom_right": "",
                "bottom_mid": "",
            }
    
    # =========================================================================
    # PANELS / BOXES
    # =========================================================================
    
    def panel(
        self,
        content: str,
        title: Optional[str] = None,
        style: Literal["default", "info", "warning", "error", "success"] = "default",
        width: Optional[int] = None,
        markdown_safe: bool = True,
    ) -> None:
        """
        Render content in a styled panel/box.
        
        Args:
            content: Text content (can be multiline)
            title: Optional panel title
            style: Panel style - "default", "info", "warning", "error", "success"
            width: Panel width (default: terminal width - 4)
            markdown_safe: Wrap in codeblock for markdown compatibility
        """
        style_colors = {
            "default": "white",
            "info": "blue",
            "warning": "yellow",
            "error": "red",
            "success": "green",
        }
        color = style_colors.get(style, "white")
        
        # Calculate width
        term_width = self._get_terminal_width()
        panel_width = width or min(term_width - 4, 76)
        inner_width = panel_width - 4  # Account for borders and padding
        
        # Box drawing characters
        tl, tr, bl, br = "┌", "┐", "└", "┘"
        h, v = "─", "│"
        
        # Start codeblock for markdown safety
        if markdown_safe:
            self._writeln("```")
        
        # Top border with optional title
        if title:
            title_display = f" {title} "
            title_len = len(title_display)
            left_pad = 2
            right_pad = panel_width - 2 - title_len - left_pad
            top = tl + h * left_pad + self._c(color, title_display, bold=True) + h * max(0, right_pad) + tr
        else:
            top = tl + h * (panel_width - 2) + tr
        
        self._writeln(self._c(color, top) if not title else top)
        
        # Content lines
        lines = content.split("\n")
        for line in lines:
            # Wrap long lines
            while len(line) > inner_width:
                chunk = line[:inner_width]
                line = line[inner_width:]
                padded = chunk + " " * (inner_width - len(strip_ansi(chunk)))
                self._writeln(self._c(color, v) + " " + padded + " " + self._c(color, v))
            
            padded = line + " " * (inner_width - len(strip_ansi(line)))
            self._writeln(self._c(color, v) + " " + padded + " " + self._c(color, v))
        
        # Bottom border
        bottom = bl + h * (panel_width - 2) + br
        self._writeln(self._c(color, bottom))
        
        # End codeblock
        if markdown_safe:
            self._writeln("```")
    
    # =========================================================================
    # BLOCKQUOTE
    # =========================================================================
    
    def blockquote(self, content: str) -> None:
        """
        Render a blockquote.
        
        Args:
            content: Quote content (can be multiline)
        """
        for line in content.split("\n"):
            prefix = self._c("gray", "│ ")
            self._writeln(prefix + self._c("white", line, dim=True))
    
    # =========================================================================
    # HORIZONTAL RULE
    # =========================================================================
    
    def horizontal_rule(self, char: str = "─", width: Optional[int] = None) -> None:
        """
        Render a horizontal rule.
        
        Args:
            char: Character to use for the rule
            width: Rule width (default: terminal width - 4)
        """
        term_width = self._get_terminal_width()
        rule_width = width or (term_width - 4)
        self._writeln("")
        self._writeln(self._c("gray", char * rule_width))
        self._writeln("")
    
    # =========================================================================
    # CHECKLISTS
    # =========================================================================
    
    def checklist(self, items: list[tuple[bool, str]]) -> None:
        """
        Render a checklist.
        
        Args:
            items: List of (checked, text) tuples
        """
        for checked, text in items:
            if checked:
                marker = self._c("green", "☑")
                text_colored = self._c("gray", text, dim=True)
            else:
                marker = self._c("white", "☐")
                text_colored = text
            self._writeln(f"  {marker} {text_colored}")
    
    # =========================================================================
    # NESTED LISTS
    # =========================================================================
    
    def list_item(self, text: str, level: int = 0, marker: str = "•") -> None:
        """
        Render a list item with indentation.
        
        Args:
            text: Item text
            level: Indentation level (0-based)
            marker: Bullet marker character
        """
        indent = "  " * level
        marker_colored = self._c("cyan", marker)
        self._writeln(f"{indent}{marker_colored} {text}")
    
    def numbered_list(self, items: list[str], start: int = 1) -> None:
        """
        Render a numbered list.
        
        Args:
            items: List items
            start: Starting number
        """
        for i, item in enumerate(items, start=start):
            num = self._c("cyan", f"{i}.")
            self._writeln(f"  {num} {item}")


# ============================================================================
# MODULE-LEVEL FUNCTIONS
# ============================================================================

def get_renderer(stream=None, use_colors: bool = True) -> MarkdownRenderer:
    if stream is None:
        stream = sys.stdout
    return MarkdownRenderer(use_colors=use_colors, stream=stream)


def render_markdown(text: str, text_lang: str = "markdown", stream=None, use_colors: bool = True) -> None:
    get_renderer(stream=stream, use_colors=use_colors).render_markdown_with_fences(text, text_lang=text_lang)


# Convenience functions
def table(headers: list[str], rows: list[list[str]], **kwargs) -> None:
    """Render a table."""
    get_renderer().table(headers, rows, **kwargs)


def panel(content: str, **kwargs) -> None:
    """Render a panel."""
    get_renderer().panel(content, **kwargs)


def blockquote(content: str) -> None:
    """Render a blockquote."""
    get_renderer().blockquote(content)


def hr(char: str = "─", width: Optional[int] = None) -> None:
    """Render a horizontal rule."""
    get_renderer().horizontal_rule(char, width)


def checklist(items: list[tuple[bool, str]]) -> None:
    """Render a checklist."""
    get_renderer().checklist(items)
