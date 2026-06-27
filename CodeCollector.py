#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# الملفات اللي عايز تجمعها
ALLOWED_EXTENSIONS = ('.ts', '.tsx', '.js', '.jsx', '.css', '.html')

# فولدرات نتجاهلها
EXCLUDED_DIRS = {'.git', 'node_modules', 'dist', 'build'}

def find_files(root_dir):
    root = Path(root_dir)
    files = []

    for path in root.rglob("*"):
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue

        if path.is_file() and path.suffix in ALLOWED_EXTENSIONS:
            files.append(path)

    return sorted(files)


def read_file_safe(file_path):
    encodings = ['utf-8', 'utf-8-sig', 'latin-1']

    for enc in encodings:
        try:
            return file_path.read_text(encoding=enc)
        except:
            continue

    return "/* ERROR: could not read file */\n"


def collect_to_file(root_dir, output_path):
    files = find_files(root_dir)

    with open(output_path, 'w', encoding='utf-8') as out:
        for file_path in files:
            rel_path = file_path.relative_to(root_dir)

            out.write("=" * 80 + "\n")
            out.write(f"FILE: {rel_path}\n")
            out.write("=" * 80 + "\n\n")

            out.write(read_file_safe(file_path))
            out.write("\n\n")

    return len(files)


def main():
    root_dir = Path.cwd()
    output_file = 'all_code_collected.txt'

    if len(sys.argv) >= 2:
        output_file = sys.argv[1]

    print(f"Scanning: {root_dir}")
    print("Collecting project files...")

    total = collect_to_file(root_dir, output_file)

    print(f"Collected {total} file(s) -> {output_file}")


if __name__ == "__main__":
    main()