const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalogs = Object.fromEntries(['en', 'am', 'om'].map(lng => [lng, require(`../src/locales/public.${lng}.json`)]));
const normalize = value => value.replace(/\s+/g, ' ').trim();

module.exports = async ({ send, evaluate, until, navigate, origin }) => {
  await send('Emulation.setEmulatedMedia', { features: [{ name:'prefers-reduced-motion', value:'reduce' }] });
  await send('Page.navigate', { url: origin + '/school' });
  await until("!!document.querySelector('#school-staff') && !!document.querySelector('header select')", 'school ready');
  const switchLanguage = async language => {
    await evaluate(`(()=>{const select=document.querySelector('header select');select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until(`document.documentElement.lang===${JSON.stringify(language)}`, 'language changes');
    await evaluate('document.fonts.ready');
  };
  for (const language of ['om', 'am', 'en', 'om']) {
    await switchLanguage(language);
    const expected = catalogs[language].school.abbotMessage;
    await until(`!![...document.querySelectorAll('main h2')].find(h=>h.textContent.trim()===${JSON.stringify(expected.title)})`, 'requested monastery-head title');
    const body = await evaluate('document.querySelector("main").textContent');
    assert(normalize(body).includes(normalize(expected.body)), 'Abbot message body must follow the selected language');
  }
  console.log('PASS: exact English, Amharic, and Afaan Oromoo monastery-head titles and message bodies');
  const school = catalogs.om.school, copy = catalogs.om.copy;
  const schoolLabels = [school.vision.eyebrow, school.mission.eyebrow, school.values.eyebrow,
    school.socialResponsibility.eyebrow, catalogs.om.monastery.celebrations.eyebrow,
    copy.communityActivitiesAndEvents, copy.activities, copy.studentVoice, copy.uniformStory];
  const text = normalize(await evaluate('document.querySelector("main").textContent'));
  for (const label of schoolLabels) assert(text.includes(label), `School Afaan Oromoo label missing: ${label}`);
  console.log('PASS: requested school and community headings render in Afaan Oromoo');

  const monastery = catalogs.om.monastery;
  const expectedTitles = [monastery.overview.title, monastery.spiritualLife.title, monastery.development.title,
    monastery.development.oil.title, monastery.development.school.title, monastery.development.mill.title,
    monastery.development.crafts.title, monastery.development.farming.title, monastery.legacy.title,
    copy.theHistoryOfDebreKewakibtAbuneGebreMenfesKidusCommunalMonastery, copy.monasteryHistoryFilm,
    copy.theMonasteryMuseum_132, monastery.museum.manuscripts, monastery.museum.vessels,
    copy.incomeGeneratingProjects, copy.livelihoodProjects, copy.monasteryMedia, copy.archivePreview,
    copy.helpPreserveALivingSpiritualHeritage, copy.cBEDonationAccount];
  for (const width of [390, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height:900, deviceScaleFactor:1, mobile:width < 768 });
    await navigate('/monastery');
    await until("location.pathname==='/monastery' && !!document.querySelector('#monastery-contact')", 'monastery ready');
    assert.equal(await evaluate('document.documentElement.lang'), 'om');
    const content = normalize(await evaluate('document.querySelector("main").textContent'));
    for (const title of expectedTitles) assert(content.includes(normalize(title)), `Monastery Afaan Oromoo heading missing: ${title}`);
    for (const paragraph of [monastery.overview.body, monastery.spiritualLife.body, monastery.legacy.body]) assert(content.includes(normalize(paragraph)), 'Monastery body must be translated');
    assert(!/[\u1200-\u137f]/.test(content), 'Amharic content leaked into the Oromo monastery page');
    for (const oldHeading of ['Spiritual Life of the Monastery', 'Key Development Initiatives', 'Ecclesiastical Museum', 'Historical Documentary', 'CBE donation account']) assert(!content.includes(oldHeading), `English heading remained: ${oldHeading}`);
    assert(content.includes('1000011282222'), 'Donation account number must stay unchanged');
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector("main").scrollWidth <= innerWidth + 1'), `Translated page overflow at ${width}px`);
    const labels = await evaluate("[...document.querySelectorAll('main button[aria-label]')].map(button=>button.getAttribute('aria-label'))");
    assert(labels.includes(copy.playMonasteryBackgroundVideo) || labels.includes(copy.pauseMonasteryBackgroundVideo));
    assert(labels.includes(copy.enableMonasteryVideoSound));
    console.log(`PASS: Afaan Oromoo monastery headings, bodies, controls, preserved account number, and layout at ${width}px`);
    await navigate('/school');
    await until("location.pathname==='/school' && !!document.querySelector('#school-staff')", 'return to school');
    assert.equal(await evaluate('document.documentElement.lang'), 'om');
  }
  const directory = path.join('verification', 'oromo-content');
  fs.mkdirSync(directory, { recursive:true });
  await evaluate(`(()=>{const heading=[...document.querySelectorAll('main h2')].find(h=>h.textContent.trim()===${JSON.stringify(school.abbotMessage.title)});heading.scrollIntoView({block:'center'});})()`);
  await new Promise(resolve => setTimeout(resolve, 700));
  const shot = await send('Page.captureScreenshot', { format:'png' });
  fs.writeFileSync(path.join(directory, 'monastery-head-message.png'), Buffer.from(shot.data, 'base64'));
};
