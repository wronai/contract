# clickmd - Roadmap Rozwoju

Plan wdrożenia funkcji w kolejności priorytetów. Każda faza kończy się wydaniem nowej wersji.

## 📊 Status Projektu

| Metryka | Wartość |
|---------|---------|
| Aktualna wersja | 1.0.0 |
| Python | 3.10+ |
| Zależności core | 0 (zero-dependency) |
| Zależności opcjonalne | click>=8.0, rich>=13.0 |

---

## 🎯 Faza 1: Fundament (v1.1.0)

**Cel:** Ustabilizowanie core i dodanie brakujących podstawowych funkcji

### 1.1 Renderowanie tabel
- [ ] Implementacja `table()` - renderowanie tabel ASCII/Unicode
- [ ] Auto-wykrywanie szerokości kolumn
- [ ] Wsparcie dla alignmentu (left/center/right)
- [ ] Obsługa tabel z Markdown (`| col1 | col2 |`)
- [ ] Konfigurowalny styl ramek (ascii, unicode, minimal, none)

### 1.2 Panele i boksy
- [ ] Implementacja `panel(content, title=None, style="default")`
- [ ] Predefiniowane style: info, warning, error, success
- [ ] Wsparcie dla zagnieżdżonych paneli
- [ ] Responsywność do szerokości terminala

### 1.3 Listy zaawansowane
- [ ] Wsparcie dla checklist `- [ ]` / `- [x]`
- [ ] Numerowane listy z auto-inkrementacją
- [ ] Zagnieżdżone listy (wielopoziomowe)
- [ ] Listy definicji (term: definition)

### 1.4 Ulepszenia istniejących funkcji
- [ ] Dodanie `md_file(path)` - renderowanie pliku Markdown
- [ ] Wsparcie dla `---` (horizontal rule)
- [ ] Obsługa blockquote `>`
- [ ] Inline code z backticks w tekście ciągłym

---

## 🚀 Faza 2: Integracja z Click (v1.2.0) ⭐ USP

**Cel:** Głęboka integracja z frameworkiem Click - **Unique Selling Point**

### 2.1 Markdown w help text
- [ ] Dekorator `@clickmd.markdown_help` parsujący docstringi jako MD
- [ ] `MarkdownCommand` / `MarkdownGroup` klasy
- [ ] Wsparcie dla `**bold**`, `*italic*` w opisach opcji
- [ ] Renderowanie list w help text
- [ ] Kolorowanie nagłówków sekcji help

### 2.2 Rozszerzone funkcje echo
- [ ] `clickmd.echo_md(text)` - dedykowana funkcja dla Markdown
- [ ] `clickmd.success(msg)` - zielony panel sukcesu
- [ ] `clickmd.warning(msg)` - żółty panel ostrzeżenia
- [ ] `clickmd.error(msg)` - czerwony panel błędu
- [ ] `clickmd.info(msg)` - niebieski panel informacyjny

### 2.3 Formatowanie argumentów
- [ ] Automatyczne kolorowanie `--option` w tekście
- [ ] Highlighting ścieżek plików
- [ ] Formatowanie URL jako klikalne linki (gdzie terminal wspiera)

### 2.4 Help screen enhancement
- [ ] Grupowanie opcji z nagłówkami Markdown
- [ ] Przykłady użycia w blokach kodu
- [ ] Sekcja "See Also" z linkami

---

## ⚡ Faza 3: Interaktywność (v1.3.0)

**Cel:** Dynamiczne elementy UI w terminalu

### 3.1 Progress bars
- [ ] `clickmd.progress(iterable, label="Processing")`
- [ ] Wsparcie dla nieokreślonej długości (spinner)
- [ ] Customowalny format (procent, ETA, prędkość)
- [ ] Nested progress bars
- [ ] Integracja z `click.progressbar`

### 3.2 Spinners
- [ ] Kolekcja animowanych spinnerów (dots, line, arc, etc.)
- [ ] Context manager: `with clickmd.spinner("Loading..."):`
- [ ] Wsparcie dla statusu końcowego (✓/✗)

### 3.3 Live updates
- [ ] `clickmd.live(renderable)` - aktualizacja w miejscu
- [ ] Tabele z live-update danymi
- [ ] Log streaming z auto-scroll

### 3.4 Prompts rozszerzone
- [ ] `clickmd.confirm_md("Czy **na pewno** chcesz kontynuować?")`
- [ ] Prompt z podpowiedziami w Markdown
- [ ] Multi-select z opisami MD

---

## 🎨 Faza 4: Theming i Customizacja (v1.4.0)

**Cel:** Pełna kontrola nad wyglądem

### 4.1 System motywów
- [ ] Predefiniowane motywy: default, monokai, dracula, nord, solarized
- [ ] `clickmd.set_theme("monokai")`
- [ ] Eksport/import motywów jako JSON/YAML
- [ ] Dziedziczenie motywów (base + overrides)

### 4.2 Customowe style
- [ ] API do definiowania własnych stylów kolorów
- [ ] Wsparcie dla 256 kolorów i True Color (24-bit)
- [ ] Graceful degradation dla terminali 16-kolorowych
- [ ] Wykrywanie możliwości terminala

### 4.3 Konfiguracja globalna
- [ ] Plik konfiguracyjny `.clickmdrc` lub `pyproject.toml`
- [ ] Zmienne środowiskowe (`CLICKMD_THEME`, `CLICKMD_NO_COLOR`)
- [ ] Wsparcie dla NO_COLOR standard (https://no-color.org/)

### 4.4 Syntax highlighting rozszerzony
- [ ] Dodanie języków: Rust, Go, C/C++, SQL, Dockerfile
- [ ] Highlighting diffów (`+ added`, `- removed`)
- [ ] Numerowanie linii w code blocks
- [ ] Highlighting konkretnych linii (np. linia 5-7)

---

## 🔧 Faza 5: Narzędzia deweloperskie (v1.5.0)

**Cel:** Ułatwienie debugowania i development

### 5.1 Pretty exceptions
- [ ] Automatyczne formatowanie tracebacków
- [ ] Syntax highlighting kodu źródłowego w traceback
- [ ] Lokalne zmienne w kontekście błędu
- [ ] Skrócone ścieżki (relative paths)

### 5.2 Debug output
- [ ] `clickmd.debug(obj)` - pretty-print obiektów Python
- [ ] Inspekcja dict/list z kolorowaniem
- [ ] Diff między dwoma obiektami
- [ ] Tree view dla zagnieżdżonych struktur

### 5.3 Logging integration
- [ ] `ClickmdHandler` dla modułu `logging`
- [ ] Formatowanie logów jako Markdown
- [ ] Poziomy logowania z ikonami/kolorami
- [ ] Structured logging support

### 5.4 Testing utilities
- [ ] `strip_ansi()` publiczne API
- [ ] Capture output helpers dla testów
- [ ] Snapshot testing dla renderowanego output

---

## 📦 Faza 6: Ekosystem (v2.0.0)

**Cel:** Rozszerzalność i integracje

### 6.1 Plugin system
- [ ] Entry points dla custom renderers
- [ ] Hook system dla pre/post processing
- [ ] Rejestracja custom języków syntax highlighting

### 6.2 Integracje zewnętrzne
- [x] Opcjonalna integracja z Rich (fallback do Rich jeśli dostępny)
- [ ] Export do HTML
- [ ] Export do PNG (via headless browser lub pillow)
- [ ] Integracja z Typer

### 6.3 Templating
- [ ] Mini template engine dla powtarzalnych formatów
- [ ] Predefiniowane szablony (report, changelog, table)
- [ ] Jinja2-like składnia (opcjonalna zależność)

### 6.4 Internacjonalizacja
- [ ] Wsparcie dla RTL (arabski, hebrajski)
- [ ] Unicode box-drawing characters
- [ ] Poprawne liczenie szerokości dla CJK

---

## 🏗️ Refaktoryzacja techniczna

### Architektura
- [ ] Wydzielenie `Parser` jako osobnej klasy
- [ ] Wzorzec Visitor dla renderowania elementów
- [ ] Lazy loading modułów (zmniejszenie import time)
- [x] Type hints dla 100% public API

### Performance
- [ ] Benchmark suite
- [ ] Caching skompilowanych regex
- [ ] Optymalizacja dla długich dokumentów
- [ ] Async support dla streaming output

### Dokumentacja
- [ ] Sphinx docs z przykładami
- [ ] Cookbook z real-world examples
- [ ] Video tutorials
- [x] Porównanie z Rich/mdv

### CI/CD
- [ ] Matrix testing (Python 3.10-3.13)
- [ ] Windows/macOS/Linux CI
- [ ] Auto-publish do PyPI
- [ ] Changelog generation

---

## 📅 Timeline (propozycja)

| Faza | Wersja | Szacowany czas | Status |
|------|--------|----------------|--------|
| 1 - Fundament | v1.1.0 | 2-3 tygodnie | 🔲 Planowane |
| 2 - Click Integration | v1.2.0 | 3-4 tygodnie | 🚧 W trakcie |
| 3 - Interaktywność | v1.3.0 | 4-5 tygodni | 🔲 Planowane |
| 4 - Theming | v1.4.0 | 2-3 tygodnie | 🔲 Planowane |
| 5 - Dev Tools | v1.5.0 | 3-4 tygodnie | 🔲 Planowane |
| 6 - Ekosystem | v2.0.0 | 6-8 tygodni | 🔲 Planowane |

---

## 🏆 Unique Selling Points

1. **Zero-dependency core** - działa bez instalowania niczego więcej
2. **Click-first** - jedyna biblioteka z natywnym wsparciem Markdown dla Click
3. **Progressive enhancement** - podstawy działają, zaawansowane funkcje opcjonalne
4. **Lightweight** - nie wymaga Rich dla prostych przypadków
5. **Drop-in replacement** - `import clickmd as click` i gotowe
6. **Optional Rich backend** - najlepszy rendering gdy Rich dostępny

---

## 📝 Decyzje podjęte

- [x] Integrować Rich jako **opcjonalną** zależność (`clickmd[rich]`)
- [x] Wspierać Windows Terminal (nowoczesny) + legacy cmd.exe (degradacja)
- [x] Strategia NO_COLOR: respektować standard https://no-color.org/
- [x] Nazewnictwo: `md()` dla prostego, `echo_md()` dla Click-aware
