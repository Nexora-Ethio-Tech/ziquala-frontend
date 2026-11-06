const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const config = require('../src/data/seoPages.json');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const read = name => fs.readFileSync(path.join(dist, name), 'utf8');
const canonicalFor = pathname => new URL(pathname, config.origin).href;
const meta = (html, key) => [...html.matchAll(/<meta\b[^>]*>/g)].filter(([tag]) => tag.includes(`name="${key}"`) || tag.includes(`property="${key}"`));
const canonicals = html => [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)];
const titles = new Set();
for (const [pathname, page] of Object.entries(config.pages)) {
  const html = read(pathname === '/' ? 'index.html' : pathname.slice(1) + '.html');
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert(title && !titles.has(title), `Missing or duplicate title: ${pathname}`); titles.add(title);
  assert.equal(canonicals(html).length, 1, pathname);
  assert(canonicals(html)[0][0].includes(`href="${canonicalFor(pathname)}"`), pathname);
  for (const key of ['description', 'robots', 'og:title', 'og:description', 'og:url']) assert.equal(meta(html, key).length, 1, `${pathname}: ${key}`);
  assert(meta(html, 'robots')[0][0].includes(page.indexable ? 'content="index, follow"' : 'content="noindex, follow"'));
  assert(meta(html, 'og:url')[0][0].includes(canonicalFor(pathname)));
  for (const [, script] of html.matchAll(/<script[^>]*src="([^\"]+)"/g)) assert(fs.existsSync(path.join(dist, script)), `Missing production script ${script}`);
  for (const language of ['en', 'am', 'om']) {
    const copy = require(`../src/locales/public.${language}.json`);
    for (const key of [config.brandKey, page.titleKey, page.descriptionKey]) assert.equal(typeof key.split('.').reduce((value, part) => value?.[part], copy), 'string', `${language}: ${key}`);
  }
}
const robots = read('robots.txt');
assert(!robots.includes('<html'), 'robots.txt contains SPA HTML');
assert(/^User-agent: \*$/m.test(robots));
assert(/^Allow: \/$/m.test(robots));
assert(robots.includes(`Sitemap: ${config.origin}/sitemap.xml`));
const sitemap = read('sitemap.xml');
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, value]) => value);
const expected = Object.entries(config.pages).filter(([, page]) => page.indexable).map(([pathname]) => canonicalFor(pathname));
assert.deepEqual(locations.sort(), expected.sort());
assert.equal(locations.length, new Set(locations).size);
const { stripBlock } = require('./security-headers.cjs');
assert.equal(stripBlock(read('.htaccess')), stripBlock(fs.readFileSync(path.join(root, 'public/.htaccess'), 'utf8')));
assert(read('.htaccess').includes('$1.html [L]'), 'Route HTML rewrite missing');
assert(read('.htaccess').includes('(robots\\.txt|sitemap\\.xml)$ - [L]'), 'Crawl-file fallback exclusion missing');
console.log(`PASS built SEO: ${titles.size} unique titles, canonical and social tags, translated copy, robots.txt, ${locations.length} sitemap URLs`);

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5190', '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
(async () => {
  try {
    const origin = 'http://127.0.0.1:5190';
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw Error('Preview exited before SEO checks');
      try { if ((await fetch(origin)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    for (const pathname of Object.keys(config.pages)) {
      const response = await fetch(origin + pathname);
      assert.equal(response.status, 200, pathname);
      const html = await response.text();
      assert.equal(canonicals(html).length, 1, pathname);
      assert(canonicals(html)[0][0].includes(canonicalFor(pathname)), `Wrong raw HTML metadata for ${pathname}`);
    }
    for (const [pathname, type] of [['/robots.txt', 'text/plain'], ['/sitemap.xml', 'xml']]) {
      const response = await fetch(origin + pathname);
      assert.equal(response.status, 200); assert(response.headers.get('content-type').includes(type), pathname);
      assert(!(await response.text()).includes('<html'), pathname);
    }
    const deepLink = await fetch(origin + '/elearning?book=loading-check-book');
    assert(canonicals(await deepLink.text())[0][0].includes(canonicalFor('/elearning')));
    console.log('PASS HTTP preview: every public route serves its own HTML head; crawl files have correct content types');
  } finally { server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
