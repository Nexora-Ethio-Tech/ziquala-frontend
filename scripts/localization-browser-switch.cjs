const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
const tab=await fetch('http://127.0.0.1:9246/json/new?about:blank',{method:'PUT'}).then(r=>r.json()),ws=new WebSocket(tab.webSocketDebuggerUrl),pending=new Map();let id=0;const exceptions=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
ws.addEventListener('message',async e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}return;}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Fetch.requestPaused')await send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({success:true,data:[]})).toString('base64')});});
await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true});});
await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
const evalJS=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evalJS(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out '+expression);};
const init=(await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.clear();localStorage.setItem('ziquala_language','en');"})).identifier;
await send('Page.navigate',{url:'http://127.0.0.1:5187/login'});await waitFor("!!document.querySelector('input[type=password]')");
await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:init});
await evalJS(`(()=>{const input=document.querySelector('input[type=password]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'KeepThisValue');input.dispatchEvent(new Event('input',{bubbles:true}));window.originalPasswordInput=input;window.originalForm=document.querySelector('form');const required=document.querySelector('input[required]:not([type=password])');window.requiredField=required;required.checkValidity();})()`);
const selectLanguage=async language=>{await evalJS(`(()=>{const select=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='am'));select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await waitFor(`document.documentElement.lang===${JSON.stringify(language)}`);await new Promise(r=>setTimeout(r,120));};
const messages={};
for(const language of ['am','om','en']){
 await selectLanguage(language);
 const state=await evalJS(`({lang:document.documentElement.lang,title:document.title,password:document.querySelector('input[type=password]').value,sameInput:window.originalPasswordInput===document.querySelector('input[type=password]'),sameForm:window.originalForm===document.querySelector('form'),message:window.requiredField.validationMessage,stored:localStorage.getItem('ziquala_language'),legacy:localStorage.getItem('ziquala_lang')})`);
 assert.equal(state.password,'KeepThisValue');assert(state.sameInput&&state.sameForm,'Language change remounted form');assert.equal(state.stored,language);assert.equal(state.legacy,language==='om'?'or':language);assert(state.message);messages[language]=state.message;console.log('PASS: form preserved, validation and persistence updated',language,state.message);
}
assert.notEqual(messages.am,messages.en);assert.notEqual(messages.om,messages.en);
await selectLanguage('om');await send('Page.reload');await waitFor("!!document.querySelector('input[type=password]') && document.documentElement.lang==='om'");console.log('PASS: language survives reload');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Page.navigate',{url:'http://127.0.0.1:5187/'});await waitFor("!!document.querySelector('header')");await new Promise(r=>setTimeout(r,300));
assert.equal(await evalJS('document.documentElement.lang'),'om');assert(await evalJS('document.documentElement.scrollWidth <= innerWidth + 1'),'Mobile page overflows');
const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync('/tmp/ziquala-language-mobile.png',Buffer.from(shot.data,'base64'));
console.log('PASS: landing page retains language and fits 390px mobile viewport');assert.equal(exceptions.length,0,exceptions.join('\n'));ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
