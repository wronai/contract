#!/usr/bin/env python3
"""
Phase 3 Features Example - Progress bars, Spinners, Live updates.

Demonstrates the new Phase 3 interactive features:
- Progress bars (with ETA, percentage, count)
- Animated spinners
- Live updates
- Status indicators
- Countdown timer

Run: python examples/phase3_progress.py
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd


def demo_progress_bar():
    """Demonstrate progress bar."""
    clickmd.md("# 📊 Progress Bars\n")
    
    clickmd.md("## Basic Progress Bar\n")
    items = range(50)
    for item in clickmd.progress(items, label="Processing"):
        time.sleep(0.02)
    
    clickmd.md("\n## Custom Progress Bar\n")
    with clickmd.ProgressBar(total=30, label="Downloading", color="green") as bar:
        for i in range(30):
            time.sleep(0.03)
            bar.update(1)
    
    clickmd.md("\n## Progress with List\n")
    files = ["file1.txt", "file2.txt", "file3.txt", "file4.txt", "file5.txt"]
    for f in clickmd.progress(files, label="Uploading"):
        time.sleep(0.1)


def demo_spinners():
    """Demonstrate spinners."""
    clickmd.md("\n# 🔄 Spinners\n")
    
    clickmd.md("## Dots Spinner (default)\n")
    with clickmd.spinner("Loading data..."):
        time.sleep(1.5)
    
    clickmd.md("\n## Circle Spinner\n")
    with clickmd.spinner("Processing...", style="circle"):
        time.sleep(1.5)
    
    clickmd.md("\n## Arc Spinner\n")
    with clickmd.spinner("Connecting...", style="arc", color="yellow"):
        time.sleep(1.5)
    
    clickmd.md("\n## Available Spinner Styles\n")
    clickmd.table(
        headers=["Style", "Frames"],
        rows=[
            [name, " ".join(frames[:6]) + "..."] 
            for name, frames in list(clickmd.SPINNERS.items())[:8]
        ]
    )


def demo_status_indicator():
    """Demonstrate status indicator."""
    clickmd.md("\n# ✅ Status Indicator\n")
    
    status = clickmd.StatusIndicator()
    
    status.start("Initializing...")
    time.sleep(0.5)
    status.done()
    
    status.start("Connecting to server...")
    time.sleep(0.8)
    status.done()
    
    status.start("Downloading data...")
    time.sleep(1.0)
    status.done()
    
    status.start("Optional step...")
    time.sleep(0.3)
    status.skip()
    
    status.start("Finalizing...")
    time.sleep(0.5)
    status.done("All tasks completed!")


def demo_live_update():
    """Demonstrate live updates."""
    clickmd.md("\n# 📺 Live Updates\n")
    
    clickmd.md("## Counter\n")
    with clickmd.live() as display:
        for i in range(10):
            display.update(f"Count: {i+1}/10")
            time.sleep(0.2)
    
    clickmd.md("\n## Multi-line Update\n")
    with clickmd.live() as display:
        for i in range(5):
            content = f"""Progress Report
================
Step: {i+1}/5
Status: Running...
Time: {i*0.3:.1f}s"""
            display.update(content)
            time.sleep(0.3)
    
    clickmd.success("Live update demo complete!")


def demo_countdown():
    """Demonstrate countdown."""
    clickmd.md("\n# ⏱️ Countdown\n")
    clickmd.countdown(3, "Demo starting in")


def demo_combined():
    """Demonstrate combined usage."""
    clickmd.md("\n# 🎨 Combined Example: Build Pipeline\n")
    
    status = clickmd.StatusIndicator()
    
    # Step 1: Initialize
    status.start("Initializing build environment...")
    time.sleep(0.5)
    status.done()
    
    # Step 2: Download with progress
    clickmd.md("")
    deps = ["react", "typescript", "webpack", "babel", "eslint"]
    for dep in clickmd.progress(deps, label="Installing dependencies"):
        time.sleep(0.15)
    
    # Step 3: Compile with spinner
    with clickmd.spinner("Compiling TypeScript...", style="dots"):
        time.sleep(1.0)
    
    # Step 4: Bundle
    with clickmd.ProgressBar(total=100, label="Bundling", color="magenta") as bar:
        for i in range(100):
            time.sleep(0.01)
            bar.update(1)
    
    # Step 5: Tests
    status.start("Running tests...")
    time.sleep(0.8)
    status.done("42 tests passed")
    
    # Final summary
    clickmd.hr()
    clickmd.panel(
        "Build completed successfully!\n"
        "Output: ./dist/bundle.js (245 KB)\n"
        "Time: 3.2s",
        title="✅ Build Summary",
        style="success"
    )


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("clickmd Phase 3 Progress Demo")
    print("=" * 60 + "\n")
    
    demo_progress_bar()
    demo_spinners()
    demo_status_indicator()
    demo_live_update()
    demo_countdown()
    demo_combined()
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60 + "\n")
