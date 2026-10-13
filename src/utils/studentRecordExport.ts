import { localeTag, uiText } from '../localization';
import type { StudentAdmissionRecord } from '../services/schoolAdminService';
import { formatEthiopianLabel } from './ethiopianCalendar';
import type { ExcelSheet } from './exportUtils';

type RecordSection = { title: string; fields: { label: string; value: string }[] };

const displayValue = (value: unknown): string =>
  value == null || String(value).trim() === '' ? '—' : String(value).trim();

const formatDate = (value?: string | null): string =>
  value ? Number.isNaN(Date.parse(value)) ? value : formatEthiopianLabel(value) || value : '—';

/** A single student's visible admission details, shared by print and download. */
const recordSections = (record: StudentAdmissionRecord): RecordSection[] => {
  const s = record.student;
  const a = record.application;
  const sections: RecordSection[] = [];
  const section = (title: string, fields: [string, unknown][]) => sections.push({
    title: uiText(title),
    // Translate labels only: names, addresses, notes and file names are authored data.
    fields: fields.map(([label, value]) => ({ label: uiText(label), value: displayValue(value) })),
  });

  section('Current Enrollment', [
    ['Full Name', s.name || a?.name],
    ['Digital ID', s.digital_id || a?.digital_id],
    ['Status', uiText(s.student_status || (s.status === 'Pending' ? 'Active' : s.status) || 'Active')],
    ['Assigned Grade', s.grade || a?.grade_applying],
    ['Assigned Section', s.section_label
      ? `${s.section_name || ''} — ${uiText('Section')} ${s.section_label}`.trim()
      : s.section_name],
    ['Enrolled Date', formatDate(s.enrolled_at)],
  ]);
  section('Personal Information', [
    ['Full Name', a?.name || s.name],
    ['Date of Birth', formatDate(a?.dob)],
    ['Gender', uiText(a?.gender)],
    ['Digital ID', s.digital_id || a?.digital_id],
    ['Place of Birth', a?.place_of_birth],
    ['Religion', a?.religion],
    ['Date Registered', formatDate(a?.date_registered || a?.created_at)],
    ['Application Status', uiText(a?.student_user_id || a?.registration_completed_at
      ? 'Enrolled / Active' : displayValue(a?.status).replace(/-/g, ' '))],
  ]);
  section("Father's Information", [
    ['Full Name', a?.father_name || a?.parent_name],
    ['Occupation', a?.father_occupation],
    ['Phone Number', a?.father_phone || a?.parent_phone],
  ]);
  section("Mother's Information", [
    ['Full Name', a?.mother_name],
    ['Occupation', a?.mother_occupation],
    ['Phone Number', a?.mother_phone],
  ]);
  section('Address & Location Information', [
    ['Full Address', a?.address],
    ['Parent ID', s.parent_digital_id || a?.parent_digital_id || a?.parent_id || s.parent_user_id],
    ['Applicant Phone', a?.applicant_phone || a?.phone],
  ]);
  section('Academic History', [
    ['Grade Applying For', a?.grade_applying || a?.grade],
    ['Last Grade Completed', a?.last_grade_completed || a?.grade],
    ['Previous School', a?.previous_school],
  ]);
  if (a?.blood_group || a?.allergies || a?.chronic_conditions || a?.medications) {
    section('Medical & Health Records', [
      ['Blood Group', a.blood_group], ['Allergies', a.allergies],
      ['Chronic Conditions', a.chronic_conditions], ['Current Medications', a.medications],
    ]);
  }
  if (a?.exam_date || a?.exam_time || a?.exam_location || a?.exam_subjects || a?.exam_notes) {
    section('Placement Exam Information', [
      ['Date', formatDate(a.exam_date)], ['Time', a.exam_time],
      ['Location', a.exam_location], ['Subjects', a.exam_subjects],
      ...(a.exam_notes ? [['Notes', a.exam_notes] as [string, unknown]] : []),
    ]);
  }
  if (a?.finance_status || a?.registration_completed_at || a?.payment_amount != null || a?.payment_reference) {
    section('Finance & Registration', [
      ['Finance Status', uiText(a.finance_status)], ['Payment Amount', a.payment_amount],
      ['Payment Reference', a.payment_reference],
      ['Registration Completed', formatDate(a.registration_completed_at)],
    ]);
  }
  section('Submitted Documents & Transcripts', record.documents.length
    ? record.documents.flatMap(doc => [
      ['Transcript Filename', doc.file_name] as [string, unknown],
      ['Transcript Uploaded', uiText(doc.has_file === false ? 'No' : 'Yes')] as [string, unknown],
    ])
    : [['Documents', uiText('No documents were submitted with this application.')]]);
  return sections;
};

export const studentRecordFilename = (record: StudentAdmissionRecord): string => {
  const identifier = record.student.digital_id || record.application?.digital_id || record.student.student_id;
  return `student-admission-record_${String(identifier).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 100) || 'student'}`;
};

export const buildStudentRecordExportSheet = (record: StudentAdmissionRecord): ExcelSheet => ({
  name: 'Admission Record',
  rows: recordSections(record).flatMap(section => section.fields.map(field => ({
    section: section.title, field: field.label, value: field.value,
  }))),
  report: {
    title: uiText('Student Admission Record'),
    subtitle: `${displayValue(record.student.name || record.application?.name)} | ${displayValue(record.student.digital_id || record.application?.digital_id)}`,
    filters: '',
    freezeColumns: 0,
    groups: [{
      label: uiText('Student Personal & Admission Details'), color: '2563EB', tint: 'EFF6FF',
      columns: [
        { key: 'section', header: uiText('Section'), width: 32 },
        { key: 'field', header: uiText('Field'), width: 30 },
        { key: 'value', header: uiText('Value'), width: 65 },
      ],
    }],
  },
});

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Compact A4 form; long records can continue onto another page without losing fields. */
export const buildStudentRecordPrintHtml = (record: StudentAdmissionRecord): string => {
  const title = uiText('Student Admission Record');
  const name = displayValue(record.student.name || record.application?.name);
  const digitalId = displayValue(record.student.digital_id || record.application?.digital_id);
  const sections = recordSections(record).map(section => `<section>
    <h2>${escapeHtml(section.title)}</h2>
    <dl>${section.fields.map(field => `<div class="field"><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`).join('')}</dl>
  </section>`).join('');
  return `<!doctype html>
<html lang="${escapeHtml(localeTag())}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(title)} — ${escapeHtml(name)} — ${escapeHtml(digitalId)}</title>
  <style>
    * { box-sizing: border-box; }
    :root { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #172033; background: #f1f5f9; }
    body { margin: 0; }
    main { max-width: 850px; margin: 24px auto; padding: 32px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; }
    .record-header { margin-bottom: 18px; }
    h1 { font-size: 26px; margin: 0 0 10px; }
    .record-meta { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; }
    .identity { font-size: 16px; font-weight: 650; margin: 0; }
    .identifier { color: #526178; font-size: 13px; margin: 0; }
    .record-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 22px; align-items: start; }
    section { min-width: 0; }
    h2 { font-size: 14px; color: #1e40af; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; margin: 0; break-after: avoid; }
    dl { margin: 0; }
    .field { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 10px; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
    dt { color: #526178; font-size: 12px; }
    dd { margin: 0; font-size: 13px; white-space: pre-wrap; }
    h1, .identity, .identifier, dt, dd { overflow-wrap: anywhere; }
    @media (max-width: 600px) {
      main { margin: 12px; padding: 20px 16px; }
      h1 { font-size: 22px; }
      .record-sections { grid-template-columns: 1fr; }
    }
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      :root { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      main { max-width: none; margin: 0; padding: 0; border: 0; border-radius: 0; }
      .record-header { margin-bottom: 4mm; break-inside: avoid; }
      h1 { font-size: 14pt; line-height: 1.2; margin-bottom: 1.5mm; }
      .record-meta { gap: 1mm 4mm; }
      .identity { font-size: 10.5pt; line-height: 1.25; }
      .identifier { font-size: 9pt; line-height: 1.25; }
      .record-sections { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3mm 5mm; }
      section { break-inside: avoid; }
      h2 { font-size: 9.5pt; line-height: 1.25; padding: 1.2mm 1.4mm; margin-bottom: .5mm; background: #eff6ff; border-bottom: .3mm solid #cbd5e1; }
      .field { gap: 2mm; padding: .85mm .6mm; break-inside: avoid; }
      dt { font-size: 9pt; line-height: 1.25; }
      dd { font-size: 9.5pt; line-height: 1.25; }
    }
  </style>
</head>
<body>
  <main>
    <header class="record-header">
      <h1>${escapeHtml(title)}</h1>
      <div class="record-meta">
        <p class="identity">${escapeHtml(name)}</p>
        <p class="identifier">${escapeHtml(uiText('Digital ID'))}: ${escapeHtml(digitalId)}</p>
      </div>
    </header>
    <div class="record-sections">${sections}</div>
  </main>
</body>
</html>`;
};
