// Production smoke check: node scripts/check-public-loading.cjs
// Uses local API fixtures only; Chrome and the preview server are owned by this script.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const previewPort = process.env.PUBLIC_CHECK_PORT || '5189';
const origin = `http://127.0.0.1:${previewPort}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ziquala-loading-check-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-extensions', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', previewPort, '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
const book = { id: 'loading-check-book', title: 'Review Book', author: 'Review Author', description: 'Review description', grade: 'Grade 7', subject: 'Math', language: 'English', materialType: 'Textbook', audience: 'Public', status: 'published', featured: true, allowDownload: true, coverClass: 'from-blue-700 to-blue-900', driveUrl: 'https://drive.google.com/file/d/fixture-book/view', createdAt: '', updatedAt: '' };
const seo = require('../src/data/seoPages.json');
const accessibility = process.argv.includes('--accessibility');
const navigation = process.argv.includes('--navigation');
const functionality = process.argv.includes('--functionality');
const visual = process.argv.includes('--visual');
const reliability = process.argv.includes('--reliability');
const headerStaff = process.argv.includes('--header-staff');
const oromoContent = process.argv.includes('--oromo');
const gradeSearchTest = process.argv.includes('--grade-search') ? require('./check-grade-entry-search.cjs') : null;
const gradeSearchState = { saved:[] };
const vpCommunicationTest = process.argv.includes('--vp-communication') ? require('./check-vp-communication.cjs') : null;
const vpCommunicationState = {requests:[]};

(async () => {
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100; i++) {
      if (browser.exitCode !== null || server.exitCode !== null) throw Error('Browser or preview exited');
      try { if (fs.existsSync(portFile) && (await fetch(origin)).ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tab = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const pending = new Map(), errors = [], checks = [], apiRequests = [], securityViolations = [], accessibilityResults = [], navigationResults = [];
    let settingsMode = 'ready', authMode = 'ready';
    const heldSettings = [], heldAuth = [];
    const modes = {library:'ready',contact:'ready',branches:'ready',application:'ready'};
    const heldContact = [];
    const heldApplications = [];
    let functionalityResults;
    const reliabilityState = { chatMode: 'ready', chunkMode: 'ready', settingsMalformed: false };
    const heldChat = [];
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`${method} timed out`)); }, 30000);
      pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const fulfill = (requestId, body, status = 200) => send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
    const verifiedStudent = { id: 'review-student', name: 'Review Student', role: 'student', status: 'active', branch_id: 'review-branch' };
    let verifiedIdentity = verifiedStudent;
    socket.addEventListener('message', async event => {
      const message = JSON.parse(event.data);
      if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (request) message.error ? request.reject(message.error) : request.resolve(message.result); return; }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      if (message.method === 'Runtime.bindingCalled' && message.params.name === '__recordSecurityViolation') securityViolations.push(JSON.parse(message.params.payload));
      if (message.method === 'Fetch.requestPaused') {
        try {
        const { requestId, request } = message.params;
        const pathname = new URL(request.url).pathname;
        if(reliability && /\/Login-[^/]+\.js$/.test(pathname)) {
          if(reliabilityState.chunkMode==='fail') await send('Fetch.fulfillRequest',{requestId,responseCode:404,responseHeaders:[{name:'Content-Type',value:'text/plain'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from('Fixture missing chunk').toString('base64')});
          else await send('Fetch.continueRequest',{requestId});
          return;
        }
        if (!pathname.startsWith('/api/')) { await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }); return; }
        if (request.method === 'OPTIONS') { await fulfill(requestId, {}); return; }
        if (request.method !== 'OPTIONS') apiRequests.push(pathname);
        const vpFixture = vpCommunicationTest?.fixtureFor(request,vpCommunicationState);
        if (vpFixture) { await fulfill(requestId,vpFixture); return; }
        const gradeFixture = gradeSearchTest?.fixtureFor(request, gradeSearchState);
        if (gradeFixture) { await fulfill(requestId, gradeFixture); return; }
        if(reliability && pathname.endsWith('/guest/chat')){
          if(reliabilityState.chatMode==='hold'){heldChat.push(requestId);return;}
          await fulfill(requestId,reliabilityState.chatMode==='malformed'?{success:true,data:[]}:reliabilityState.chatMode==='tracking'?{content:'Synthetic assistant reply ![Synthetic illustration](https://tracking.invalid/pixel)'}:{content:'Synthetic assistant reply'});return;
        }
        if(reliability && pathname.endsWith('/system-settings') && reliabilityState.settingsMalformed){await fulfill(requestId,'Fixture invalid settings');return;}
        if(functionality && pathname.endsWith('/auth/login')){await fulfill(requestId,{success:false,error:{message:'Invalid credentials'}},401);return;}
        if(functionality && pathname.endsWith('/public/applications')){
          if(modes.application==='hold'){heldApplications.push(requestId);return;}
          await fulfill(requestId,modes.application==='malformed'?'<html>Fixture invalid response</html>':{success:true,data:{id:'synthetic-application'}},201);return;
        }
        if (functionality && pathname.endsWith('/contact')) {
          if(modes.contact==='hold'){heldContact.push(requestId);return;}
          if(modes.contact==='network'){await send('Fetch.failRequest',{requestId,errorReason:'Failed'});return;}
          await fulfill(requestId,modes.contact==='malformed'?'<html>Fixture invalid response</html>':{success:modes.contact==='ready'},modes.contact==='rate-limit'?429:200);return;
        }
        if (functionality && pathname.endsWith('/elearning/books') && modes.library!=='ready') {
          await fulfill(requestId,modes.library==='empty'?{success:true,data:[]}:modes.library==='malformed'?'<html>Fixture invalid response</html>':{success:false},modes.library==='error'?503:200);return;
        }
        if(functionality && pathname.endsWith('/guest/branches') && modes.branches==='error'){await fulfill(requestId,{success:false},503);return;}
        if(functionality && pathname.endsWith('/guest/branches') && modes.branches==='empty'){await fulfill(requestId,{success:true,data:[]});return;}
        if (request.method !== 'OPTIONS' && pathname.endsWith('/auth/me') && authMode === 'hold') { heldAuth.push(requestId); return; }
        if (request.method !== 'OPTIONS' && pathname.endsWith('/system-settings') && settingsMode === 'hold') { heldSettings.push(requestId); return; }
        if (pathname.endsWith('/auth/refresh-token') || (pathname.endsWith('/auth/me') && authMode === 'expired')) { await fulfill(requestId, { success: false, error: { message: 'Fixture expired session' } }, 401); return; }
        if (pathname.endsWith('/system-settings') && settingsMode === 'error') { await fulfill(requestId, { success: false, error: { message: 'Fixture settings unavailable' } }, 503); return; }
        let data = [];
        if (headerStaff && pathname.endsWith('/website-content/public') && new URL(request.url).searchParams.get('type') === 'team') {
          const names = require('../src/data/staffNames.json');
          const flower = names['copy.myFlowerHasFallen'];
          const base = { content_type:'team', subtitle:'copy.schoolPrincipal', body:'Fixture staff record', image_url:'', category:'Office & management', status:'published', display_order:1 };
          await fulfill(requestId, { success:true, data:[
            {...base,id:'staff-office',title:names['school.staff.abrahamKefyalew'].nameAm},
            {...base,id:'staff-flower',title:flower.nameAm,category:'Kindergarten team'},
            {...base,id:'staff-phonetic',title:flower.nameAm.split(' ')[0],category:'Kindergarten team'},
            {...base,id:'staff-authored',title:'Fixture authored name',nameAm:flower.nameAm.split(' ')[0],nameEn:'Abebaye Tesfaye',category:'Kindergarten team'}
          ] }); return;
        }
        if (pathname.endsWith('/system-settings')) data = { registration_open: settingsMode === 'closed' ? 'false' : 'true', grade_submission_open: 'true' };
        else if (pathname.endsWith('/branches')) data = [{ id: 'review-branch', name: 'Review Branch', location: 'Review location', address: 'Review address' }];
        else if (pathname.endsWith('/elearning/books')) data = accessibility ? [book,{...book,id:'review-unavailable',title:'Unavailable review book',driveUrl:'',coverClass:'from-white to-slate-100'}] : [book];
        else if (pathname.endsWith('/auth/me')) data = verifiedIdentity;
        const body = pathname.endsWith('/guest/chat') ? { content: '**Review reply**' } : { success: true, data };
        await fulfill(requestId, body);
        } catch (error) {
          // Fast route changes can cancel a request before Chrome accepts its fixture reply.
          if (error.code === -32602 && error.message?.includes('Invalid InterceptionId')) return;
          errors.push({ fixtureError: error });
        }
      }
    });
    await send('Runtime.enable'); await send('Page.enable');
    if (accessibility) await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await send('Runtime.addBinding', { name: '__recordSecurityViolation' });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('securitypolicyviolation', e => __recordSecurityViolation(JSON.stringify({directive:e.effectiveDirective,blocked:e.blockedURI,disposition:e.disposition})));` });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }, { urlPattern: 'https://fonts.*/*' }, { urlPattern: 'https://drive.google.com/*' }, ...(reliability?[{urlPattern:origin+'/assets/Login-*.js'}]:[])] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.origin === ${JSON.stringify(origin)}) localStorage.setItem('ziquala_language', 'en');` });
    const evaluate = async (expression, userGesture = false) => { const response = await send('Runtime.evaluate', { expression, userGesture, awaitPromise: true, returnByValue: true }).catch(error=>{throw Error('Evaluation failed: '+expression.slice(0,180)+' '+JSON.stringify(error));}); if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails)); return response.result.value; };
    const until = async (expression, label) => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); } throw Error(`Not ready: ${label}\n${JSON.stringify({ errors, body: await evaluate('document.body.innerText.slice(0, 1000)'), focus: await evaluate('document.activeElement?.outerHTML.slice(0,500)'), chat: await evaluate("document.querySelector('[data-school-chat]')?.innerText.slice(0,1000)") })}`); };
    const navigate = async route => { await evaluate(`history.pushState({}, '', ${JSON.stringify(route)});dispatchEvent(new PopStateEvent('popstate'));`); };
    const key = async (key, code = key, modifiers = 0) => {
      const windowsVirtualKeyCode = {Enter:13,Escape:27,Tab:9,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Home:36,End:35}[key];
      await send('Input.dispatchKeyEvent', {type:'keyDown',key,code,modifiers,windowsVirtualKeyCode,...(key === 'Enter' ? {text:'\r',unmodifiedText:'\r'} : {})});
      await send('Input.dispatchKeyEvent', {type:'keyUp',key,code,modifiers,windowsVirtualKeyCode});
    };
    const audit = async label => {
      if (!accessibility && !(functionality && label.startsWith('functionality-'))) return;
      await new Promise(resolve => setTimeout(resolve, 1100));
      if (!await evaluate('!!window.axe')) await evaluate(require('axe-core').source);
      const result = await evaluate(`axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},iframes:false,preload:false}).then(r=>({violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)}))`);
      accessibilityResults.push({label,...result});
      if (process.env.LOADING_CHECK_OUTPUT) fs.writeFileSync(process.env.LOADING_CHECK_OUTPUT, JSON.stringify({accessibilityResults}, null, 2));
      console.log(`ACCESSIBILITY ${label}: ${result.violations.length} violations`);
      if (result.violations.length) console.error(JSON.stringify({label,violations:result.violations}, null, 2));
      if (process.env.LOADING_CHECK_OUTPUT && ['home-dark', 'home-light', 'book-reader'].includes(label)) {
        const screenshot = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
        fs.writeFileSync(path.join(path.dirname(process.env.LOADING_CHECK_OUTPUT), `step8-${label}.png`), Buffer.from(screenshot.data, 'base64'));
      }
    };
    if (vpCommunicationTest) {
      await vpCommunicationTest.run({send,evaluate,until,navigate,origin,state:vpCommunicationState});
      assert.equal(errors.length,0,JSON.stringify(errors));
      console.log('PASS: no browser runtime errors');
      return;
    }
    if (gradeSearchTest) {
      await gradeSearchTest.run({send,evaluate,until,navigate,origin,state:gradeSearchState,apiRequests});
      assert.equal(errors.length, 0, JSON.stringify(errors));
      console.log('PASS: no browser runtime errors');
      return;
    }
    if (oromoContent) {
      await require('./check-oromo-content.cjs')({send,evaluate,until,navigate,origin});
      assert.equal(errors.length, 0, JSON.stringify(errors));
      console.log('PASS: no browser runtime errors');
      return;
    }
    if (headerStaff) {
      await require('./check-header-staff.cjs')({send,evaluate,until,navigate,key,origin});
      assert.equal(errors.length, 0, JSON.stringify(errors));
      console.log('PASS: no browser runtime errors');
      return;
    }
    if(reliability){
      const reliabilityResults=await require('./check-public-reliability.cjs')({send,evaluate,until,navigate,origin,state:reliabilityState,heldChat,apiRequests});
      if(process.env.LOADING_CHECK_OUTPUT)fs.writeFileSync(process.env.LOADING_CHECK_OUTPUT,JSON.stringify({reliabilityResults,errors,securityViolations},null,2));
      assert.equal(errors.length,0,JSON.stringify(errors));return;
    }
    if (visual) {
      const visualResults = await require('./check-public-visual.cjs')({send,evaluate,until,navigate,origin,audit});
      const output = process.env.LOADING_CHECK_OUTPUT;
      if(output) fs.writeFileSync(output,JSON.stringify({visualResults,errors,securityViolations,accessibilityResults},null,2));
      assert.equal(errors.length,0,JSON.stringify(errors));
      assert.equal(visualResults.issues.length,0,'Visual layout issues; see results');
      assert.equal(accessibilityResults.reduce((sum,result)=>sum+result.violations.length,0),0,'Visual accessibility issues; see results');
      return;
    }
    const resources = () => evaluate("performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).map(r=>({file:new URL(r.name).pathname,bytes:r.encodedBodySize}))");
    const clickNavigation = async (url, width) => {
      const parent = url.split('#')[0] || '/';
      const selector = scope => JSON.stringify(`${scope} a[href=${JSON.stringify(url)}]`);
      if (width === 390) {
        await evaluate("document.querySelector('header button[aria-controls=public-navigation-menu]').click()");
        await until("document.querySelector('#public-navigation-menu a') && document.getElementById('public-main-content').inert", 'mobile navigation ready');
        await evaluate(`(()=>{const link=document.querySelector(${selector('#public-navigation-menu')});link.focus();link.click();})()`);
      } else {
        if (url.includes('#')) {
          await evaluate(`document.querySelector(${JSON.stringify(`header nav a[href=${JSON.stringify(parent)}]`)}).focus()`);
          await key('ArrowDown');
          await until(`getComputedStyle(document.querySelector(${selector('header nav')})).visibility==='visible'`, 'desktop sections visible');
        }
        await evaluate(`(()=>{const link=document.querySelector(${selector('header nav')});link.focus();link.click();})()`);
      }
      const expected = new URL(url, origin);
      await until(`location.pathname===${JSON.stringify(expected.pathname)} && location.hash===${JSON.stringify(expected.hash)} && !!document.querySelector('#public-main-content h1')`, `navigation ${url}`);
      if (width === 390) await until("document.querySelector('header button[aria-controls=public-navigation-menu]').getAttribute('aria-expanded')==='false' && !document.getElementById('public-main-content').inert", 'navigation dismisses menu');
      await until(`document.activeElement.id===${JSON.stringify(expected.hash ? expected.hash.slice(1) : 'public-main-content')}`, `route focus settled: ${url}`);
    };
    const checkResponsiveHeaders = async () => {
      const responsiveHeaders=[];
      for (const width of [768,1024,1280,1440]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
        for (const language of ['am','om','en']) {
          await evaluate(`(()=>{const select=document.querySelector('header select');select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
          await until(`document.documentElement.lang===${JSON.stringify(language)}`, 'translated navigation');
          const clipped=await evaluate("[...document.querySelectorAll('header nav a, header nav button')].filter(element=>!element.closest('[data-public-submenu]')).filter(element=>{const r=element.getBoundingClientRect();return r.left<0 || r.right>innerWidth || r.bottom>document.querySelector('header').getBoundingClientRect().bottom+1;}).map(element=>element.textContent||element.getAttribute('aria-label'))");
          assert.deepEqual(clipped,[],`Header links clipped at ${width}px in ${language}`);
          responsiveHeaders.push({width,language});
        }
      }
      navigationResults.push({responsiveHeaders});
      console.log('PASS translated navigation at 768, 1024, 1280 and 1440px');
    };
    const checkNavigation = async width => {
      if (width === 1440) await checkResponsiveHeaders();
      const ts = require('typescript'), vm = require('node:vm');
      const content = {};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'src/data/ziqualaContent.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:content,require:()=>({default:'fixture-image'})});
      await evaluate("window.__navigationMarker='client-navigation'");
      let links = 0;
      for (const item of content.publicNavigation) {
        await clickNavigation(item.to, width); links++;
        for (const child of item.children) {
          const url = item.to + child.hash;
          await clickNavigation(url, width); links++;
          await new Promise(resolve=>setTimeout(resolve,650));
          const id = child.hash.slice(1);
          await until(`(()=>{const target=document.getElementById(${JSON.stringify(id)});const header=document.querySelector('header').getBoundingClientRect();return !!target && target.getBoundingClientRect().top>=header.bottom-3 && target.getBoundingClientRect().top<innerHeight-40;})()`, `section clears sticky header: ${url}`);
        }
      }
      assert.equal(await evaluate('window.__navigationMarker'), 'client-navigation', 'Internal navigation reloaded the document');
      await clickNavigation('/monastery',width);
      await evaluate("document.querySelector('main a[href=\"#donate\"]').click()");
      await until("location.hash==='#donate' && document.activeElement.id==='donate'", 'native section link follows route focus policy');
      if (width === 1440) {
        await evaluate("document.querySelector('header nav a[href=\"/school\"]').focus()");
        await key('ArrowDown'); await until("document.activeElement.matches('#public-submenu-school a')", 'desktop arrow enters sections');
        await key('Escape');
        assert(await evaluate("document.activeElement.matches('header nav a[href=\"/school\"]') && document.querySelector('header nav a[aria-controls=public-submenu-school]').getAttribute('aria-expanded')==='false'"));
      }
      await clickNavigation('/school',width);
      await evaluate('scrollTo(0,1400)'); await new Promise(resolve=>setTimeout(resolve,150));
      const savedScroll = await evaluate('scrollY');
      await clickNavigation('/news',width); await until('scrollY<5','new page scrolls to top');
      await evaluate('history.back()');
      await until(`location.pathname==='/school' && Math.abs(scrollY-${savedScroll})<8`, 'Back restores article scroll');
      await evaluate('history.forward()'); await until("location.pathname==='/news' && scrollY<5", 'Forward restores page scroll');
      for (const alias of Object.keys(seo.aliases)) {
        const target=seo.aliases[alias], hash=target==='/school'?'#school-purpose':'#public-main-content';
        await navigate(alias+'/?keep=1'+hash);
        await until(`location.pathname===${JSON.stringify(target)} && location.search==='?keep=1' && location.hash===${JSON.stringify(hash)}`, 'alias preserves query and fragment');
      }
      await navigate('/branches?keep=1'); await until("location.pathname==='/school' && location.search==='?keep=1' && location.hash==='#school-campuses'", 'guest branches alias');
      await navigate('/elearning?keep=1'); await until("[...document.querySelectorAll('article button')].some(b=>b.innerText.includes('Review Book'))", 'library ready for URL navigation');
      await evaluate("window.__readerTrigger=[...document.querySelectorAll('article button')].find(b=>b.innerText.includes('Review Book'));window.__readerTrigger.focus()"); await key('Enter');
      await until("!!document.querySelector('dialog[open]') && new URLSearchParams(location.search).get('book')==='loading-check-book'", 'opening reader updates URL');
      await evaluate('history.back()'); await until("!document.querySelector('dialog') && location.search==='?keep=1'", 'Back closes reader');
      await evaluate('history.forward()'); await until("!!document.querySelector('dialog[open]')", 'Forward reopens reader');
      await evaluate("document.querySelector('dialog button').focus()"); await key('Escape');
      await until("!document.querySelector('dialog') && location.search==='?keep=1'", 'Escape closes one history entry');
      await navigate('/elearning?keep=1&book=loading-check-book'); await until("!!document.querySelector('dialog[open]')",'direct book URL');
      await evaluate("document.querySelector('dialog button').click()");
      await until("!document.querySelector('dialog') && location.search==='?keep=1'", 'direct book close clears URL and preserves other parameters');
      await send('Page.navigate',{url:origin+'/school#school-purpose'});
      await until("!!document.getElementById('school-purpose') && Math.abs(document.getElementById('school-purpose').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().height-16)<8",'fresh deep link scroll');
      await send('Page.reload');
      await until("!!document.getElementById('school-purpose') && Math.abs(document.getElementById('school-purpose').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().height-16)<8",'refresh retains deep section');
      await navigate('/school#%E0%A4%A'); await until('scrollY<5','invalid fragment safely falls back to top');
      await navigate('/school#navigation-delayed-target'); await new Promise(resolve=>setTimeout(resolve,200));
      await evaluate("(()=>{const target=document.createElement('section');target.id='navigation-delayed-target';target.textContent='Delayed navigation fixture';target.style.height='100px';const spacer=document.createElement('div');spacer.style.height='1000px';document.querySelector('main').append(target,spacer);})()");
      await until("document.activeElement.id==='navigation-delayed-target'",'wait for late section before focusing');
      navigationResults.push({width,links,savedScroll,backForward:true,aliases:true,bookUrls:true,deepLinks:true});
      console.log(`PASS navigation ${width}px: ${links} public links, section alignment, aliases, Back/Forward, reader URL history, refresh and delayed/malformed fragments`);
    };
    const checkMetadata = async (pathname, language = 'en') => {
      const copy = require(`../src/locales/public.${language}.json`);
      const read = key => key.split('.').reduce((value, part) => value?.[part], copy);
      const page = seo.pages[pathname], brand = read(seo.brandKey), label = read(page.titleKey);
      const title = pathname === '/' ? `${brand} | ${label}` : `${label} | ${brand}`;
      await until(`document.title === ${JSON.stringify(title)}`, 'localized route title');
      const metadata = await evaluate("({canonical:[...document.querySelectorAll('link[rel=canonical]')].map(n=>n.href),description:[...document.querySelectorAll('meta[name=description]')].map(n=>n.content),robots:document.querySelector('meta[name=robots]')?.content,ogUrl:document.querySelector('meta[property=\"og:url\"]')?.content})");
      assert.deepEqual(metadata.canonical, [new URL(pathname, seo.origin).href]);
      assert.deepEqual(metadata.description, [read(page.descriptionKey)]);
      assert.equal(metadata.robots, page.indexable ? 'index, follow' : 'noindex, follow');
      assert.equal(metadata.ogUrl, metadata.canonical[0]);
    };
    for (const width of [390, 1440]) {
      const firstRequest = apiRequests.length;
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
      await send('Page.navigate', { url: origin + '/' });
      await until("!!document.querySelector('#home-books')", 'mounted homepage');
      await new Promise(r => setTimeout(r, 600));
      assert(!apiRequests.slice(firstRequest).some(p => /system-settings|branches|elearning\/books/.test(p)), 'Homepage fetched settings, branches, or books before needed');
      const initialApiRequests = apiRequests.slice(firstRequest);
      const initial = await resources();
      assert(!initial.some(r => /\/(Register|Login|Layout|ContactPage|ELearningPage|ChatMessage)-/.test(r.file)), 'Unused feature loaded on homepage');
      await evaluate("document.querySelector('#home-books').scrollIntoView()");
      await until("document.body.innerText.includes('Review Book')", 'books load near viewport');
      if (width === 390 || accessibility) {
        await new Promise(r => setTimeout(r, 1000));
        await audit(width === 390 ? 'home-dark' : 'desktop-home-dark');
        await evaluate("document.querySelector('header button[aria-pressed]').click()");
        await new Promise(r => setTimeout(r, 600));
        await audit(width === 390 ? 'home-light' : 'desktop-home-light');
        await evaluate("document.querySelector('header button[aria-pressed]').click()");
      }
      await evaluate('scrollTo(0,0)');
      for (const language of ['am', 'om', 'en']) {
        await evaluate(`(()=>{const select=document.querySelector('header select');select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await until(`document.documentElement.lang === ${JSON.stringify(language)}`, 'language switch');
        assert(!await evaluate("document.querySelector('h1').innerText.includes('copy.')"));
        await checkMetadata('/', language);
        if (navigation && width === 1440) {
          assert(await evaluate("[...document.querySelectorAll('header nav > div')].every(element=>{const r=element.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth;})"), `Desktop navigation clipped in ${language}`);
        }
      }
      if (width === 390) {
        if (accessibility) {
          await evaluate("document.querySelector('a[href=\"#public-main-content\"]').focus()");
          await key('Enter');
          await until("document.activeElement.id==='public-main-content'", 'skip link focuses main');
        }
        await evaluate("document.querySelector('header button[aria-controls=public-navigation-menu]').click()");
        await until("document.querySelector('header button[aria-controls=public-navigation-menu]').getAttribute('aria-expanded') === 'true'", 'mobile menu');
        if (accessibility) {
          await until("document.getElementById('public-main-content').inert && !!document.activeElement.closest('#public-navigation-menu')", 'menu focuses visible navigation and inerts main');
          await audit('mobile-menu');
          await key('Escape');
          await until("document.activeElement.matches('header button[aria-controls=public-navigation-menu][aria-expanded=false]') && !document.getElementById('public-main-content').inert", 'menu Escape restores focus');
        } else await evaluate("document.querySelector('header button[aria-controls=public-navigation-menu]').click()");
      }
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.className.includes('fixed bottom-6 right-6')).click()");
      await until("!!document.querySelector('input[placeholder]')", 'chat opens');
      await until("performance.getEntriesByType('resource').some(r=>/ChatMessage-/.test(r.name))", 'Markdown chunk loads on opening chat');
      await evaluate("(()=>{const input=document.querySelector('input[placeholder]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Review question');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
      await evaluate("document.querySelector('input[placeholder]').form.requestSubmit()");
      await until("[...document.querySelectorAll('strong')].some(s=>s.textContent==='Review reply')", 'chat Markdown response');
      if (width === 390) await audit('chat-open');
      await navigate('/elearning?book=loading-check-book');
      await until("!!document.querySelector('[role=dialog]') && document.querySelector('#book-reader-title')?.textContent === 'Review Book'", 'library deep link');
      await checkMetadata('/elearning');
      if (accessibility && width === 390) {
        await until("!!document.querySelector('dialog[open]') && document.activeElement === document.querySelector('dialog button')", 'reader focuses Close');
        await evaluate("document.querySelector('header select').focus()");
        assert(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"), 'Modal background accepted focus');
        await evaluate("document.querySelector('dialog button').focus()");
        await key('Tab', 'Tab', 8);
        assert.equal(await evaluate("document.activeElement.tagName"), 'IFRAME', 'Shift+Tab must wrap to reader iframe');
        // Embedded documents may expose their own controls before returning to the reader.
        for (let tab = 0; tab < 12; tab++) {
          await key('Tab');
          assert(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"), 'Tab escaped modal content');
          if (await evaluate("document.activeElement === document.querySelector('dialog button')")) break;
        }
        assert(await evaluate("document.activeElement === document.querySelector('dialog button')"), 'Reader tab sequence did not wrap');
      }
      if (width === 390) await audit('book-reader');
      if (accessibility && width === 390) {
        await evaluate("document.querySelector('dialog button').focus()"); await key('Escape');
      } else await evaluate("document.querySelector('dialog button').click()");
      await until("!document.querySelector('#book-reader-title')", 'book reader closes');
      if (width === 390) await audit('library');
      if (accessibility && width === 390) {
        await evaluate("document.querySelector('header button[aria-pressed]').click()"); await audit('library-light');
        await evaluate("document.querySelector('header button[aria-pressed]').click()");
        await evaluate("window.__bookTrigger=[...document.querySelectorAll('article button')].find(button=>button.innerText.includes('Unavailable review book'));window.__bookTrigger.focus()");
        await key('Enter');
        await until("!!document.querySelector('dialog[open] h3')", 'missing book file fallback');
        await audit('book-reader-no-file');
        await key('Escape');
        await until("!document.querySelector('dialog') && document.activeElement===window.__bookTrigger", 'reader restores its triggering button');
      }
      if (accessibility && width === 390) {
        await evaluate("document.querySelector('[data-school-chat] input').focus()");
        await key('Escape');
        await until("!document.querySelector('[data-school-chat]') && document.activeElement.matches('button[title]')", 'chat Escape restores launcher focus');
        await key('Enter');
        await until("document.activeElement.matches('[data-school-chat] input')", 'chat opens with keyboard focus');
        const beforeMove = await evaluate("document.querySelector('[data-school-chat]').getBoundingClientRect().left");
        await evaluate("document.querySelector('[data-drag-handle]').focus()"); await key('ArrowLeft');
        await new Promise(resolve => setTimeout(resolve, 350));
        assert(await evaluate(`document.querySelector('[data-school-chat]').getBoundingClientRect().left < ${beforeMove}`));
        await evaluate("document.querySelector('[data-school-chat] button[aria-expanded]').focus()"); await key('Enter');
        await until("!document.querySelector('[data-school-chat] input')", 'chat minimize by keyboard');
        await key('Enter'); await until("document.activeElement.matches('[data-school-chat] input')", 'chat restore focuses input');
      }
      await navigate('/login'); await until("!!document.querySelector('input[type=password]')", 'login');
      await checkMetadata('/login');
      if (width === 390) await audit('login');
      if (accessibility && width === 390) {
        await evaluate("document.getElementById('login-password').focus()"); await key('Tab');
        assert(await evaluate("document.activeElement.matches('[aria-controls=login-password]')"));
        await key('Enter'); await until("document.getElementById('login-password').type==='text'", 'password reveal by keyboard');
        assert.equal(await evaluate("document.activeElement.getAttribute('aria-pressed')"), 'true');
        await key('Enter'); await until("document.getElementById('login-password').type==='password'", 'password hidden by keyboard');
        await evaluate("document.documentElement.classList.remove('dark')"); await audit('login-light');
        await evaluate("document.documentElement.classList.add('dark')");
      }
      await navigate('/register'); await until("document.querySelectorAll('main input, .admissions-page input').length > 0", 'registration');
      await checkMetadata('/register');
      if (width === 390) await audit('register');
      if (accessibility && width === 390) {
        await evaluate("document.documentElement.classList.remove('dark')"); await audit('register-light');
        await evaluate("document.documentElement.classList.add('dark')");
      }
      await navigate('/contact'); await until("!!document.querySelector('textarea')", 'contact');
      await checkMetadata('/contact');
      if (width === 390) await audit('contact');
      if (accessibility && width === 390) {
        await evaluate("document.documentElement.classList.remove('dark')"); await audit('contact-light');
        await evaluate("document.documentElement.classList.add('dark')");
      }
      await navigate('/school'); await until("!!document.querySelector('main img[fetchpriority=high]')", 'school');
      await checkMetadata('/school');
      if (width === 390) await audit('school');
      if (accessibility && width === 390) {
        await evaluate("document.querySelector('[role=tab]').focus()");
        await key('ArrowRight');
        await until("document.activeElement === document.querySelectorAll('[role=tab]')[1] && document.activeElement.getAttribute('aria-selected')==='true'", 'staff arrow navigation');
        await key('End');
        assert(await evaluate("document.activeElement === [...document.querySelectorAll('[role=tab]')].at(-1)"));
        await key('Home');
        assert.equal(await evaluate("document.querySelectorAll('[role=tab][tabindex=\"0\"]').length"), 1);
        await key('Tab'); assert.equal(await evaluate('document.activeElement.id'), 'staff-tabpanel');
        await evaluate("document.querySelector('header button[aria-pressed]').click()"); await audit('school-light');
        await evaluate("document.querySelector('header button[aria-pressed]').click()");
      }
      await navigate('/monastery'); await until("document.querySelector('main')?.innerText.includes('Monastery')", 'monastery');
      await checkMetadata('/monastery');
      if (width === 390) await audit('monastery');
      if (accessibility && width === 390) {
        assert.equal(await evaluate("document.querySelector('video').autoplay"), false, 'Reduced motion must disable video autoplay');
        await evaluate("document.querySelector('header button[aria-pressed]').click()"); await audit('monastery-light');
        await evaluate("document.querySelector('header button[aria-pressed]').click()");
      }
      await navigate('/news'); await until("!!document.querySelector('main h1')", 'news heading');
      await checkMetadata('/news');
      if (width === 390) await audit('news');
      await navigate('/portal'); await until("!!document.querySelector('main h1')", 'portal heading');
      await checkMetadata('/portal');
      if (width === 390) await audit('portal');
      await navigate('/contact-us'); await until("location.pathname === '/contact'", 'contact alias');
      await checkMetadata('/contact');
      if (navigation) await checkNavigation(width);
      checks.push({ width, initialScripts: initial, initialApiRequests });
      console.log(`PASS ${width}px: deferred chunks, language switching, menu, chat, library, login, registration, contact, school, monastery`);
    }
    if(functionality) functionalityResults = await require('./check-public-functionality.cjs')({send,evaluate,until,navigate,fulfill,origin,modes,heldContact,heldApplications,apiRequests,audit});
    authMode = 'hold';
    const sessionRequestStart = apiRequests.length;
    await evaluate("localStorage.setItem('ziquala_token','review-fixture-token');localStorage.setItem('ziquala_user',JSON.stringify({id:'untrusted',name:'Untrusted Cached Admin',role:'super-admin'}))");
    await send('Page.navigate', { url: origin + '/' });
    await until("!!document.querySelector('main h1')", 'public hero while session verification is held');
    assert(!await evaluate("document.body.innerText.includes('Untrusted Cached Admin')"));
    assert(!apiRequests.slice(sessionRequestStart).some(p => /branches|system-settings/.test(p)), 'Portal data loaded before verification');
    await navigate('/change-password');
    await until("document.body.innerText.includes('Verifying session')", 'protected route waits for verification');
    assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 0);
    assert.equal(heldAuth.length, 1);
    authMode = 'ready';
    await fulfill(heldAuth.shift(), { success: true, data: verifiedStudent });
    await until("document.querySelectorAll('input[type=password]').length >= 2", 'authenticated lazy layout');
    assert((await resources()).some(r => /\/Layout-/.test(r.file)), 'Portal layout was not loaded for authenticated route');
    await until("localStorage.getItem('ziquala_user')?.includes('Review Branch')", 'branch selected after verification');
    assert.equal(apiRequests.slice(sessionRequestStart).filter(p => p.endsWith('/guest/branches')).length, 1, 'Branch-name update refetched branches');
    if (navigation) {
      for (const route of ['/', '/school', '/monastery', '/elearning', '/news', '/contact', '/portal']) {
        await navigate(route);
        await until(`location.pathname===${JSON.stringify(route)} && !!document.getElementById('public-main-content') && !!document.querySelector('main h1')`, 'verified user can read public page');
        await checkMetadata(route);
      }
      navigationResults.push({signedInPublicPages:true});
    }

    authMode = 'expired';
    await send('Page.navigate', { url: origin + '/' });
    await until("!!document.querySelector('main h1') && !localStorage.getItem('ziquala_token')", 'expired session leaves public content available');
    assert.equal(await evaluate('location.pathname'), '/');

    settingsMode = 'hold';
    const registrationRequestStart = apiRequests.length;
    await navigate('/register');
    await until("!!document.querySelector('.admissions-page [role=status]')", 'registration waits for fresh settings');
    assert.equal(await evaluate("document.querySelectorAll('.admissions-page form').length"), 0);
    for (let i = 0; heldSettings.length === 0 && i < 100; i++) await new Promise(r => setTimeout(r, 100));
    assert.equal(heldSettings.length, 1);
    await fulfill(heldSettings.shift(), { success: true, data: { registration_open: 'false' } });
    await until("document.body.innerText.includes('Online Registration Closed')", 'closed registration stays closed');
    assert.equal(await evaluate("document.querySelectorAll('.admissions-page form').length"), 0);
    settingsMode = 'error';
    await navigate('/'); await until("!!document.querySelector('main h1')", 'leave registration');
    await navigate('/register');
    await until("!!document.querySelector('.admissions-page [role=alert]')", 'settings failure keeps registration unavailable');
    assert.equal(await evaluate("document.querySelectorAll('.admissions-page form').length"), 0);
    settingsMode = 'ready';
    await evaluate("document.querySelector('.admissions-page [role=alert] button').click()");
    await until("!!document.querySelector('.admissions-page form')", 'settings retry restores form');
    assert.equal(apiRequests.slice(registrationRequestStart).filter(p => p.endsWith('/guest/branches')).length, 1, 'Registration made duplicate branch requests');
    if (navigation) {
      authMode='ready'; verifiedIdentity={id:'review-admin',name:'Review Admin',role:'super-admin',status:'active'};
      await evaluate("localStorage.setItem('ziquala_token','review-admin-token')");
      await send('Page.navigate',{url:origin+'/branches'});
      await until("location.pathname==='/branches' && !document.getElementById('public-main-content') && document.body.innerText.includes('Review Branch')", 'authorized branch management survives public alias changes');
      navigationResults.push({protectedBranchManagement:true});
      await navigate('/school'); await until("!!document.getElementById('public-main-content')",'admin returns to public site');

    }
    // Exercise the real print renderer in an about:blank window inheriting the page CSP.
    const ts = require('typescript');
    const printModule = ts.transpileModule(fs.readFileSync(path.join(root, 'src/utils/studentPrint.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const printResult = await evaluate(`(()=>{
      const exports = {};
      const require = () => ({uiText: text=>text, localeTag: ()=>'en'});
      ${printModule}
      const preview = window.open('', '_blank');
      if (!preview) throw Error('Print window blocked');
      let printed = false, closed = false;
      const close = preview.close.bind(preview);
      preview.print = () => { printed = true; };
      preview.close = () => { closed = true; };
      exports.renderStudentPrintPreview(preview, {name:'Review',rows:[{name:'<script>attack</script>'}],report:{title:'Review report',subtitle:'Fixture',filters:'',groups:[{label:'Students',color:'#475569',tint:'#FFFFFF',columns:[{key:'name',header:'Name'}]}]}});
      preview.document.getElementById('print-preview').click();
      preview.document.getElementById('close-preview').click();
      const result = {printed,closed,scripts:preview.document.scripts.length,escaped:preview.document.querySelector('td').textContent};
      close(); return result;
    })()`, true);
    assert.deepEqual(printResult, {printed:true,closed:true,scripts:0,escaped:'<script>attack</script>'});
    const { jsPDF } = require('jspdf');
    const pdf = new jsPDF(); pdf.text('Security review transcript fixture', 10, 10);
    await evaluate(`(()=>{
      const bytes = Uint8Array.from(atob(${JSON.stringify(Buffer.from(pdf.output('arraybuffer')).toString('base64'))}), c=>c.charCodeAt(0));
      window.__transcriptFixtureUrl = URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
      const object = document.createElement('object'); object.type='application/pdf'; object.data=window.__transcriptFixtureUrl; object.id='transcript-security-fixture'; document.body.append(object);
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await evaluate("document.getElementById('transcript-security-fixture').remove();URL.revokeObjectURL(window.__transcriptFixtureUrl)");
    assert.equal(securityViolations.filter(v => v.disposition === 'enforce').length, 0, JSON.stringify(securityViolations));
    await evaluate(`(()=>{
      const inline = document.createElement('script'); inline.textContent = 'window.__unapprovedInlineRan=true'; document.head.append(inline);
      const remote = document.createElement('script'); remote.src = 'https://unapproved.invalid/payload.js'; document.head.append(remote);
    })()`);
    await until("!window.__unapprovedInlineRan", 'unapproved inline script stays blocked');
    for (let i = 0; i < 50 && securityViolations.filter(v => v.disposition === 'enforce').length < 2; i++) await new Promise(r => setTimeout(r, 100));
    assert(securityViolations.some(v => v.disposition === 'enforce' && v.blocked === 'inline'));
    assert(securityViolations.some(v => v.disposition === 'enforce' && ['https://unapproved.invalid', 'https://unapproved.invalid/payload.js'].includes(v.blocked)));
    console.log('PASS CSP: normal flows have no enforced violations; print controls work; injected inline and unapproved remote scripts are blocked');
    const cacheAsset = '/assets/images/' + fs.readdirSync(path.join(root, 'dist/assets/images')).find(file => file.startsWith('school-logo-') && file.endsWith('.webp'));
    const cacheResult = await evaluate(`(async()=>{
      const url = new URL(${JSON.stringify(cacheAsset)}, location.origin).href;
      const first = await fetch(url, {cache:'reload'}); await first.arrayBuffer();
      const second = await fetch(url); await second.arrayBuffer();
      await new Promise(resolve=>setTimeout(resolve,100));
      const entries = performance.getEntriesByName(url).filter(entry=>entry.initiatorType==='fetch');
      return {policy:second.headers.get('cache-control'),transfers:entries.slice(-2).map(entry=>entry.transferSize),decodedBytes:entries.at(-1).decodedBodySize};
    })()`);
    assert.equal(cacheResult.policy, 'public, max-age=31536000, immutable');
    assert(cacheResult.transfers[0] > 0, 'Initial reload must transfer image bytes');
    assert.equal(cacheResult.transfers[1], 0, 'Repeat image fetch must use browser HTTP cache');
    assert(cacheResult.decodedBytes > 0);
    console.log('PASS browser HTTP cache: repeat hashed-image fetch transfers zero network bytes');
    assert.equal(errors.length, 0, JSON.stringify(errors));
    const output = process.env.LOADING_CHECK_OUTPUT;
    if (output) fs.writeFileSync(output, JSON.stringify({ mode: 'Local production preview, synthetic APIs, blocked external fonts and book iframe; not Lighthouse', checks, apiRequests, errors, securityViolations, printResult, cacheResult, accessibilityResults, navigationResults, functionalityResults }, null, 2));
    if (accessibility || functionality) assert.equal(accessibilityResults.reduce((count, result) => count + result.violations.length, 0), 0, 'Accessibility violations; see the audit output');
    console.log('PASS delayed/expired sessions, protected routes, registration settings/closed/error/retry, branch deduplication, and zero uncaught browser errors');
  } finally {
    socket?.close(); browser.kill(); server.kill();
    for (let i = 0; i < 20; i++) { try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
