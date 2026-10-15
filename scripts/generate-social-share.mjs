import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const backgroundPath = path.join(scriptDirectory, "assets", "social-share-paper-v2.webp");
const outputPath = path.join(projectRoot, "public", "social-share-sorp2026-v2.png");
const fontPath = path.join(
  projectRoot,
  "node_modules",
  "@fontsource",
  "dm-sans",
  "files",
  "dm-sans-latin-400-normal.woff2",
);
const boldFontPath = path.join(
  projectRoot,
  "node_modules",
  "@fontsource",
  "dm-sans",
  "files",
  "dm-sans-latin-700-normal.woff2",
);

const [background, regularFont, boldFont] = await Promise.all([
  fs.readFile(backgroundPath),
  fs.readFile(fontPath),
  fs.readFile(boldFontPath),
]);

const regularFontData = regularFont.toString("base64");
const boldFontData = boldFont.toString("base64");

const artwork = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <style>
    @font-face {
      font-family: "DM Sans Share";
      src: url("data:font/woff2;base64,${regularFontData}") format("woff2");
      font-style: normal;
      font-weight: 400;
    }
    @font-face {
      font-family: "DM Sans Share";
      src: url("data:font/woff2;base64,${boldFontData}") format("woff2");
      font-style: normal;
      font-weight: 700;
    }
    .regular { font-family: "DM Sans Share", sans-serif; font-weight: 400; }
    .bold { font-family: "DM Sans Share", sans-serif; font-weight: 700; }
  </style>

  <rect x="0" y="0" width="1200" height="12" fill="#c9ff3d"/>
  <rect x="0" y="12" width="1200" height="618" fill="url(#softWash)"/>

  <defs>
    <linearGradient id="softWash" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fbf8f1" stop-opacity="0.98"/>
      <stop offset="0.58" stop-color="#fbf8f1" stop-opacity="0.95"/>
      <stop offset="0.79" stop-color="#fbf8f1" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#fbf8f1" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-40%" width="150%" height="200%">
      <feDropShadow dx="0" dy="9" stdDeviation="12" flood-color="#1f2823" flood-opacity="0.14"/>
    </filter>
  </defs>

  <g transform="translate(70 56)">
    <text x="0" y="70" class="bold" font-size="78" fill="#202126" letter-spacing="-3.8">SORP</text>
    <text x="210" y="70" class="regular" font-size="78" fill="#202126" letter-spacing="-3.8">2026</text>
    <circle cx="405" cy="61" r="8" fill="#ff603f"/>

    <text x="0" y="163" class="regular" font-size="48" fill="#315b4c" letter-spacing="-1.8">Reporting for greater impact.</text>

    <text x="0" y="238" class="regular" font-size="25" fill="#34353a">
      <tspan x="0" dy="0">Free tools and affordable expertise to help charities</tspan>
      <tspan x="0" dy="35">navigate SORP 2026 and achieve greater impact.</tspan>
    </text>

    <g transform="translate(0 348)" filter="url(#shadow)">
      <path d="M0 0H286C301 0 313 12 313 27V62H0Z" fill="#ff603f"/>
      <text x="24" y="40" class="bold" font-size="20" fill="#202126">Are You SORP Ready?</text>
      <path d="M270 25L280 31L270 37" fill="none" stroke="#202126" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <line x1="0" y1="459" x2="510" y2="459" stroke="#315b4c" stroke-opacity="0.28"/>
    <text x="0" y="501" class="bold" font-size="16" fill="#315b4c" letter-spacing="1.55">A UK-BASED SOCIAL ENTERPRISE INITIATIVE</text>
  </g>
</svg>`;

await sharp(background)
  .resize(1200, 630, { fit: "cover" })
  .composite([{ input: Buffer.from(artwork) }])
  .png({ compressionLevel: 9, palette: true, quality: 92 })
  .toFile(outputPath);

const metadata = await sharp(outputPath).metadata();
console.log(`${path.relative(projectRoot, outputPath)} ${metadata.width}x${metadata.height}`);
