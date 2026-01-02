#!/usr/bin/env python3
"""
Find Duplicate Files

Finds duplicate files based on content hash and suggests which to remove.
"""

import hashlib
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Directories to skip
SKIP_DIRS = {
    'node_modules', 'venv', '.venv', '__pycache__', 'dist', '.git',
    'output', 'generated', 'test-verify', 'todo', '.pytest_cache',
    'reclapp.egg-info', 'reclapp_core.egg-info'
}

# File extensions to check
CHECK_EXTENSIONS = {
    '.py', '.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.sh', '.sql',
    '.html', '.css', '.yml', '.yaml', '.toml', '.txt'
}

# Minimum file size to check (skip tiny files)
MIN_SIZE = 100


def get_file_hash(filepath: Path) -> str:
    """Get MD5 hash of file content"""
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            buf = f.read(65536)
            while len(buf) > 0:
                hasher.update(buf)
                buf = f.read(65536)
        return hasher.hexdigest()
    except Exception:
        return ""


def should_skip(path: Path) -> bool:
    """Check if path should be skipped"""
    parts = path.parts
    return any(skip in parts for skip in SKIP_DIRS)


def find_all_files(root: Path) -> list[Path]:
    """Find all relevant files"""
    files = []
    for path in root.rglob('*'):
        if path.is_file() and not should_skip(path):
            if path.suffix in CHECK_EXTENSIONS:
                if path.stat().st_size >= MIN_SIZE:
                    files.append(path)
    return files


def find_duplicates(root: Path) -> dict[str, list[Path]]:
    """Find duplicate files by content hash"""
    hash_to_files = defaultdict(list)
    
    print(f"Scanning {root}...")
    files = find_all_files(root)
    print(f"Found {len(files)} files to check")
    
    for i, filepath in enumerate(files):
        if i % 100 == 0:
            print(f"  Processing {i}/{len(files)}...", end='\r')
        
        file_hash = get_file_hash(filepath)
        if file_hash:
            hash_to_files[file_hash].append(filepath)
    
    print(f"\nProcessed {len(files)} files")
    
    # Filter to only duplicates
    duplicates = {h: paths for h, paths in hash_to_files.items() if len(paths) > 1}
    return duplicates


def analyze_duplicates(duplicates: dict[str, list[Path]], root: Path) -> list[dict]:
    """Analyze duplicates and suggest which to remove"""
    suggestions = []
    
    for file_hash, paths in duplicates.items():
        # Get file info
        file_infos = []
        for p in paths:
            stat = p.stat()
            rel_path = p.relative_to(root)
            file_infos.append({
                'path': p,
                'rel_path': rel_path,
                'size': stat.st_size,
                'mtime': datetime.fromtimestamp(stat.st_mtime),
                'is_source': 'src/python' in str(p),
                'is_pip_package': str(rel_path).startswith('reclapp/') and 'src' not in str(p),
                'is_example': 'examples/' in str(p) or 'target/' in str(p),
            })
        
        # Sort by preference (keep source, remove copies)
        file_infos.sort(key=lambda x: (
            not x['is_source'],  # Keep source files
            x['is_pip_package'],  # Remove pip package duplicates (they're copies)
            x['is_example'],  # Remove example duplicates
            x['mtime']  # Keep newer files
        ))
        
        # First is to keep, rest are to remove
        keep = file_infos[0]
        remove = file_infos[1:]
        
        suggestions.append({
            'hash': file_hash[:8],
            'size': keep['size'],
            'keep': keep['rel_path'],
            'remove': [f['rel_path'] for f in remove],
            'reason': get_reason(keep, remove)
        })
    
    return suggestions


def get_reason(keep: dict, remove: list[dict]) -> str:
    """Get reason for keeping/removing"""
    if keep['is_source']:
        return "Keep source, remove copies"
    if any(r['is_pip_package'] for r in remove):
        return "Remove pip package copy"
    if any(r['is_example'] for r in remove):
        return "Remove example/target duplicates"
    return "Keep newer file"


def print_report(suggestions: list[dict], root: Path):
    """Print duplicate analysis report"""
    print("\n" + "=" * 80)
    print("DUPLICATE FILES ANALYSIS")
    print("=" * 80)
    
    # Group by type
    pip_copies = [s for s in suggestions if 'reclapp/' in str(s['remove'][0])]
    example_dups = [s for s in suggestions if any('target/' in str(r) or 'examples/' in str(r) for r in s['remove'])]
    other_dups = [s for s in suggestions if s not in pip_copies and s not in example_dups]
    
    print(f"\n📦 PIP Package Copies (reclapp/ ← src/python/reclapp/): {len(pip_copies)}")
    for s in pip_copies[:10]:
        print(f"  Keep: {s['keep']}")
        for r in s['remove']:
            print(f"  ❌ Remove: {r}")
        print()
    
    if len(pip_copies) > 10:
        print(f"  ... and {len(pip_copies) - 10} more\n")
    
    print(f"\n📁 Example/Target Duplicates: {len(example_dups)}")
    for s in example_dups[:5]:
        print(f"  Keep: {s['keep']}")
        for r in s['remove'][:3]:
            print(f"  ❌ Remove: {r}")
        if len(s['remove']) > 3:
            print(f"  ... and {len(s['remove']) - 3} more")
        print()
    
    if len(example_dups) > 5:
        print(f"  ... and {len(example_dups) - 5} more groups\n")
    
    print(f"\n📄 Other Duplicates: {len(other_dups)}")
    for s in other_dups[:5]:
        print(f"  Keep: {s['keep']}")
        for r in s['remove']:
            print(f"  ❌ Remove: {r}")
        print()
    
    # Summary
    total_to_remove = sum(len(s['remove']) for s in suggestions)
    total_size = sum(s['size'] * len(s['remove']) for s in suggestions)
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total duplicate groups: {len(suggestions)}")
    print(f"Files to remove: {total_to_remove}")
    print(f"Space to save: {total_size / 1024:.1f} KB")
    
    return suggestions


def generate_cleanup_script(suggestions: list[dict], root: Path):
    """Generate cleanup script"""
    script_path = root / "scripts" / "cleanup_duplicates.sh"
    
    with open(script_path, 'w') as f:
        f.write("#!/bin/bash\n")
        f.write("# Auto-generated duplicate cleanup script\n")
        f.write(f"# Generated: {datetime.now().isoformat()}\n")
        f.write("# Review before running!\n\n")
        f.write("set -e\n")
        f.write("cd \"$(dirname \"$0\")/..\"\n\n")
        
        # Group: pip package copies
        f.write("# === PIP Package Copies (safe to remove - will be re-copied) ===\n")
        pip_copies = [s for s in suggestions if any('reclapp/' in str(r) and 'src' not in str(r) for r in s['remove'])]
        for s in pip_copies:
            for r in s['remove']:
                if 'reclapp/' in str(r) and 'src' not in str(r):
                    f.write(f"# rm -f \"{r}\"  # duplicate of {s['keep']}\n")
        
        f.write("\n# === Example/Target Duplicates (review carefully) ===\n")
        example_dups = [s for s in suggestions if any('target/' in str(r) for r in s['remove'])]
        for s in example_dups[:20]:
            for r in s['remove']:
                f.write(f"# rm -f \"{r}\"  # duplicate of {s['keep']}\n")
        
        f.write("\necho 'Review and uncomment lines to execute cleanup'\n")
    
    os.chmod(script_path, 0o755)
    print(f"\n✅ Cleanup script generated: {script_path}")
    print("   Review and uncomment lines before running!")


def main():
    root = Path(__file__).parent.parent.resolve()
    
    print("🔍 Finding Duplicate Files")
    print(f"Root: {root}\n")
    
    duplicates = find_duplicates(root)
    
    if not duplicates:
        print("✅ No duplicates found!")
        return 0
    
    print(f"\n⚠️  Found {len(duplicates)} groups of duplicates")
    
    suggestions = analyze_duplicates(duplicates, root)
    print_report(suggestions, root)
    generate_cleanup_script(suggestions, root)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
