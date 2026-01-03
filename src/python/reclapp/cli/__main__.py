"""
Reclapp CLI entry point for module execution.

Usage:
    python -m reclapp.cli evolve -p "Create a todo app" -o ./output
"""

from .main import main

if __name__ == "__main__":
    main()
