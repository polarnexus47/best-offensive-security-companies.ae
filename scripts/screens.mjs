// Captures the first screen (1440x900) of each ranked company's homepage and writes WebP under 120 KB.
// Usage: node scripts/screens.mjs [rank ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { screenPath } from '../src/components.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const companies = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/companies.json'), 'utf8'));
const only = process.argv.slice(2).map(Number);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' });
const report = [];
for (const c of companies) {
  if (only.length && !only.includes(c.rank)) continue;
  const out = path.join(ROOT, screenPath(c));
  const page = await ctx.newPage();
  try {
    const res = await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const title = await page.title();
    const png = await page.screenshot({ type: 'png' });
    let q = 78, buf;
    do { buf = await sharp(png).webp({ quality: q }).toBuffer(); q -= 8; } while (buf.length > 120 * 1024 && q > 20);
    fs.writeFileSync(out, buf);
    report.push(`${c.rank}. ${c.name}: HTTP ${res?.status()} "${title.slice(0, 60)}" ${Math.round(buf.length / 1024)} KB`);
  } catch (e) {
    report.push(`${c.rank}. ${c.name}: FAILED ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
console.log(report.join('\n'));
