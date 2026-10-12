const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'student-record-pdf-check-'));
const language = { language: 'en' };
const modules = new Map();
let failFont = true;
let fetches = 0;

function load(relative) {
  const file = path.resolve(root, relative);
  if (modules.has(file)) return modules.get(file);
  const result = {};
  modules.set(file, result);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports: result, TextEncoder, Uint8Array, Uint32Array, URL, Intl, Date, Blob,
    fetch: async url => {
      fetches += 1;
      if (failFont) return new Response('', { status: 503 });
      return new Response(fs.readFileSync(url));
    },
    require: id => {
      if (id === 'jspdf') return require(path.join(root, 'node_modules/jspdf'));
      const target = path.resolve(path.dirname(file), id);
      if (id.endsWith('?url')) return target.slice(0, -4);
      if (target === path.join(root, 'src/i18n')) return language;
      if (id.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
      return load(target + '.ts');
    },
  }, { filename: file });
  return result;
}

async function main() {
  const { buildStudentRecordPdf } = load('src/utils/studentRecordPdf.ts');
  const { buildStudentRecordExportSheet } = load('src/utils/studentRecordExport.ts');
  const { uiText } = load('src/localization.ts');
  const noteLines = Array.from({ length: 180 }, (_, index) =>
    `NOTE-${String(index).padStart(3, '0')} English Afaan Oromoo የተማሪ መረጃ ${index === 179 ? 'FINAL-NOTE' : 'complete'}`);
  const record = {
    student: {
      student_id: 'student-pdf-001', name: 'Sample Student ሙሉ ስም', digital_id: 'ST-PDF-001',
      grade: '7', section_name: 'Grade 7', section_label: '1', status: 'Active',
    },
    application: {
      name: 'Sample Student ሙሉ ስም', gender: 'Female', digital_id: 'ST-PDF-001',
      father_name: 'Abbaa አባት', father_phone: '0912345678',
      mother_name: 'Haadha እናት', address: 'Adama አዳማ\nHouse 4 & 5 <Main Street>',
      exam_notes: noteLines.join('\n'), previous_school: 'SCHOOL-' + 'A'.repeat(350),
      allergies: '<script>alert("text only")</script>', medications: '=SUM(1,2)',
      payment_amount: 0, payment_reference: 'PAY-FINAL-001',
    },
    documents: [{ id: 'doc-001', file_name: 'Grade 6 ሪፖርት.pdf', has_file: true }],
    hasApplication: true,
  };
  await assert.rejects(buildStudentRecordPdf(buildStudentRecordExportSheet(record)), /Unable to load/);
  failFont = false;
  const failedFetches = fetches;
  for (const locale of ['en', 'am', 'om']) {
    language.language = locale;
    const sheet = buildStudentRecordExportSheet(record);
    const blob = await buildStudentRecordPdf(sheet);
    assert.equal(blob.type, 'application/pdf');
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    const filename = path.join(outputDir, `student-record-${locale}.pdf`);
    fs.writeFileSync(filename, bytes);
    // Poppler independently verifies embedded Unicode text and every page boundary.
    const extracted = execFileSync('pdftotext', ['-layout', filename, '-'], { encoding: 'utf8' });
    const normalized = extracted.replace(/\s+/gu, ' ');
    for (const value of [record.student.name, record.student.digital_id, 'Abbaa አባት', 'Haadha እናት',
      '0912345678', 'Adama አዳማ', 'House 4 & 5 <Main Street>', '<script>alert("text only")</script>',
      '=SUM(1,2)', 'PAY-FINAL-001', 'Grade 6 ሪፖርት.pdf', uiText('Student Admission Record'),
      uiText('Full Name'), uiText('Submitted Documents & Transcripts')]) {
      assert.ok(normalized.includes(value), `${locale} PDF preserves selectable text: ${value}`);
    }
    for (const line of noteLines) assert.ok(normalized.includes(line), `${locale} preserves ${line}`);
    assert.ok(normalized.replace(/\s/gu, '').includes('SCHOOL-' + 'A'.repeat(350)), 'Long unbroken values are complete');
    const pages = extracted.split('\f').filter(page => page.trim());
    assert.ok(pages.length >= 5, 'Oversized notes continue across multiple pages');
    pages.forEach((page, index) => {
      assert.ok(page.includes('ST-PDF-001'), 'Every continuation page identifies the student');
      assert.ok(new RegExp(`${index + 1}\\s*/\\s*${pages.length}`).test(page), 'Every page has its page count');
    });
    const bbox = execFileSync('pdftotext', ['-bbox', filename, '-'], { encoding: 'utf8' });
    for (const match of bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"/g)) {
      const [, xMin, yMin, xMax, yMax] = match.map(Number);
      assert.ok(xMin >= 35 && xMax <= 558 && yMin >= 30 && yMax <= 822,
        `Text stays within A4 margins: ${match[0]}`);
    }
    assert.equal(fetches, failedFetches + 2, 'Fonts retry after failure and are cached after success');
  }
  const minimal = { ...record, application: null, documents: [], hasApplication: false };
  const minimalPdf = await buildStudentRecordPdf(buildStudentRecordExportSheet(minimal));
  assert.ok(minimalPdf.size > 0, 'An absent application still produces a PDF');
  console.log(`PDF fixtures: ${outputDir}`);
  console.log('Student record PDF checks passed: direct PDF, Unicode selection, all values, long rows, long tokens, A4 bounds, continuation identity, page counts, missing application, and retryable cached font loading.');
}

main().catch(error => {
  console.error(`PDF fixtures: ${outputDir}`);
  console.error(error);
  process.exit(1);
});
