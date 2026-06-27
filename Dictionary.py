#!/usr/bin/env python3
import sys
from pathlib import Path

# الامتدادات المسموح بيها
ALLOWED_EXTENSIONS = ('.ts', '.tsx', '.js', '.jsx', '.css', '.html','.java')

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


def save_file_names(root_dir, output_path):
    files = find_files(root_dir)

    with open(output_path, 'w', encoding='utf-8') as out:
        for file_path in files:
            rel_path = file_path.relative_to(root_dir)
            out.write(f"{rel_path}\n")

    return len(files)


def main():
    root_dir = Path.cwd()
    output_file = 'file_names.txt'

    if len(sys.argv) >= 2:
        output_file = sys.argv[1]

    print(f"Scanning: {root_dir}")
    print("Collecting file names...")

    total = save_file_names(root_dir, output_file)

    print(f"Found {total} file(s) -> {output_file}")


if __name__ == "__main__":
    main()