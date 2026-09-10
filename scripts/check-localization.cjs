const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const json = file => JSON.parse(fs.readFileSync(path.join(root, 'src/locales', file), 'utf8'));
const catalogs = { en: json('en.json'), am: json('am.json'), om: json('om.json') };
const copy = { en: json('copy.en.json'), am: json('copy.am.json'), om: json('copy.om.json') };
function flatten(object, prefix = '') {
  return Object.fromEntries(Object.entries(object).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [[fullKey, value]] : Object.entries(flatten(value, fullKey));
  }));
}
const placeholders = text => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort();
const english = flatten(catalogs.en);
for (const language of ['am', 'om']) {
  const translated = flatten(catalogs[language]);
  for (const [key, value] of Object.entries(english)) {
    assert(translated[key], `${language}: missing ${key}`);
    assert.deepEqual(placeholders(translated[key]), placeholders(value), `${language}: placeholders ${key}`);
  }
}
assert.deepEqual(Object.keys(copy.am).sort(), Object.keys(copy.om).sort(), 'Copy catalog key parity');
for (const [key, value] of Object.entries(copy.am)) {
  assert(value.trim() && copy.om[key].trim(), `Empty copy: ${key}`);
  for (const language of ['am', 'om']) assert.deepEqual(placeholders(copy[language][key]), placeholders(key), `${language}: ${key}`);
}
// Exercise the real presentation helper with a controllable language, without a DOM or network.
const i18n = { language: 'en' };
const source = fs.readFileSync(path.join(root, 'src/localization.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject, require: id => id === './i18n' ? i18n : json(path.basename(id)), DOMParser: undefined });
const { uiText, uiError, normalizeLanguage, localeTag } = exportsObject;
assert.equal(normalizeLanguage('or'), 'om');
assert.equal(normalizeLanguage('am-ET'), 'am');
assert.equal(normalizeLanguage('unknown'), 'en');
for (const language of ['en', 'am', 'om']) {
  i18n.language = language;
  assert.equal(uiText(42), 42);
  const object = { name: 'Review Person', role: 'teacher' };
  assert.equal(uiText(object), object);
  assert.equal(uiText('Review Person'), 'Review Person');
  assert.equal(uiText('abc-123@example.com'), 'abc-123@example.com');
  assert.equal(uiText(''), '');
  assert.equal(uiError(''), '');
  assert.equal(localeTag(), `${language}-ET`);
  const result = uiText('Grade {{value0}}', { value0: 9 });
  assert(result.includes('9') && !result.includes('{{'), `Interpolation: ${language}`);
  if (language !== 'en') {
    assert.notEqual(uiText('Select language'), 'Select language');
    assert.notEqual(uiText('branches'), 'branches');
    assert.notEqual(uiText('Loading page...'), 'Loading page...');
    assert.notEqual(uiError('Unexpected internal server detail'), 'Unexpected internal server detail');
  }
}
i18n.language = 'am';
const savedMessage = uiText('Grade {{value0}}', { value0: 9 });
i18n.language = 'om';
assert.equal(uiText(savedMessage), uiText('Grade {{value0}}', { value0: 9 }), 'Messages update when language changes');

// Supplied library labels translate, but staff edits remain authored content.
const bookModule = {};
const bookCode = ts.transpileModule(fs.readFileSync(path.join(root, 'src/utils/localizeBook.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const defaultBook = { id: 'demo-book', title: 'Home', description: 'School' };
vm.runInNewContext(bookCode, { exports: bookModule, require: id => id.endsWith('localization') ? exportsObject : { defaultELearningBooks: [defaultBook] } });
i18n.language = 'am';
assert.notEqual(bookModule.bookText(defaultBook, 'title'), 'Home');
assert.equal(bookModule.bookText({ ...defaultBook, title: 'Student' }, 'title'), 'Student');
assert.equal(bookModule.bookText({ ...defaultBook, id: 'staff-created' }, 'title'), 'Home');

// Follow actual imports from main.tsx. Historical and unused page backups are outside the app.
const seen = new Set();
const literalCopy = new Set();
function visitFile(file) {
  if (seen.has(file)) return;
  seen.add(file);
  if (!/\.tsx?$/.test(file)) return;
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text;
    if (specifier?.startsWith('.')) {
      const base = path.resolve(path.dirname(file), specifier);
      const resolved = [base, base + '.tsx', base + '.ts', base + '/index.tsx', base + '/index.ts'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      if (resolved) visitFile(resolved);
    }
    if (ts.isPropertyAssignment(node) && ['label', 'placeholder', 'emptyMessage', 'buttonText', 'eyebrow', 'subtitle'].includes(node.name.getText(source)) && ts.isStringLiteral(node.initializer)) {
      const text = node.initializer.text.trim().replace(/\s+/g, ' ');
      if (/[A-Za-z\u1200-\u137f]/.test(text)) literalCopy.add(text);
    }
    if (ts.isJsxAttribute(node) && ['title', 'placeholder', 'alt', 'aria-label', 'label', 'description'].includes(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer) && /[A-Za-z\u1200-\u137f]/.test(node.initializer.text)) assert.fail(`Unlocalized attribute in ${path.relative(root, file)}: ${node.initializer.text}`);
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'uiText' && node.arguments[0] && /(?:target|currentTarget)\.value$/.test(node.arguments[0].getText(source))) assert.fail('User input must not be translated before storing it');
    if (ts.isJsxText(node) && /[A-Za-z\u1200-\u137f]/.test(node.text) && !file.endsWith('LanguageSelector.tsx')) {
      assert.fail(`Unlocalized JSX in ${path.relative(root, file)}: ${node.text.trim()}`);
    }
    if (ts.isCallExpression(node) && ['uiText', 'uiError'].includes(node.expression.getText(source)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      const text = node.arguments[0].text.trim().replace(/\s+/g, ' ');
      if (/[A-Za-z\u1200-\u137f]/.test(text) && !/^https?:|^\/|^[^\s]+@/.test(text)) literalCopy.add(text);
    }
    if (ts.isCallExpression(node) && /^(t|i18n\.t)$/.test(node.expression.getText(source)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) assert(english[node.arguments[0].text], `Missing i18n key: ${node.arguments[0].text}`);
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'option') assert(node.openingElement.attributes.properties.some(a => a.name?.getText(source) === 'value'), `Option needs a stable value: ${path.relative(root, file)}`);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
visitFile(path.join(root, 'src/main.tsx'));
const knownCopy = new Set([...Object.keys(copy.am), ...Object.values(english)].map(text => text.trim().toLowerCase()));
for (const text of literalCopy) assert(knownCopy.has(text.toLowerCase()), `Missing translated UI copy: ${text}`);
console.log(`Localization checks passed: ${Object.keys(english).length} keyed messages, ${Object.keys(copy.am).length} copy entries, ${literalCopy.size} literal labels, ${seen.size} reachable files.`);
