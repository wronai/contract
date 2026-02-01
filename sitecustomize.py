import os
import sys


def _is_running_pytest() -> bool:
    argv0 = os.path.basename(sys.argv[0] or "")
    if argv0.startswith("pytest"):
        return True
    return any("pytest" in (a or "") for a in sys.argv)


if _is_running_pytest():
    os.environ.setdefault("PYTEST_DISABLE_PLUGIN_AUTOLOAD", "1")

    try:
        import pytest_asyncio  # type: ignore

        if hasattr(pytest_asyncio, "fixture"):
            existing = os.environ.get("PYTEST_ADDOPTS", "")
            if "-p pytest_asyncio" not in existing:
                os.environ["PYTEST_ADDOPTS"] = (existing + " -p pytest_asyncio").strip()
    except Exception:
        pass
