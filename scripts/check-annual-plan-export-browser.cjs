// Click the annual-plan export in a production browser and inspect the downloaded XLSX. Uses synthetic API data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:5192';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ziquala-annual-check-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5192', '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const admin = { id: id(10), name: 'Synthetic Admin', email: 'admin@example.com', role: 'school-admin', branch_id: id(1), status: 'Active' };
const { verify, fixture } = require('./check-annual-plan-export.cjs');
const downloadDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ziquala-annual-export-download-'));
let socket, send;
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 150; i++) {
      if (browser.exitCode !== null || server.exitCode !== null) throw Error('Browser or preview exited');
      try { if (fs.existsSync(portFile) && (await fetch(origin)).ok) break; } catch {}
      await delay(100);
    }
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tab = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { pending.delete(id); reject(Error(`${method} timed out`)); }, 20000);
      pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const fulfill = (requestId, data, status = 200) => send('Fetch.fulfillRequest', { requestId, responseCode: status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: '*' }],
      body: Buffer.from(JSON.stringify(data)).toString('base64') });
    socket.addEventListener('message', async event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const task = pending.get(message.id); pending.delete(message.id);
        if (task) message.error ? task.reject(message.error) : task.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      if (message.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      try {
        if (!url.pathname.startsWith('/api/')) {
          if (url.origin === origin) await send('Fetch.continueRequest', { requestId });
          else await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
          return;
        }
        if (request.method === 'OPTIONS') { await fulfill(requestId, {}); return; }
        let data = [];
        let pagination;
        if (url.pathname.endsWith('/auth/me')) data = admin;
        else if (url.pathname.endsWith('/system-settings')) data = { registration_open: 'true' };
        else if (url.pathname.endsWith('/branches')) data = [{ id: id(1), name: 'Synthetic Branch' }];
        else if (url.pathname.endsWith('/annual-plans')) {
          data = [fixture];
          pagination = { total: 1, page: 1, pageSize: 25, summary: { total: 1, approved: 1, submitted: 1 }, grades: ['Grade 7'] };
        } else if (url.pathname.endsWith('/annual-plans/' + fixture.id)) data = fixture;
        await fulfill(requestId, { success: true, data, ...(pagination ? { pagination } : {}) });
      } catch (error) { if (!String(error.message).includes('Invalid InterceptionId')) errors.push(error); }
    });
    await send('Runtime.enable'); await send('Page.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('ziquala_token','synthetic-token');localStorage.setItem('i18nextLng','en');localStorage.setItem('ziquala_language','en');` });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const until = async expression => {
      for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(100); }
      throw Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText.slice(-2000)')}`);
    };
    const clickText = text => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.getClientRects().length && item.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})); if (!button) throw Error('Button missing: ' + ${JSON.stringify(text)}); button.click(); })()`);
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDirectory });
    await send('Page.navigate', { url: `${origin}/teachers` });
    await until(`document.body.innerText.includes('ALAN')`);
    await evaluate(`document.querySelector('button[title="View Details"]').click()`);
    await until(`document.body.innerText.toLowerCase().includes('annual plan review')`);
    assert(await evaluate(`document.body.innerText.includes(${JSON.stringify(fixture.items[0].topicContent)})`), 'The web view contains the actual lesson content');
    await clickText('Export Excel');
    let downloaded;
    for (let i = 0; i < 150; i++) {
      downloaded = fs.readdirSync(downloadDirectory).find(name => name.endsWith('.xlsx'));
      if (downloaded) break;
      await delay(100);
    }
    assert(downloaded, 'The export button must download a completed XLSX');
    const filename = path.join(downloadDirectory, downloaded);
    verify(fs.readFileSync(filename));
    assert(downloaded.includes('ALAN') && downloaded.includes('Grade_7'), 'Download uses the selected teacher and grade');
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log('PASS actual browser export: selected ALAN plan, three filled weeks, all eleven columns, complete detail sheet and formatting');
    console.log('Downloaded workbook: ' + filename);
  } finally {
    socket?.close(); browser.kill(); server.kill();
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    if (!path.resolve(profile).startsWith(tempRoot) || !path.basename(profile).startsWith('ziquala-annual-check-')) throw Error('Unexpected browser profile path');
    for (let i = 0; i < 20; i++) { try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await delay(100); } }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
