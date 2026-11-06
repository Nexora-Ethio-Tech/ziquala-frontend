// Production UI smoke check using synthetic API responses; no real accounts are changed.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:5191';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ziquala-staff-check-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5191', '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const admin = { id: id(10), name: 'Synthetic Admin', email: 'admin@example.com', role: 'school-admin', branch_id: id(1), status: 'Active' };
const staff = { id: id(2), name: 'Synthetic Teacher', email: 'teacher@example.com', role: 'teacher', branch_id: id(1), status: 'Active', digital_id: 'STAFF-002', created_at: '2024-01-01T00:00:00Z', staff_profile: { educationLevel: 'Bachelor', phoneNumber: '+251911223344' } };
const librarian = { ...staff, id: id(3), name: 'Synthetic Librarian', email: 'library@example.com', role: 'librarian' };
let socket, send, saveFailure = false, saves = 0;
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
        else if (url.pathname.endsWith('/staff-profile')) {
          const person = url.pathname.includes(id(3)) ? librarian : staff;
          if (request.method === 'PATCH') {
            saves++;
            if (saveFailure) { await fulfill(requestId, { success: false, error: { message: 'This email address is already in use' } }, 409); return; }
            const body = JSON.parse(request.postData);
            assert(!('assignedClassIds' in body) && !('assignedCourseIds' in body), 'Profile saves must omit teaching assignments');
            Object.assign(person, { name: body.name, email: body.email, status: body.status, role: body.role, staff_profile: { ...person.staff_profile, ...body.staffProfile } });
            data = person;
          } else data = { user: person, teacherId: person === staff ? id(12) : null,
            classes: person === staff ? [{ id: id(21), name: 'Grade 2', section: 'A', teacher_id: null }] : [],
            courses: person === staff ? [{ id: id(31), name: 'Physics', class_name: 'Grade 2', section: 'A', teacher_id: null }] : [] };
        } else if (url.pathname.endsWith('/teachers')) {
          data = [{ ...staff, id: id(12), user_id: staff.id }]; pagination = { total: 1, page: 1, pageSize: 25 };
        } else if (url.pathname.endsWith('/users')) {
          data = [librarian]; pagination = { total: 1, page: 1, pageSize: 25 };
        }
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
    const clickText = text => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.getClientRects().length && item.textContent.includes(${JSON.stringify(text)})); if (!button) throw Error('Button missing: ' + ${JSON.stringify(text)}); button.click(); })()`);
    const fill = (label, value) => evaluate(`(() => { const label = [...document.querySelectorAll('form label')].find(item => item.textContent.startsWith(${JSON.stringify(label)})); const field = label && (document.getElementById(label.htmlFor) || label.parentElement.querySelector('input,select')); if (!field) throw Error('Field missing'); Object.getOwnPropertyDescriptor(field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(field, ${JSON.stringify(value)}); field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await send('Page.navigate', { url: `${origin}/staff/teachers` });
    await until(`document.body.innerText.includes('Synthetic Teacher')`);
    await clickText('Synthetic Teacher');
    await until(`!!document.querySelector('[data-staff-record]')`);
    const sections = ['Account & System Information', 'Personal & Professional Profile', 'Emergency Contact', 'Attached Document'];
    for (const section of sections) assert.equal(await evaluate(`document.querySelectorAll('[data-record-section="${section}"]').length`), 1, section + ' appears once');
    assert.equal(await evaluate(`document.querySelectorAll('[data-staff-record] input:not([type="file"]),[data-staff-record] select').length`), 0, 'View mode is read-only');
    assert.equal(await evaluate(`document.querySelectorAll('[data-staff-record] header button').length`), 2, 'Edit Record is in the header with Close');
    await clickText('Edit Record');
    await until(`!!document.querySelector('form input[autocomplete="name"]:enabled')`);
    for (const section of sections) assert.equal(await evaluate(`document.querySelectorAll('[data-record-section="${section}"]').length`), 1, section + ' stays in place');
    assert(await evaluate(`document.body.innerText.includes('You are currently editing the staff profile details.')`));
    assert(await evaluate(`document.querySelector('[data-staff-record] button[type="submit"]').classList.contains('bg-emerald-600')`), 'Save uses the student record green button');
    assert.equal(await evaluate(`['Digital ID','Registration Date'].filter(text => [...document.querySelectorAll('[data-staff-record] label')].find(label => label.textContent === text)?.parentElement.querySelector('input,select')).length`), 0, 'System identifiers stay read-only');
    await fill('Full Name', 'Updated Teacher'); await fill('Gender', 'Female'); await fill('Department', 'Science');
    await fill('Job Title', 'Science Teacher'); await fill('Account Status', 'Inactive');
    await fill('Phone Number', '+251944556677'); await fill('Date of Birth', '1985-04-12'); await fill('Age', '33');
    await fill('Education Status', 'Master'); await fill('Specialty / Course', 'Physics'); await fill('Previous School', 'Previous School');
    await fill('Years of Experience', '8'); await fill('Emergency Contact Name', 'Emergency Contact'); await fill('Emergency Contact Phone', '+251922334455');
    assert.equal(await evaluate(`document.querySelectorAll('[data-record-section="Teaching Assignments"], [data-staff-record] input[type="checkbox"]').length`), 0, 'Teaching assignment controls are removed');
    assert(await evaluate('document.querySelector("form").checkValidity()'), 'Form must pass browser validation');
    await clickText('Save Changes');
    await until(`document.body.innerText.includes('Staff profile updated successfully')`);
    assert.equal(staff.name, 'Updated Teacher'); assert.equal(staff.status, 'Inactive'); assert.equal(staff.staff_profile.department, 'Science');
    assert.equal(staff.staff_profile.dob, '1985-04-12'); assert.equal(staff.staff_profile.educationLevel, 'Master');
    assert.equal(staff.staff_profile.age, 33); assert.equal(staff.staff_profile.experienceYears, 8);
    assert.equal(staff.staff_profile.previousSchool, 'Previous School'); assert.equal(staff.staff_profile.specialty, 'Physics');
    assert.equal(staff.staff_profile.phoneNumber, '+251944556677'); assert.equal(staff.staff_profile.emergencyContactName, 'Emergency Contact');
    assert.equal(staff.staff_profile.emergencyContactPhone, '+251922334455');
    assert.equal(await evaluate(`document.querySelectorAll('[data-staff-record] input:not([type="file"]),[data-staff-record] select').length`), 0, 'Save exits edit mode');
    await clickText('Edit Record');
    await until(`!!document.querySelector('form input[autocomplete="name"]:enabled')`);
    await fill('Full Name', 'Unsaved Teacher'); await clickText('Cancel');
    assert.equal(staff.name, 'Updated Teacher');
    await clickText('Edit Record');
    await until(`!!document.querySelector('form input[autocomplete="name"]:enabled')`);
    saveFailure = true; await clickText('Save Changes');
    await until(`document.querySelector('[role="alert"]')?.textContent.includes('already in use')`);
    assert(await evaluate('!!document.querySelector("form")'), 'Failed saves retain the form');
    saveFailure = false;
    await send('Page.navigate', { url: `${origin}/staff/librarian` });
    await until(`document.body.innerText.includes('Synthetic Librarian')`);
    await clickText('Synthetic Librarian'); await clickText('Edit Record');
    await until(`!!document.querySelector('form input[autocomplete="name"]:enabled')`);
    await fill('Full Name', 'Updated Librarian'); await clickText('Save Changes');
    await until(`document.body.innerText.includes('Staff profile updated successfully')`);
    assert.equal(librarian.name, 'Updated Librarian'); assert.equal(saves, 3);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log('PASS inline staff record UI: single cards, in-place editing, metadata protection, all profile fields, teacher and librarian saves, browser validation, cancel, immediate updates, server errors, zero uncaught exceptions');
  } finally {
    socket?.close(); browser.kill(); server.kill();
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    if (!path.resolve(profile).startsWith(tempRoot) || !path.basename(profile).startsWith('ziquala-staff-check-')) throw Error('Unexpected browser profile path');
    for (let i = 0; i < 20; i++) { try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await delay(100); } }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
