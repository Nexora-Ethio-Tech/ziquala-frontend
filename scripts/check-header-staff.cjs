const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const names = require('../src/data/staffNames.json');

module.exports = async ({ send, evaluate, until, navigate, key, origin }) => {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: origin + '/school' });
  await until("!!document.querySelector('#school-staff') && !!document.querySelector('header select')", 'school ready');
  const switchLanguage = async language => {
    await evaluate(`(()=>{const select=document.querySelector('header select');select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until(`document.documentElement.lang===${JSON.stringify(language)}`, 'selected language');
    await evaluate('document.fonts.ready');
  };
  const directory = path.join('verification', 'header-staff');
  fs.mkdirSync(directory, { recursive: true });
  for (const width of [280, 320, 360, 390, 640, 767, 768, 1024, 1280, 1600]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    for (const language of ['en', 'am', 'om']) {
      await switchLanguage(language);
      const layout = await evaluate(`(()=>{
        const header=document.querySelector('header');
        const outside=[...header.querySelectorAll('a,button,select,img')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5}).map(e=>e.outerHTML.slice(0,150));
        return {width:innerWidth,scroll:document.documentElement.scrollWidth,header:header.scrollWidth,outside};
      })()`);
      assert(layout.scroll <= width + 1 && layout.header <= width + 1, `Overflow at ${width}px ${language}: ${JSON.stringify(layout)}`);
      assert.deepEqual(layout.outside, [], `Header control outside ${width}px ${language}`);
      if (width < 768) {
        await evaluate("document.querySelector('header button[aria-controls=public-navigation-menu]').click()");
        await until("!!document.querySelector('#public-navigation-menu')", 'mobile menu opens');
        await until("Math.abs(document.querySelector('#public-navigation-menu').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom)<2", 'mobile menu animation settles below header');
        const gap = await evaluate("document.querySelector('#public-navigation-menu').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom");
        assert(Math.abs(gap) < 2, 'Mobile menu must follow the current wrapped header height');
        await key('Escape');
        await until("!document.querySelector('#public-navigation-menu')", 'mobile menu closes');
      }
    }
    console.log(`PASS: header controls contained at ${width}px in English, Amharic, and Afaan Oromoo`);
    if (width === 320) {
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(directory, 'header-320.png'), Buffer.from(screenshot.data, 'base64'));
    }
  }
  await switchLanguage('en');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate("document.querySelectorAll('header nav > div > button').length"), 0, 'Desktop caret buttons removed');
  assert(await evaluate("[...document.querySelectorAll('header nav > div > a')].every(a=>!/[⌄▾▼˅]/.test(a.textContent)&&!a.querySelector('svg'))"));
  await evaluate("document.querySelector('header nav > div > a').focus()");
  await key('ArrowDown');
  await until("!!document.activeElement.closest('[data-public-submenu]')", 'keyboard opens submenu');
  await key('Escape');
  await until("document.querySelector('header nav > div > a').getAttribute('aria-expanded')==='false'", 'Escape closes submenu');
  if (await evaluate("matchMedia('(hover: hover) and (pointer: fine)').matches")) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 850 });
    const point = await evaluate("(()=>{const r=document.querySelector('header nav > div > a').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await until("document.querySelector('header nav > div > a').getAttribute('aria-expanded')==='true'", 'hover opens submenu');
  }
  console.log('PASS: desktop labels have no caret symbols; keyboard and hover dropdowns work');

  await key('Escape');
  await evaluate("document.querySelector('#school-staff').scrollIntoView()");
  await until("document.querySelector('#staff-tabpanel')?.innerText.includes('Fixture')", 'live staff fixture loaded');
  const known = new Set(Object.values(names).flatMap(person => [person.nameAm, person.nameEn]));
  for (const language of ['en', 'am', 'om', 'en']) {
    await switchLanguage(language);
    for (const group of ['office', 'primary', 'kindergarten']) {
      await evaluate(`document.querySelector('#staff-tab-${group}').click()`);
      const displayed = await evaluate("[...document.querySelectorAll('#staff-tabpanel h3')].map(e=>({name:e.innerText,translate:e.getAttribute('translate')}))");
      assert(displayed.length > 0);
      for (const person of displayed) {
        assert.equal(person.translate, 'no');
        assert(known.has(person.name) || ['Abebaye', 'Abebaye Tesfaye', names['copy.myFlowerHasFallen'].nameAm.split(' ')[0]].includes(person.name), `Unexpected proper name: ${person.name}`);
        if (language !== 'am') assert(!/[\u1200-\u137f]/.test(person.name), `English phonetic spelling missing: ${person.name}`);
      }
      if (group === 'kindergarten' && language === 'en') {
        assert(displayed.some(p => p.name === 'Abebaye Kassahun Garedew'));
        assert(displayed.some(p => p.name === 'Abebaye'));
        assert(displayed.some(p => p.name === 'Abebaye Tesfaye'));
        assert.equal(displayed.filter(p => p.name === 'Abebaye Kassahun Garedew').length, 1, 'Live override must not duplicate the fallback');
      }
    }
  }
  console.log('PASS: all staff tabs use phonetic English names; live records, explicit spellings, aliases, and Amharic switching work');
};
