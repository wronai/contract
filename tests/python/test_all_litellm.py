"""
Główny plik testowy - uruchamia wszystkie testy LiteLLM integration

Uruchomienie:
    python tests/python/test_all_litellm.py
"""

import sys
import pytest
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


def main():
    """Uruchom wszystkie testy LiteLLM"""
    print("=" * 70)
    print("🧪 TESTY INTEGRACJI LITELLM Z RECLAPP")
    print("=" * 70)
    print()
    print("Testy sprawdzają:")
    print("  ✅ LLMSetupService - wykrywanie i setup providerów")
    print("  ✅ EvolutionSetupService - setup Evolution Manager")
    print("  ✅ Generowanie aplikacji z użyciem LiteLLM")
    print("  ✅ Poprawność endpointów LiteLLM")
    print()
    print("⚠️  Wymagania:")
    print("  - LM Studio uruchomione na porcie 8123 (dla testów integracyjnych)")
    print("  - Node.js zainstalowany")
    print("  - npm dependencies zainstalowane (npm install)")
    print()
    print("=" * 70)
    print()
    
    # Uruchom testy
    exit_code = pytest.main([
        str(project_root / 'tests' / 'python' / 'test_litellm_integration.py'),
        str(project_root / 'tests' / 'python' / 'test_generate_apps.py'),
        '-v',
        '--tb=short',
        '--color=yes'
    ])
    
    print()
    print("=" * 70)
    if exit_code == 0:
        print("✅ WSZYSTKIE TESTY PRZESZŁY")
    else:
        print("❌ NIEKTÓRE TESTY NIE PRZESZŁY")
    print("=" * 70)
    
    return exit_code


if __name__ == '__main__':
    sys.exit(main())

