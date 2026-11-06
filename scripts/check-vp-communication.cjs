const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sectionId = '00000000-0000-4000-8000-000000000071';
const emptyId = '00000000-0000-4000-8000-000000000072';
exports.fixtureFor = (request, state) => {
  const url = new URL(request.url), pathname = url.pathname;
  let data;
  if (pathname.endsWith('/auth/me')) data = { id:'review-vp', name:'Review Vice Principal', role:'vice-principal', branch_id:'review-branch', status:'active' };
  else if (pathname.endsWith('/system-settings')) data = { grade_submission_open:'true', registration_open:'true' };
  else if (pathname.endsWith('/vice-principal/grade-management/sections')) data = [{id:'grade-7',name:'Grade 7',grade_name:'7',sections:[{id:sectionId,section_name:'A',student_count:2,capacity:30},{id:emptyId,section_name:'B',student_count:0,capacity:30}]}];
  else if (pathname.endsWith('/vice-principal/communication-logs/summary')) {
    const query = Object.fromEntries(url.searchParams);
    assert(/^[0-9a-f-]{36}$/.test(query.sectionId));
    assert(/^\d{4}-\d{2}-\d{2}$/.test(query.weekEnding), 'Send ISO dates, never the displayed Ethiopian label');
    state.requests.push(query);
    data = query.sectionId === emptyId ? {homeroomTeacher:'Not Assigned',totalStudents:0,sentCount:0,students:[]}
      : {homeroomTeacher:'Fixture Teacher',totalStudents:2,sentCount:1,students:[
        {id:'student-1',name:'Ada Fixture',parentName:'Parent Fixture',sent:true,sentAt:'2026-11-06T10:00:00Z'},
        {id:'student-2',name:'Bela Fixture',parentName:'N/A',sent:false,sentAt:null},
      ]};
  } else return;
  return {success:true,data};
};

exports.run = async ({send,evaluate,until,navigate,origin,state}) => {
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.clear();localStorage.setItem('ziquala_language','en');localStorage.setItem('ziquala_token','synthetic-vp-token');"});
  await send('Page.navigate',{url:origin+'/vp-communication'});
  await until("!!document.querySelector('#vp-grade-select')",'VP communication book opens');
  const select = async (selector,value) => evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});element.value=${JSON.stringify(value)};element.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await select('#vp-grade-select','7');
  await select('#vp-section-select',sectionId);
  await until("document.body.innerText.includes('Ada Fixture') && document.body.innerText.includes('Bela Fixture')",'communication roster loads');
  assert(!await evaluate("document.body.innerText.includes('An unexpected error occurred.')"));
  assert(state.requests.length > 0);
  const week = await evaluate("document.querySelector('#vp-week-select').options[1].value");
  const before = state.requests.length;
  await select('#vp-week-select',week);
  await until("document.body.innerText.includes('Ada Fixture')",'week-filtered roster');
  assert(state.requests.length > before); assert.equal(state.requests.at(-1).weekEnding,week);
  await select('#vp-section-select',emptyId);
  await until("document.body.innerText.includes('No students found in this section.')",'empty section handled');
  console.log('PASS: VP Communication Book loads, changes weeks using ISO values, and handles an empty roster');

  const switchLanguage = async language => {
    await select('header select',language);
    await until(`document.documentElement.lang===${JSON.stringify(language)}`,'language changes');
    await evaluate('document.fonts.ready');
  };
  fs.mkdirSync(path.join('verification','vp-communication'),{recursive:true});
  for (const width of [280,320,360]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
    for (const language of ['en','am','om']) {
      await switchLanguage(language);
      const header = await evaluate(`(()=>{const header=document.querySelector('header');return {width:header.scrollWidth,outside:[...header.querySelectorAll('button,select,h1')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5}).map(e=>e.outerHTML.slice(0,100))};})()`);
      assert(header.width <= width + 1, `Portal header overflows at ${width}px ${language}`);
      assert.deepEqual(header.outside,[], `Portal controls outside viewport at ${width}px ${language}`);
      await evaluate("document.querySelector('header button[aria-label]').click()");
      await until("document.querySelector('aside').getBoundingClientRect().left>=-1",'mobile sidebar opens');
      const brand = await evaluate(`(()=>{const aside=document.querySelector('aside'),group=aside.firstElementChild.firstElementChild,badge=group.firstElementChild,title=group.lastElementChild;const b=badge.getBoundingClientRect(),t=title.getBoundingClientRect(),close=aside.firstElementChild.querySelector('button').getBoundingClientRect();return {badgeRight:b.right,titleLeft:t.left,titleRight:t.right,closeLeft:close.left,asideRight:aside.getBoundingClientRect().right,whiteSpace:getComputedStyle(title.firstElementChild).whiteSpace};})()`);
      assert(brand.badgeRight + 4 <= brand.titleLeft, 'Logo must have space before the school title');
      assert(brand.titleRight <= brand.closeLeft + 1, 'School title must not overlap the close button');
      assert(brand.asideRight <= width + 1);
      assert.equal(brand.whiteSpace,'nowrap');
      if (width===320 && language==='en') {
        const shot=await send('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync(path.join('verification','vp-communication','sidebar-320.png'),Buffer.from(shot.data,'base64'));
      }
      await evaluate("document.querySelector('aside > div:first-child button').click()");
      await until("document.querySelector('aside').getBoundingClientRect().right<=1",'mobile sidebar closes');
    }
    console.log(`PASS: VP header and logo/title alignment at ${width}px in all three languages`);
  }
  await navigate('/school');
  await until("!!document.querySelector('#public-main-content') && !!document.querySelector('header a[href=\"/\"] img')",'public school header');
  for (const width of [280,320,360]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
    for (const language of ['en','am','om']) {
      await switchLanguage(language);
      const brand=await evaluate(`(()=>{const link=document.querySelector('header a[href="/"]'),img=link.querySelector('img'),title=link.querySelector('p'),i=img.getBoundingClientRect(),t=title.getBoundingClientRect();return {visible:!!title.getClientRects().length,imageRight:i.right,titleLeft:t.left,titleRight:t.right,whiteSpace:getComputedStyle(title).whiteSpace,headerWidth:document.querySelector('header').scrollWidth};})()`);
      assert(brand.headerWidth<=width+1);
      if (brand.visible) { assert(brand.imageRight+4<=brand.titleLeft);assert(brand.titleRight<=width+1);assert.equal(brand.whiteSpace,'nowrap'); }
    }
    console.log(`PASS: public school emblem/title do not overlap at ${width}px in all three languages`);
  }
};
