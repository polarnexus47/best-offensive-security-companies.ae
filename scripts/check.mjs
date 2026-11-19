// Post-build QA gates. Exit code 1 on any FAIL. WARN lines are reported but do not fail the build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/pages.json'), 'utf8'));
const companies = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/companies.json'), 'utf8'));
const fails = [];
const warns = [];
const info = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

const INDEPENDENCE = 'This is an independent comparison compiled by the Editorial Team from public sources, with no paid placements.';
const BANNED = ['comprehensive', 'tailored approach', 'wide range of services', 'experienced team of professionals', 'flexible approach', 'holistic', 'robust', 'seamless', 'trusted by', 'best-in-class', 'world-class', 'cutting-edge', 'award-winning', 'industry-leading'];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const companyHosts = companies.map((c) => new URL(c.url).hostname.replace(/^www\./, ''));

const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const words = (s) => s.split(/\s+/).filter(Boolean).length;

const files = pages.map((p) => ({ p, file: p.slug === '/' ? 'index.html' : path.join(p.slug.slice(1), 'index.html') }));
const titles = new Map();
const descs = new Map();
const primaryLinks = new Set();
let monthYear = null;

for (const { p, file } of files) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) { fail(`${file}: missing`); continue; }
  const html = fs.readFileSync(abs, 'utf8');
  const tag = `[${p.key}]`;

  // meta
  const title = (html.match(/<title>(.*?)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const titleT = text(title); const descT = text(desc);
  if (titleT.length > 60) fail(`${tag} title ${titleT.length} chars > 60`);
  if (descT.length < 150 || descT.length > 160) fail(`${tag} description ${descT.length} chars, need 150-160`);
  if (titles.has(titleT)) fail(`${tag} duplicate title with ${titles.get(titleT)}`); titles.set(titleT, p.key);
  if (descs.has(descT)) fail(`${tag} duplicate description with ${descs.get(descT)}`); descs.set(descT, p.key);
  if (!html.includes(`<link rel="canonical" href="https://best-offensive-security-companies.ae${p.slug}">`)) fail(`${tag} canonical missing or wrong`);
  if (!html.includes('hreflang="en-ae"')) fail(`${tag} hreflang en-ae missing`);
  if (!html.includes('<html lang="en">')) fail(`${tag} lang attribute`);

  // headings
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(`${tag} ${h1s.length} H1 elements`);
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) { fail(`${tag} heading skip h${levels[i - 1]} -> h${levels[i]}`); break; }

  // tokens, scripts, emoji
  if (/\{\{[A-Z_]+\}\}/.test(html)) fail(`${tag} unreplaced token`);
  const scripts = (html.match(/<script(?![^>]*application\/ld\+json)[^>]*>/g) || []);
  if (scripts.length) fail(`${tag} non-JSON-LD script present`);
  if (/onclick=/i.test(html)) fail(`${tag} onclick attribute`);
  const body = text(html);
  if (EMOJI.test(body)) fail(`${tag} emoji in text`);
  if (/[А-Яа-яЁё]/.test(html)) fail(`${tag} Cyrillic characters`);
  for (const b of BANNED) if (body.toLowerCase().includes(b)) fail(`${tag} banned phrase "${b}"`);
  if (/[—–]/.test(body)) warn(`${tag} em or en dash in text`);

  // last updated + dateModified
  const lu = body.match(/Last updated: ([A-Z][a-z]+ \d{4})/);
  if (lu) { monthYear ??= lu[1]; if (lu[1] !== monthYear) fail(`${tag} Last updated differs: ${lu[1]}`); }
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  if (!ld.length) fail(`${tag} no JSON-LD`);
  const graph = ld.flatMap((d) => d['@graph'] || [d]);
  for (const n of graph) {
    if (n['@type'] === 'Review' || n['@type'] === 'AggregateRating' || JSON.stringify(n).includes('aggregateRating')) fail(`${tag} Review or AggregateRating in schema`);
    if (n.dateModified) { const d = new Date(n.dateModified); const my = d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }); if (monthYear && my !== monthYear) fail(`${tag} dateModified ${n.dateModified} does not match ${monthYear}`); }
  }

  // FAQ: schema must equal visible text
  const faqNode = graph.find((n) => n['@type'] === 'FAQPage');
  const visible = [...html.matchAll(/<details><summary><h3>([\s\S]*?)<\/h3>[\s\S]*?<div class="answer">([\s\S]*?)<\/div><\/details>/g)].map((m) => ({ q: text(m[1]), a: text(m[2]) }));
  if (faqNode) {
    const schemaQ = faqNode.mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text }));
    if (schemaQ.length !== visible.length) fail(`${tag} FAQ count schema ${schemaQ.length} vs visible ${visible.length}`);
    schemaQ.forEach((s, i) => { if (!visible[i] || s.q !== visible[i].q || s.a !== visible[i].a) fail(`${tag} FAQ ${i + 1} schema text differs from visible`); });
    if (p.type === 'guide' && (visible.length < 3 || visible.length > 5)) fail(`${tag} guide FAQ has ${visible.length} questions`);
  } else if (visible.length) fail(`${tag} visible FAQ without FAQPage schema`);

  // links
  for (const m of html.matchAll(/<a\s([^>]*)>/g)) {
    const a = m[1];
    const href = (a.match(/href="([^"]*)"/) || [])[1];
    if (href === undefined) { fail(`${tag} <a> without href`); continue; }
    if (/rel="[^"]*nofollow/.test(a)) fail(`${tag} nofollow link ${href}`);
    if (/utm_/i.test(href)) fail(`${tag} UTM in ${href}`);
    if (/^https?:/.test(href)) {
      const host = new URL(href).hostname.replace(/^www\./, '');
      if (host === 'best-offensive-security-companies.ae') continue;
      const isCompany = companyHosts.includes(host);
      if (isCompany) {
        if (p.key !== 'home') fail(`${tag} links to ranked company ${host} outside the main page`);
        if (!/target="_blank"/.test(a) || !/rel="noopener"/.test(a)) fail(`${tag} company link ${host} lacks target/rel`);
      } else {
        primaryLinks.add(href.replace(/#.*$/, ''));
      }
    } else if (!href.startsWith('#') && !href.startsWith('mailto:')) {
      const target = path.normalize(path.join(path.dirname(abs), href.split('#')[0]));
      const resolved = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(resolved)) fail(`${tag} broken internal link ${href}`);
    }
  }

  // images
  for (const m of html.matchAll(/<img\s([^>]*)>/g)) {
    if (!/width="\d+"/.test(m[1]) || !/height="\d+"/.test(m[1]) || !/alt="[^"]+"/.test(m[1])) fail(`${tag} image without width/height/alt`);
  }

  // independence wording
  const indep = body.match(/This is an independent comparison[^.]*\./g) || [];
  for (const s of indep) if (s !== INDEPENDENCE) fail(`${tag} independence wording differs`);

  // walls of text: 3+ consecutive <p> inside a section without a break
  for (const sec of html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/g)) {
    if (/class="hero"/.test(sec[0].slice(0, 60))) continue;
    // top-level children only: track nesting of container elements
    const seq = []; let depth = 0;
    for (const m of sec[1].matchAll(/<(\/?)(p|ul|ol|table|div|aside|figure|h2|h3|details|nav)(\s[^>]*)?>/g)) {
      const [, close, tagName, attrs] = m;
      if (close) { if (tagName !== "p") depth--; continue; }
      if (depth === 0) seq.push(tagName === "p" && !attrs ? "p" : "x");
      if (tagName !== "p") depth++;
    }
    let run = 0;
    for (const t of seq) { run = t === "p" ? run + 1 : 0; if (run >= 3) { warn(`${tag} 3+ consecutive paragraphs in #${(sec[0].match(/id="([^"]+)"/) || [])[1]}`); break; } }
  }

  // weight
  const kb = Buffer.byteLength(html) / 1024;
  if (kb > 100) warn(`${tag} HTML ${kb.toFixed(1)} KB > 100 KB`);
  info.push(`${p.key.padEnd(18)} ${String(words(body)).padStart(5)} words  ${kb.toFixed(1).padStart(5)} KB  title ${titleT.length}  desc ${descT.length}`);

  // main page specifics
  if (p.key === 'home') {
    const cards = [...html.matchAll(/<article class="card"[\s\S]*?<\/article>/g)].map((m) => m[0]);
    if (cards.length !== companies.length) fail(`[home] ${cards.length} cards, expected ${companies.length}`);
    cards.forEach((c, i) => {
      const name = companies[i].name;
      const bodyText = text((c.match(/<p class="card-body">([\s\S]*?)<\/p>/) || [])[1] || '');
      const n = words(bodyText);
      info.push(`  card ${String(i + 1).padStart(2)} ${name.padEnd(32)} ${n} words`);
      if (n < 100 || n > 115) fail(`[home] card "${name}" ${n} words, need 100-115`);
      const labels = [...c.matchAll(/<dt>(.*?)<\/dt>/g)].map((m) => m[1]).join('|');
      if (labels !== 'UAE base|Core offensive services|Accreditations|Delivery model|Other services|Best for') fail(`[home] card "${name}" attribute labels differ`);
      if (!c.includes(`>Visit ${name}`)) fail(`[home] card "${name}" visit link wording`);
      if (/<h4|<blockquote|class="quote"/.test(c)) fail(`[home] card "${name}" has extra sections`);
    });
    const itemList = graph.find((n) => n['@type'] === 'ItemList');
    if (!itemList || itemList.itemListElement.length !== companies.length) fail('[home] ItemList schema count');
  }
  if (p.type === 'guide') {
    if (!/href="\.\.\/"|href="\.\.\/#ranking-table"/.test(html.replace(/<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/g, ''))) fail(`${tag} guide does not link to the ranking in its content`);
    const sib = new Set([...html.replace(/<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/g, '').matchAll(/href="\.\.\/([a-z0-9-]+)\/"/g)].map((m) => m[1]).filter((s) => pages.some((x) => x.type === 'guide' && x.slug === `/${s}/`)));
    if (sib.size < 2) fail(`${tag} links to ${sib.size} sibling guides in content, need 2-3`);
  }
}

// site-level files
for (const f of ['sitemap.xml', 'robots.txt', 'CNAME', '.nojekyll', '404.html', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'site.webmanifest', 'images/og/og.png']) if (!fs.existsSync(path.join(ROOT, f))) fail(`missing ${f}`);
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
if ((sm.match(/<loc>/g) || []).length !== pages.length) fail('sitemap URL count');
info.push(`distinct primary-source links across the site: ${primaryLinks.size}`);
if (primaryLinks.size < 2) fail('fewer than 2 primary-source links');

// optional local checks kept outside the repository
const local = path.join(ROOT, '..', 'qa-local.mjs');
if (fs.existsSync(local)) {
  const { default: run } = await import(pathToFileURL(local).href);
  await run({ ROOT, files, fail, warn, text });
}

console.log(info.join('\n'));
if (warns.length) console.log('\nWARN\n' + warns.map((w) => '  ' + w).join('\n'));
if (fails.length) { console.log('\nFAIL\n' + fails.map((f) => '  ' + f).join('\n')); process.exit(1); }
console.log('\nAll checks passed.');
