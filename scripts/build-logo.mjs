// Builds web logo assets from brand/logo.jpg (orange flame on near-black).
// Run: node scripts/build-logo.mjs
import sharp from 'sharp';

const SRC = 'brand/logo.jpg';
const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

// Sample background (corner) and brand orange (mean of solidly orange pixels; avoids JPEG outliers).
const bg = [data[0], data[1], data[2]];
const sum = [0, 0, 0]; let n = 0;
for (let i = 0; i < data.length; i += 3) {
  if (data[i] > 200 && data[i + 2] < 90) { sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; n++; }
}
if (!n) throw new Error('No orange pixels found in ' + SRC);
const orange = sum.map((v) => Math.round(v / n));
console.log('bg', bg, 'orange', orange, '#' + orange.map((c) => c.toString(16).padStart(2, '0')).join(''));

// Alpha from the red channel distance between bg and orange; colour = pure orange.
const rgba = Buffer.alloc(W * H * 4);
for (let p = 0, i = 0; i < data.length; i += 3, p += 4) {
  const a = Math.max(0, Math.min(1, (data[i] - bg[0]) / (orange[0] - bg[0])));
  rgba[p] = orange[0]; rgba[p + 1] = orange[1]; rgba[p + 2] = orange[2]; rgba[p + 3] = Math.round(a * 255);
}
const cut = sharp(rgba, { raw: { width: W, height: H, channels: 4 } });

// Flame mark only: top ~68% of the image holds the icon, text sits below.
const flameBuf = await cut.clone().extract({ left: 0, top: 0, width: W, height: Math.round(H * 0.68) }).png().toBuffer();
const flame = sharp(flameBuf).trim({ threshold: 1 });
await flame.clone().resize({ height: 160 }).png({ compressionLevel: 9 }).toFile('site/images/logo-flame.png');

// Square app icons: flame on the logo's dark background.
const hex = '#' + bg.map((c) => c.toString(16).padStart(2, '0')).join('');
const icon = async (size, out, pad) => {
  const mark = await sharp(flameBuf).trim({ threshold: 1 })
    .resize({ width: Math.round(size * (1 - pad * 2)), height: Math.round(size * (1 - pad * 2)), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: hex } })
    .composite([{ input: mark, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(out);
};
await icon(180, 'site/apple-touch-icon.png', 0.14);
await icon(64, 'brand/favicon-64.png', 0.1);
await icon(512, 'brand/icon-512.png', 0.14);
console.log('bg hex', hex);

// Social share card: the business card (site/brand/business-card.png) at 1200 wide, uncropped.
await sharp('site/brand/business-card.png').resize({ width: 1200 }).flatten({ background: hex }).jpeg({ quality: 85, mozjpeg: true }).toFile('site/images/og.jpg');
