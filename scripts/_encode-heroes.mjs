import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const inputs = [
  { src: 'public/images/facility-exterior-mountains.jpg', out: 'public/hero/facility-exterior-mountains' },
  { src: 'public/images/embrace-connection.jpg',          out: 'public/hero/embrace-connection' },
  { src: 'public/images/sign-night-sky-milky-way.jpg',    out: 'public/hero/sign-night-sky-milky-way' },
  { src: 'public/images/sound-healing-session.jpg',       out: 'public/hero/sound-healing-session' },
  { src: 'public/images/group-therapy-room.jpg',          out: 'public/hero/group-therapy-room' },
  { src: 'public/images/covered-porch-desert-view.jpg',   out: 'public/hero/covered-porch-desert-view' },
  { src: 'public/images/common-area-living-room.jpg',     out: 'public/hero/common-area-living-room' },
  { src: 'public/images/equine-therapy-portrait.jpg',     out: 'public/hero/equine-therapy-portrait' },
  { src: 'public/images/group-gathering-pavilion.jpg',    out: 'public/hero/group-gathering-pavilion' },
  { src: 'public/images/horses-grazing.jpg',              out: 'public/hero/horses-grazing' },
  { src: 'public/images/group-sunset-desert.jpg',         out: 'public/hero/group-sunset-desert' },
  { src: 'public/images/individual-therapy-session.jpg',  out: 'public/hero/individual-therapy-session' },
  { src: 'public/images/horse-sketch-artwork.jpg',        out: 'public/hero/horse-sketch-artwork' },
  { src: 'public/images/resident-reading-window.jpg',     out: 'public/hero/resident-reading-window' },
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
