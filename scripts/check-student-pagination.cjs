const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
let token = 'session-one';
let now = 0;
const calls = [];
const api = { get: async (url, { params }) => {
  calls.push(params);
  const total = 205;
  const start = (params.page - 1) * params.pageSize;
  return { data: { data: Array.from({ length: Math.min(params.pageSize, Math.max(0, total - start)) }, (_, i) => ({ student_id: `student-${start + i}` })), pagination: { total, page: params.page, pageSize: params.pageSize, graduationYears: [] } } };
} };
function load(relative) {
  const file = path.resolve(root, relative);
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date: { now: () => now }, localStorage: { getItem: () => token }, require: id => id === './api' ? { __esModule: true, default: api } : load(path.join(path.dirname(file), id + '.ts')) });
  return exports;
}
(async () => {
  const service = load('src/services/studentService.ts').default;
  const cache = load('src/services/listCache.ts');
  const filters = { search: 'Abel', grade: '1', section: '1', status: 'ALL' };
  const a = service.getStudentsPage(filters, 1, 50);
  const b = service.getStudentsPage(filters, 1, 50);
  assert.equal(a, b, 'concurrent requests must share a promise');
  await a;
  await service.getStudentsPage(filters, 1, 50);
  assert.equal(calls.length, 1, 'repeat visits use cached pages');
  await service.getStudentsPage(filters, 2, 50);
  assert.equal(calls.length, 2, 'page keys remain separate');
  token = 'session-two';
  await service.getStudentsPage(filters, 1, 50);
  assert.equal(calls.length, 3, 'sessions never share pages');
  now += 119_999;
  await service.getStudentsPage(filters, 1, 50);
  assert.equal(calls.length, 3, 'pages remain cached for two minutes');
  now += 2;
  await service.getStudentsPage(filters, 1, 50);
  assert.equal(calls.length, 4, 'expired pages reload');
  cache.clearListCache();
  await service.getStudentsPage(filters, 1, 50);
  assert.equal(calls.length, 5, 'changes invalidate cached pages');
  let attempts = 0;
  await assert.rejects(cache.cachedList('failure', async () => { attempts++; throw new Error('offline'); }));
  assert.equal(await cache.cachedList('failure', async () => { attempts++; return 'recovered'; }), 'recovered');
  assert.equal(attempts, 2, 'failed requests can retry');
  calls.length = 0;
  const ids = await service.getMatchingStudentIds(filters);
  assert.equal(ids.length, 205);
  assert.equal(new Set(ids).size, 205);
  assert.equal(ids[204], 'student-204');
  assert.equal(calls.length, 3, 'exports traverse every matching page');
  for (const params of calls) {
    assert.equal(params.search, 'Abel');
    assert.equal(params.grade, '1');
    assert.equal(params.section, '1');
    assert.equal(params.status, 'ALL');
    assert.equal(params.idsOnly, true);
  }
  console.log('PASS: page caching, request deduplication, session isolation, expiry, invalidation, retry, and full filtered exports');
})().catch(error => { console.error(error); process.exitCode = 1; });
