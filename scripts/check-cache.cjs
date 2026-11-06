const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { apacheBlock, immutable, YEAR, DOCUMENT } = require('./cache-headers.cjs');
const root = path.resolve(__dirname, '..'), dist = path.join(root, 'dist');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
for (const file of ['.htaccess', 'public/.htaccess', 'dist/.htaccess']) {
  assert(read(file).includes(apacheBlock()), `Cache policy drift: ${file}`);
  assert(!read(file).includes('ExpiresByType'), 'MIME-wide expiry would cache fixed-name files');
}
const files = fs.readdirSync(path.join(dist, 'assets'), { recursive: true }).filter(file => fs.statSync(path.join(dist, 'assets', file)).isFile());
const assets = ['.js', '.css', '.webp', '.mp4'].map(extension => {
  const file = files.find(file => file.endsWith(extension));
  assert(file, `Missing ${extension} build asset`);
  const url = '/assets/' + file.replace(/\\/g, '/');
  assert(immutable.test(url), `Build asset is not content versioned: ${url}`);
  return url;
});
// PDF utility fonts can be tree-shaken when their export path is unused.
// Check any emitted fonts and keep their naming rules covered without requiring dead assets.
for (const file of files.filter(file => /\.(ttf|otf|woff2?)$/.test(file))) assets.push('/assets/' + file.replace(/\\/g, '/'));
for (const extension of ['ttf', 'otf', 'woff', 'woff2']) assert(immutable.test(`/assets/fonts/fixture-12345678.${extension}`));
assert(!fs.existsSync(path.join(dist, 'videos/monastery-forest-hero.mp4')), 'Unversioned video copied into build');
console.log('PASS cache configuration: Apache policies match, emitted assets have versioned URLs and font extensions are covered');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5192', '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
const fixture = path.join(dist, 'cache-review.txt');
assert(!fs.existsSync(fixture), 'Unexpected cache fixture already exists');
(async () => {
  try {
    const origin = 'http://127.0.0.1:5192';
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw Error('Preview exited before cache checks');
      try { if ((await fetch(origin)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    for (const url of assets) {
      // HEAD avoids downloading the 97 MB video merely to inspect its policy.
      const response = await fetch(origin + url, { method: 'HEAD' });
      assert.equal(response.status, 200, url);
      assert.equal(response.headers.get('cache-control'), YEAR, url);
      assert(!response.headers.get('pragma'));
      const etag = response.headers.get('etag'); assert(etag, 'Missing asset validator');
      const unchanged = await fetch(origin + url, { headers: { 'If-None-Match': etag } });
      assert.equal(unchanged.status, 304, url);
      assert.equal(unchanged.headers.get('cache-control'), YEAR);
    }
    const partial = await fetch(origin + assets.find(url => url.endsWith('.mp4')), { headers: { Range: 'bytes=0-127' } });
    assert.equal(partial.status, 206); assert.equal(partial.headers.get('cache-control'), YEAR);
    assert.equal((await partial.arrayBuffer()).byteLength, 128);
    for (const url of ['/', '/school', '/school.html', '/login', '/change-password']) {
      const response = await fetch(origin + url);
      assert.equal(response.headers.get('cache-control'), DOCUMENT, url);
    }
    for (const url of ['/favicon.svg', '/robots.txt', '/sitemap.xml', '/security-headers.json']) {
      const response = await fetch(origin + url); assert.equal(response.headers.get('cache-control'), 'no-cache', url);
    }
    const missing = await fetch(origin + '/assets/missing-12345678.js');
    assert(missing.headers.get('cache-control').includes('no-store'), 'Missing assets must not become immutable');
    fs.writeFileSync(fixture, 'first revision');
    const first = await fetch(origin + '/cache-review.txt');
    assert.equal(first.headers.get('cache-control'), 'no-cache'); await first.text();
    fs.writeFileSync(fixture, 'second revision with changed bytes');
    const changed = await fetch(origin + '/cache-review.txt', { headers: { 'If-None-Match': first.headers.get('etag') } });
    assert.equal(changed.status, 200); assert.equal(await changed.text(), 'second revision with changed bytes');
    console.log('PASS HTTP cache behavior: immutable assets, 304 reuse, 206 video ranges, fresh HTML, fixed-name revalidation, changed content and missing-asset protection');
  } finally { server.kill(); if (fs.existsSync(fixture)) fs.unlinkSync(fixture); }
})().catch(error => { console.error(error); process.exitCode = 1; });
