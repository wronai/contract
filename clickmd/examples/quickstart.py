#!/usr/bin/env python3
"""
Quickstart - Najprostsze użycie clickmd

Ten przykład pokazuje jak w 3 liniach kodu uzyskać
pięknie sformatowany output w terminalu.

Run: python examples/quickstart.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd

# ============================================================================
# PRZYKŁAD 1: Jedna linia - markdown w terminalu
# ============================================================================

clickmd.md("# 🚀 Hello clickmd!")

# ============================================================================
# PRZYKŁAD 2: Automatyczna detekcja markdown
# ============================================================================

# clickmd.echo() automatycznie wykrywa markdown i renderuje
clickmd.echo("## To jest nagłówek")
clickmd.echo("Zwykły tekst bez markdown - bez renderowania")
clickmd.echo("**Pogrubiony** tekst z *kursywą*")

# ============================================================================
# PRZYKŁAD 3: Kolorowe komunikaty statusu
# ============================================================================

clickmd.success("Operacja zakończona pomyślnie!")
clickmd.warning("Uwaga: dysk prawie pełny")
clickmd.error("Błąd: nie można połączyć z serwerem")
clickmd.info("Przetwarzanie 42 plików...")

# ============================================================================
# PRZYKŁAD 4: Kod z syntax highlighting
# ============================================================================

clickmd.md("""
## Przykład kodu Python

```python
def hello(name: str) -> str:
    return f"Hello, {name}!"

print(hello("World"))
```
""")

# ============================================================================
# PRZYKŁAD 5: Prosta tabela
# ============================================================================

clickmd.table(
    headers=["Nazwa", "Wersja", "Status"],
    rows=[
        ["clickmd", "1.5.0", "✅ aktywny"],
        ["Python", "3.12", "✅ aktywny"],
    ]
)

# ============================================================================
# PRZYKŁAD 6: Panel informacyjny
# ============================================================================

clickmd.panel(
    "clickmd to zero-dependency biblioteka\n"
    "do renderowania markdown w terminalu.",
    title="ℹ️ Info",
    style="info"
)
