/**
 * Rasterize the PWA icons from their SVG sources.
 *
 * Run with `npm run icons` after editing public/icon.svg or
 * public/icon-maskable.svg. Checking the PNGs in AND keeping this script means
 * the icons are reproducible instead of being a one-off manual export nobody
 * can redo later.
 *
 * `sharp` is a devDependency: it never reaches the client bundle.
 */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const JOBS = [
  { src: "icon.svg", size: 192, out: "icon-192.png" },
  { src: "icon.svg", size: 512, out: "icon-512.png" },
  // iOS ignores the manifest icons entirely and uses this one.
  { src: "icon.svg", size: 180, out: "apple-touch-icon.png" },
  { src: "icon-maskable.svg", size: 512, out: "icon-maskable-512.png" },
];

for (const { src, size, out } of JOBS) {
  const svg = await readFile(join(publicDir, src));
  const info = await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, out));
  console.log(`${out.padEnd(24)} ${size}x${size}  ${info.size} B`);
}
