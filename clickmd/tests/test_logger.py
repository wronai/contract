"""Tests for clickmd.logger module"""

import io
import pytest

from clickmd.logger import (
    Logger,
    get_logger,
    set_logger,
    log_info,
    log_success,
    log_warning,
    log_error,
    log_action,
)


class TestLogger:
    def test_creates_logger(self):
        log = Logger()
        assert log is not None

    def test_verbose_false_no_output(self, capsys):
        log = Logger(verbose=False)
        log.info("should not appear")
        captured = capsys.readouterr()
        assert captured.out == ""

    def test_info_outputs(self, capsys):
        log = Logger(verbose=True)
        log.info("test message")
        captured = capsys.readouterr()
        assert "test message" in captured.out
        assert "```log" in captured.out

    def test_success_outputs(self, capsys):
        log = Logger(verbose=True)
        log.success("operation complete")
        captured = capsys.readouterr()
        assert "operation complete" in captured.out
        assert "✅" in captured.out

    def test_warning_outputs(self, capsys):
        log = Logger(verbose=True)
        log.warning("be careful")
        captured = capsys.readouterr()
        assert "be careful" in captured.out
        assert "⚠️" in captured.out

    def test_error_outputs(self, capsys):
        log = Logger(verbose=True)
        log.error("something failed")
        captured = capsys.readouterr()
        assert "something failed" in captured.out
        assert "🛑" in captured.out

    def test_action_outputs(self, capsys):
        log = Logger(verbose=True)
        log.action("start", "beginning process")
        captured = capsys.readouterr()
        assert "beginning process" in captured.out
        assert "🚀" in captured.out

    def test_progress_outputs(self, capsys):
        log = Logger(verbose=True)
        log.progress("Building", 50, 100)
        captured = capsys.readouterr()
        assert "50%" in captured.out
        assert "Building" in captured.out

    def test_step_outputs(self, capsys):
        log = Logger(verbose=True)
        log.step(2, 5, "processing")
        captured = capsys.readouterr()
        assert "[2/5]" in captured.out
        assert "processing" in captured.out

    def test_attempt_outputs(self, capsys):
        log = Logger(verbose=True)
        log.attempt(1, 3, "generation")
        captured = capsys.readouterr()
        assert "1/3" in captured.out
        assert "generation" in captured.out

    def test_exception_outputs(self, capsys):
        log = Logger(verbose=True)
        try:
            raise ValueError("test error")
        except Exception as e:
            log.exception(e)
        captured = capsys.readouterr()
        assert "ValueError" in captured.out
        assert "test error" in captured.out

    def test_key_value_outputs(self, capsys):
        log = Logger(verbose=True)
        log.key_value("Model", "gpt-4")
        captured = capsys.readouterr()
        assert "Model" in captured.out
        assert "gpt-4" in captured.out

    def test_llm_outputs(self, capsys):
        log = Logger(verbose=True)
        log.llm("openrouter", "qwen-2.5")
        captured = capsys.readouterr()
        assert "🤖" in captured.out
        assert "openrouter" in captured.out
        assert "qwen-2.5" in captured.out


class TestLoggerSection:
    def test_section_groups_output(self, capsys):
        log = Logger(verbose=True)
        with log.section("Test"):
            log.info("line 1")
            log.info("line 2")
        captured = capsys.readouterr()
        # Should be single codeblock with both lines
        assert captured.out.count("```log") == 1
        assert "line 1" in captured.out
        assert "line 2" in captured.out

    def test_without_section_multiple_blocks(self, capsys):
        log = Logger(verbose=True)
        log.info("line 1")
        log.info("line 2")
        captured = capsys.readouterr()
        # Should be two separate codeblocks
        assert captured.out.count("```log") == 2


class TestLoggerHeading:
    def test_heading_outputs(self, capsys):
        log = Logger(verbose=True)
        log.heading(1, "Main Title")
        captured = capsys.readouterr()
        assert "# Main Title" in captured.out

    def test_heading_not_in_codeblock(self, capsys):
        log = Logger(verbose=True)
        log.heading(2, "Section")
        captured = capsys.readouterr()
        # Heading should be outside codeblock
        assert "```log" not in captured.out or captured.out.index("## Section") < captured.out.find("```log") if "```log" in captured.out else True


class TestGlobalLogger:
    def test_get_logger_returns_logger(self):
        log = get_logger()
        assert isinstance(log, Logger)

    def test_set_logger_changes_default(self):
        custom = Logger(verbose=False)
        set_logger(custom)
        assert get_logger() is custom

    def test_log_convenience_functions(self, capsys):
        set_logger(Logger(verbose=True))
        log_info("info msg")
        log_success("success msg")
        log_warning("warning msg")
        log_error("error msg")
        log_action("start", "action msg")
        captured = capsys.readouterr()
        assert "info msg" in captured.out
        assert "success msg" in captured.out
        assert "warning msg" in captured.out
        assert "error msg" in captured.out
        assert "action msg" in captured.out


class TestLoggerCustomStream:
    def test_custom_stream(self):
        buffer = io.StringIO()
        log = Logger(verbose=True, stream=buffer)
        log.info("custom output")
        output = buffer.getvalue()
        assert "custom output" in output

    def test_buffer_mode(self):
        log = Logger(verbose=True, buffer_logs=True)
        log.info("buffered 1")
        log.info("buffered 2")
        # Should not output yet
        # Flush to output
        log.flush()
