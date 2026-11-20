// Generates PWA icons from the Letan Moris logo (Pieter Both, option B). Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const mark = (scale = 1) => `
<g transform="translate(${60 - 60 * scale} ${60 - 60 * scale}) scale(${scale})">
  <line x1="22" y1="22" x2="17" y2="33" stroke="#5AA2FF" stroke-width="5" stroke-linecap="round"/>
  <line x1="34" y1="16" x2="29" y2="27" stroke="#5AA2FF" stroke-width="5" stroke-linecap="round"/>
  <line x1="46" y1="24" x2="41" y2="35" stroke="#5AA2FF" stroke-width="5" stroke-linecap="round"/>
  <path d="M90 96 a15 15 0 0 1 30 0z" fill="#F2A541"/>
  <path d="M8 96 L40 52 L54 68 L72 34 L112 96Z" fill="#3CCFCF"/>
  <circle cx="72" cy="27" r="7" fill="#FFFFFF"/>
  <path d="M10 106 q8 -7 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
  <path d="M86 44 c-10 -2 -14 6 -6 8 c6 1 6 -6 0 -6" fill="none" stroke="#E7EEF2" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M80 52 h22 M84 60 h16" stroke="#E7EEF2" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M44 101 q13 5 28 0 l-4 5 h-20 z" fill="#FFFFFF" stroke="#0B2A3C" stroke-width="1.5"/>
  <path d="M57 100 L57 78 L70 98 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
</g>`;
const svg = (scale, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="${rounded ? 26 : 0}" fill="#0B2A3C"/>${mark(scale)}</svg>`;

mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["icon-192.png", 192, svg(0.78, true)],
  ["icon-512.png", 512, svg(0.78, true)],
  ["icon-maskable-512.png", 512, svg(0.62, false)],
  ["apple-touch-icon.png", 180, svg(0.74, false)],
];
for (const [name, size, s] of jobs) await sharp(Buffer.from(s)).resize(size, size).png().toFile(`public/icons/${name}`);
await sharp(Buffer.from(svg(0.78, true))).resize(48, 48).png().toFile("public/icons/favicon-48.png");
console.log("icons done");
