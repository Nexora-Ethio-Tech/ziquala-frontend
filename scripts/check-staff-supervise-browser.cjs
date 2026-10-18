// Run with Vite on 5191 and headless Chrome on debugging port 9254.
// All API responses are synthetic; no live records are accessed.
const assert = require('node:assert/strict');
(async () => {
  const tab = await fetch('http://127.0.0.1:9254/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0, role = 'school-admin', init;
  const pending = new Map(), requests = [], errors = [];
  let failListOnce = false, delayedSearch = false;
  const send = (method, params = {}) => new Promise((resolve, reject) => { const call = ++id; pending.set(call, {resolve,reject}); ws.send(JSON.stringify({id:call,method,params})); });
  const fixture = n => ({ id: `teacher-${n}`, user_id: `user-${n}`, name: `Teacher ${String(n).padStart(3,'0')}`, email: `t${n}@test`, digital_id: `TE${n}`, branch_id:'branch-1', status:'Active', role:'teacher', staff_profile:{educationLevel:'Bachelor',specialty:'Science'} });
  ws.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (task) message.error ? task.reject(message.error) : task.resolve(message.result); return; }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = message.params;
    const url = new URL(request.url), pathname = url.pathname;
    requests.push({ pathname, params:Object.fromEntries(url.searchParams), method:request.method });
    let data = [], pagination;
    let responseCode = 200;
    if (pathname.endsWith('/auth/me')) data = { id:'user-test', name:'Test Admin', role, branch_id:'branch-1', branch_name:'Branch One', status:'Active' };
    else if (pathname.endsWith('/branches')) data = [{id:'branch-1',name:'Branch One'}];
    else if (pathname.endsWith('/system-settings')) data = { registration_open:'true', grade_submission_open:'true' };
    else if (url.searchParams.has('page')) {
      const page = Number(url.searchParams.get('page')), pageSize = Number(url.searchParams.get('pageSize'));
      let rows = Array.from({length:121}, (_,i) => fixture(i+1));
      if (pathname.endsWith('/users')) rows = rows.map(r => ({...r, role: url.searchParams.get('role') || 'school-admin'}));
      if (/annual-plans$|weekly-plans$/.test(pathname)) rows = rows.map((r,i) => ({...r, teacher_id:r.id, teacher_name:r.name, subject:'Biology', grade:'Grade 2', academic_year:'2018 E.C.', status:i===0?'Approved':'Not Submitted', grade_statuses:[], items:[]}));
      if (pathname.endsWith('/branch-lab-requisitions')) rows = rows.map(r => ({...r, teacher_name:r.name, subject:'Biology', grade_level:'Grade 2', status:'Approved by Lab Tech',items:[]}));
      const summary = {total:121,approved:1,pending:120,pendingReview:0,unlocked:0,labPending:121,labApproved:0};
      const search = (url.searchParams.get('search') || '').toLowerCase();
      if (search) rows = rows.filter(row => row.name.toLowerCase().includes(search));
      if (url.searchParams.get('category') === 'submitted') rows = rows.filter(row => row.status === 'Approved');
      pagination = {total:rows.length,page,pageSize,summary,grades:['Grade 2','Grade 9'],subjects:['Biology','Physics']};
      data = rows.slice((page-1)*pageSize,page*pageSize);
      if (failListOnce) { failListOnce = false; responseCode = 500; }
      if (search === 'teacher 120' && delayedSearch) await new Promise(r=>setTimeout(r,600));
    }
    await send('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders:[{name:'Content-Type',value:'application/json'}], body:Buffer.from(JSON.stringify(responseCode===200?{success:true,data,...(pagination?{pagination}:{})}:{success:false,error:{message:'Synthetic list failure'}})).toString('base64') });
  });
  await new Promise((resolve,reject) => {ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', {patterns:[{urlPattern:'*/api/*'}]});
  const evaluate = async expression => {const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value;};
  const until = async (expression, label) => {for(let i=0;i<100;i++){if(await evaluate(expression)) return; await new Promise(r=>setTimeout(r,100));} throw new Error('Timed out: '+label+' '+await evaluate('document.body.innerText.slice(-600)'));};
  const click = async text => {assert(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!b || b.disabled) return false; b.click(); return true;})()`),'click '+text);};
  const input = async (selector,value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const visit = async (path,asRole='school-admin') => {
    role=asRole;
    if(init)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:init});
    init=(await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.clear();localStorage.setItem('ziquala_language','en');localStorage.setItem('ziquala_token','browser-test');localStorage.setItem('ziquala-front-store',JSON.stringify({state:{selectedBranchId:'branch-1'},version:0}));`})).identifier;
    await send('Page.navigate',{url:'http://127.0.0.1:5191'+path});
    await until(`document.body.innerText.includes('Showing 1–50 of 121')`,path);
  };
  const checkPaging = async endpoint => {
    const count = () => requests.filter(r=>r.pathname.endsWith(endpoint)&&r.params.page).length;
    const before=count();
    await click('Next');await until("document.body.innerText.includes('Showing 51–100 of 121')",'second page');
    assert.equal(count(),before+1);
    await click('Previous');await until("document.body.innerText.includes('Showing 1–50 of 121')",'first page cached');
    assert.equal(count(),before+1,'returning to page one should use cache');
    await click('Refresh');await until("document.body.innerText.includes('Showing 1–50 of 121')",'refresh');
    assert.equal(count(),before+2,'manual refresh fetches a fresh page');
  };
  await visit('/staff/teachers');
  await checkPaging('/school-admin/teachers');
  await click('Next');await until("document.body.innerText.includes('Showing 51–100 of 121')",'second page');
  await input('input[placeholder^="Search by name"]','Teacher 121');
  await until("document.body.innerText.includes('Showing 1–1 of 1')",'server search resets page');
  assert(requests.some(r=>r.pathname.endsWith('/teachers')&&r.params.search==='Teacher 121'&&r.params.page==='1'));
  await input('input[placeholder^="Search by name"]','');
  await until("document.body.innerText.includes('Showing 1–50 of 121')",'clear search');
  failListOnce=true;await click('Refresh');await until("document.body.innerText.includes('Synthetic list failure')",'error shown');
  await click('Refresh');await until("document.body.innerText.includes('Showing 1–50 of 121')",'retry works');
  await click('Export Excel');
  await until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Export Excel'&&!b.disabled)",'full teacher export');
  assert(requests.some(r=>r.pathname.endsWith('/school-admin/teachers')&&r.params.pageSize==='100'&&r.params.page==='2'),'exports include every matching page');
  // Ignore an older search response that arrives after a newer one.
  delayedSearch=true;await input('input[placeholder^="Search by name"]','Teacher 120');
  await new Promise(r=>setTimeout(r,350));
  await input('input[placeholder^="Search by name"]','Teacher 121');
  await until("document.body.innerText.includes('Showing 1–1 of 1') && document.querySelector('tbody')?.innerText.includes('Teacher 121')",'newer search result');
  await new Promise(r=>setTimeout(r,700));
  assert(await evaluate("document.querySelector('tbody')?.innerText.includes('Teacher 121')"),'stale response must not replace newer search');
  await visit('/staff/librarian');await checkPaging('/school-admin/users');
  await visit('/teachers');await checkPaging('/vice-principal/annual-plans');
  assert(await evaluate("[...document.querySelectorAll('select option')].some(o=>o.textContent==='Grade 9')"),'grade choices include other pages');
  await click('Weekly Plans');await until("document.body.innerText.includes('Showing 1–50 of 121') && document.body.innerText.includes('Ethiopian Academic Week')",'weekly tab');
  await checkPaging('/vice-principal/weekly-plans');
  assert(requests.some(r=>r.pathname.endsWith('/weekly-plans')&&r.params.weekDate));
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Lab Requisitions Supervision')).click()");
  await until("document.body.innerText.includes('Showing 1–50 of 121') && document.body.innerText.includes('requisition form(s)')",'lab tab');
  await checkPaging('/teacher/branch-lab-requisitions');
  await visit('/staff','super-admin');await checkPaging('/super-admin/users');
  await input('input[aria-label="Search staff"]','Teacher 121');await until("document.body.innerText.includes('Showing 1–1 of 1')",'admin staff search');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: staff, teachers, librarians, annual plans, weekly plans, lab supervision; pagination, search, cache reuse, refresh, error retry, and stale response protection');
  await send('Page.close');ws.close();
})().catch(error=>{console.error(error);process.exitCode=1;setTimeout(()=>process.exit(1),100);});
