const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'student-record-export-check-'));
const language = { language: 'en' };
const modules = new Map();

// Exercise the real TypeScript utilities and translation dictionaries without a browser.
function load(relative) {
  const file = path.resolve(root, relative);
  if (modules.has(file)) return modules.get(file);
  const result = {};
  modules.set(file, result);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports: result, TextEncoder, Uint8Array, Uint32Array, URL, Intl, Date,
    require: id => {
      const target = path.resolve(path.dirname(file), id);
      if (target === path.join(root, 'src/i18n')) return language;
      if (id.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
      return load(target + '.ts');
    },
  }, { filename: file });
  return result;
}

function zipEntry(bytes, filename) {
  const buffer = Buffer.from(bytes);
  for (let offset = 0; buffer.readUInt32LE(offset) === 0x04034b50;) {
    const method = buffer.readUInt16LE(offset + 8);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const start = offset + 30 + nameLength + extraLength;
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    if (name === filename) {
      const content = buffer.subarray(start, start + size);
      assert.ok(method === 0 || method === 8, 'Workbook uses a supported ZIP compression method');
      return (method === 8 ? zlib.inflateRawSync(content) : content).toString('utf8');
    }
    offset = start + size;
  }
  assert.fail(`Missing workbook entry: ${filename}`);
}

const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const values = sheet => sheet.rows.map(row => String(row.value ?? ''));
const findField = (sheet, field, section) => sheet.rows.find(row =>
  row.field === field && (!section || row.section === section));

const record = {
  student: {
    student_id: '00000000-0000-4000-8000-000000000011', user_id: 'user-record-11',
    name: 'Sample Student & Family / ሙሉ ስም', email: 'student.example@ziquala.edu.et',
    digital_id: 'ST-BR-0011', grade: '7', student_status: null, status: 'Pending',
    section_name: 'Grade 7', section_label: '1', enrolled_at: '2025-09-11T09:00:00Z',
    parent_user_id: 'parent-record-11', parent_digital_id: 'PA-BR-0011',
    parent_name: 'Sample Father', parent_phone: '+251912345678',
  },
  application: {
    id: 'application-record-11', name: 'Sample Student & Family / ሙሉ ስም',
    digital_id: '001234567890', dob: '2013-09-11', gender: 'Female',
    place_of_birth: 'Home', religion: 'Sample religion', date_registered: '2025-08-01',
    father_name: 'Sample Father', father_occupation: 'Home', father_phone: '+251912345678',
    mother_name: 'Sample Mother', mother_occupation: 'Teacher', mother_phone: '0912345678',
    address: 'House 4 & 5 <Main Street>\nA second address line', applicant_phone: '0900000011',
    grade_applying: '7', last_grade_completed: '6', previous_school: 'Home',
    blood_group: 'O+', allergies: 'Peanuts', chronic_conditions: 'None recorded', medications: 'None recorded',
    exam_date: '2025-08-15', exam_time: '09:00', exam_location: 'Home', exam_subjects: 'Math & English',
    exam_notes: '=SUM(1,2)', finance_status: 'Paid', payment_amount: 0,
    payment_reference: 'PAY-0011', registration_completed_at: '2025-09-11', status: 'Approved',
  },
  documents: [
    { id: 'document-record-11', file_name: 'Grade 6 & report.pdf', has_file: true, source: 'application', applicationId: 'application-record-11' },
    { id: 'document-record-12', file_name: 'Missing transcript.pdf', has_file: false, source: 'application', applicationId: 'application-record-11' },
  ],
  hasApplication: true,
};

function main() {
  const { buildStudentRecordExportSheet, buildStudentRecordPrintHtml } = load('src/utils/studentRecordExport.ts');
  const { buildExcelWorkbook } = load('src/utils/exportUtils.ts');
  const { uiText } = load('src/localization.ts');
  const saveFixtures = (name, source) => {
    const sheet = buildStudentRecordExportSheet(source);
    const html = buildStudentRecordPrintHtml(source);
    const workbook = buildExcelWorkbook([sheet]);
    fs.writeFileSync(path.join(outputDir, `${name}.html`), html);
    fs.writeFileSync(path.join(outputDir, `${name}.xlsx`), workbook);
    fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify(sheet, null, 2));
    return { sheet, html, workbook };
  };
  const { sheet, html, workbook } = saveFixtures('student-record-en', record);
  assert.ok(sheet.rows.length > 20, 'The full record includes admission details');
  for (const row of sheet.rows) assert.deepEqual(Object.keys(row).sort(), ['field', 'section', 'value']);
  for (const value of [record.student.digital_id, record.student.name, record.student.parent_digital_id,
    record.application.father_name, record.application.mother_name, record.application.address,
    '+251912345678', '0912345678', '0900000011', 'Peanuts', '=SUM(1,2)', 'PAY-0011']) {
    assert.ok(values(sheet).includes(value), `The record contains ${value}`);
  }
  assert.equal(String(findField(sheet, 'Payment Amount')?.value), '0', 'Zero payments are retained');
  assert.equal(findField(sheet, 'Phone Number', "Mother's Information")?.value, '0912345678');
  assert.ok(html.includes('Sample Student &amp; Family / ሙሉ ስም'));
  assert.ok(html.includes('House 4 &amp; 5 &lt;Main Street&gt;'));
  assert.ok(html.includes('@media print'), 'The printable record has print styling');
  assert.ok(!/<button|<script/.test(html), 'Direct printing has no extra preview controls');

  const other = structuredClone(record);
  other.student.name = other.application.name = 'Other student only';
  other.student.digital_id = 'ST-OTHER-0099';
  buildStudentRecordExportSheet(other);
  buildStudentRecordPrintHtml(other);
  assert.ok(!JSON.stringify(buildStudentRecordExportSheet(record)).includes('ST-OTHER-0099'));
  assert.ok(!buildStudentRecordPrintHtml(record).includes('Other student only'), 'Exports do not retain another student');

  const absent = structuredClone(record);
  absent.application = null;
  absent.documents = [];
  absent.hasApplication = false;
  absent.student.enrolled_at = '';
  const minimal = saveFixtures('student-record-no-application', absent);
  assert.ok(values(minimal.sheet).includes(record.student.digital_id));
  assert.ok(values(minimal.sheet).includes(record.student.name));
  assert.ok(!values(minimal.sheet).includes('Peanuts'), 'Missing applications do not reuse previous admission data');
  assert.ok(!/Invalid Date|\bundefined\b|\bNaN\b/.test(minimal.html));
  assert.ok(!minimal.sheet.rows.some(row => row.section === 'Medical & Health Records'));
  assert.ok(!minimal.sheet.rows.some(row => row.section === 'Placement Exam Information'));
  const blankApplication = { ...absent, application: {}, hasApplication: true };
  assert.equal(JSON.stringify(buildStudentRecordExportSheet(blankApplication).rows), JSON.stringify(minimal.sheet.rows),
    'An empty application is as safe to export as a missing application');
  const invalidDate = { ...absent, student: { ...absent.student, enrolled_at: 'not-a-date' } };
  assert.ok(['', '—', 'not-a-date'].includes(findField(buildStudentRecordExportSheet(invalidDate), 'Enrolled Date')?.value),
    'An invalid saved date must not turn into today in an exported record');

  const zeroOnly = structuredClone(absent);
  zeroOnly.application = { payment_amount: 0 };
  zeroOnly.hasApplication = true;
  assert.equal(String(findField(buildStudentRecordExportSheet(zeroOnly), 'Payment Amount')?.value), '0',
    'Payment amount alone makes the finance details available, including zero');

  const notesOnly = { ...absent, application: { exam_notes: 'Bring a calculator' }, hasApplication: true };
  assert.ok(values(buildStudentRecordExportSheet(notesOnly)).includes('Bring a calculator'),
    'Saved exam notes are retained even when a date or location has not been assigned');

  const documentRecord = structuredClone(record);
  documentRecord.documents = [record.documents[1]];
  const missingDocument = buildStudentRecordExportSheet(documentRecord);
  documentRecord.documents = [{ ...record.documents[1], has_file: true }];
  const uploadedDocument = buildStudentRecordExportSheet(documentRecord);
  assert.notEqual(JSON.stringify(missingDocument.rows), JSON.stringify(uploadedDocument.rows),
    'A named document without a stored file must have a different status from an uploaded document');
  assert.equal(findField(missingDocument, 'Transcript Uploaded')?.value, 'No');
  assert.equal(findField(uploadedDocument, 'Transcript Uploaded')?.value, 'Yes');
  for (const doc of record.documents) {
    assert.ok(JSON.stringify(sheet.rows).includes(doc.file_name));
    assert.ok(html.includes(xmlEscape(doc.file_name)));
  }

  const hostile = structuredClone(record);
  hostile.student.name = hostile.application.name = '<img src=x onerror=alert(1)> & "Student"';
  hostile.application.exam_notes = '</td><script>alert("record")</script>&';
  hostile.documents[0].file_name = '<svg onload=alert(2)>.pdf';
  const hostileHtml = buildStudentRecordPrintHtml(hostile);
  for (const payload of [hostile.student.name, hostile.application.exam_notes, hostile.documents[0].file_name]) {
    assert.ok(!hostileHtml.includes(payload), 'Authored text must not become active HTML');
  }
  assert.ok(hostileHtml.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(hostileHtml.includes('&lt;script&gt;'));
  assert.ok(hostileHtml.includes('&lt;svg onload=alert(2)&gt;.pdf'));

  const worksheet = zipEntry(workbook, 'xl/worksheets/sheet1.xml');
  for (const authored of ['0912345678', '+251912345678', '=SUM(1,2)', record.student.name]) {
    assert.ok(worksheet.includes(`t="inlineStr"><is><t xml:space="preserve">${xmlEscape(authored)}</t></is></c>`),
      `${authored} is stored as an inline string, not a number or Excel formula`);
  }
  assert.ok(!/<f(?:\s|>)/.test(worksheet), 'Authored cells must never be formulas');

  const originalValues = values(sheet);
  for (const locale of ['am', 'om']) {
    language.language = locale;
    const translated = saveFixtures(`student-record-${locale}`, record);
    assert.notEqual(uiText('Student Admission Record'), 'Student Admission Record');
    assert.ok(translated.html.includes(uiText('Student Admission Record')), `${locale} title is localized`);
    assert.ok(translated.sheet.rows.some(row => row.field === uiText('Full Name')), `${locale} fields are localized`);
    for (const authored of [record.student.name, record.application.father_name, record.application.mother_name,
      '0912345678', '+251912345678', 'Home', record.application.address]) {
      assert.equal(values(translated.sheet).filter(value => value === authored).length,
        originalValues.filter(value => value === authored).length, `${locale} retains authored value ${authored}`);
    }
    assert.ok(translated.html.includes('Sample Student &amp; Family / ሙሉ ስም'));
    assert.ok(translated.html.includes('Home'), `${locale} does not translate authored text that matches a system label`);
    assert.ok(zipEntry(translated.workbook, 'xl/worksheets/sheet1.xml').includes(xmlEscape(record.student.name)));
  }
  language.language = 'en';
  console.log(`Record export fixtures: ${outputDir}`);
  console.log('Student record export checks passed: one student, full details, absent application, zero payments, document availability, escaped HTML, safe Excel strings, and Amharic/Oromo labels with unchanged authored values.');
}

try { main(); } catch (error) {
  console.error(`Record export fixtures: ${outputDir}`);
  console.error(error);
  process.exit(1);
}
