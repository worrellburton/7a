import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const inputs = [
  { src: 'public/images/facility-exterior-mountains.jpg', out: 'public/hero/facility-exterior-mountains' },
  { src: 'public/images/embrace-connection.jpg',          out: 'public/hero/embrace-connection' },
];

for (const { src, out } of inputs) {
  // Re-encode the source to a clean, optimally-sized JPEG fallback
  // (mozjpeg quality 78 — visibly identical at hero scale, ~60% smaller
  // than the unoptimized originals) and an AVIF master at quality 50
  // (AVIF is roughly 3x as efficient as JPEG so a 50 there matches a
  // ~80-quality JPEG visually while being substantially smaller).
  // Hero images on this site render at up to ~1920px wide, so we
  // resize to a 1920px-wide max and let next/image scale further on
  // smaller viewports via its on-the-fly responsive pipeline.
  const meta = await sharp(src).metadata();
  const targetWidth = Math.min(meta.width ?? 1920, 1920);

  const jpgPath = `${out}.jpg`;
  const avifPath = `${out}.avif`;
  await sharp(src)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(jpgPath);
  await sharp(src)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .avif({ quality: 50, effort: 6 })
    .toFile(avifPath);

  const [origStat, jpgStat, avifStat] = await Promise.all([
    stat(src), stat(jpgPath), stat(avifPath),
  ]);
  const fmt = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`${src}`);
  console.log(`  orig:  ${fmt(origStat.size)}`);
  console.log(`  jpg:   ${fmt(jpgStat.size)} → ${jpgPath}`);
  console.log(`  avif:  ${fmt(avifStat.size)} → ${avifPath}`);
}
