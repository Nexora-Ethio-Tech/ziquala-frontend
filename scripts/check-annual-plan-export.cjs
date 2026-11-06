const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const fixture = require('./annual-plan-export-fixture.cjs');
function load(relative) {
  const file = path.resolve(root, relative);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, TextEncoder, Uint8Array, Uint32Array, URL, Date, require: id => {
    if (id === '../localization') return { uiText: value => value };
    throw Error(`Unexpected dependency ${id}`);
  } }, { filename: file });
  return exports;
}
function unzip(bytes) {
  const data = Buffer.from(bytes), files = new Map();
  let position = 0;
  while (data.readUInt32LE(position) === 0x04034b50) {
    const size = data.readUInt32LE(position + 18), nameLength = data.readUInt16LE(position + 26), extraLength = data.readUInt16LE(position + 28);
    assert.equal(data.readUInt16LE(position + 8), 0, 'Stored ZIP entries need no external dependencies');
    const start = position + 30 + nameLength + extraLength;
    files.set(data.subarray(position + 30, position + 30 + nameLength).toString(), data.subarray(start, start + size).toString());
    position = start + size;
  }
  return files;
}
const decode = value => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
function cells(xml, row) {
  const rowXml = xml.match(new RegExp(`<row r="${row}"[^>]*>([\\s\\S]*?)</row>`))?.[1] || '';
  return [...rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map(cell => ({
    ref: cell[1].match(/r="([^"]+)"/)[1], style: cell[1].match(/s="([^"]+)"/)?.[1],
    value: decode(cell[2]?.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? cell[2]?.match(/<v>(.*?)<\/v>/)?.[1] ?? ''),
  }));
}
function verify(bytes) {
  const files = unzip(bytes), sheet = files.get('xl/worksheets/sheet1.xml'), detailed = files.get('xl/worksheets/sheet2.xml');
  assert(sheet && detailed, 'Both the requested columns and complete web-view details are exported');
  const expectedHeaders = ['Month', 'Week', '# Periods', 'Unit', 'Main Content', 'Sub Content', 'Competence', 'Teaching Methodology', 'Class Room Management / Aid', 'Evaluation', 'Remark'];
  assert.deepEqual(cells(sheet, 5).map(cell => cell.value.trim()), expectedHeaders);
  const expected = [
    ['September', '1', '4', 'Unit 1', fixture.items[0].topicContent, fixture.items[0].subContent, fixture.items[0].learningOutcome,
      fixture.items[0].teachingMethodology, fixture.items[0].classroomManagement + '\n' + fixture.items[0].instructionalMaterials, fixture.items[0].evaluation, fixture.items[0].remark],
    ['September', '2', '0', 'Unit 2', 'Main legacy content', 'Sub legacy content', 'Competence legacy', 'Method legacy', 'Management legacy\nAid legacy', 'Evaluation legacy', 'Remark legacy'],
    ['February', '1', '3', 'Unit 3', 'Main & <content>', 'Sub content', 'Competence', 'Demonstration', fixture.items[2].aids, 'Written test\nObservation', '=A1+1'],
  ];
  for (let i = 0; i < expected.length; i++) {
    const row = cells(sheet, i + 6);
    assert.equal(row.length, 11, 'Every row retains exactly eleven cells');
    assert.deepEqual(row.map(cell => cell.value), expected[i], `All columns align for exported week ${i + 1}`);
    assert(row.every(cell => cell.style), 'Every body cell has a style');
  }
  assert.equal(cells(sheet, 9).length, 0, 'Empty template rows are omitted');
  assert.equal(cells(detailed, 5).length, 15, 'All fifteen web-view columns remain available');
  assert.equal(cells(detailed, 7)[0].value, '1st Semester', 'Legacy rows infer their semester exactly as the web view does');
  assert(cells(detailed, 6).some(cell => cell.value === fixture.items[0].significanceSubject));
  assert(cells(detailed, 6).some(cell => cell.value === fixture.items[0].priorCompetency));
  assert(!sheet.includes('<f>'), 'Authored formula-looking text is exported as text');
  assert(sheet.includes('wrapText') || files.get('xl/styles.xml').includes('wrapText="1"'));
  const styles = files.get('xl/styles.xml');
  const xfs = [...styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)[1].matchAll(/<xf\b[^>]*?\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g)].map(match => match[0]);
  const header = xfs[Number(cells(sheet, 5)[0].style)];
  assert(header.includes('fontId="3"') && header.includes('borderId="1"'), 'Headers use white bold text and borders');
  assert(styles.includes('FF1E293B'), 'Header fill is dark');
  for (const cell of cells(sheet, 6)) assert(xfs[Number(cell.style)].includes('borderId="1"'));
  assert(Number(sheet.match(/<row r="8" ht="([^"]+)"/)[1]) > 108, 'Long Amharic text gets enough wrapped row height');
  assert.equal((sheet.match(/<col /g) || []).length, 11);
  return files;
}
if (require.main === module) {
  const { buildAnnualPlanExportSheets, getAnnualItemValue } = load('src/utils/annualPlanExport.ts');
  const { buildExcelWorkbook } = load('src/utils/exportUtils.ts');
  const sheets = buildAnnualPlanExportSheets(fixture);
  assert.equal(sheets[0].rows.length, 3);
  assert.equal(buildAnnualPlanExportSheets({ items: [{ month: 'September', week: 1 }] })[0].rows.length, 0);
  assert.equal(buildAnnualPlanExportSheets({ items: JSON.stringify(fixture.items) })[0].rows.length, 3);
  assert.equal(getAnnualItemValue({ noOfSessions: 0 }, 'noOfSessions'), '0');
  const bytes = buildExcelWorkbook(sheets);
  verify(bytes);
  if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), bytes);
  console.log('PASS annual-plan workbook: all 11 columns, current/legacy fields, zero values, complete detail sheet, Amharic wrapping, borders and dark headers');
}
module.exports = { verify, fixture };
