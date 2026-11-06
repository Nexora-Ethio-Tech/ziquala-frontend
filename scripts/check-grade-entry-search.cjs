const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const students = [
  { id:'student-search-1', firstName:'Abebe', lastName:'Kebede', digitalId:'STU-001' },
  { id:'student-search-2', name:'Sara Bekele', firstName:'', lastName:'', digitalId:'STU-002' },
  { id:'internal-student-3', firstName:'ሐና', lastName:'ከበደ', digital_id:'ZI-003' },
];
const classes = [1, 2].map(number => ({ id:`class-search-${number}`, class_id:`class-search-${number}`, course_id:`course-search-${number}`, name:'Grade 7', gradeLevel:'7', section:number === 1 ? 'A' : 'B', subject:'Mathematics', enrolledStudents:number === 1 ? 3 : 0, branch_id:'review-branch' }));

exports.fixtureFor = (request, state) => {
  const pathname = new URL(request.url).pathname;
  let data;
  if (pathname.endsWith('/auth/me')) data = { id:'review-teacher', name:'Review Teacher', role:'teacher', status:'active', branch_id:'review-branch' };
  else if (pathname.endsWith('/system-settings')) data = { grades_locked:'false', grade_submission_open:'true', registration_open:'true' };
  else if (pathname.endsWith('/teacher/classes')) data = classes;
  else if (pathname.endsWith('/teacher/students/class-search-1')) data = students;
  else if (pathname.endsWith('/teacher/students/class-search-2')) data = [];
  else if (pathname.includes('/grading-configs/')) data = [{ id:'continuous', label:'Continuous Assessment', maxWeight:40 }, { id:'final', label:'Final Exam', maxWeight:60 }];
  else if (pathname.endsWith('/teacher/grades/course-search-1')) data = [{ student_id:students[0].id, type:'continuous', score:12 }, { student_id:students[1].id, type:'continuous', score:18 }];
  else if (pathname.endsWith('/teacher/grades/bulk') && request.method === 'POST') { state.saved.push(JSON.parse(request.postData)); data = []; }
  else return;
  return { success:true, data };
};

exports.run = async ({ send, evaluate, until, navigate, origin, state, apiRequests }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', { source:"localStorage.clear();localStorage.setItem('ziquala_language','en');localStorage.setItem('ziquala_token','synthetic-grade-search-token');" });
  await send('Page.navigate', { url:origin + '/grades?classId=class-search-1&courseId=course-search-1&subject=Mathematics' });
  await until("!!document.querySelector('#grade-entry-student-search') && document.querySelectorAll('#grade-entry-student-rows input[type=number]').length===6", 'teacher grade entry ready');
  const input = async (selector, value) => evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const rowNames = () => evaluate("[...document.querySelectorAll('#grade-entry-student-rows tr')].filter(row=>row.querySelector('input[type=number]')).map(row=>row.cells[0].innerText)");
  const search = async (value, expected) => {
    await input('#grade-entry-student-search', value);
    await until(`document.querySelectorAll('#grade-entry-student-rows input[type=number]').length===${expected.length * 2}`, 'search results');
    assert.deepEqual(await rowNames(), expected);
  };
  const rosterRequests = apiRequests.filter(url=>url.includes('/teacher/students/')).length;
  assert(await evaluate("document.querySelector('#grade-entry-student-search').getBoundingClientRect().top < document.querySelector('#grade-entry-student-rows').closest('table').getBoundingClientRect().top"), 'Search must sit above the table');
  for (const [value, names] of [
    ['aBeBe', ['Abebe Kebede']], ['kebede', ['Abebe Kebede']], ['  Abebe   Kebede  ', ['Abebe Kebede']],
    ['stu-002', ['Sara Bekele']], ['Sara', ['Sara Bekele']], ['zi-003', ['ሐና ከበደ']],
    ['internal-student-3', ['ሐና ከበደ']], ['ሐና', ['ሐና ከበደ']], ['not-a-student', []],
  ]) await search(value, names);
  assert(await evaluate("document.querySelector('#grade-entry-student-rows').innerText.includes('No students match your search.')"));
  await search('  ', ['Abebe Kebede', 'Sara Bekele', 'ሐና ከበደ']);
  assert.equal(apiRequests.filter(url=>url.includes('/teacher/students/')).length, rosterRequests, 'Typing must not refetch the roster');
  console.log('PASS: immediate partial/case-insensitive name and ID search, Amharic, alternate API fields, whitespace, no-match state, and clearing');

  await search('Abebe', ['Abebe Kebede']);
  await input('#grade-entry-student-rows input[type=number]', '30');
  await search('Sara', ['Sara Bekele']);
  await input('#grade-entry-student-rows input[type=number]', '99');
  await search('Abebe', ['Abebe Kebede']);
  assert.equal(await evaluate("document.querySelector('#grade-entry-student-rows input[type=number]').value"), '30');
  const save = () => evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Save Grades').click()");
  await save();
  await until("document.body.innerText.includes('Cannot save:')", 'hidden invalid score still validates');
  assert.equal(state.saved.length, 0);
  await search('Sara', ['Sara Bekele']);
  assert.equal(await evaluate("document.querySelector('#grade-entry-student-rows input[type=number]').value"), '99');
  await input('#grade-entry-student-rows input[type=number]', '22');
  await search('Abebe', ['Abebe Kebede']);
  await save();
  for (let n = 0; n < 100 && state.saved.length === 0; n++) await new Promise(resolve=>setTimeout(resolve, 50));
  assert.equal(state.saved.length, 1, 'Save request captured by the synthetic API');
  assert.deepEqual(state.saved[0].grades.map(grade=>({id:grade.studentId,score:grade.score})).sort((a,b)=>a.id.localeCompare(b.id)), [{id:'student-search-1',score:30},{id:'student-search-2',score:22}]);
  await search('', ['Abebe Kebede', 'Sara Bekele', 'ሐና ከበደ']);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('#grade-entry-student-rows tr')].map(row=>row.querySelector('input[type=number]').value)"), ['30','22','']);
  console.log('PASS: unsaved grades survive filtering; hidden invalid scores block saving; valid hidden grades are saved with the visible row');

  await send('Emulation.setDeviceMetricsOverride', { width:390, height:900, deviceScaleFactor:1, mobile:true });
  await search('Sara', ['Sara Bekele']);
  for (const language of ['am', 'om', 'en']) {
    const labels = require(`../src/locales/${language}.json`).gradeEntry;
    await evaluate(`(()=>{const select=document.querySelector('header select');select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await until(`document.querySelector('#grade-entry-student-search')?.placeholder===${JSON.stringify(labels.searchPlaceholder)}`, 'localized student search');
    assert.equal(await evaluate("document.querySelector('#grade-entry-student-search').value"), 'Sara');
    assert.deepEqual(await rowNames(), ['Sara Bekele']);
  }
  assert(await evaluate("(()=>{const r=document.querySelector('#grade-entry-student-search').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1;})()"), 'Mobile search fits the viewport');
  fs.mkdirSync(path.join('verification','grade-entry-search'), {recursive:true});
  const screenshot = await send('Page.captureScreenshot', {format:'png'});
  fs.writeFileSync(path.join('verification','grade-entry-search','teacher-search.png'), Buffer.from(screenshot.data,'base64'));
  await navigate('/grades?classId=class-search-2&courseId=course-search-2&subject=Mathematics');
  await until("!!document.querySelector('#grade-entry-student-search') && document.querySelector('#grade-entry-student-rows').innerText.includes('No students enrolled in this class.')", 'second empty class ready');
  assert.equal(await evaluate("document.querySelector('#grade-entry-student-search').value"), '');
  console.log('PASS: mobile search layout, query reset on class change, and original empty-class message');
};
