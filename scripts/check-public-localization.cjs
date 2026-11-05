const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createInstance } = require('i18next');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const flatten = (value, prefix = '') => Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
  const name = prefix ? `${prefix}.${key}` : key;
  return typeof entry === 'string' ? [[name, entry]] : Object.entries(flatten(entry, name));
}));
const catalogs = Object.fromEntries(['en', 'am', 'om'].map(lng => [lng, json(`src/locales/public.${lng}.json`)]));
const flat = Object.fromEntries(Object.entries(catalogs).map(([lng, entries]) => [lng, flatten(entries)]));
const placeholders = value => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
for (const lng of ['am', 'om']) {
  assert.deepEqual(Object.keys(flat[lng]).sort(), Object.keys(flat.en).sort(), `${lng} key coverage`);
  for (const [key, english] of Object.entries(flat.en)) {
    assert(flat[lng][key].trim(), `${lng} empty value: ${key}`);
    assert.deepEqual(placeholders(flat[lng][key]), placeholders(english), `${lng} interpolation: ${key}`);
  }
}
for (const [key, text] of Object.entries(flat.en)) {
  if (key !== 'language.amharic') assert(!/[\u1200-\u137f]/.test(text), `Amharic in English: ${key}`);
}
for (const [key, text] of Object.entries(flat.am)) {
  if (!key.startsWith('language.')) assert(!/[A-Za-z]{3,}/.test(text.replace(/\{\{.*?\}\}/g, '')), `English in Amharic: ${key}`);
}
const sources = json('src/locales/public.sources.json');
for (const [source, key] of Object.entries(sources)) assert(flat.en[key], `Unresolved source alias: ${source}`);

const publicFiles = [
  'src/pages/LandingPage.tsx', 'src/pages/ELearningPage.tsx', 'src/components/BookReader.tsx',
  'src/components/LanguageSelector.tsx', 'src/components/OfficialSchoolPurpose.tsx',
  'src/components/Chatbot.tsx',
  'src/data/ziqualaContent.ts', 'src/pages/LandingPage/context/LanguageContext.tsx',
];
for (const file of publicFiles) {
  const source = read(file);
  assert(!/[\u1200-\u137f]/.test(source), `Hardcoded Ethiopic in ${file}`);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function checkPresentation(node) {
    if (ts.isStringLiteralLike(node) && /[A-Za-z\u1200-\u137f]/.test(node.text)) {
      assert(/^(?:copy|school|monastery|library|footer|chat)\./.test(node.text.trim()), `Hardcoded presentation text in ${file}: ${node.text}`);
    } else if (ts.isConditionalExpression(node)) {
      checkPresentation(node.whenTrue);
      checkPresentation(node.whenFalse);
    } else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) {
      checkPresentation(node.right);
    }
  }
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'uiText' && node.arguments[0]) checkPresentation(node.arguments[0]);
    if (ts.isStringLiteralLike(node) && /^(?:copy|school|monastery|library|footer)\./.test(node.text.trim())) {
      const key = node.text.trim();
      assert(flat.en[key] || flat.en[key + '_other'] || Object.keys(flat.en).some(child => child.startsWith(key + '.')), `Missing public key in ${file}: ${key}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}

const transpile = file => ts.transpileModule(read(file), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const languageModule = {};
vm.runInNewContext(transpile('src/locales/languages.ts'), { exports: languageModule });
const { normalizeLanguage } = languageModule;
assert.equal(normalizeLanguage('am-ET'), 'am');
assert.equal(normalizeLanguage('or'), 'om');
assert.equal(normalizeLanguage('unexpected'), 'en');

async function checkState(saved) {
  const engine = createInstance();
  const storage = new Map(Object.entries(saved));
  const events = {};
  const document = { title: '', documentElement: { lang: '', dataset: {} }, body: { dataset: {} } };
  const exports = {};
  vm.runInNewContext(transpile('src/i18n.ts'), {
    exports, document,
    window: { addEventListener: (name, callback) => { events[name] = callback; } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    require: id => {
      if (id === 'i18next') return engine;
      if (id === 'react-i18next') return { initReactI18next: { type: '3rdParty', init() {} } };
      if (id === './locales/languages') return languageModule;
      return json('src/' + id.replace(/^\.\//, ''));
    },
  });
  assert.equal(document.documentElement.lang, engine.resolvedLanguage);
  assert.equal(storage.get('ziquala_language'), engine.resolvedLanguage);
  for (const lng of ['am', 'en', 'am', 'en']) {
    await engine.changeLanguage(lng);
    assert.equal(document.documentElement.lang, lng);
    assert.equal(document.body.dataset.lang, lng);
    assert.equal(storage.get('ziquala_language'), lng);
    assert.equal(storage.get('ziquala_lang'), lng);
    const purpose = engine.t('school.purpose.name', { ns: 'public' });
    assert.equal(/[\u1200-\u137f]/.test(purpose), lng === 'am');
  }
  events.storage({ key: 'ziquala_language', newValue: 'am' });
  assert.equal(engine.resolvedLanguage, 'am');

  const old = {};
  vm.runInNewContext(transpile('src/localization.ts'), {
    exports: old,
    require: id => id === './i18n' ? engine : id === './locales/languages' ? languageModule : json('src/locales/' + path.basename(id)),
  });
  const translated = {};
  vm.runInNewContext(transpile('src/publicLocalization.ts'), {
    exports: translated,
    require: id => id === './i18n' ? engine : id === './localization' ? old : json('src/' + id.replace(/^\.\//, '')),
  });
  const { publicText, publicVariants } = translated;
  assert.equal(publicText('monastery.development.oil.title'), 'የዘይት ፋብሪካ');
  assert.equal(publicText('library.resultCount', { count: 2 }), '2 መጻሕፍት ተገኝተዋል');
  assert.equal(publicText('Grade 7'), '7ኛ ክፍል');
  assert.equal(publicText('staff-authored-123'), 'staff-authored-123');
  assert(publicVariants('school.purpose.name').includes('Ziquala Abo Monastery Primary School'));
  await engine.changeLanguage('en');
  assert.equal(publicText('monastery.overview.title'), 'Ziquala Debre Kewakibt Communal Monastery');
  assert.equal(publicText('monastery.spiritualLife.title'), 'A Center of Traditional Learning, Prayer, and Stewardship');
  assert.equal(publicText('monastery.development.oil.title'), 'Edible Oil Processing Plant');
  assert.equal(publicText('library.resultCount', { count: 1 }), '1 book found');
  assert.equal(publicText('library.resultCount', { count: 2 }), '2 books found');
}

(async () => {
  await checkState({ ziquala_language: 'en', ziquala_lang: 'am' });
  await checkState({ ziquala_lang: 'am' });
  await checkState({ ziquala_language: 'invalid' });
  console.log(`Public localization passed: ${Object.keys(flat.en).length} keys, script coverage, live state changes, storage synchronization, pluralization, and contextual content.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
