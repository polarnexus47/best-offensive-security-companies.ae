// Renders the OG image (1200x630), apple-touch-icon, icon-512 and favicon.ico from inline SVG/HTML.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const font = fs.readFileSync(path.join(ROOT, 'fonts/barlow-condensed-700.woff2')).toString('base64');

const og = `<!doctype html><html><head><style>
@font-face{font-family:B;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:700}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:radial-gradient(800px 500px at 85% 30%,rgba(74,120,176,.22),transparent 65%),linear-gradient(180deg,#0a1420,#0d1b2b);color:#d6e4f1;font-family:-apple-system,Helvetica,Arial,sans-serif;position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:radial-gradient(rgba(214,228,241,.18) 1px,transparent 1.3px);background-size:24px 24px}
.radar{position:absolute;width:760px;height:760px;right:-200px;top:-70px;border-radius:50%;background:linear-gradient(rgba(214,228,241,.12),rgba(214,228,241,.12)) center/1px 100% no-repeat,linear-gradient(rgba(214,228,241,.12),rgba(214,228,241,.12)) center/100% 1px no-repeat,repeating-radial-gradient(circle,transparent 0 94px,rgba(214,228,241,.12) 94px 95px);-webkit-mask-image:radial-gradient(circle,#000 55%,transparent 71%)}
.rule{position:absolute;left:0;right:0;bottom:0;height:22px;border-top:1px solid rgba(214,228,241,.16);background:repeating-linear-gradient(90deg,rgba(214,228,241,.4) 0 1px,transparent 1px 120px) top left/100% 16px no-repeat,repeating-linear-gradient(90deg,rgba(214,228,241,.2) 0 1px,transparent 1px 12px) top left/100% 7px no-repeat}
.in{position:absolute;left:72px;top:64px;right:72px}
.wm{display:flex;align-items:center;gap:14px;font:700 30px B;letter-spacing:.03em;text-transform:uppercase}
.tag{font:600 16px ui-monospace,Menlo,monospace;border:1px solid rgba(214,228,241,.4);padding:3px 8px;border-radius:4px;letter-spacing:.12em}
h1{font:700 104px/0.92 B;text-transform:uppercase;margin-top:56px;max-width:900px}
p{font:500 20px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#9fb8d0;margin-top:34px}
</style></head><body><div class="grid"></div>
<div class="radar"></div><div class="rule"></div>
<div class="in"><div class="wm"><svg width="40" height="40" viewBox="0 0 32 32"><path d="M4 11V4h7M21 4h7v7M28 21v7h-7M11 28H4v-7" fill="none" stroke="#d6e4f1" stroke-width="2"/><circle cx="16" cy="16" r="4.5" fill="none" stroke="#d6e4f1" stroke-width="2"/></svg>Offensive Security Companies <span class="tag">UAE</span></div>
<h1>Offensive security companies in the UAE, 2026</h1>
<p>Ranking · Methodology · Buyer guides</p></div></body></html>`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png' });
await sharp(png).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(ROOT, 'images/og/og.png'));
await browser.close();

const svg = fs.readFileSync(path.join(ROOT, 'favicon.svg'));
await sharp(svg, { density: 1200 }).resize(180, 180).png().toFile(path.join(ROOT, 'apple-touch-icon.png'));
await sharp(svg, { density: 1600 }).resize(512, 512).png().toFile(path.join(ROOT, 'icon-512.png'));
// favicon.ico: ICO container holding one 32x32 PNG
const p32 = await sharp(svg, { density: 300 }).resize(32, 32).png().toBuffer();
const hdr = Buffer.alloc(22);
hdr.writeUInt16LE(0, 0); hdr.writeUInt16LE(1, 2); hdr.writeUInt16LE(1, 4);
hdr.writeUInt8(32, 6); hdr.writeUInt8(32, 7); hdr.writeUInt8(0, 8); hdr.writeUInt8(0, 9);
hdr.writeUInt16LE(1, 10); hdr.writeUInt16LE(32, 12); hdr.writeUInt32LE(p32.length, 14); hdr.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(ROOT, 'favicon.ico'), Buffer.concat([hdr, p32]));
console.log('assets written');
