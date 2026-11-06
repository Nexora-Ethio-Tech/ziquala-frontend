// Emit route-specific HTML heads for crawlers and link previews before React runs.
// The application body remains client rendered. Run after `vite build`.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require('../src/data/seoPages.json');
const english = require('../src/locales/public.en.json');
const readKey = key => key.split('.').reduce((value, part) => value?.[part], english);
const escape = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const dist = path.join(root, 'dist');
const renderHero = require('./render-public-hero.cjs');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
  .replace(/\s*<meta\s+(?:name="(?:description|robots)"|property="og:[^"]+")[^>]*>/gi, '')
  .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '');
const brand = readKey(config.brandKey);
// Public heroes are available to the HTML parser before any route JS executes.
// React replaces this static shell when it mounts; the image URL stays identical.
const imageDir = path.join(dist, 'assets/images');
const heroFile = fs.readdirSync(imageDir).find(name => /^school-building-[\w-]+\.webp$/.test(name));
if (!heroFile) throw Error('Missing optimized school hero');
const heroUrl = `/assets/images/${heroFile}`;
const logoFile = fs.readdirSync(imageDir).find(name => /^school-logo-[\w-]+\.webp$/.test(name));
if (!logoFile) throw Error('Missing school logo');
if (fs.statSync(path.join(imageDir, heroFile)).size >= 150000) throw Error('School hero must be below 150 KB');
for (const [pathname, page] of Object.entries(config.pages)) {
  const label = readKey(page.titleKey), description = readKey(page.descriptionKey);
  if (typeof label !== 'string' || typeof description !== 'string') throw Error(`Missing SEO copy for ${pathname}`);
  const title = pathname === '/' ? `${brand} | ${label}` : `${label} | ${brand}`;
  const canonical = new URL(pathname, config.origin).href;
  const tags = [
    `<meta name="description" content="${escape(description)}" />`,
    `<meta name="robots" content="${page.indexable ? 'index, follow' : 'noindex, follow'}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escape(brand)}" />`,
    '<meta property="og:locale" content="en_ET" />',
    `<meta property="og:url" content="${canonical}" />`,
  ].join('\n    ');
  const hasHero = pathname === '/' || pathname === '/school';
  const html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/\s*<meta\s+name="description"[^>]*>/i, '')
    .replace('</head>', `    ${tags}${hasHero ? `\n    <link rel="preload" as="image" href="${heroUrl}" fetchpriority="high" />` : ''}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${hasHero ? renderHero(pathname, heroUrl, `/assets/images/${logoFile}`) : ''}</div>`);
  fs.writeFileSync(path.join(dist, pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`), html);
}
const urls = Object.entries(config.pages).filter(([, page]) => page.indexable).map(([pathname]) =>
  `  <url><loc>${new URL(pathname, config.origin).href}</loc></url>`);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`SEO output: ${Object.keys(config.pages).length} HTML heads, ${urls.length} sitemap URLs, robots.txt copied by Vite`);
