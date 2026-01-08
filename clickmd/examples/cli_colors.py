#!/usr/bin/env python3
"""
CLI Colors - Kolorowy output bez skomplikowanego kodu

Porównanie: print() vs clickmd - ta sama funkcjonalność,
ale clickmd daje kolory i formatowanie automatycznie.

Run: python examples/cli_colors.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd

# ============================================================================
# BEZ CLICKMD (nudne, szare)
# ============================================================================

print("\n=== Tradycyjny print() ===")
print("Starting application...")
print("Loading configuration...")
print("Warning: Config file not found, using defaults")
print("Error: Database connection failed")
print("Success: Application started")

# ============================================================================
# Z CLICKMD (kolorowe, czytelne)
# ============================================================================

clickmd.md("\n## Z clickmd - te same komunikaty, ale ładniejsze\n")

clickmd.info("Starting application...")
clickmd.info("Loading configuration...")
clickmd.warning("Config file not found, using defaults")
clickmd.error("Database connection failed")
clickmd.success("Application started")

# ============================================================================
# LOGOWANIE AKCJI
# ============================================================================

clickmd.md("\n## Logowanie akcji\n")

# Zamiast print() użyj clickmd.log_* dla automatycznego formatowania
clickmd.log_action("download", "Pobieranie pliku config.yaml")
clickmd.log_success("Plik pobrany (2.3 KB)")
clickmd.log_action("parse", "Parsowanie konfiguracji")
clickmd.log_warning("Brak klucza 'timeout', używam domyślnej wartości")
clickmd.log_action("connect", "Łączenie z bazą danych")
clickmd.log_error("Timeout po 30s")

# ============================================================================
# MARKDOWN W KOMUNIKATACH
# ============================================================================

clickmd.md("\n## Markdown w komunikatach\n")

clickmd.echo("""
### Podsumowanie instalacji

Zainstalowano **3** pakiety:
- `clickmd` - renderowanie markdown
- `click` - CLI framework
- `rich` - opcjonalny backend

Uruchom `clickmd --help` aby rozpocząć.
""")

# ============================================================================
# PORÓWNANIE ILOŚCI KODU
# ============================================================================

clickmd.md("""
## Porównanie kodu

### Bez clickmd (ANSI escape codes):
```python
print("\\033[92m✅ Success\\033[0m")
print("\\033[93m⚠️  Warning\\033[0m")
print("\\033[91m🛑 Error\\033[0m")
```

### Z clickmd:
```python
clickmd.success("Success")
clickmd.warning("Warning")
clickmd.error("Error")
```

**Rezultat:** Ten sam efekt, 3x mniej kodu, 10x czytelniej!
""")
