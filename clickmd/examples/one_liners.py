#!/usr/bin/env python3
"""
One-Liners - Najprostsze użycie clickmd

Kolekcja jednolinijkowych przykładów pokazujących
jak clickmd upraszcza typowe zadania CLI.

Run: python examples/one_liners.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd

clickmd.md("# 📝 clickmd One-Liners\n")

# ============================================================================
# PODSTAWY - zamień print() na clickmd
# ============================================================================

clickmd.md("## 1. Zamień print() na clickmd\n")

# Zamiast: print("Hello")
clickmd.echo("Hello from clickmd!")

# Zamiast: print("# Heading") 
clickmd.md("# To jest nagłówek")

# Zamiast: print("\033[92mSuccess\033[0m")
clickmd.success("Operacja udana!")

# ============================================================================
# STATUSY - bez ANSI escape codes
# ============================================================================

clickmd.md("\n## 2. Kolorowe statusy\n")

clickmd.success("Zapisano plik")      # Zielony ✅
clickmd.warning("Dysk prawie pełny")  # Żółty ⚠️
clickmd.error("Brak połączenia")      # Czerwony 🛑
clickmd.info("Przetwarzanie...")      # Niebieski ℹ️

# ============================================================================
# KOD - syntax highlighting w jednej linii
# ============================================================================

clickmd.md("\n## 3. Kod z kolorowaniem\n")

clickmd.md("```python\nprint('Hello, World!')\n```")
clickmd.md("```bash\ncurl -X GET https://api.example.com\n```")
clickmd.md("```sql\nSELECT * FROM users WHERE active = true;\n```")

# ============================================================================
# TABELE - bez formatowania ręcznego
# ============================================================================

clickmd.md("\n## 4. Szybka tabela\n")

clickmd.table(["Kolumna A", "Kolumna B"], [["Wartość 1", "Wartość 2"]])

# ============================================================================
# PANELE - informacje w ramce
# ============================================================================

clickmd.md("\n## 5. Panel informacyjny\n")

clickmd.panel("Ważna informacja!", title="Uwaga", style="warning")

# ============================================================================
# PROGRESS - dla operacji długotrwałych
# ============================================================================

clickmd.md("\n## 6. Progress bar\n")

import time
for i in clickmd.progress(range(20), label="Processing"):
    time.sleep(0.02)

# ============================================================================
# PORÓWNANIE KODU
# ============================================================================

clickmd.md("""
## Porównanie: print() vs clickmd

| Zadanie | print() | clickmd |
|---------|---------|---------|
| Nagłówek | `print("# Title")` | `clickmd.md("# Title")` |
| Success | `print("\\033[92m✅\\033[0m")` | `clickmd.success("OK")` |
| Tabela | 20+ linii kodu | `clickmd.table(...)` |
| Progress | zewnętrzna lib | `clickmd.progress(...)` |

**Wniosek:** Ten sam efekt, mniej kodu, lepszy UX!
""")
