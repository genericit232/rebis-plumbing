// Resizes and compresses photos from photos-raw/ into site/images/.
// Name raw photos after the slot they fill (see photos-raw/README.md), any format sharp reads
// (jpg, png, heic on most installs, webp). Strips EXIF/GPS. Run: npm install && npm run images
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { extname, basename, join } from 'node:path';

const RAW = 'photos-raw';
const OUT = 'site/images';
// slot -> max width. Height follows the photo's ratio; CSS crops to fit.
const SLOTS = {
  hero: 1800, cta: 1000, about: 900,
  'work-1': 800, 'work-2': 800, 'work-3': 800, 'work-4': 800, 'work-5': 800, 'work-6': 800,
};

await mkdir(OUT, { recursive: true });
const files = (await readdir(RAW, { withFileTypes: true }))
  .filter((d) => d.isFile() && !d.name.startsWith('.') && d.name !== 'README.md').map((d) => d.name);
if (!files.length) { console.log(`No photos in ${RAW}/. See ${RAW}/README.md.`); process.exit(0); }

for (const f of files) {
  const slot = basename(f, extname(f)).toLowerCase();
  if (!(slot in SLOTS)) { console.warn(`skip ${f}: not a known slot (${Object.keys(SLOTS).join(', ')})`); continue; }
  const out = join(OUT, `${slot}.jpg`);
  const info = await sharp(join(RAW, f))
    .rotate()
    .resize({ width: SLOTS[slot], withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out);
  console.log(`${f} -> ${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}
