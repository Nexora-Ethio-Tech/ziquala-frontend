// Shared cache policy for Apache deployment and local production preview.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const immutablePattern = '^/assets/(?:[^/]+/)*[^/]+-[A-Za-z0-9_-]{8}\\.(?:js|mjs|css|png|jpe?g|webp|avif|svg|gif|ico|woff2?|ttf|otf|eot|wasm|mp4|webm|ogg|mp3)$';
const immutable = new RegExp(immutablePattern, 'i');
const YEAR = 'public, max-age=31536000, immutable';
const DOCUMENT = 'no-cache, no-store, must-revalidate';
const PRIVATE = 'private, no-store';
const stripBlock = text => text.replace(/# BEGIN Ziquala cache policy[\s\S]*?# END Ziquala cache policy\r?\n\r?\n?/, '');
function apacheBlock() {
  return `# BEGIN Ziquala cache policy
# Disable inherited MIME-wide expiry rules; fixed-name files must revalidate.
<IfModule mod_expires.c>
    ExpiresActive Off
</IfModule>
<IfModule mod_headers.c>
    Header onsuccess unset Cache-Control
    Header always set Cache-Control "no-cache"
    Header onsuccess unset Expires
    Header always unset Expires
    Header onsuccess unset Pragma
    Header always unset Pragma
    # Only successful, existing, content-hashed build assets are immutable.
    Header always set Cache-Control "${YEAR}" "expr=%{REQUEST_URI} =~ m#${immutablePattern}#i && -f %{REQUEST_FILENAME} && %{REQUEST_STATUS} =~ m#^(200|206|304)$#"
    Header always set Cache-Control "${PRIVATE}" "expr=%{REQUEST_URI} =~ m#^/api(?:/|$)#"
    Header always set Cache-Control "no-store" "expr=%{REQUEST_STATUS} >= 400"
</IfModule>
<FilesMatch "\\.(html|htm)$">
    <IfModule mod_headers.c>
        Header always set Cache-Control "${DOCUMENT}"
    </IfModule>
</FilesMatch>
# END Ziquala cache policy

`;
}
function cacheControl(url, status, existingFile) {
  const pathname = new URL(url, 'http://preview.local').pathname;
  if (status >= 400) return 'no-store';
  if (/^\/api(?:\/|$)/.test(pathname)) return PRIVATE;
  if (existingFile && immutable.test(pathname)) return YEAR;
  if (!existingFile || /\.(html|htm)$/i.test(pathname)) return DOCUMENT;
  return 'no-cache';
}
function previewCachePlugin() {
  return {
    name: 'ziquala-preview-cache',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        // Match Apache's discovery-file exclusion: missing resources are 404s,
        // never successful HTML responses from the SPA history fallback.
        const discoveryPath = new URL(req.originalUrl || req.url || '/', 'http://preview.local').pathname;
        if (discoveryPath === '/llms.txt' || discoveryPath.startsWith('/.well-known/')) {
          let file;
          try {
            file = path.resolve(root, 'dist', `.${decodeURIComponent(discoveryPath)}`);
            if (!file.startsWith(path.join(root, 'dist') + path.sep) || !fs.statSync(file).isFile()) file = null;
          } catch { file = null; }
          res.setHeader('Cache-Control', file ? 'no-cache' : 'no-store');
          res.setHeader('Content-Type', file && file.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
          res.statusCode = file ? 200 : 404;
          res.end(req.method === 'HEAD' ? undefined : file ? fs.readFileSync(file) : 'Not found');
          return;
        }
        // Connect temporarily strips mounted prefixes while serving HEAD/304 responses.
        const requestUrl = req.originalUrl || req.url || '/';
        const original = res.writeHead;
        res.writeHead = function (status, ...args) {
          const pathname = new URL(requestUrl, 'http://preview.local').pathname;
          let exists = false;
          try {
            const candidate = path.resolve(root, 'dist', `.${decodeURIComponent(pathname)}`);
            exists = candidate.startsWith(path.join(root, 'dist') + path.sep) && fs.statSync(candidate).isFile();
          } catch { /* Malformed paths and missing files must never become immutable. */ }
          const policy = cacheControl(requestUrl, status, exists);
          // sirv supplies its own header object to writeHead for HEAD/304 replies.
          // Those explicit values take precedence over setHeader unless replaced here.
          const index = args.findIndex(value => value && typeof value === 'object');
          if (index !== -1) {
            const replace = name => /^(cache-control|expires|pragma)$/i.test(name);
            if (Array.isArray(args[index])) {
              const pairs = args[index];
              args[index] = pairs.flatMap((value, i) => i % 2 === 0 && !replace(value) ? [value, pairs[i + 1]] : []);
              args[index].push('Cache-Control', policy);
            } else {
              args[index] = Object.fromEntries(Object.entries(args[index]).filter(([name]) => !replace(name)));
              args[index]['Cache-Control'] = policy;
            }
          }
          this.setHeader('Cache-Control', policy);
          this.removeHeader('Expires'); this.removeHeader('Pragma');
          return original.call(this, status, ...args);
        };
        next();
      });
    },
  };
}
module.exports = { apacheBlock, stripBlock, cacheControl, previewCachePlugin, immutable, YEAR, DOCUMENT, PRIVATE };
if (require.main === module) {
  for (const name of ['.htaccess', 'public/.htaccess']) {
    const file = path.join(root, name);
    const source = stripBlock(fs.readFileSync(file, 'utf8'))
      .replace(/# [^\r\n]*Prevent caching[\s\S]*?(?=# [^\r\n]*SPA Rewrite)/, '');
    fs.writeFileSync(file, source.replace(/(?=# [^\r\n]*SPA Rewrite)/, apacheBlock()));
  }
  console.log('Synchronized Apache cache policy.');
}
