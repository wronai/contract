import re
import sys


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

    def _c(self, color: str, text: str) -> str:
        if not self._use_colors:
            return text
        return f"{_COLORS[color]}{text}{_COLORS['reset']}"

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
        if l in ("bash", "sh", "shell"):
            return self._highlight_bash(line)
        if l in ("typescript", "ts", "javascript", "js"):
            return self._highlight_js(line)
        if l in ("python", "py"):
            return self._highlight_python(line)
        if l in ("markdown", "md"):
            return self._highlight_markdown(line)
        if l in ("log",):
            return self._highlight_log(line)
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


def get_renderer(stream=None, use_colors: bool = True) -> MarkdownRenderer:
    if stream is None:
        stream = sys.stdout
    return MarkdownRenderer(use_colors=use_colors, stream=stream)


def render_markdown(text: str, text_lang: str = "markdown", stream=None, use_colors: bool = True) -> None:
    get_renderer(stream=stream, use_colors=use_colors).render_markdown_with_fences(text, text_lang=text_lang)
