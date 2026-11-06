const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { getHeaders, apacheBlock, stripBlock } = require('./security-headers.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const headers = JSON.parse(read('dist/security-headers.json'));
const production = getHeaders();
for (const name of ['.htaccess', 'public/.htaccess']) assert(read(name).startsWith(apacheBlock(production)), `Stale headers: ${name}; run node scripts/security-headers.cjs`);
assert.equal(stripBlock(read('.htaccess')), stripBlock(read('public/.htaccess')));
assert(read('dist/.htaccess').startsWith(apacheBlock(headers)), 'Build policy differs from Apache output');
const csp = headers['Content-Security-Policy'];
assert(!/script-src[^;]*(unsafe-inline|unsafe-eval)/.test(csp));
assert(csp.includes("frame-ancestors 'none'"));
assert(csp.includes("base-uri 'none'"));
assert(csp.includes("object-src 'self' blob:"));
assert(!/require-trusted-types/.test(csp), 'Existing DOMParser/print sinks need migration before enforcement');
assert.equal(headers['Content-Security-Policy-Report-Only'], "require-trusted-types-for 'script'");
for (const file of fs.readdirSync(path.join(root, 'dist')).filter(file => file.endsWith('.html'))) {
  const html = read(`dist/${file}`).replace(/\r\n?/g, '\n');
  for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (!script.trim()) continue;
    const hash = `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
    assert(csp.includes(hash), `${file}: theme bootstrap blocked by CSP`);
  }
}
// Alternate API deployments must receive their exact origin, without wildcards.
assert(getHeaders('https://school-api.example/api')['Content-Security-Policy'].includes('https://school-api.example'));
assert(!getHeaders('/api')['Content-Security-Policy'].includes('localhost'));
console.log('PASS security configuration: Apache copies, build policy, route bootstrap hashes and API origins');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5191', '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
(async () => {
  try {
    const origin = 'http://127.0.0.1:5191';
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw Error('Preview exited before header checks');
      try { if ((await fetch(origin)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const asset = read('dist/index.html').match(/src="(\/assets\/[^\"]+\.js)"/)[1];
    for (const route of ['/', '/school', '/login', '/change-password', '/robots.txt', asset]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      for (const [name, value] of Object.entries(headers)) assert.equal(response.headers.get(name), value, `${route}: ${name}`);
    }
    console.log('PASS HTTP preview: eight security headers on public/account routes, SPA fallback, crawl files and JavaScript');
  } finally { server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
