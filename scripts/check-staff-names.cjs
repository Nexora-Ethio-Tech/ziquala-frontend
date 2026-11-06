const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const names = require('../src/data/staffNames.json');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/staffNames.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, { exports: exportsObject, require: () => names });
const { staffDisplayName, staffNameVariants, transliterateStaffName } = exportsObject;
for (const person of Object.values(names)) {
  assert(/[\u1200-\u137f]/.test(person.nameAm));
  assert(/^[A-Za-z .'-]+$/.test(person.nameEn));
  for (const language of ['en', 'om']) {
    assert.equal(staffDisplayName(person, language), person.nameEn);
    for (const title of [person.nameAm, ...person.aliases]) {
      assert.equal(staffDisplayName({ title }, language), person.nameEn, `Legacy name: ${title}`);
      assert(staffNameVariants({ title }).includes(person.nameAm));
    }
  }
  assert.equal(staffDisplayName(person, 'am-ET'), person.nameAm);
}
const flower = names['copy.myFlowerHasFallen'];
assert.equal(staffDisplayName({ title: flower.nameAm }, 'en'), 'Abebaye Kassahun Garedew');
assert.equal(staffDisplayName({ title: names['copy.fatherKenfemichaelWoldegiorgisTeklegiorgis'].nameAm }, 'en'), 'Aba Kenfemichael Woldegiorgis Teklegiorgis');
assert.equal(transliterateStaffName(flower.nameAm.split(' ')[0]), 'Abebaye');
assert.equal(staffDisplayName({ title: 'Home' }, 'am'), 'Home', 'Authored names must bypass interface dictionaries');
assert.equal(staffDisplayName({ title: flower.nameAm, nameEn: 'Abebaye K. Garedew' }, 'en'), 'Abebaye K. Garedew');
assert.equal(staffDisplayName({ title: 'Authored English Name' }, 'om'), 'Authored English Name');
console.log(`PASS: ${Object.keys(names).length} explicit proper names, legacy aliases, authored spellings, and phonetic fallback`);
