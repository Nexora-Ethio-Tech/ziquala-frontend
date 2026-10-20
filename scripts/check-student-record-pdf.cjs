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

const compactText = text => String(text).replace(/\s+/gu, '');
const decodeXml = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

async function inspectPdf(blob, name) {
  assert.equal(blob.type, 'application/pdf');
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const filename = path.join(outputDir, `${name}.pdf`);
  fs.writeFileSync(filename, bytes);
  // Poppler independently checks real embedded text, page count, and geometry.
  const raw = execFileSync('pdftotext', ['-raw', filename, '-'], { encoding: 'utf8' });
  const bbox = execFileSync('pdftotext', ['-bbox', filename, '-'], { encoding: 'utf8' });
  const pages = raw.split('\f').filter(page => page.trim());
  const words = [...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)]
    .map(([, xMin, yMin, xMax, yMax, value]) => ({
      xMin: Number(xMin), yMin: Number(yMin), xMax: Number(xMax), yMax: Number(yMax), text: decodeXml(value),
    }));
  assert.ok(words.length > 0, `${name} contains selectable text`);
  for (const word of words) {
    assert.ok(word.xMin >= 27 && word.xMax <= 568 && word.yMin >= 24 && word.yMax <= 830,
      `${name} text stays within A4 margins: ${JSON.stringify(word)}`);
  }
  // Read label/value columns independently so wrapped text cannot be interleaved
  // with a neighboring field by pdftotext's page-wide reading order.
  const region = (left, right) => compactText(words.filter(word => word.xMin >= left && word.xMin < right)
    .map(word => word.text).join(' '));
  const streams = [compactText(raw), region(27, 140), region(140, 296), region(303, 416), region(416, 568)];
  return { filename, raw, pages, words, streams };
}

function assertSheetText(pdf, sheet, name) {
  for (const value of [sheet.report.title, ...sheet.rows.flatMap(row => [row.section, row.field, row.value])]) {
    assert.ok(pdf.streams.some(text => text.includes(compactText(value))),
      `${name} retains selectable text: ${value}`);
  }
}

async function main() {
  const { buildStudentRecordPdf } = load('src/utils/studentRecordPdf.ts');
  const { buildStudentRecordExportSheet } = load('src/utils/studentRecordExport.ts');
  const { uiText } = load('src/localization.ts');
  const normalRecord = {
    student: {
      student_id: 'student-pdf-001', name: 'Sample Student ሙሉ ስም', digital_id: 'ST-PDF-001',
      grade: '7', section_name: 'Grade 7', section_label: '1', status: 'Active',
      enrolled_at: '2025-09-11', parent_digital_id: 'PA-BR-0011',
    },
    application: {
      name: 'Sample Student ሙሉ ስም', digital_id: 'ST-PDF-001', dob: '2013-09-11', gender: 'Female',
      place_of_birth: 'Adama አዳማ', religion: 'Sample religion', date_registered: '2025-08-01',
      father_name: 'Abbaa አባት', father_occupation: 'Farmer', father_phone: '+251912345678',
      mother_name: 'Haadha እናት', mother_occupation: 'Teacher', mother_phone: '0912345678',
      address: 'House 4 & 5 <Main Street>\nAdama አዳማ', applicant_phone: '0900000011',
      grade_applying: '7', last_grade_completed: '6', previous_school: 'Sample Primary School',
      blood_group: 'O+', allergies: 'Peanuts', chronic_conditions: 'None recorded', medications: 'None recorded',
      exam_date: '2025-08-15', exam_time: '09:00', exam_location: 'Room 12', exam_subjects: 'Math & English',
      exam_notes: 'Bring a calculator አስታውስ', finance_status: 'Paid', payment_amount: 0,
      payment_reference: 'PAY-0011', registration_completed_at: '2025-09-11', status: 'Approved',
    },
    documents: [
      { id: 'doc-001', file_name: 'Grade 6 ሪፖርት.pdf', has_file: true },
      { id: 'doc-002', file_name: 'Birth certificate.pdf', has_file: false },
    ],
    hasApplication: true,
  };
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
    const normalSheet = buildStudentRecordExportSheet(normalRecord);
    const normal = await inspectPdf(await buildStudentRecordPdf(normalSheet), `student-record-normal-${locale}`);
    assert.equal(normal.pages.length, 1, `${locale} fully populated normal record downloads as one A4 page`);
    assert.ok(normalSheet.rows.length >= 40, 'The one-page fixture includes every optional section and two documents');
    assertSheetText(normal, normalSheet, `${locale} normal record`);
    assert.ok(normal.words.some(word => word.yMin > 80 && word.xMin < 140)
      && normal.words.some(word => word.yMin > 80 && word.xMin > 416),
    `${locale} record uses both columns`);
    assert.ok(/1\s*\/\s*1/.test(normal.raw), `${locale} compact PDF has the correct page count`);
    execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-scale-to', '1500', '-png', normal.filename,
      normal.filename.replace(/\.pdf$/, '')]);

    const sheet = buildStudentRecordExportSheet(record);
    const long = await inspectPdf(await buildStudentRecordPdf(sheet), `student-record-long-${locale}`);
    for (const value of [record.student.name, record.student.digital_id, 'Abbaa አባት', 'Haadha እናት',
      '0912345678', 'Adama አዳማ', 'House 4 & 5 <Main Street>', '<script>alert("text only")</script>',
      '=SUM(1,2)', 'PAY-FINAL-001', 'Grade 6 ሪፖርት.pdf', uiText('Student Admission Record'),
      uiText('Full Name'), uiText('Submitted Documents & Transcripts')]) {
      assert.ok(long.streams.some(text => text.includes(compactText(value))), `${locale} PDF preserves selectable text: ${value}`);
    }
    for (const line of noteLines) assert.ok(long.streams.some(text => text.includes(compactText(line))), `${locale} preserves ${line}`);
    assert.ok(long.streams.some(text => text.includes('SCHOOL-' + 'A'.repeat(350))), 'Long unbroken values are complete');
    const pages = long.pages;
    assert.ok(pages.length >= 5, 'Oversized notes continue across multiple pages');
    pages.forEach((page, index) => {
      assert.ok(page.includes('ST-PDF-001'), 'Every continuation page identifies the student');
      assert.ok(new RegExp(`${index + 1}\\s*/\\s*${pages.length}`).test(page), 'Every page has its page count');
    });
    assert.equal(fetches, failedFetches + 2, 'Fonts retry after failure and are cached after success');
  }
  const minimal = { ...record, application: null, documents: [], hasApplication: false };
  for (const [name, source] of [['no-application', minimal], ['blank-application', { ...minimal, application: {}, hasApplication: true }]]) {
    const sheet = buildStudentRecordExportSheet(source);
    const pdf = await inspectPdf(await buildStudentRecordPdf(sheet), `student-record-${name}`);
    assert.equal(pdf.pages.length, 1, `${name} remains one page`);
    assertSheetText(pdf, sheet, name);
    assert.ok(!/FINAL-NOTE|PAY-FINAL|Invalid Date|\bundefined\b|\bNaN\b/.test(pdf.raw), 'Missing fields do not reuse earlier records');
  }
  console.log(`PDF fixtures: ${outputDir}`);
  console.log('Student record PDF checks passed: fully populated one-page A4 forms in English/Amharic/Oromo, selectable text and all field values, two columns, overflow rows, long tokens, A4 bounds, continuation identity, page counts, missing/blank applications, and retryable cached fonts.');
}

main().catch(error => {
  console.error(`PDF fixtures: ${outputDir}`);
  console.error(error);
  process.exit(1);
});
