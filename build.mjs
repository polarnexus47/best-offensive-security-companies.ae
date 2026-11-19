// Assembles every page from src/pages/*.html, src/pages.json and src/data/companies.json.
// Output: index.html and <slug>/index.html in this directory, plus 404.html and sitemap.xml.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './src/components.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ORIGIN = 'https://best-offensive-security-companies.ae';
const SITE_NAME = 'Offensive Security Companies UAE';
const CONTACT_EMAIL = 'editor@best-offensive-security-companies.ae';
const PUBLISHED = '2026-11-18';

const now = new Date();
const MONTH_YEAR = now.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
const MODIFIED = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' }); // YYYY-MM-DD

const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/pages.json'), 'utf8'));
const companies = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/companies.json'), 'utf8'));
const guides = pages.filter((p) => p.type === 'guide');
const bySlug = Object.fromEntries(pages.map((p) => [p.key, p]));

const NAV_GUIDE_LABELS = {
  'guide-a': 'What is an offensive security company',
  'guide-b': 'Pentest vs red team vs VAPT',
  'guide-c': 'UAE pentest requirements',
  'guide-d': 'How to choose a provider',
  'guide-e': 'Certifications explained',
  'guide-f': 'Penetration testing cost',
  'guide-g': 'Crypto testing and forensics',
};

const EYEBROW = (p) => {
  if (p.type === 'main') return `UAE ranking · ${companies.length} companies`;
  if (p.type === 'guide') return `Buyer guide ${p.key.slice(-1).toUpperCase()} of ${guides.length}`;
  return 'Editorial Team';
};

function header() {
  return `<header class="site-header">
<div class="wrap header-row">
<a class="wordmark" href="/" aria-label="${SITE_NAME}, home">
<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 11V4h7M21 4h7v7M28 21v7h-7M11 28H4v-7" /><circle cx="16" cy="16" r="4.5"/></svg>
<span class="wm-text">Offensive Security Companies</span><span class="wm-tag mono">UAE</span>
</a>
<input type="checkbox" id="nav-toggle" class="nav-toggle" aria-hidden="true">
<label for="nav-toggle" class="nav-burger"><span class="sr-only">Menu</span><span></span><span></span><span></span></label>
<nav class="main-nav" aria-label="Main">
<ul>
<li><a href="/#ranking-table">Ranking</a></li>
<li class="has-sub"><details><summary>Guides</summary><ul class="sub">${guides.map((g) => `<li><a href="${g.slug}">${NAV_GUIDE_LABELS[g.key]}</a></li>`).join('')}</ul></details></li>
<li><a href="/methodology/">Methodology</a></li>
<li><a href="/add-a-company/">Add a company</a></li>
<li><a href="/about/">About</a></li>
</ul>
</nav>
</div>
</header>`;
}

function footer() {
  const col = (title, links) => `<div class="f-col"><p class="f-h mono">${title}</p><ul>${links.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-footer">
<div class="wrap">
<div class="f-top">
<div class="f-brand"><a class="wordmark" href="/"><svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 11V4h7M21 4h7v7M28 21v7h-7M11 28H4v-7" /><circle cx="16" cy="16" r="4.5"/></svg><span class="wm-text">Offensive Security Companies</span><span class="wm-tag mono">UAE</span></a>
<p>A comparison of penetration testing and red team providers serving the UAE, compiled from public sources by the Editorial Team.</p>
<p class="mono f-upd">Last updated: ${MONTH_YEAR}</p></div>
${col('Guides', guides.map((g) => [g.slug, NAV_GUIDE_LABELS[g.key]]))}
${col('Ranking', [['/#ranking-table', 'Ranking table'], ['/methodology/', 'Methodology'], ['/add-a-company/', 'Add a company'], ['/sources/', 'Sources and fact-checking']])}
${col('Editorial', [['/about/', 'About'], ['/editorial-policy/', 'Editorial policy'], ['/contact/', 'Contact'], ['/terms/', 'Terms and disclaimer']])}
</div>
<div class="f-bottom">
<p>Information is compiled from public sources. Verify scope, accreditations and price with each provider before you sign. See the <a href="/terms/">terms and disclaimer</a>.</p>
<p>Image credits: homepage screenshots are shown for identification and belong to their respective owners. Icons and graphics are original to this site.</p>
<p class="mono">© 2026 ${SITE_NAME}</p>
</div>
</div>
</footer>`;
}

const ORG = { '@type': 'Organization', '@id': `${ORIGIN}/#org`, name: SITE_NAME, url: `${ORIGIN}/`, logo: `${ORIGIN}/apple-touch-icon.png`, email: CONTACT_EMAIL };

function schema(p, url) {
  const graph = [ORG];
  const types = p.schema || [];
  const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Ranking', item: `${ORIGIN}/` }];
  if (p.type !== 'main') crumbs.push({ '@type': 'ListItem', position: 2, name: p.h1, item: url });
  for (const t of types) {
    if (t === 'Article') {
      graph.push({ '@type': 'Article', '@id': `${url}#article`, headline: p.h1, description: p.description, url, mainEntityOfPage: url, inLanguage: 'en-AE', datePublished: PUBLISHED, dateModified: MODIFIED, author: { '@id': `${ORIGIN}/#org` }, publisher: { '@id': `${ORIGIN}/#org` }, image: `${ORIGIN}/images/og/og.png` });
    } else if (t === 'ItemList') {
      graph.push({ '@type': 'ItemList', '@id': `${url}#ranking`, name: `Ranking of offensive security companies in the UAE, ${MONTH_YEAR}`, numberOfItems: companies.length, itemListOrder: 'https://schema.org/ItemListOrderAscending', itemListElement: companies.map((c) => ({ '@type': 'ListItem', position: c.rank, item: { '@type': 'Organization', name: c.name, url: c.url, areaServed: 'AE' } })) });
    } else if (t === 'FAQPage') {
      graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: C.plain(f.a) } })) });
    } else if (t === 'BreadcrumbList') {
      graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumbs`, itemListElement: crumbs });
    } else {
      graph.push({ '@type': t, '@id': `${url}#webpage`, name: p.h1, description: p.description, url, inLanguage: 'en-AE', dateModified: MODIFIED, publisher: { '@id': `${ORIGIN}/#org` } });
    }
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

function head(p, url, noindex = false) {
  const css = p.type === 'main' ? '' : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${C.esc(p.title)}</title>
<meta name="description" content="${C.attr(p.description)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}">
${noindex ? '' : `<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en-ae" href="${url}">`}
<meta property="og:type" content="${p.type === 'service' ? 'website' : 'article'}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${C.attr(p.title)}">
<meta property="og:description" content="${C.attr(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/images/og/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_AE">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${C.attr(p.title)}">
<meta name="twitter:description" content="${C.attr(p.description)}">
<meta name="twitter:image" content="${ORIGIN}/images/og/og.png">
<meta name="theme-color" content="#0c1724">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/global.css">${css}
<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-5G8XWNXW"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
</script>
${noindex ? '' : `<script type="application/ld+json">${schema(p, url)}</script>`}`;
}

function breadcrumbs(p) {
  if (p.type === 'main') return '';
  return `<nav class="crumbs mono" aria-label="Breadcrumb"><ol><li><a href="/">Ranking</a></li><li aria-current="page">${C.esc(p.h1)}</li></ol></nav>`;
}

function relativise(html, depth) {
  const prefix = depth === 0 ? './' : '../'.repeat(depth);
  return html.replace(/(href|src)="\/(?!\/)([^"]*)"/g, (m, a, rest) => `${a}="${prefix}${rest}"`);
}

function expand(p, body) {
  // collect H2s for the table of contents
  const sections = [];
  body.replace(/<section class="block" id="([^"]+)"[^>]*>\s*<h2>(.*?)<\/h2>/g, (m, id, text) => { sections.push({ id, text }); return m; });
  const comps = {
    'ranking-table': () => C.rankingTable(companies),
    cards: () => C.cards(companies, ROOT),
    faq: () => C.faq(p.faq),
    spectrum: () => C.spectrum(companies),
    venn: () => C.venn(),
    'duo-models': () => C.duoModels(),
    'duo-crypto': () => C.duoCrypto(),
    proofs: () => C.proofs(),
    'req-matrix': () => C.reqMatrix(),
    'hero-aside': () => (p.type === 'main' ? C.heroTiers(companies, MONTH_YEAR) : C.toc(sections, 'On this page')),
  };
  body = body.replace('<div class="hero-inner">', '<div class="hero-fx" aria-hidden="true"><span class="fx-radar"></span><span class="fx-scan"></span></div><div class="hero-inner">');
  return body.replace(/<x-comp name="([a-z-]+)"><\/x-comp>/g, (m, name) => {
    if (!comps[name]) throw new Error(`Unknown component ${name} on ${p.key}`);
    return comps[name]();
  });
}

function render(p, body, { depth, url, noindex = false }) {
  let html = `<!doctype html>
<html lang="en">
<head>
${head(p, url, noindex)}
</head>
<body class="page-${p.type} page-${p.key}">
<a class="skip" href="#main">Skip to content</a>
${header()}
<main id="main">
${breadcrumbs(p)}
${expand(p, body)}
</main>
${footer()}
</body>
</html>
`;
  html = html
    .replaceAll('{{MONTH_YEAR}}', MONTH_YEAR)
    .replaceAll('{{CONTACT_EMAIL}}', CONTACT_EMAIL)
    .replaceAll('{{EYEBROW}}', C.esc(EYEBROW(p)));
  // e-mail addresses in prose become mailto links (the contact address only)
  html = html.replace(new RegExp(`(?<![\\w.:@/"=])${CONTACT_EMAIL.replace(/\./g, '\\.')}(?![\\w"])`, 'g'), `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`);
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error(`Unreplaced token on ${p.key}: ${html.match(/\{\{[A-Z_]+\}\}/)[0]}`);
  return relativise(html, depth);
}

// pages
for (const p of pages) {
  const body = fs.readFileSync(path.join(ROOT, 'src/pages', `${p.key}.html`), 'utf8');
  const depth = p.slug === '/' ? 0 : p.slug.split('/').filter(Boolean).length;
  const out = p.slug === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, p.slug, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(p, body, { depth, url: `${ORIGIN}${p.slug}` }));
}

// 404 (served at any depth, so it uses root-absolute paths via depth 0 + base tag)
{
  const p = { key: '404', type: 'service', slug: '/404.html', title: 'Page Not Found | Offensive Security Companies UAE', description: 'The page you requested does not exist. Return to the ranking of offensive security companies in the UAE or open one of the buyer guides.', h1: 'Page not found', schema: [] };
  const body = `<section class="hero" id="nf"><div class="hero-inner"><div class="hero-copy"><p class="eyebrow mono">Error 404</p><h1>Page not found</h1><p>The address may have changed. Start from the ranking or open a guide.</p><p><a class="jump" href="/">Go to the ranking</a></p></div></div></section>
<section class="block"><h2>Buyer guides</h2><ul>${guides.map((g) => `<li><a href="${g.slug}">${g.h1}</a></li>`).join('')}</ul></section>`;
  let html = render(p, body, { depth: 0, url: `${ORIGIN}/404.html`, noindex: true });
  // undo relativising: 404 must work from any path on the production domain
  html = html.replace(/(href|src)="\.\/([^"]*)"/g, '$1="/$2"');
  fs.writeFileSync(path.join(ROOT, '404.html'), html);
}

// sitemap
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${ORIGIN}${p.slug}</loc><lastmod>${MODIFIED}</lastmod></url>`).join('\n')}
</urlset>
`);

console.log(`Built ${pages.length} pages + 404, ${MONTH_YEAR} (${MODIFIED})`);
