#!/usr/bin/env python3
"""
Główny skrypt testowy - uruchamia wszystkie testy LiteLLM integration

Uruchomienie:
    python run_tests.py
"""

import sys
import subprocess
from pathlib import Path

project_root = Path(__file__).parent


def main():
    """Uruchom wszystkie testy"""
    print("=" * 70)
    print("TESTY INTEGRACJI LITELLM Z RECLAPP")
    print("=" * 70)
    print()
    print("Testy sprawdzaja:")
    print("  [OK] LLMSetupService - wykrywanie i setup providerow")
    print("  [OK] EvolutionSetupService - setup Evolution Manager")
    print("  [OK] Generowanie aplikacji z uzyciem LiteLLM")
    print("  [OK] Poprawnosc endpointow LiteLLM")
    print()
    print("[!] Wymagania:")
    print("  - LM Studio uruchomione na porcie 8123 (dla testow integracyjnych)")
    print("  - Node.js zainstalowany")
    print("  - npm dependencies zainstalowane (npm install)")
    print()
    print("=" * 70)
    print()
    
    # Uruchom testy
    test_files = [
        project_root / 'tests' / 'python' / 'test_litellm_integration.py',
        project_root / 'tests' / 'python' / 'test_generate_apps.py'
    ]
    
    exit_code = 0
    for test_file in test_files:
        if not test_file.exists():
            print(f"[!] Plik testowy nie istnieje: {test_file}")
            continue
        
        print(f"[*] Uruchamianie: {test_file.name}")
        print("-" * 70)
        
        result = subprocess.run(
            [sys.executable, '-m', 'pytest', str(test_file), '-v', '--tb=short', '--color=yes'],
            cwd=project_root
        )
        
        if result.returncode != 0:
            exit_code = result.returncode
        
        print()
    
    print("=" * 70)
    if exit_code == 0:
        print("[OK] WSZYSTKIE TESTY PRZESZLY")
    else:
        print("[FAIL] NIEKTORE TESTY NIE PRZESZLY")
    print("=" * 70)
    
    return exit_code


if __name__ == '__main__':
    sys.exit(main())

