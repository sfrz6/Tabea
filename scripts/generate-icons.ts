/**
 * Renders the Tabea application icons from the source SVG.
 *
 * The interface itself uses the SVG mark, so these PNG files exist only for the
 * places that cannot take an SVG: the iPhone home screen and the web manifest.
 * Run it after changing the brand:
 *
 *   npx tsx scripts/generate-icons.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = join(root, "public", "brand", "tabea-app-icon.svg");
const iconsDir = join(root, "public", "icons");

type Target = {
  file: string;
  size: number;
  label: string;
};

const TARGETS: Target[] = [
  { file: "icon-192.png", size: 192, label: "manifest icon" },
  { file: "icon-512.png", size: 512, label: "manifest icon" },
  { file: "icon-maskable-512.png", size: 512, label: "maskable icon" },
  { file: "apple-touch-icon.png", size: 180, label: "iPhone home screen" },
];

async function main(): Promise<void> {
  const svg = await readFile(source);
  await mkdir(iconsDir, { recursive: true });

  for (const target of TARGETS) {
    const output = join(iconsDir, target.file);
    await mkdir(dirname(output), { recursive: true });

    await sharp(svg, { density: 384 })
      .resize(target.size, target.size, { fit: "contain" })
      .png({ compressionLevel: 9 })
      .toFile(output);

    console.log(`wrote ${target.file} (${target.size}px, ${target.label})`);
  }

  // A 32px favicon for browsers that still prefer an ICO sized bitmap.
  const favicon = await sharp(await readFile(join(root, "public", "brand", "tabea-mark.svg")), {
    density: 384,
  })
    .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(join(root, "public", "icons", "favicon-32.png"), favicon);
  console.log("wrote favicon-32.png (32px, browser tab)");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
