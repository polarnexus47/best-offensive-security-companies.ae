// Shared renderers. Every value comes from src/data/companies.json or from the page source.
import fs from 'node:fs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const attr = (s) => esc(s).replace(/"/g, '&quot;');
const fmt = (s) => s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');

export function inline(s) {
  const out = [];
  let last = 0;
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(s))) {
    out.push(fmt(esc(s.slice(last, m.index))));
    const ext = /^https?:/.test(m[2]);
    out.push(`<a href="${attr(m[2])}"${ext ? ' target="_blank" rel="noopener"' : ''}>${fmt(esc(m[1]))}</a>`);
    last = re.lastIndex;
  }
  out.push(fmt(esc(s.slice(last))));
  return out.join('');
}
export const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');

export const icon = (name, cls = 'ico') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="/images/icons.svg#${name}"></use></svg>`;
export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tierNum = (t) => Number(t.match(/Tier (\d)/)[1]);
const tierShort = (t) => t.replace(/^Tier \d · /, '');
const initials = (name) => { const w = name.split(/\s+/).filter((x) => /^[A-Z]/.test(x)); return w.length === 1 ? w[0].slice(0, 4) : w.map((x) => x[0]).join('').slice(0, 4); };
const pad = (n) => String(n).padStart(2, '0');

export const SCREEN_MONTH = 'November 2026';

export function screenPath(c) {
  return `images/screens/${pad(c.rank)}-${slugify(c.name)}.webp`;
}

export function rankingTable(companies) {
  const rows = companies.map((c) => `<tr>
<td class="c-rank"><span class="rank-badge num">${pad(c.rank)}</span></td>
<th scope="row" class="c-name"><a href="${attr(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a></th>
<td><span class="chip t${tierNum(c.tier)}">Tier ${tierNum(c.tier)}</span></td>
<td>${esc(c.base)}</td>
<td>${esc(c.core)}</td>
<td>${esc(c.acc)}</td>
<td>${esc(c.best)}</td>
</tr>`).join('\n');
  return `<div class="table-wrap ranking" id="ranking-table" tabindex="0" role="region" aria-label="Ranking table, scrolls horizontally">
<table>
<caption>Ten offensive security companies ranked by tier and testing scope, ${SCREEN_MONTH}</caption>
<thead><tr><th scope="col">Rank</th><th scope="col">Company</th><th scope="col">Tier</th><th scope="col">UAE base</th><th scope="col">Core offensive services</th><th scope="col">Accreditations (stated or directory-listed)</th><th scope="col">Best for</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>
<p class="table-note">"Not stated" means the company's own page does not state it. Company names link to each company's official website.</p>`;
}

export function cards(companies, siteDir) {
  const labels = [['UAE base', 'base'], ['Core offensive services', 'core'], ['Accreditations', 'acc'], ['Delivery model', 'delivery'], ['Other services', 'other'], ['Best for', 'best']];
  return `<div class="cards">\n` + companies.map((c) => {
    const shot = screenPath(c);
    const hasShot = fs.existsSync(`${siteDir}/${shot}`);
    const media = hasShot
      ? `<img src="/${shot}" width="1440" height="900" alt="${attr(c.name)} homepage screenshot, ${SCREEN_MONTH}" loading="lazy" decoding="async">`
      : `<div class="monogram" role="img" aria-label="${attr(c.name)}, name plate"><span class="mg-mark"><span>${esc(initials(c.name))}</span></span>${c.name.includes(' ') ? `<span class="mg-name">${esc(c.name)}</span>` : ''}<span class="mg-host mono">${esc(new URL(c.url).hostname.replace(/^www\./, ''))}</span></div>`;
    return `<article class="card" id="${slugify(c.name)}">
<header class="card-head"><span class="rank-badge num">${pad(c.rank)}</span><h3>${esc(c.name)}</h3><span class="chip t${tierNum(c.tier)}">Tier ${tierNum(c.tier)} · ${esc(tierShort(c.tier))}</span></header>
<div class="card-grid">
<figure class="shot">${media}<figcaption>${hasShot ? `Homepage screenshot, ${SCREEN_MONTH}` : `Homepage could not be captured, ${SCREEN_MONTH}`}</figcaption></figure>
<div class="card-main">
<dl class="attrs">${labels.map(([l, k]) => `<div><dt>${l}</dt><dd>${esc(c[k])}</dd></div>`).join('')}</dl>
<p class="card-body">${esc(c.body)}</p>
<a class="visit" href="${attr(c.url)}" target="_blank" rel="noopener">Visit ${esc(c.name)}${icon('external', 'ico ico-sm')}</a>
</div>
</div>
</article>`;
  }).join('\n') + `\n</div>`;
}

export function heroTiers(companies, monthYear) {
  const counts = [1, 2, 3].map((t) => companies.filter((c) => tierNum(c.tier) === t).length);
  const names = ['Offensive-only', 'Offensive-led', 'Managed-led'];
  const segs = counts.map((n, i) => `<span class="hp-seg t${i + 1}" style="flex-grow:${n};--d:${i}"><span class="num">${n}</span></span>`).join('');
  const legend = names.map((n, i) => `<li><i class="sw t${i + 1}"></i>Tier ${i + 1} · ${n}</li>`).join('');
  const rows = companies.map((c, i) => {
    const t = tierNum(c.tier);
    return `<li style="--i:${i}"><a href="#${slugify(c.name)}"><span class="hp-rank num">${pad(c.rank)}</span><span class="hp-name">${esc(c.name)}</span><span class="hp-track" data-t="${t}"><i></i><i></i><i></i><b class="t${t}"></b><span class="sr-only">Tier ${t}</span></span></a></li>`;
  }).join('');
  return `<aside class="data-card hp" aria-label="Ranking at a glance">
<p class="dc-label mono"><span class="live" aria-hidden="true"></span>Ranking snapshot · ${esc(monthYear)}</p>
<div class="hp-dist"><div class="hp-bar" role="img" aria-label="${counts.map((n, i) => `Tier ${i + 1}: ${n}`).join(', ')}">${segs}</div><ul class="hp-legend mono">${legend}</ul></div>
<div class="hp-head mono" aria-hidden="true"><span>#</span><span>Company</span><span class="hp-axis"><span>T1</span><span>T2</span><span>T3</span></span></div>
<ol class="hp-list">${rows}</ol>
<p class="dc-foot">No paid placements. Accreditations do not change the order.</p>
</aside>`;
}

export function toc(sections, label) {
  if (sections.length < 2) return '';
  return `<nav class="data-card toc" aria-label="On this page">
<p class="dc-label mono">${esc(label)}</p>
<ol>${sections.map((s) => `<li><a href="#${s.id}">${s.text}</a></li>`).join('')}</ol>
</nav>`;
}

export function faq(items) {
  return `<div class="faq">${items.map((f) => `<details><summary><h3>${esc(f.q)}</h3>${icon('arrow', 'ico faq-ico')}</summary><div class="answer"><p>${inline(f.a)}</p></div></details>`).join('')}</div>`;
}

export function spectrum(companies) {
  const counts = [1, 2, 3].map((t) => companies.filter((c) => tierNum(c.tier) === t).length);
  const segs = [
    ['Offensive-only specialist', 'Testing is the whole stated offering'],
    ['Offensive-led', 'Testing leads, beside compliance, advisory, forensics or training'],
    ['Managed-security-led', 'An offensive line next to MDR, SOC or platform services'],
  ];
  return `<figure class="spectrum wide">
<div class="spec-axis mono" aria-hidden="true"><span>Offensive</span><span>Managed security</span></div>
<ol class="spec-row">${segs.map(([n, d], i) => `<li class="spec t${i + 1}"><span class="spec-tier mono">Tier ${i + 1}</span><strong>${n}</strong><span class="spec-desc">${d}</span><span class="spec-count num">${counts[i]} ${counts[i] === 1 ? 'company' : 'companies'}</span></li>`).join('')}</ol>
<figcaption>The three tiers used in this ranking. Tier definitions are on the <a href="/methodology/">Methodology page</a>.</figcaption>
</figure>`;
}

export function venn() {
  return `<figure class="venn">
<svg viewBox="0 0 520 330" role="img" aria-labelledby="venn-t">
<title id="venn-t">Offensive security tests, defensive security protects, managed security operates</title>
<circle cx="190" cy="130" r="105" class="v1"/><circle cx="330" cy="130" r="105" class="v2"/><circle cx="260" cy="225" r="105" class="v3"/>
<text x="150" y="112" class="vt">Offensive</text><text x="150" y="134" class="vs">tests</text>
<text x="370" y="112" class="vt">Defensive</text><text x="370" y="134" class="vs">protects</text>
<text x="260" y="270" class="vt">Managed</text><text x="260" y="292" class="vs">operates</text>
</svg>
<figcaption>A managed security provider can also sell testing. In this ranking such firms sit in Tier 3.</figcaption>
</figure>`;
}

function duo(a, b, mid, caption) {
  const col = (c) => `<div class="duo-col"><p class="duo-label mono">${c.label}</p><p class="duo-title">${c.title}</p><ul>${c.items.map(([ic, t]) => `<li>${icon(ic)}<span>${t}</span></li>`).join('')}</ul></div>`;
  return `<figure class="duo wide">${col(a)}<div class="duo-mid" aria-hidden="true"><span class="mono">${mid}</span></div>${col(b)}<figcaption>${caption}</figcaption></figure>`;
}

export const duoModels = () => duo(
  { label: 'Model A', title: 'Boutique offensive specialist', items: [['layers', 'Depth on a bounded scope'], ['person', 'Named senior testers'], ['doc', 'Fixed-scope project and report']] },
  { label: 'Model B', title: 'Platform or managed-security-led', items: [['radar', 'Monitoring, detection and response'], ['briefcase', 'One vendor, one contract'], ['repeat', 'Testing as one recurring line']] },
  'or', 'Two provider models. Many buyers use one of each.');

export const duoCrypto = () => duo(
  { label: 'Before an incident', title: 'Offensive testing', items: [['search', 'Find weaknesses'], ['target', 'Exploit with proof of concept'], ['repeat', 'Fix, then retest']] },
  { label: 'After an incident', title: 'Forensics', items: [['shield', 'Preserve evidence'], ['chain', 'Trace funds on-chain'], ['report', 'Report with confidence levels']] },
  'incident', 'Testing prevents; forensics investigates.');

export function proofs() {
  const items = [
    ['badge', 'Company accreditation', 'An organisation passed an assessment by an issuing body.'],
    ['person', 'Individual certification', 'A person passed an exam.'],
    ['briefcase', 'Real experience', 'What the people assigned to you have done before.'],
  ];
  return `<div class="proofs wide">${items.map(([ic, t, d]) => `<div class="proof">${icon(ic)}<p class="proof-t">${t}</p><p>${d}</p></div>`).join('')}</div>`;
}

export function reqMatrix() {
  const cols = [
    ['Explicit testing clause', 'c1', ['PCI DSS v4.0.1, Req. 11.4']],
    ['Rule on who may test', 'c2', ['Dubai Cyber Force programme']],
    ['General security duty, no testing clause found', 'c3', ['UAE IA Regulation', 'UAE PDPL', 'DIFC and ADGM data protection']],
    ['Text not public or not verified', 'c4', ['DESC ISR', 'CBUAE', 'VARA']],
  ];
  return `<figure class="req-matrix wide"><div class="rm-grid">${cols.map(([h, c, items]) => `<div class="rm-col ${c}"><p class="rm-h mono">${h}</p><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`).join('')}</div>
<figcaption>How each framework in the table below treats penetration testing, based on the primary pages reviewed.</figcaption></figure>`;
}
