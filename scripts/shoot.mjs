// Full-page screenshots of local pages for visual review: node scripts/shoot.mjs <outdir> [path ...]
import { chromium } from 'playwright-core';
const [outdir, ...paths] = process.argv.slice(2);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const w of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  for (const p of paths.length ? paths : ['/']) {
    await page.goto(`http://localhost:3000${p}`, { waitUntil: 'load' });
    await page.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }); await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))); });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const name = (p.replace(/\//g, '_') || '_') + `-${w}`;
    await page.screenshot({ path: `${outdir}/${name}.png`, fullPage: true });
    console.log(name, 'h-overflow:', overflow);
  }
  await page.close();
}
await browser.close();
