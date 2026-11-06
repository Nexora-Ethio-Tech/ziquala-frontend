// Offline production checks. Every non-loopback browser request is intercepted.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const origin = 'http://127.0.0.1:5194';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ziquala-performance-'));
let browser, server;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const localFetch = async pathname => {
  let failure;
  for (let attempt=0; attempt<3; attempt++) {
    try { return await fetch(origin+pathname, { headers:{ Connection:'close' }, signal:AbortSignal.timeout(10000) }); }
    catch (error) { failure=error; await sleep(100); }
  }
  throw failure;
};
const report = { mode:'Local production preview, synthetic API fixtures, 4x CPU slowdown, all external requests intercepted. Not a Lighthouse score.', audits:null, routes:[], errors:[] };
const auditFile = [path.join(root,'../lighthouse-school.json'),path.join(root,'lighthouse-school.json')].find(fs.existsSync);
if (auditFile) {
  const audit = JSON.parse(fs.readFileSync(auditFile,'utf8'));
  report.audits = Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','speed-index','largest-contentful-paint-element','lcp-lazy-loaded','render-blocking-resources','render-blocking-insight','unused-javascript','bootup-time','mainthread-work-breakdown','server-response-time','lcp-discovery-insight','lcp-breakdown-insight'].map(id => [id,audit.audits?.[id] || null]));
  report.settingsRequests = audit.audits?.['network-requests']?.details?.items?.filter(item => item.url?.includes('/public/system-settings'));
}
const manifest = JSON.parse(fs.readFileSync(path.join(dist,'.vite/manifest.json'),'utf8'));
const graph = (name, seen = new Set()) => {
  if(seen.has(name))return seen;
  seen.add(name);
  for(const imported of manifest[name]?.imports || [])graph(imported,seen);
  return seen;
};
const size = name => {
  const files = [...graph(name)].map(key => manifest[key].file);
  const sizes = files.map(file => {const bytes=fs.readFileSync(path.join(dist,file));return {file,bytes:bytes.length,gzipBytes:gzipSync(bytes).length};});
  return {files:sizes, bytes:sizes.reduce((n,f)=>n+f.bytes,0),gzipBytes:sizes.reduce((n,f)=>n+f.gzipBytes,0)};
};
report.entry = size('index.html');
report.school = size('src/pages/PublicSchool.tsx');
for(const route of ['PublicHome','PublicSchool','PublicMonastery','ELearningPage','ContactPage']) {
  assert(Object.values(manifest).some(entry=>entry.name===route&&entry.isDynamicEntry), route+' must be a lazy entry');
}
assert(!report.entry.files.some(f=>/localization-|PublicSchool-|PublicMonastery-|TeacherPortal-|ExamSession-/.test(f.file)),'Private code/public routes eagerly imported');
assert(!report.school.files.some(f=>/localization-|PublicMonastery-|TeacherPortal-|ExamSession-/.test(f.file)),'School imports unrelated code');
(async()=>{
 let socket;
 try {
  browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--no-sandbox','--disable-gpu','--disable-extensions','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], {windowsHide:true,stdio:'ignore'});
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5194','--strictPort'], {cwd:root,windowsHide:true,stdio:'ignore'});
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<150;i++){
    if(server.exitCode!==null)throw Error('Preview exited: '+server.exitCode);
    try{if(fs.existsSync(portFile)){const ready=await localFetch('/');await ready.text();if(ready.ok)break;}}catch{}
    await sleep(100);
  }
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const tab=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json());
  socket=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let sequence=0;const pending=new Map(),requests=[];
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>reject(Error(method+' timeout')),30000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});socket.send(JSON.stringify({id,method,params}));});
  socket.addEventListener('message',async event=>{
   const m=JSON.parse(event.data);
   if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(m.error):p.resolve(m.result);return;}
   if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);
   if(m.method==='Fetch.requestPaused'){
    const {request,requestId}=m.params;const url=new URL(request.url);
    if(url.origin===origin&&!url.pathname.startsWith('/api/')){await send('Fetch.continueRequest',{requestId});return;}
    requests.push(request.url);
    if(url.pathname.startsWith('/api/')){
     // A stalled settings service cannot be allowed to hide either hero.
     if(url.pathname.includes('system-settings'))return;
     const data=url.searchParams.get('type')==='team' ? [{id:'offline-team',content_type:'team',title:'Offline team member',category:'Office & management',image_url:'',subtitle:'',body:'',status:'published'}] : [];
     await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify({success:true,data})).toString('base64')});
    }else await send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});
   }
  });
  await send('Runtime.enable');await send('Page.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:412,height:823,deviceScaleFactor:1.75,mobile:true});
  await send('Emulation.setCPUThrottlingRate',{rate:4});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.clear();localStorage.setItem('ziquala_language','am');window.__cls=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});`});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  for(const route of ['/school','/']){
   const html=await localFetch(route).then(r=>r.text());
   assert(/<link rel="preload" as="image"/.test(html),'Hero preload absent');
   assert(/<div id="root">[\s\S]*?<img[^>]+fetchPriority="high"[^>]+loading="eager"/i.test(html),'Static hero absent');
   assert(!html.includes('fonts.googleapis.com'),'Render-blocking font');
   const image=html.match(/<img[^>]+src="([^"]+)"/)[1];
   assert(fs.statSync(path.join(dist,image)).size<150000);
   // With scripts disabled the actual image must still paint and decode.
   await send('Emulation.setScriptExecutionDisabled',{value:true});
   await send('Page.navigate',{url:origin+route});await sleep(1200);
   await send('Emulation.setScriptExecutionDisabled',{value:false});
   assert(await evaluate(`!![...document.images].find(img=>img.src.includes('school-building')&&img.complete&&img.naturalWidth>0)`),'Hero requires JS');
   console.log('PASS parser-discovered hero with scripts disabled:',route);
   const start=requests.length;
   await send('Page.navigate',{url:origin+route});
   for(let i=0;i<250;i++){if(await evaluate(`!!document.querySelector('#public-main-content h1')`))break;await sleep(100);}
   await sleep(1500);
   const state=await evaluate(`({heading:document.querySelector('h1')?.textContent,lang:document.documentElement.lang,cls:window.__cls,overflow:document.documentElement.scrollWidth>innerWidth,hero:[...document.images].filter(img=>img.src.includes('school-building')).map(img=>({complete:img.complete,width:img.naturalWidth,priority:img.fetchPriority,loading:img.loading})),scripts:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).map(r=>r.name)})`);
   assert(state.heading&&state.lang==='am');assert(!state.overflow);assert(state.hero.some(img=>img.complete&&img.width&&img.priority==='high'&&img.loading==='eager'));
   assert(state.cls<.1,`Layout shifts: ${state.cls}`);
   const initial=requests.slice(start);
   assert(!initial.some(url=>/system-settings|type=team|fonts\.google/.test(url)),'Noncritical dependency on initial render');
   assert(!state.scripts.some(url=>/localization-|PublicMonastery-|TeacherPortal-|ExamSession-/.test(url)),'Unrelated code downloaded: '+JSON.stringify(state.scripts));
   if(route==='/school'){
    await evaluate(`document.getElementById('school-staff').scrollIntoView()`);
    for(let i=0;i<100&&!requests.slice(start).some(url=>url.includes('type=team'));i++)await sleep(100);
    assert(requests.slice(start).some(url=>url.includes('type=team')),'Staff request never started');
    for(let i=0;i<100;i++){if(await evaluate(`document.body.textContent.includes('Offline team member')`))break;await sleep(100);}
    assert(await evaluate(`document.body.textContent.includes('Offline team member')`),'Staff data not rendered');
   }
   report.routes.push({route,...state,initialApiRequests:initial});console.log('PASS',route,'static hero, lazy routes, no settings/team/font dependency, CLS',state.cls);
  }
  for(const [url,type] of [['/robots.txt','text/plain'],['/llms.txt','text/plain'],['/.well-known/ai-catalog.json','application/json']]){
   const response=await localFetch(url);assert.equal(response.status,200);assert(response.headers.get('content-type').includes(type));
   const text=await response.text();assert(!text.includes('<!doctype'));if(url.endsWith('.json'))JSON.parse(text);
  }
  assert.equal((await localFetch('/.well-known/missing.json')).status,404);
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 }finally{socket?.close();browser.kill();server.kill();}
 fs.writeFileSync(process.env.PERFORMANCE_CHECK_OUTPUT||path.join(root,'../performance-local-results.json'),JSON.stringify(report,null,2));
 console.log('Production performance checks passed. Entry gzip bytes:',report.entry.gzipBytes);
})().catch(error=>{console.error(error);browser.kill();server.kill();process.exitCode=1;});
