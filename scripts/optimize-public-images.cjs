// Rebuild the public site's WebP assets with Chrome's image encoder.
// Usage: node scripts/optimize-public-images.cjs [path-to-chrome.exe]
// Original images are retained. No external packages or services are required.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const chrome = process.argv[2] || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const assets = [
  ['src/assets/school/school-building.jpg', [1280]],
  ['src/assets/school/student-assembly.jpg', [1280]],
  ['src/assets/school/school-logo.jpg', [160]],
  ['src/assets/monastery/ziquala-aerial.png', [640, 820]],
  ['src/assets/monastery/church.jpg', [1600]],
  ['src/assets/monastery/museum-building.png', [1600]],
  ['src/assets/monastery/projects/textile-weaving.png', [1600]],
  ['src/assets/monastery/projects/wofcho-project.jpeg', [1600]],
  ['src/assets/monastery/projects/oil-project.jpeg', [1600]],
];

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ziquala-image-encoder-'));
  const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile); i++) {
      if (i > 100 || browser.exitCode !== null) throw new Error('Chrome did not start');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    console.log(`Image encoder listening on ${port}`);
    const tab = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    });
    const send = (method, params) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 30000);
      pending.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); }, reject: error => { clearTimeout(timeout); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    await send('Runtime.enable', {});
    for (const [relative, widths] of assets) {
      const original = fs.readFileSync(path.join(root, relative));
      const mime = relative.endsWith('.png') ? 'image/png' : 'image/jpeg';
      for (const width of widths) {
        const response = await send('Runtime.evaluate', {
          expression: `(async () => {
            const img = new Image(); img.src = ${JSON.stringify(`data:${mime};base64,${original.toString('base64')}`)}; await img.decode();
            const canvas = document.createElement('canvas'); canvas.width = Math.min(${width}, img.naturalWidth); canvas.height = Math.round(img.naturalHeight * canvas.width / img.naturalWidth);
            const context = canvas.getContext('2d'); context.imageSmoothingQuality = 'high'; context.drawImage(img, 0, 0, canvas.width, canvas.height);
            return { data: canvas.toDataURL('image/webp', 0.82), width: canvas.width, height: canvas.height };
          })()`, awaitPromise: true, returnByValue: true,
        });
        if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
        const encoded = response.result.value;
        if (!encoded.data.startsWith('data:image/webp;base64,')) throw new Error('WebP encoding unavailable');
        const output = relative.replace(/\.(jpe?g|png)$/, `${width === widths.at(-1) ? '' : `-${width}`}.webp`);
        const buffer = Buffer.from(encoded.data.split(',')[1], 'base64');
        fs.writeFileSync(path.join(root, output), buffer);
        console.log(`${output}: ${encoded.width}x${encoded.height}, ${buffer.length} bytes (original ${original.length})`);
      }
    }
  } finally {
    socket?.close();
    browser.kill();
    // Keep cleanup bounded to the exact disposable directory created above.
    for (let i = 0; i < 20; i++) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
