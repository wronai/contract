#!/usr/bin/env python3
"""
Build Script - Skrypt budowania z progress barami

Pokazuje jak używać clickmd do tworzenia
profesjonalnie wyglądających skryptów automatyzacji.

Run: python examples/build_script.py
"""

import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd


def build_project():
    """Przykładowy skrypt budowania projektu."""
    
    clickmd.md("# 🔨 Build Project\n")
    
    # Status indicator dla kroków
    status = clickmd.StatusIndicator()
    
    # Krok 1: Czyszczenie
    status.start("Cleaning build directory...")
    time.sleep(0.3)
    status.done()
    
    # Krok 2: Instalacja zależności z progress bar
    clickmd.md("")
    deps = ["react", "typescript", "webpack", "babel", "eslint", "prettier"]
    for dep in clickmd.progress(deps, label="Installing dependencies"):
        time.sleep(0.1)
    
    # Krok 3: Kompilacja ze spinnerem
    with clickmd.spinner("Compiling TypeScript...", style="dots"):
        time.sleep(1.0)
    
    # Krok 4: Bundling z progress bar
    with clickmd.ProgressBar(total=100, label="Bundling", color="cyan") as bar:
        for i in range(100):
            time.sleep(0.01)
            bar.update(1)
    
    # Krok 5: Testy
    status.start("Running tests...")
    time.sleep(0.5)
    status.done("42 tests passed")
    
    # Krok 6: Linting (opcjonalny)
    status.start("Linting code...")
    time.sleep(0.2)
    status.skip("No linting configured")
    
    # Podsumowanie
    clickmd.hr()
    clickmd.panel(
        "Build completed successfully!\n"
        "Output: dist/bundle.js (245 KB)\n"
        "Time: 2.1s",
        title="✅ Build Summary",
        style="success"
    )


def deploy_preview():
    """Przykładowy skrypt deploymentu."""
    
    clickmd.md("\n# 🚀 Deploy Preview\n")
    
    # Countdown przed deployem
    clickmd.countdown(3, "Deploying in")
    
    # Deploy steps
    steps = [
        ("upload", "Uploading files..."),
        ("configure", "Configuring server..."),
        ("restart", "Restarting services..."),
        ("verify", "Verifying deployment..."),
    ]
    
    for action, message in steps:
        clickmd.log_action(action, message)
        time.sleep(0.3)
        clickmd.log_success(f"{action.capitalize()} complete")
    
    # Final status
    clickmd.md("")
    clickmd.panel(
        "Preview URL: https://preview-abc123.example.com\n"
        "Expires: 24 hours",
        title="🌐 Preview Ready",
        style="success"
    )


if __name__ == "__main__":
    build_project()
    deploy_preview()
