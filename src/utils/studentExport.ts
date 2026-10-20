import { uiText } from '../localization';
import type { StudentExportRecord } from '../services/studentService';
import { gregorianToEthiopian } from './ethiopianCalendar';
import type { ExcelSheet, ExcelReportGroup } from './exportUtils';

const column = (key: string, header: string, width = 24, hyperlink = false) => ({
  key, header: uiText(header), width, hyperlink,
});

export const getStudentExportGroups = (): ExcelReportGroup[] => [
  {
    label: uiText('System IDs'), color: '2563EB', tint: 'EFF6FF',
    columns: [
      column('studentId', 'Student Digital ID'), column('name', 'Full Name', 32),
      column('parentIds', 'Parent Digital ID', 26), column('username', 'Student Username'),
      column('parentUsernames', 'Parent Username', 26),
    ],
  },
  {
    label: uiText('Current Enrollment'), color: '4F46E5', tint: 'EEF2FF',
    columns: [
      column('branch', 'Branch', 28), column('grade', 'Current Grade', 18),
      column('section', 'Section', 16), column('status', 'Status', 18),
      column('enrolled', 'Enrollment Date (E.C.)'),
    ],
  },
  {
    label: uiText('Personal Information'), color: '0F766E', tint: 'F0FDFA',
    columns: [
      column('gender', 'Gender', 16), column('dobEC', 'Date of Birth (E.C.)'),
      column('birthPlace', 'Place of Birth', 28),
      column('religion', 'Religion', 20), column('age', 'Recorded Age', 18),
      column('studentPhone', 'Student Phone'),
    ],
  },
  {
    label: uiText('Family Contacts'), color: 'B45309', tint: 'FFFBEB',
    columns: [
      column('linkedParentNames', 'Linked Parent / Guardian', 30), column('linkedParentPhones', 'Linked Parent Phone'),
      column('admissionParentName', 'Parent / Guardian at Admission', 30), column('admissionParentPhone', 'Parent Phone at Admission'),
      column('fatherName', "Father's Name", 30), column('fatherOccupation', "Father's Occupation", 28),
      column('fatherPhone', "Father's Phone"), column('motherName', "Mother's Name", 30),
      column('motherOccupation', "Mother's Occupation", 28), column('motherPhone', "Mother's Phone"),
      column('applicantPhone', 'Applicant Phone'),
    ],
  },
  {
    label: uiText('Address'), color: '7C3AED', tint: 'F5F3FF',
    columns: [
      column('address', 'Address', 42), column('region', 'Region'), column('town', 'Town'),
      column('kebele', 'Kebele', 18), column('ketena', 'Ketena', 18),
    ],
  },
  {
    label: uiText('Admission History'), color: '0E7490', tint: 'ECFEFF',
    columns: [
      column('applicationDate', 'Application Date (E.C.)'), column('registeredDate', 'Registration Date (As Recorded)', 28),
      column('previousSchool', 'Previous School', 34), column('lastGrade', 'Last Grade Completed at Admission', 28),
      column('applicationStatus', 'Application Status'),
      column('paymentAmount', 'Admission Payment Amount'), column('paymentDate', 'Payment Date (E.C.)'),
    ],
  },
  {
    label: uiText('Other Saved Details / Health'), color: 'BE185D', tint: 'FFF1F2',
    columns: [
      column('bloodGroup', 'Blood Group', 18),
      column('allergies', 'Allergies', 36), column('conditions', 'Chronic Conditions', 36),
      column('medications', 'Medications', 36),
    ],
  },
  {
    label: uiText('Documents'), color: '475569', tint: 'F8FAFC',
    columns: [
      column('transcriptType', 'Transcript File Type', 26),
      column('recordUrl', 'Student Record Link', 45, true),
    ],
  },
];

const text = (value: unknown): string => value == null ? '' : String(value);

// Dates are exported as unambiguous text; unknown values must never become today's date.
const calendarDate = (value: unknown): string => {
  const input = text(value);
  if (!input || !/^\d{4}-\d{2}-\d{2}/.test(input) || Number.isNaN(Date.parse(input))) return '';
  const { year, month, day } = gregorianToEthiopian(input);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const gradeLabel = (value: unknown): string => {
  const grade = text(value).trim();
  return /^\d+$/.test(grade) ? `Grade ${grade}` : grade;
};

const sectionLabel = (value: unknown): string => {
  const section = text(value).trim();
  if (!section) return '';
  const normalized = section.replace(/^Section\s+/i, '');
  return `Section ${/^[a-z]$/i.test(normalized) ? normalized.toUpperCase().charCodeAt(0) - 64 : normalized}`;
};

export interface StudentExportContext {
  branchName?: string;
  filters: string;
  origin: string;
  exportedAt?: Date;
  selectedColumnKeys?: readonly string[];
}

export const buildStudentsExportSheet = (records: StudentExportRecord[], context: StudentExportContext): ExcelSheet => {
  const selected = context.selectedColumnKeys === undefined ? null : new Set(context.selectedColumnKeys);
  const groups = getStudentExportGroups()
    .map(group => ({ ...group, columns: group.columns.filter(column => !selected || selected.has(column.key)) }))
    .filter(group => group.columns.length > 0);
  const columns = groups.flatMap(group => group.columns);
  if (!columns.length) throw new Error('Choose at least one column to continue.');

  const rows = records.map(({ student: s, application, parents }) => {
    const a = application || {};
    const parentValues = (key: 'digital_id' | 'username' | 'name' | 'phone') => parents.map(parent => text(parent[key])).join('\n');
    const birthDate = s.birth_date || a.dob;
    const row = {
      studentId: text(s.digital_id), name: s.name, parentIds: parentValues('digital_id'),
      username: text(s.username), parentUsernames: parentValues('username'),
      branch: text(s.branch_name), grade: gradeLabel(s.grade), section: sectionLabel(s.section), status: text(s.status),
      enrolled: calendarDate(s.enrolled_at),
      gender: text(s.sex || a.gender), dobEC: calendarDate(birthDate),
      birthPlace: text(s.birth_place || a.place_of_birth), religion: text(a.religion), age: text(s.age || a.card_age),
      studentPhone: text(s.phone_no), linkedParentNames: parentValues('name'), linkedParentPhones: parentValues('phone'),
      admissionParentName: text(a.parent_name), admissionParentPhone: text(a.parent_phone),
      fatherName: text(a.father_name), fatherOccupation: text(a.father_occupation), fatherPhone: text(a.father_phone),
      motherName: text(a.mother_name), motherOccupation: text(a.mother_occupation), motherPhone: text(a.mother_phone),
      applicantPhone: text(a.applicant_phone), address: text(a.address), region: text(s.region), town: text(s.town),
      kebele: text(a.kebele), ketena: text(a.ketena),
      applicationDate: calendarDate(a.created_at), registeredDate: text(a.date_registered),
      previousSchool: text(a.previous_school), lastGrade: gradeLabel(a.grade),
      applicationStatus: text(a.status), paymentDate: calendarDate(a.payment_date),
      paymentAmount: a.payment_amount ?? '',
      bloodGroup: text(a.blood_group), allergies: text(a.allergies),
      conditions: text(a.chronic_conditions), medications: text(a.medications),
      transcriptType: text(a.transcript_file_type),
      recordUrl: new URL(`/students/${encodeURIComponent(s.student_id)}/record`, context.origin).href,
    };
    return Object.fromEntries(columns.map(column => [column.key, row[column.key as keyof typeof row]]));
  });
  const branchNames = [...new Set(records.map(record => record.student.branch_name).filter(Boolean))];
  const branches = branchNames.join(', ') || context.branchName || '';
  const exportTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Addis_Ababa', dateStyle: 'medium', timeStyle: 'short',
  }).format(context.exportedAt || new Date());

  return {
    name: 'Students', rows,
    report: {
      title: uiText('Student Register'),
      subtitle: `${branches} | ${rows.length} ${uiText('students')} | ${uiText('Exported')}: ${exportTime} EAT (G.C.)`,
      filters: context.filters,
      groups,
      freezeColumns: Math.min(
        columns.filter(column => column.key === 'studentId' || column.key === 'name').length,
        Math.max(0, columns.length - 1),
      ),
    },
  };
};
