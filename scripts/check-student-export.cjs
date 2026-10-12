const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const outputDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'student-export-check-'));
const ts = require(path.join(root, 'node_modules/typescript'));
const language = { language: 'en' };
const modules = new Map();
const calls = [];
let responseRows = [];
const api = { post: async (url, body) => { calls.push({url, body}); return { data: { data: responseRows.filter(r => body.studentIds.includes(r.student.student_id)).reverse() } }; } };
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
      if (id === './i18n') return language;
      if (id === './api') return api;
      const target = path.resolve(path.dirname(file), id);
      if (id.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
      return load(target + '.ts');
    },
  }, { filename: file });
  return result;
}
async function main() {
  const { buildStudentsExportSheet } = load('src/utils/studentExport.ts');
  const { buildStudentPrintHtml } = load('src/utils/studentPrint.ts');
  const { buildExcelWorkbook } = load('src/utils/exportUtils.ts');
  const service = load('src/services/studentService.ts').default;
  const records = [
    {
      student: { student_id:'00000000-0000-4000-8000-000000000001', user_id:'user-1', digital_id:'ST-BR-0001', name:'Sample Student & Family', username:'ST-BR-0001', email:'student.example@ziquala.edu.et', branch_name:'Sample Branch', grade:'7', section:'A', status:'Active', enrolled_at:'2025-09-11T21:30:00Z', birth_date:'2013-09-11', sex:'Female' },
      application: { id:'application-1', name:'Sample Student', digital_id:'001234567890', grade:'6', grade_applying:'7', created_at:'2025-08-01', date_registered:'2017-11-25', father_name:'Sample Father', father_phone:'+251912345678', mother_name:'Sample Mother', mother_phone:'0912345678', address:'House 4 & 5 <Main Street>\nA second address line', has_transcript:true, transcript_file_name:'Grade 6 & report.pdf', transcript_file_type:'application/pdf', transcript_file_size:12345, exam_notes:'=SUM(1,2)', payment_amount:0, payment_date:'2025-09-11', religion:'Sample religion', allergies:'None recorded', email:'family@example.com' },
      parents:[{digital_id:'PA-BR-0001', username:'PA-BR-0001', name:'Sample Father', phone:'+251912345678'}], admission_match:'linked',
    },
    {
      student: { student_id:'00000000-0000-4000-8000-000000000002', user_id:'user-2', digital_id:'ST-BR-0002', name:'ሙሉ ስም / Sample Two', username:'ST-BR-0002', branch_name:'Sample Branch', grade:'7', section:'1', status:'Active', enrolled_at:'invalid' },
      application:null, parents:[], admission_match:'ambiguous',
    },
  ];
  responseRows = records;
  const result = await service.getStudentExportRecords(records.map(r=>r.student.student_id));
  assert.equal(result[0].student.digital_id, 'ST-BR-0001');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/school-admin/students/export');
  assert.equal(calls[0].body.studentIds.length, 2);
  const context = { filters:'Grade: Grade 7 | Section: Section 1 | Status: Active', origin:'https://school.example', exportedAt:new Date('2026-10-12T09:30:00Z') };
  const sheet = buildStudentsExportSheet(result, context);
  const removedColumns = {
    accountEmail: 'Student Account Email',
    graduationYear: 'Graduation Year (E.C.)',
    dobGC: 'Date of Birth (G.C.)',
    poBox: 'P.O. Box',
    houseNo: 'House Number',
    admissionRecord: 'Admission Record',
    applicationId: 'Application Reference',
    admissionName: 'Name at Admission',
    admissionId: 'ID Recorded at Admission',
    admissionGrade: 'Admission Grade (As Recorded)',
    completedDate: 'Registration Completed (E.C.)',
    examDate: 'Placement Exam Date (E.C.)',
    examTime: 'Placement Exam Time',
    examLocation: 'Placement Exam Location',
    examSubjects: 'Placement Exam Subjects',
    examNotes: 'Placement Exam Notes',
    financeStatus: 'Admission Payment Status',
    examScore: 'Placement Exam Score',
    examResult: 'Placement Exam Result',
    examStatus: 'Placement Exam Status',
    paymentStatus: 'Payment Status',
    paymentReference: 'Admission Payment Reference',
    paymentMethod: 'Payment Method',
    notes: 'Admission Notes',
    removalReason: 'Application Closure Reason',
    contactEmail: 'Admission Contact Email',
    transcriptUploaded: 'Transcript Uploaded',
    transcriptName: 'Transcript Filename',
    transcriptSize: 'Transcript Size (Bytes)',
  };
  const expectedKeys = [
    'studentId', 'name', 'parentIds', 'username', 'parentUsernames',
    'branch', 'grade', 'section', 'status', 'enrolled',
    'gender', 'dobEC', 'birthPlace', 'religion', 'age', 'studentPhone',
    'linkedParentNames', 'linkedParentPhones', 'admissionParentName', 'admissionParentPhone',
    'fatherName', 'fatherOccupation', 'fatherPhone', 'motherName', 'motherOccupation', 'motherPhone', 'applicantPhone',
    'address', 'region', 'town', 'kebele', 'ketena',
    'applicationDate', 'registeredDate', 'previousSchool', 'lastGrade', 'applicationStatus', 'paymentAmount', 'paymentDate',
    'bloodGroup', 'allergies', 'conditions', 'medications',
    'transcriptType', 'recordUrl',
  ];
  const columns = Array.from(sheet.report.groups.flatMap(group => group.columns));
  assert.equal(columns.length, 45);
  assert.deepEqual(columns.map(column => column.key), expectedKeys);
  assert.equal(Object.keys(removedColumns).length, 29);
  for (const [key, header] of Object.entries(removedColumns)) {
    assert.ok(columns.every(column => column.key !== key && column.header !== header), `${header} must be omitted`);
    assert.ok(sheet.rows.every(row => !Object.hasOwn(row, key)), `${key} must be absent from row data`);
  }
  for (const row of sheet.rows) {
    assert.deepEqual(Object.keys(row).sort(), [...expectedKeys].sort());
  }
  for (const [key, header] of Object.entries({
    paymentAmount: 'Admission Payment Amount', paymentDate: 'Payment Date (E.C.)',
    transcriptType: 'Transcript File Type', recordUrl: 'Student Record Link',
  })) {
    assert.equal(columns.find(column => column.key === key).header, header);
  }
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[0].studentId, 'ST-BR-0001');
  assert.equal(sheet.rows[0].dobEC, '2006-01-01');
  assert.equal(sheet.rows[0].fatherPhone, '+251912345678');
  assert.equal(sheet.rows[0].motherPhone, '0912345678');
  assert.equal(sheet.rows[0].lastGrade, 'Grade 6');
  assert.equal(sheet.rows[0].grade, 'Grade 7');
  assert.equal(sheet.rows[0].paymentAmount, 0);
  assert.equal(sheet.rows[0].paymentDate, '2018-01-01');
  assert.equal(sheet.rows[0].transcriptType, 'application/pdf');
  assert.equal(sheet.rows[0].recordUrl, 'https://school.example/students/00000000-0000-4000-8000-000000000001/record');
  assert.equal(sheet.rows[1].fatherName, '');
  assert.equal(sheet.rows[1].enrolled, '');
  assert.equal(sheet.rows[1].applicationDate, '');
  assert.equal(sheet.rows[1].transcriptType, '');
  assert.equal(sheet.report.groups.length, 8);

  const selectedSheet = buildStudentsExportSheet(result, {
    ...context, selectedColumnKeys: ['fatherPhone', 'name', 'studentId', 'name', 'unknown'],
  });
  assert.deepEqual(Array.from(selectedSheet.report.groups.flatMap(group => group.columns.map(column => column.key))),
    ['studentId', 'name', 'fatherPhone'], 'Selection preserves the established column order');
  assert.equal(selectedSheet.report.groups.length, 2, 'Unselected groups disappear');
  assert.equal(selectedSheet.report.freezeColumns, 2);
  assert.deepEqual(Object.keys(selectedSheet.rows[0]), ['studentId', 'name', 'fatherPhone'],
    'Unselected data must not enter either output');
  const nameOnly = buildStudentsExportSheet(result, { ...context, selectedColumnKeys: ['name'] });
  assert.equal(nameOnly.report.freezeColumns, 0);
  assert.deepEqual(Object.keys(nameOnly.rows[0]), ['name']);
  const phoneOnly = buildStudentsExportSheet(result, { ...context, selectedColumnKeys: ['fatherPhone'] });
  assert.equal(phoneOnly.report.freezeColumns, 0, 'Other columns must not be frozen as student identifiers');
  assert.throws(() => buildStudentsExportSheet(result, { ...context, selectedColumnKeys: [] }), /Choose at least one column/);
  assert.throws(() => buildStudentsExportSheet(result, { ...context, selectedColumnKeys: ['unknown'] }), /Choose at least one column/);
  const printHtml = buildStudentPrintHtml(selectedSheet);
  const printedKeys = [...printHtml.matchAll(/data-column-key="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual([...new Set(printedKeys)], ['studentId', 'name', 'fatherPhone']);
  assert.ok(printHtml.includes('+251912345678'));
  assert.ok(!printHtml.includes('0912345678'), 'Unselected mother phone must not appear in print');
  assert.ok(printHtml.includes('Sample Student &amp; Family'), 'Print escapes authored content');
  const lonePhonePrint = buildStudentPrintHtml(phoneOnly);
  assert.ok(!lonePhonePrint.includes('Sample Student'), 'Print must not add unselected identifiers');
  assert.ok(!lonePhonePrint.includes('data-column-key="studentId"'));
  const allPrintHtml = buildStudentPrintHtml(sheet);
  assert.ok((allPrintHtml.match(/data-print-band=/g) || []).length > 1, 'Wide reports split into readable bands');
  const allPrintedKeys = [...allPrintHtml.matchAll(/data-column-key="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual([...new Set(allPrintedKeys)].sort(), [...expectedKeys].sort());
  fs.writeFileSync(path.join(outputDir, 'student-export-selected.xlsx'), buildExcelWorkbook([selectedSheet]));
  fs.writeFileSync(path.join(outputDir, 'student-export-print.html'), allPrintHtml);
  fs.writeFileSync(path.join(outputDir, 'student-export-sample.xlsx'), buildExcelWorkbook([sheet]));
  fs.writeFileSync(path.join(outputDir, 'student-export-sample.json'), JSON.stringify(sheet));
  fs.writeFileSync(path.join(outputDir, 'student-export-plain.xlsx'), buildExcelWorkbook([{name:'Plain', rows:[{ID:'00123', Phone:'+251912345678', Formula:'=1+1', Unicode:'ሙሉ <>&\u0001'}]}]));
  for (const locale of ['am', 'om']) {
    language.language = locale;
    const translated = buildStudentsExportSheet(result, context);
    assert.equal(translated.rows[0].name, records[0].student.name);
    assert.equal(translated.rows[0].fatherPhone, '+251912345678');
    fs.writeFileSync(path.join(outputDir, `student-export-${locale}.xlsx`), buildExcelWorkbook([translated]));
  }
  language.language = 'en';
  await assert.rejects(service.getStudentExportRecords(['missing']), /Refresh the list/);
  calls.length = 0;
  responseRows = Array.from({length:501}, (_, index) => ({ student:{student_id:String(index)} }));
  const batched = await service.getStudentExportRecords(responseRows.map(r=>r.student.student_id));
  assert.equal(calls.length, 2);
  assert.equal(batched.length, 501);
  assert.equal(batched[0].student.student_id, '0');
  assert.equal(batched[500].student.student_id, '500');
  console.log(`Workbook fixtures: ${outputDir}`);
  console.log('Student export checks passed: filtered IDs, 501-row batching, 45-column defaults, custom selections, omitted groups/data, empty-selection guards, selected-only print/Excel, readable print bands, escaped print content, dates, Unicode, and translations.');
}
main().catch(error => { console.error(error); process.exit(1); });
