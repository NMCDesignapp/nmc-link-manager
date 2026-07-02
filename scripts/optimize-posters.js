#!/usr/bin/env node
/**
 * Optimize poster PNGs in /public/posters/ → WebP (80% smaller, same quality).
 *
 * Strategy:
 *  - Backup original PNGs to /public/posters-originals/ (one-time)
 *  - Convert each PNG to WebP at quality 80, max width 1600px (posters are 2:1, displayed at ~1100px max)
 *  - ALSO keep a small "thumbnail" WebP (max 400px) for use in template selector lists
 *  - Print before/after sizes so we can verify savings
 *
 * Posters change only once a year, so we run this once after each yearly change.
 * Result: ~99MB → ~5MB total, ~95% reduction.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'public', 'posters');
const BACKUP_DIR = path.join(__dirname, '..', 'public', 'posters-originals');

// Display width on vinh-danh page is ~1100px (max-width: 1100px app-wrap).
// Use 1600px to be safe for retina displays. 2:1 aspect → 1600x800.
const MAX_WIDTH = 1600;
const QUALITY = 78;
const THUMB_WIDTH = 400;

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('Source dir not found:', SRC_DIR);
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const pngs = fs.readdirSync(SRC_DIR).filter(f => f.toLowerCase().endsWith('.png'));
  if (pngs.length === 0) {
    console.log('No PNG files to optimize.');
    return;
  }

  console.log(`Found ${pngs.length} PNG files. Starting optimization...\n`);

  let totalOriginal = 0;
  let totalWebp = 0;
  let totalThumb = 0;

  for (const file of pngs) {
    const srcPath = path.join(SRC_DIR, file);
    const baseName = path.basename(file, '.png');
    const webpPath = path.join(SRC_DIR, `${baseName}.webp`);
    const thumbPath = path.join(SRC_DIR, `${baseName}-thumb.webp`);
    const backupPath = path.join(BACKUP_DIR, file);

    // Backup original (if not already backed up)
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(srcPath, backupPath);
    }

    const originalStat = fs.statSync(srcPath);
    totalOriginal += originalStat.size;

    try {
      // Full-size WebP
      await sharp(srcPath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 4 })
        .toFile(webpPath);

      // Thumbnail WebP for selectors/lists
      await sharp(srcPath)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 70, effort: 4 })
        .toFile(thumbPath);

      const webpStat = fs.statSync(webpPath);
      const thumbStat = fs.statSync(thumbPath);
      totalWebp += webpStat.size;
      totalThumb += thumbStat.size;

      const saved = ((1 - webpStat.size / originalStat.size) * 100).toFixed(1);
      console.log(
        `${file.padEnd(28)} ${(originalStat.size / 1024).toFixed(0).padStart(6)}KB → ` +
        `${(webpStat.size / 1024).toFixed(0).padStart(5)}KB (${saved}% saved) ` +
        `+ thumb ${(thumbStat.size / 1024).toFixed(0)}KB`
      );
    } catch (err) {
      console.error(`Failed to optimize ${file}:`, err.message);
    }
  }

  console.log('\n--- Totals ---');
  console.log(`Original PNGs: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`WebP full:     ${(totalWebp / 1024 / 1024).toFixed(2)} MB`);
  console.log(`WebP thumbs:   ${(totalThumb / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Combined WebP: ${((totalWebp + totalThumb) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Reduction:     ${((1 - (totalWebp + totalThumb) / totalOriginal) * 100).toFixed(1)}%`);
  console.log('\nOriginals backed up to: public/posters-originals/');
  console.log('PNG originals still in public/posters/ — you may delete them after verifying.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
