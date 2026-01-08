
=== Tradycyjny print() ===
Starting application...
Loading configuration...
Warning: Config file not found, using defaults
Error: Database connection failed
Success: Application started

## Z clickmd - te same komunikaty, ale ładniejsze

ℹ️  Starting application...
ℹ️  Loading configuration...
⚠️  Config file not found, using defaults
🛑 Database connection failed
✅ Application started

## Logowanie akcji


```log
→ Pobieranie pliku config.yaml
```


```log
✅ Plik pobrany (2.3 KB)
```


```log
→ Parsowanie konfiguracji
```


```log
⚠️ Brak klucza 'timeout', używam domyślnej wartości
```


```log
→ Łączenie z bazą danych
```


```log
🛑 Timeout po 30s
```


## Markdown w komunikatach


### Podsumowanie instalacji

Zainstalowano 3 pakiety:
- `clickmd` - renderowanie markdown
- `click` - CLI framework
- `rich` - opcjonalny backend

Uruchom `clickmd --help` aby rozpocząć.


## Porównanie kodu

### Bez clickmd (ANSI escape codes):

```python
print("\033[92m✅ Success\033[0m")
print("\033[93m⚠️  Warning\033[0m")
print("\033[91m🛑 Error\033[0m")
```


### Z clickmd:

```python
clickmd.success("Success")
clickmd.warning("Warning")
clickmd.error("Error")
```


Rezultat: Ten sam efekt, 3x mniej kodu, 10x czytelniej!

