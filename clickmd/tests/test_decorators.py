"""Tests for clickmd.decorators module"""

import pytest

from clickmd.decorators import (
    CLICK_AVAILABLE,
    group,
    command,
    option,
    argument,
    pass_context,
    Choice,
    Path,
    Context,
)


class TestClickAvailability:
    def test_click_available_is_boolean(self):
        assert isinstance(CLICK_AVAILABLE, bool)


@pytest.mark.skipif(not CLICK_AVAILABLE, reason="Click not installed")
class TestClickDecorators:
    def test_group_decorator(self):
        @group()
        def cli():
            pass
        
        assert hasattr(cli, "command")

    def test_command_decorator(self):
        @command()
        def my_cmd():
            pass
        
        assert callable(my_cmd)

    def test_option_decorator(self):
        @command()
        @option("--name", "-n", default="World")
        def greet(name):
            pass
        
        assert callable(greet)

    def test_argument_decorator(self):
        @command()
        @argument("name")
        def greet(name):
            pass
        
        assert callable(greet)

    def test_choice_type(self):
        choices = Choice(["a", "b", "c"])
        assert choices is not None

    def test_path_type(self):
        path = Path(exists=True)
        assert path is not None


@pytest.mark.skipif(CLICK_AVAILABLE, reason="Click is installed")
class TestClickNotAvailable:
    def test_decorators_raise_import_error(self):
        with pytest.raises(ImportError):
            @group()
            def cli():
                pass

    def test_choice_raises_import_error(self):
        with pytest.raises(ImportError):
            Choice(["a", "b"])

    def test_path_raises_import_error(self):
        with pytest.raises(ImportError):
            Path(exists=True)
