import type { ExcelReportColumn, ExcelSheet } from './exportUtils';

const aliases: Record<string, string[]> = {
  date: ['date', 'weekDate', 'week_date'], pageRef: ['pageRef', 'pageReference', 'page_ref'],
  unit: ['unit', 'chapter_unit', 'chapterUnit', 'chapter'],
  topicContent: ['topicContent', 'topic_content', 'mainContent', 'main_content', 'topic', 'topic_title'],
  mainContent: ['mainContent', 'main_content', 'topicContent', 'topic_content', 'topic', 'topic_title'],
  subContent: ['subContent', 'sub_content', 'subTopic', 'sub_topic'],
  noOfSessions: ['noOfSessions', 'no_of_sessions', 'noOfPeriods', 'no_of_periods', 'periods', 'periods_week'],
  learningOutcome: ['learningOutcome', 'learning_outcome', 'competence', 'competency'],
  significanceSubject: ['significanceSubject', 'significance_subject'], priorCompetency: ['priorCompetency', 'prior_competency'],
  instructionalMaterials: ['instructionalMaterials', 'instructional_materials', 'teachingAid', 'teaching_aids', 'aids'],
  teachingMethodology: ['teachingMethodology', 'teaching_methodology', 'teachingMethod', 'teaching_method', 'method'],
  classroomManagement: ['classroomManagement', 'classroom_management'],
  evaluation: ['evaluation', 'evaluationMethod', 'evaluation_method', 'assessment', 'remark'], remark: ['remark', 'remarks'],
};
const text = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('\n');
  return String(value);
};

/** Shared by the web tables and export, including both current and legacy plan fields. */
export const getAnnualItemValue = (item: any, key: string): string => {
  if (!item) return '';
  for (const name of aliases[key] || [key]) {
    const value = text(item[name]);
    if (value.trim()) return value;
  }
  return '';
};

const annualColumns: ExcelReportColumn[] = [
  { key: 'month', header: 'Month' }, { key: 'week', header: 'Week' }, { key: 'noOfSessions', header: '# Periods' },
  { key: 'unit', header: 'Unit' }, { key: 'mainContent', header: 'Main Content' }, { key: 'subContent', header: 'Sub Content' },
  { key: 'learningOutcome', header: 'Competence' }, { key: 'teachingMethodology', header: 'Teaching Methodology' },
  { key: 'managementAid', header: 'Class Room Management / Aid' }, { key: 'evaluation', header: 'Evaluation' }, { key: 'remark', header: 'Remark' },
];
const detailedColumns: ExcelReportColumn[] = [
  { key: 'semester', header: 'Semester' }, { key: 'month', header: 'Month' }, { key: 'week', header: 'Week' },
  { key: 'date', header: 'Date' }, { key: 'pageRef', header: 'Page reference' }, { key: 'unit', header: 'Unit' },
  { key: 'topicContent', header: 'Topic/content' }, { key: 'noOfSessions', header: 'No. of sessions' },
  { key: 'learningOutcome', header: 'Minimum learning outcome' }, { key: 'significanceSubject', header: 'Significance of the subject matter' },
  { key: 'priorCompetency', header: 'Prior competency (knowledge)' }, { key: 'instructionalMaterials', header: 'Instructional materials' },
  { key: 'teachingMethodology', header: 'Teaching methodology' }, { key: 'classroomManagement', header: 'Class room management' },
  { key: 'evaluation', header: 'Evaluation' },
];
const textWidth = (value: string) => value.replace(/[\u1200-\u137f\u2d80-\u2ddf\uab00-\uab2f]/g, 'xx').length;

export function buildAnnualPlanExportSheets(plan: any): ExcelSheet[] {
  let items = plan.items;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
  // Month/week/semester-only rows belong to the blank annual-plan template.
  const rows = (Array.isArray(items) ? items : []).filter(item =>
    Object.keys(aliases).some(key => getAnnualItemValue(item, key).trim()),
  ).map(item => {
    const row: Record<string, string> = {};
    for (const key of new Set([...annualColumns, ...detailedColumns].map(column => column.key))) row[key] = getAnnualItemValue(item, key);
    if (!row.semester && row.month) row.semester = ['September', 'October', 'November', 'December', 'January'].includes(row.month) ? '1st Semester' : '2nd Semester';
    row.managementAid = [...new Set([getAnnualItemValue(item, 'classroomManagement'), getAnnualItemValue(item, 'instructionalMaterials')].filter(Boolean))].join('\n');
    return row;
  });
  const teacher = plan.teacher_name || plan.teacherName || 'Assigned Teacher';
  const subtitle = `Teacher: ${teacher} | Subject: ${plan.subject || ''} | Grade: ${plan.grade || ''} | Academic Year: ${plan.academic_year || plan.academicYear || ''}`;
  const filters = `Periods / Week: ${plan.periods_week ?? plan.periodsPerWeek ?? ''} | Working Days / Year: ${plan.working_days_year ?? ''} | Periods / Year: ${plan.periods_year ?? ''} | Duration / Period: ${plan.duration_period ?? ''} | Weeks Planned: ${rows.length}`;
  const sheet = (name: string, columns: ExcelReportColumn[]): ExcelSheet => ({
    name, rows,
    report: {
      title: 'ZIQUALA ABO SCHOOL ANNUAL LESSON PLAN', subtitle, filters, freezeColumns: 2, maxRowHeight: 409, lineHeight: 19,
      groups: [{ label: name, color: '1E293B', tint: 'F8FAFC', columns: columns.map(column => ({
        ...column, width: Math.min(64, Math.max(14, textWidth(column.header) + 3,
          ...rows.map(row => Math.max(...text(row[column.key]).split(/\r?\n/).map(textWidth)) + 3))),
      })) }],
    },
  });
  return [sheet('Annual Lesson Plan', annualColumns), sheet('Detailed Annual Plan', detailedColumns)];
}
