// Shared Apache and production-preview policy. No policy is applied to Vite HMR.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const start = '# BEGIN Ziquala security headers';
const end = '# END Ziquala security headers';
const stripBlock = text => text.replace(/# BEGIN Ziquala security headers[\s\S]*?# END Ziquala security headers\r?\n\r?\n?/, '');

function getHeaders(apiUrl = 'https://api.ziquala.com') {
  // HTML parsing normalizes CRLF before calculating inline-script hashes.
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n?/g, '\n');
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, script]) =>
    `'sha256-${createHash('sha256').update(script).digest('base64')}'`);
  const api = !apiUrl || apiUrl.startsWith('/') ? '' : new URL(/^https?:\/\//.test(apiUrl) ? apiUrl : `https://${apiUrl}`).origin;
  const connections = [...new Set(["'self'", 'https://api.ziquala.com', ...(api ? [api] : [])])].join(' ');
  return {
    'Content-Security-Policy': [
      "default-src 'self'", `script-src 'self' ${hashes.join(' ')}`,
      // React, motion and print templates use inline styles; scripts remain hash restricted.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:", `connect-src ${connections}`,
      "media-src 'self' blob: https:",
      "frame-src 'self' blob: https://drive.google.com https://www.youtube.com https://www.youtube-nocookie.com",
      // Transcript previews use PDF objects backed by authenticated blob downloads.
      "object-src 'self' blob:", "worker-src 'self' blob:",
      "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    ].join('; '),
    // Print document.write and localization DOMParser need migration before enforcement.
    'Content-Security-Policy-Report-Only': "require-trusted-types-for 'script'",
    'Strict-Transport-Security': 'max-age=31536000',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

function apacheBlock(headers) {
  return `${start}\n<IfModule mod_headers.c>\n` + Object.entries(headers).map(([name, value]) =>
    // Clear both Apache header tables, including inherited upstream values.
    `    Header onsuccess unset ${name}\n    Header always set ${name} "${value}"`).join('\n') + `\n</IfModule>\n${end}\n\n`;
}

function writeBuildHeaders(apiUrl) {
  const headers = getHeaders(apiUrl);
  const template = fs.readFileSync(path.join(root, 'public/.htaccess'), 'utf8');
  fs.writeFileSync(path.join(root, 'dist/.htaccess'), apacheBlock(headers) + stripBlock(template));
  fs.writeFileSync(path.join(root, 'dist/security-headers.json'), JSON.stringify(headers, null, 2) + '\n');
}

module.exports = { getHeaders, apacheBlock, stripBlock, writeBuildHeaders };
if (require.main === module) {
  for (const name of ['.htaccess', 'public/.htaccess']) {
    const file = path.join(root, name);
    fs.writeFileSync(file, apacheBlock(getHeaders()) + stripBlock(fs.readFileSync(file, 'utf8')));
  }
  console.log('Synchronized Apache security headers (production API origin).');
}
