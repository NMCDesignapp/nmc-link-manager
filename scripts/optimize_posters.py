#!/usr/bin/env python3
"""
Optimize all poster images in /home/z/my-project/public/posters/
- Resize to max 1280px wide (preserve aspect ratio) if larger
- Save as optimized PNG (compression level 9, optimize=True)
- Backup originals to /home/z/my-project/public/posters_original_backup/ (only first run)

Goal: reduce total size from ~99MB to ~10-15MB to speed up app load.
"""
import os
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageOps

POSTERS_DIR = Path('/home/z/my-project/public/posters')
BACKUP_DIR = Path('/home/z/my-project/public/posters_original_backup')

MAX_WIDTH = 1280  # px — resize down if larger
JPEG_QUALITY = 82  # for any photo-like content

def optimize_one(src_path: Path) -> tuple[int, int]:
    """Optimize a single image. Returns (original_size, new_size) in bytes."""
    orig_size = src_path.stat().st_size
    backup_path = BACKUP_DIR / src_path.name

    # Backup original (only if backup doesn't exist yet)
    if not backup_path.exists():
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_path, backup_path)

    # Open and process
    with Image.open(src_path) as img:
        # Auto-rotate based on EXIF (avoid sideways images)
        img = ImageOps.exif_transpose(img)

        # Convert mode if needed (RGBA stays RGBA; everything else → RGB)
        if img.mode not in ('RGB', 'RGBA', 'L', 'P'):
            img = img.convert('RGB')

        # Resize if wider than MAX_WIDTH
        if img.width > MAX_WIDTH:
            new_h = int(img.height * MAX_WIDTH / img.width)
            img = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)

        # Save as optimized PNG
        tmp_path = src_path.with_suffix('.png.tmp')
        img.save(tmp_path, format='PNG', optimize=True, compress_level=9)
        new_size = tmp_path.stat().st_size

        # Replace original
        tmp_path.replace(src_path)

    return orig_size, new_size


def main():
    if not POSTERS_DIR.exists():
        print(f'ERROR: {POSTERS_DIR} does not exist')
        sys.exit(1)

    png_files = sorted(POSTERS_DIR.glob('*.png'))
    print(f'Found {len(png_files)} PNG files to optimize')

    total_orig = 0
    total_new = 0
    for i, p in enumerate(png_files, 1):
        try:
            orig, new = optimize_one(p)
            total_orig += orig
            total_new += new
            saved_pct = (1 - new / orig) * 100 if orig > 0 else 0
            print(f'  [{i}/{len(png_files)}] {p.name}: {orig/1024:.0f}KB → {new/1024:.0f}KB ({saved_pct:.0f}% smaller)')
        except Exception as e:
            print(f'  [{i}/{len(png_files)}] {p.name}: ERROR - {e}')

    print()
    print(f'TOTAL: {total_orig/1024/1024:.1f}MB → {total_new/1024/1024:.1f}MB')
    saved_pct = (1 - total_new / total_orig) * 100 if total_orig > 0 else 0
    print(f'Saved: {saved_pct:.1f}%')
    print(f'Backups at: {BACKUP_DIR}')


if __name__ == '__main__':
    main()
