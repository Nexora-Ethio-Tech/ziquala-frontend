if (process.argv[2] === 'all') {
  const { spawnSync } = require('node:child_process');
  for (const args of [['am'], ['om'], ['en'], ['am', 'routes'], ['om', 'routes']]) {
    const result = spawnSync(process.execPath, [__filename, ...args], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
  process.exit(0);
}
// Run against a local production preview with a headless Chrome debugging port.
// All API requests are fulfilled with synthetic fixtures; no live records are used.
const assert = require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
const tab=await fetch('http://127.0.0.1:9246/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(tab.webSocketDebuggerUrl);let seq=0,role='',language=process.argv[2]||'am';const pending=new Map(),exceptions=[],pages=[],requests=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
ws.addEventListener('message',async e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}return;}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
if(m.method==='Fetch.requestPaused'){const {requestId,request}=m.params;const url=new URL(request.url);requests.push(url.pathname);let data=[];
if(url.pathname.endsWith('/auth/me'))data={id:'test-user',name:'Review Person',role,branch_id:'branch-1',branch_name:'Test Branch',status:'active'};
else if(url.pathname.endsWith('/system-settings'))data={grade_submission_open:'true',registration_open:'true'};
else if(url.pathname.endsWith('/branches'))data=[{id:'branch-1',name:'Test Branch',address:'Test address'}];
else if(url.pathname.endsWith('/teacher-of-week'))data={isOpen:false,hasVoted:false,teachers:[]};
else if(url.pathname.endsWith('/student/dashboard'))data={student:{id:'test-student',name:'Review Student',grade:'9',class:'A'},stats:{totalCourses:0,attendanceRate:95,averageGradeDisplay:'Pending',currentSemester:1},weeklySchedule:[],schoolAnnouncements:[],logisticsAnnouncements:[]};
else if(url.pathname.endsWith('/parent/dashboard'))data={children:[],stats:{},announcements:[]};
else if(/dashboard$|overview$|\/stats$|absent-count/.test(url.pathname))data={stats:{},overview:{},branches:[],recentActivities:[],announcements:[],gradeStats:[],assets:{},issues:{},categories:[],absentCount:0};
else if(url.pathname.endsWith('/grade-submission-policy'))data={unlockWindowDays:60,activeSemesterOnly:true,activePeriod:{academicYear:'2026/2027',semester:1}};
else if(url.pathname.endsWith('/grade-submission-settings'))data={open:true};
await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({success:true,data})).toString('base64')});}});
await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true});});
await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
let init;
async function visit(path,asRole=''){
role=asRole;if(init)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:init});
init=(await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.clear();localStorage.setItem('ziquala_language',${JSON.stringify(language)});${role?"localStorage.setItem('ziquala_token','local-language-test');":""}`})).identifier;
const before=exceptions.length;await send('Page.navigate',{url:'http://127.0.0.1:5187'+path});
for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,200));if(await evaluate("document.readyState!=='loading' && (!!document.querySelector('header') || !!document.querySelector('form'))"))break;}
await new Promise(r=>setTimeout(r,900));
const result=await evaluate(`(()=>{const nodes=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(!n.parentElement?.closest('script,style')&&n.parentElement?.getClientRects().length&&n.textContent.trim())nodes.push(n.textContent.trim().replace(/\\s+/g,' '));}return {url:location.pathname,lang:document.documentElement.lang,nodes,body:document.body.innerText,selects:[...document.querySelectorAll('select')].map(s=>({label:s.getAttribute('aria-label'),value:s.value,options:[...s.options].map(o=>({value:o.value,text:o.text}))}))};})()`);
pages.push({path,role,language,...result,errors:exceptions.slice(before)});console.log(role||'public',path,result.lang,'nodes:',result.nodes.length,'errors:',exceptions.length-before);
}
if(process.argv[3]==='routes') {
 const cases = {
 'super-admin':['/branches','/analytics','/website-posts','/chatbot-management','/settings'],
 'school-admin':['/students','/registration','/branch-users','/classes','/subjects','/attendance-management','/staff/teachers','/staff/librarian','/inventory','/schedule-builder','/settings','/exams','/attendance'],
 'academic-manager':['/academic-grades','/elearning-management'],
 'teacher':['/teacher-classes','/teacher-grades','/grades','/schedule','/attendance','/change-password'],
 'student':['/courses','/student-schedule','/attendance','/exams'],
 'vice-principal':['/vp-attendance','/vp-communication','/vp-transcripts','/vp-grade-management','/transcripts'],
 'parent':['/dashboard/parent?tab=grades','/dashboard/parent?tab=history','/dashboard/parent?tab=communication-book'],
 };
 for(const [r,paths] of Object.entries(cases))for(const p of paths)await visit(p,r);
} else {
 for(const path of ['/','/school','/monastery','/elearning','/news','/portal','/login','/register'])await visit(path);
 for(const r of ['super-admin','academic-manager','school-admin','teacher','student','parent','vice-principal','librarian','storekeeper'])await visit('/dashboard/'+r,r);
}
fs.writeFileSync('/tmp/ziquala-language-pages-'+language+(process.argv[3]||'')+'.json',JSON.stringify({pages,exceptions,requests},null,2));assert.equal(exceptions.length,0,exceptions.join('\n'));
for(const page of pages){assert.equal(page.lang,language);assert(page.nodes.length>0,`Blank page: ${page.path}`);}
console.log('PASS: all requested pages rendered in '+language+' without uncaught errors');
await Promise.race([send('Page.close'), new Promise(resolve => setTimeout(resolve, 1000))]);
ws.close();
setTimeout(() => process.exit(0), 100);
})().catch(e=>{console.error(e);process.exit(1)});
