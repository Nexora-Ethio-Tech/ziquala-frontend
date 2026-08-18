import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Download, BarChart3, Users, BookOpen, CheckCircle2, Shield, Lock, Unlock, Clock, AlertTriangle, KeyRound, RefreshCw, Search, Filter } from 'lucide-react';
import * as vicePrincipalService from '../services/vicePrincipalService';
import {
  getCurrentECYear,
  ecYearToGregorian,
  getCurrentSemester,
  formatSemester,
  getAvailableGregorianYears,
  gregorianToECYear,
} from '../utils/ethiopianCalendar';

interface VpGradeGroup {
  id: string;
  name: string;
  grade_name?: string;
  sections: Section[];
}

interface Section {
  id: string;
  section_name: string;
  student_count: number;
  capacity: number;
}

interface Student {
  id: string;
  user_id: string;
  name: string;
  grade: string;
  section: string;
  enrollment_date: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  teacher_id?: string;
  teacher_name?: string;
}

interface StudentGrade {
  id: string;
  name: string;
  total?: number;
  average?: number;
  rank?: number;
  grades: Record<string, any>;
}

interface GradeSubmissionRecord {
  id: string;
  course_id: string;
  teacher_id: string;
  course_name: string;
  course_code: string;
  teacher_name: string;
  submission_type: string;
  academic_year: string;
  semester: number;
  submitted_at: string;
  is_locked: boolean;
  submission_stage: string;
  grade_level?: string;
  section_name?: string;
}

export const VPGradeManagement = () => {
  const [gradeSubmissionOpen, setGradeSubmissionOpen] = useState(true);
  const [grades, setGrades] = useState<VpGradeGroup[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<VpGradeGroup | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(() => ecYearToGregorian(getCurrentECYear()));
  const [selectedSemester, setSelectedSemester] = useState<string>(() => formatSemester(getCurrentSemester()));
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSectionData, setLoadingSectionData] = useState(false);
  const [generatingResults, setGeneratingResults] = useState(false);
  const [togglingSubmission, setTogglingSubmission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Submissions & Re-submission Unlock State
  const [activeTab, setActiveTab] = useState<'section-grades' | 'submissions-review'>('section-grades');
  const [submissions, setSubmissions] = useState<GradeSubmissionRecord[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Submission filter state
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'unlocked' | 'not_submitted'>('all');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [selectedSubmissionGrade, setSelectedSubmissionGrade] = useState<string>('all');
  const [selectedSubmissionSection, setSelectedSubmissionSection] = useState<string>('all');

  // Section grade status filter state
  const [sectionGradeFilter, setSectionGradeFilter] = useState<'all' | 'complete' | 'incomplete'>('all');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoadingSubmissions(true);
      const data = await vicePrincipalService.getVPGradeSubmissions();
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Failed to fetch grade submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    fetchGradesAndSections();
    fetchSubmissions();
    vicePrincipalService.getGradeSubmissionSetting()
      .then(open => setGradeSubmissionOpen(open))
      .catch(() => setGradeSubmissionOpen(true));
  }, [fetchSubmissions]);

  const handleUnlockSubmission = async (sub: GradeSubmissionRecord) => {
    const currentActiveYear = ecYearToGregorian(getCurrentECYear());
    const currentActiveSemNum = getCurrentSemester();

    // Active semester & year check
    if (sub.academic_year !== currentActiveYear || Number(sub.semester) !== Number(currentActiveSemNum)) {
      showToast('Unlock denied: Grade submission belongs to a past semester or academic year.', 'error');
      return;
    }

    // 30-day window check
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const submittedTime = sub.submitted_at ? new Date(sub.submitted_at).getTime() : 0;
    if (submittedTime > 0 && (Date.now() - submittedTime > THIRTY_DAYS_MS)) {
      showToast('Unlock denied: Grade submission is older than 30 days.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to unlock grade submission for "${sub.course_name}" (${sub.submission_type}) by ${sub.teacher_name}?\n\nThis will grant edit permission back to the teacher so they can correct and resubmit scores.`)) {
      return;
    }

    setUnlockingId(sub.id);
    try {
      const res = await vicePrincipalService.unlockGradeSubmission({
        courseId: sub.course_id,
        submissionType: sub.submission_type,
        academicYear: sub.academic_year,
        semester: sub.semester,
      });
      showToast(res.message || 'Submission successfully unlocked for teacher.', 'success');
      fetchSubmissions();
      if (selectedSection && selectedGradeGroup) {
        handleSectionSelect(selectedGradeGroup, selectedSection, selectedYear, selectedSemester);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to unlock grade submission';
      showToast(message, 'error');
    } finally {
      setUnlockingId(null);
    }
  };

  const fetchGradesAndSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vicePrincipalService.getGradesAndSections();
      setGrades(
        (Array.isArray(data) ? data : []).map((grade: any) => ({
          id: grade.id,
          name: grade.name ?? grade.grade_name ?? 'Unnamed Grade',
          grade_name: grade.grade_name ?? grade.name,
          sections: Array.isArray(grade.sections) ? grade.sections : [],
        }))
      );
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch grades and sections';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGradeSubmission = async (newValue: boolean) => {
    setTogglingSubmission(true);
    try {
      await vicePrincipalService.toggleGradeSubmission(newValue);
      setGradeSubmissionOpen(newValue);
      showToast(`System-wide grade submission window is now ${newValue ? 'OPEN' : 'CLOSED'}.`, 'success');
    } catch (err: any) {
      console.error('Failed to toggle grade submission:', err);
      showToast(err.response?.data?.message || 'Failed to update grade submission status.', 'error');
    } finally {
      setTogglingSubmission(false);
    }
  };


  const handleSectionSelect = useCallback(async (grade: VpGradeGroup, section: Section, yearOverride?: string, semOverride?: string) => {
    setSelectedGrade(grade.grade_name ?? grade.name);
    setSelectedGradeGroup(grade);
    setSelectedSection(section);
    setLoadingSectionData(true);

    const yearToUse = yearOverride ?? selectedYear;
    const semToUse = semOverride ?? selectedSemester;
    const semNum = semToUse === 'First Semester' ? 1 : 2;

    try {
      console.log(`[VPGradeManagement] Fetching data for section: ${section.id}, Year: ${yearToUse}, Semester: ${semNum} (${semToUse})`);

      const [studentsData, coursesData, gradesData] = await Promise.all([
        vicePrincipalService.getStudentsBySection(section.id, yearToUse),
        vicePrincipalService.getCoursesBySection(section.id),
        vicePrincipalService.getSectionGrades(section.id, yearToUse, semNum)
      ]);

      setStudents(studentsData);
      setCourses(coursesData);
      setStudentGrades(gradesData.grades || []);

      if (gradesData.queriedSemester !== gradesData.availableDataSemester && gradesData.availableDataSemester) {
        const semesterName = gradesData.availableDataSemester === 1 ? 'First Semester' : 'Second Semester';
        showToast(`Note: Showing grades from ${semesterName} (no data for ${semToUse})`, 'success');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch section data';
      console.error(`[VPGradeManagement] Error fetching section data:`, err);
      showToast(message, 'error');
    } finally {
      setLoadingSectionData(false);
    }
  }, [selectedYear, selectedSemester]);

  const handleGradeSelect = useCallback((gradeName: string) => {
    const grade = grades.find((g) => g.grade_name === gradeName);
    if (!grade) {
      setSelectedGrade(null);
      setSelectedGradeGroup(null);
      setSelectedSection(null);
      setStudents([]);
      setCourses([]);
      setStudentGrades([]);
      return;
    }

    setSelectedGrade(grade.grade_name ?? grade.name);
    setSelectedGradeGroup(grade);
    setSelectedSection(null);
    setStudents([]);
    setCourses([]);
    setStudentGrades([]);

    if (grade.sections.length === 1) {
      handleSectionSelect(grade, grade.sections[0]);
    }
  }, [grades, handleSectionSelect]);

  const getExportPayload = () => {
    const headers = ['Student Name', ...courses.map(c => `${c.name}${c.teacher_name ? ` (${c.teacher_name})` : ''}`), 'Total', 'Average', 'Rank'];
    const rows = studentGrades.map((student) => [
      student.name,
      ...courses.map((course) => student.grades[course.id]?.score ?? ''),
      student.total !== undefined && student.total !== null ? student.total.toFixed(2) : '',
      student.average !== undefined && student.average !== null ? `${student.average.toFixed(2)}%` : '',
      student.rank ?? ''
    ]);

    return { headers, rows };
  };

  const exportToExcel = () => {
    if (!selectedSection || studentGrades.length === 0) return;

    const { headers, rows } = getExportPayload();
    const tableRows = [
      `<tr>${headers.map((header) => `<th style="border:1px solid #d1d5db;padding:8px;text-align:left;">${header}</th>`).join('')}</tr>`,
      ...rows.map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #d1d5db;padding:8px;">${String(cell)}</td>`).join('')}</tr>`)
    ].join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);

    const element = document.createElement('a');
    element.href = url;
    element.download = `${selectedGrade}-${selectedSection.section_name}-grades.xls`;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);

    showToast('Grades exported to Excel', 'success');
  };

  useEffect(() => {
    if (selectedSection && selectedGradeGroup) {
      handleSectionSelect(selectedGradeGroup, selectedSection, selectedYear, selectedSemester);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedSemester]);

  const handleGenerateResults = async () => {
    if (!selectedSection) return;

    const semNum = selectedSemester === 'First Semester' ? 1 : 2;
    setGeneratingResults(true);
    try {
      const results = await vicePrincipalService.generateSectionResults(selectedSection.id, selectedYear, semNum);

      const updatedGrades = studentGrades.map(sg => {
        const result = results.find((r: any) => r.student_id === sg.id);
        if (result) {
          return {
            ...sg,
            total: result.total,
            average: result.average,
            rank: result.rank
          };
        }
        return sg;
      });

      setStudentGrades(updatedGrades);
      showToast('Results generated successfully', 'success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to generate results';
      showToast(message, 'error');
    } finally {
      setGeneratingResults(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">Loading grade management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 px-4 sm:px-6 lg:px-8 max-w-[95vw] xl:max-w-[1400px] mx-auto">
      {/* Header */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.2),_transparent_50%)]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-2">Grade Management</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">Student Grade Processing</h1>
          <p className="text-slate-400 text-sm max-w-2xl font-medium leading-relaxed">
            View student grades by class section, submit grades, and generate comprehensive result reports with totals, averages, and rankings.
          </p>
        </div>
      </section>

      {/* Grade Submission Window Toggle */}
      <div
        onClick={() => !togglingSubmission && handleToggleGradeSubmission(!gradeSubmissionOpen)}
        title={gradeSubmissionOpen ? 'Click to close grade submission' : 'Click to open grade submission'}
        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer select-none hover:opacity-90 active:scale-[0.99] ${
          togglingSubmission ? 'opacity-60 cursor-wait' : ''
        } ${
          gradeSubmissionOpen
            ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10'
            : 'border-rose-200 bg-rose-50 dark:bg-rose-900/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white ${gradeSubmissionOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            <Shield size={18} />
          </div>
          <div>
            <p className={`text-sm font-black uppercase tracking-tight ${gradeSubmissionOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              Grade Submission Window: {gradeSubmissionOpen ? 'OPEN' : 'CLOSED'}
            </p>
            <p className={`text-[10px] font-medium ${gradeSubmissionOpen ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
              {gradeSubmissionOpen
                ? 'Teachers can currently enter and submit grades for their assigned courses.'
                : 'System-wide grade submission is closed. Teachers cannot submit new grades.'}
            </p>
          </div>
        </div>
        <div className={`w-12 h-6 rounded-full relative transition-colors ${gradeSubmissionOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${gradeSubmissionOpen ? 'right-1' : 'left-1'}`} />
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
        <button
          onClick={() => setActiveTab('section-grades')}
          className={`flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
            activeTab === 'section-grades'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={16} />
          1. Section Grade Processing &amp; Completion Filter
        </button>
        <button
          onClick={() => setActiveTab('submissions-review')}
          className={`flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
            activeTab === 'submissions-review'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound size={16} />
          2. Teacher Submissions &amp; Re-submission Filter
          <span className="ml-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] rounded-full font-black">
            {submissions.length} Total
          </span>
        </button>
      </div>

      {/* SUBMISSIONS REVIEW & RE-SUBMISSION UNLOCK PANEL */}
      {activeTab === 'submissions-review' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <KeyRound className="text-indigo-600" size={20} />
                  Teacher Grade Submissions & Unlock Permissions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Filter submissions to detect who has and hasn't submitted grades.
                  <span className="font-semibold text-amber-600 dark:text-amber-400 ml-1">
                    (Unlock Rule: Active Semester Only &amp; &le; 30 Days From Submission)
                  </span>
                </p>
              </div>
              <button
                onClick={() => fetchSubmissions()}
                disabled={loadingSubmissions}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw size={14} className={loadingSubmissions ? 'animate-spin' : ''} />
                Refresh Submissions
              </button>
            </div>

            {/* Filter Bar */}
            {(() => {
              const formatGradeDisplay = (g?: string) => {
                if (!g) return '';
                const cleaned = g.replace(/^Grade\s*/i, '').trim();
                return cleaned ? `Grade ${cleaned}` : '';
              };

              const availableSubmissionGrades = Array.from(
                new Set(
                  submissions
                    .map(s => formatGradeDisplay(s.grade_level))
                    .filter(Boolean)
                )
              ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

              const availableSubmissionSections = Array.from(
                new Set(
                  submissions
                    .filter(s => {
                      if (selectedSubmissionGrade === 'all') return true;
                      return formatGradeDisplay(s.grade_level) === selectedSubmissionGrade;
                    })
                    .map(s => s.section_name)
                    .filter(Boolean)
                )
              ).sort();

              const scopedSubmissions = submissions.filter(s => {
                if (selectedSubmissionGrade !== 'all' && formatGradeDisplay(s.grade_level) !== selectedSubmissionGrade) return false;
                if (selectedSubmissionSection !== 'all' && s.section_name !== selectedSubmissionSection) return false;
                return true;
              });

              return (
                <>
                  <div className="flex flex-col lg:flex-row gap-3 mb-4">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by teacher, course, grade or section..."
                        value={submissionSearch}
                        onChange={(e) => setSubmissionSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {/* Grade Level Dropdown Filter */}
                    <div className="relative min-w-[160px]">
                      <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={selectedSubmissionGrade}
                        onChange={(e) => {
                          setSelectedSubmissionGrade(e.target.value);
                          setSelectedSubmissionSection('all');
                        }}
                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                      >
                        <option value="all">All Grade Levels</option>
                        {availableSubmissionGrades.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Section Dropdown Filter */}
                    <div className="relative min-w-[150px]">
                      <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={selectedSubmissionSection}
                        onChange={(e) => setSelectedSubmissionSection(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                      >
                        <option value="all">All Sections</option>
                        {availableSubmissionSections.map(sec => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 overflow-x-auto">
                      <Filter size={13} className="text-slate-400 ml-1 shrink-0" />
                      {([
                        { key: 'all',           label: 'All' },
                        { key: 'submitted',     label: 'Submitted' },
                        { key: 'not_submitted', label: 'Not Submitted' },
                        { key: 'unlocked',      label: 'Unlocked' },
                      ] as const).map(({ key, label }) => {
                        const submittedCount = scopedSubmissions.filter(s => s.is_locked || s.submission_stage === 'submitted' || s.submission_stage === 'finalized').length;
                        const notSubmittedCount = scopedSubmissions.filter(s => s.submission_stage === 'not_submitted' || !s.submitted_at).length;
                        const unlockedCount = scopedSubmissions.filter(s => !s.is_locked && s.submission_stage !== 'not_submitted' && s.submitted_at).length;
                        const count = key === 'submitted' ? submittedCount : key === 'not_submitted' ? notSubmittedCount : unlockedCount;

                        return (
                          <button
                            key={key}
                            onClick={() => setSubmissionFilter(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${
                              submissionFilter === key
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            {label}
                            {key !== 'all' && (
                              <span className="ml-1 opacity-70">
                                ({count})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Total Courses: {scopedSubmissions.length}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <Lock size={11} />
                      Submitted &amp; Locked: {scopedSubmissions.filter(s => s.is_locked || s.submission_stage === 'submitted' || s.submission_stage === 'finalized').length}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      <AlertTriangle size={11} />
                      Not Submitted / Pending: {scopedSubmissions.filter(s => s.submission_stage === 'not_submitted' || !s.submitted_at).length}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                      <Unlock size={11} />
                      Unlocked (Editable): {scopedSubmissions.filter(s => !s.is_locked && s.submission_stage !== 'not_submitted' && s.submitted_at).length}
                    </span>
                  </div>
                </>
              );
            })()}

            {loadingSubmissions ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-3" />
              </div>
            ) : (() => {
              const formatGradeDisplay = (g?: string) => {
                if (!g) return '';
                const cleaned = g.replace(/^Grade\s*/i, '').trim();
                return cleaned ? `Grade ${cleaned}` : '';
              };

              const filtered = submissions
                .filter(sub => {
                  if (selectedSubmissionGrade !== 'all' && formatGradeDisplay(sub.grade_level) !== selectedSubmissionGrade) return false;
                  if (selectedSubmissionSection !== 'all' && sub.section_name !== selectedSubmissionSection) return false;

                  const isNotSubmitted = sub.submission_stage === 'not_submitted' || !sub.submitted_at;
                  const isSubmitted = sub.is_locked || sub.submission_stage === 'submitted' || sub.submission_stage === 'finalized';
                  const isUnlocked = !sub.is_locked && !isNotSubmitted;
                  
                  if (submissionFilter === 'submitted') return isSubmitted;
                  if (submissionFilter === 'not_submitted') return isNotSubmitted;
                  if (submissionFilter === 'unlocked') return isUnlocked;
                  return true;
                })
                .filter(sub => {
                  const q = submissionSearch.toLowerCase();
                  return !q || 
                    sub.teacher_name.toLowerCase().includes(q) || 
                    sub.course_name.toLowerCase().includes(q) || 
                    sub.course_code.toLowerCase().includes(q) ||
                    (sub.grade_level && sub.grade_level.toLowerCase().includes(q)) ||
                    (sub.section_name && sub.section_name.toLowerCase().includes(q));
                });

              return filtered.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Lock className="mx-auto text-slate-400 mb-3" size={32} />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {submissions.length === 0 ? 'No Grade Submissions Found' : 'No results match your selected filters'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {submissions.length === 0
                      ? 'When teachers submit grades, they will appear here.'
                      : 'Try selecting a different Grade Level, Section, or search term.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Course & Code</th>
                        <th className="py-3 px-4">Grade & Section</th>
                        <th className="py-3 px-4">Teacher Name</th>
                        <th className="py-3 px-4">Assessment Type</th>
                        <th className="py-3 px-4">Academic Period</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">VP Permission Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filtered.map((sub) => {
                        const currentActiveYear = ecYearToGregorian(getCurrentECYear());
                        const currentActiveSemNum = getCurrentSemester();
                        const isActivePeriod = sub.academic_year === currentActiveYear && Number(sub.semester) === Number(currentActiveSemNum);
                        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
                        const submittedTime = sub.submitted_at ? new Date(sub.submitted_at).getTime() : 0;
                        const isWithin30Days = submittedTime > 0 && (Date.now() - submittedTime <= THIRTY_DAYS_MS);
                        const isEligibleToUnlock = sub.is_locked && isActivePeriod && isWithin30Days;
                        const isNotSubmitted = sub.submission_stage === 'not_submitted' || !sub.submitted_at;
                        const formattedGrade = formatGradeDisplay(sub.grade_level);

                        return (
                          <tr key={sub.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                            isNotSubmitted ? 'bg-amber-50/30 dark:bg-amber-900/10' : !sub.is_locked ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''
                          }`}>
                            <td className="py-4 px-4">
                              <p className="font-bold text-sm text-slate-800 dark:text-white">{sub.course_name}</p>
                              <p className="text-xs text-slate-400">{sub.course_code}</p>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {formattedGrade && (
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-xs">
                                    {formattedGrade}
                                  </span>
                                )}
                                {sub.section_name && (
                                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded font-bold text-xs">
                                    {sub.section_name}
                                  </span>
                                )}
                                {!formattedGrade && !sub.section_name && (
                                  <span className="text-xs text-slate-400 italic">General</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                                  {sub.teacher_name ? sub.teacher_name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{sub.teacher_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold uppercase tracking-wider">
                                {sub.submission_type}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {gregorianToECYear(sub.academic_year)} E.C. &bull; Semester {sub.semester}
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-500">
                              {sub.submitted_at ? (
                                <div className="flex items-center gap-1">
                                  <Clock size={13} className="text-slate-400" />
                                  {new Date(sub.submitted_at).toLocaleString()}
                                </div>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 italic font-semibold">Not yet submitted</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {isNotSubmitted ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-extrabold border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle size={12} />
                                  Not Submitted
                                </span>
                              ) : sub.is_locked ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-extrabold border border-rose-200 dark:border-rose-800">
                                  <Lock size={12} />
                                  Submitted &amp; Locked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-extrabold border border-emerald-200 dark:border-emerald-800">
                                  <Unlock size={12} />
                                  Unlocked (Editable)
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {isNotSubmitted ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center justify-end gap-1">
                                  <AlertTriangle size={13} /> Pending Submission
                                </span>
                              ) : isEligibleToUnlock ? (
                                <button
                                  onClick={() => handleUnlockSubmission(sub)}
                                  disabled={unlockingId === sub.id}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <KeyRound size={14} />
                                  {unlockingId === sub.id ? 'Unlocking...' : 'Unlock & Grant Edit'}
                                </button>
                              ) : sub.is_locked ? (
                                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800" title="Cannot unlock: past semester or older than 30 days.">
                                  <AlertTriangle size={13} />
                                  {!isActivePeriod ? 'Past Semester' : '30-Day Expired'}
                                </div>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Teacher Can Edit</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* SECTION GRADE PROCESSING CONTENT */}
      {activeTab === 'section-grades' && (
        <>
          {/* Academic Period Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 items-end">
              <div className="flex-1">
                <label htmlFor="vp-academic-year" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Academic Year
                </label>
                <div className="relative">
                  <select
                    id="vp-academic-year"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
                  >
                    {getAvailableGregorianYears().map((year) => {
                      const ecYear = gregorianToECYear(year);
                      return (
                        <option key={year} value={year}>
                          {ecYear} E.C. ({year})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="vp-semester" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Semester
                </label>
                <div className="relative">
                  <select
                    id="vp-semester"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
                  >
                    <option>First Semester</option>
                    <option>Second Semester</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1 flex items-end">
                <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-sm">
                  <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Viewing</span>
                  <p className="font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                    {gregorianToECYear(selectedYear)} E.C. &bull; {selectedSemester}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Grade and Section Selection */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Grade Dropdown */}
              <div>
                <label htmlFor="vp-grade" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Grade
                </label>
                <div className="relative">
                  <select
                    id="vp-grade"
                    value={selectedGrade ?? ''}
                    onChange={(e) => {
                      const gradeName = e.target.value;
                      if (gradeName) {
                        handleGradeSelect(gradeName);
                      } else {
                        setSelectedGrade(null);
                        setSelectedGradeGroup(null);
                        setSelectedSection(null);
                        setStudents([]);
                        setCourses([]);
                        setStudentGrades([]);
                      }
                    }}
                    className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
                    title="Select a grade"
                  >
                    <option value="">Select Grade</option>
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.grade_name ?? grade.name}>
                        {grade.grade_name ?? grade.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Section Dropdown */}
              <div>
                <label htmlFor="vp-section" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Section
                </label>
                <div className="relative">
                  <select
                    id="vp-section"
                    value={selectedSection?.id ?? ''}
                    onChange={(e) => {
                      const sectionId = e.target.value;
                      if (sectionId && selectedGradeGroup) {
                        const section = selectedGradeGroup.sections.find((s) => s.id === sectionId);
                        if (section) {
                          handleSectionSelect(selectedGradeGroup, section);
                        }
                      } else {
                        setSelectedSection(null);
                        setStudents([]);
                        setCourses([]);
                        setStudentGrades([]);
                      }
                    }}
                    disabled={!selectedGradeGroup}
                    className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Select a section (choose a grade first)"
                  >
                    <option value="">
                      {selectedGradeGroup ? 'Select Section' : 'Choose Grade First'}
                    </option>
                    {selectedGradeGroup?.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.section_name} ({section.student_count}/{section.capacity})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section Content */}
          {selectedSection && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <Users className="text-blue-600 dark:text-blue-400" size={18} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Total Students</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{students.length}</p>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                      <BookOpen className="text-emerald-600 dark:text-emerald-400" size={18} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Total Courses</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{courses.length}</p>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <BarChart3 className="text-purple-600 dark:text-purple-400" size={18} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Grades Submitted</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">
                    {studentGrades.filter(sg => Object.keys(sg.grades).length > 0).length}
                  </p>
                </div>
              </div>

              {/* Controls & Submission Status Filter */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Grade Actions &amp; Submission Filter</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Filter students by grade completion or calculate section results</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Student Grade Filter */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <Filter size={13} className="text-slate-400 ml-1" />
                      <button
                        onClick={() => setSectionGradeFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                          sectionGradeFilter === 'all'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        All ({studentGrades.length})
                      </button>
                      <button
                        onClick={() => setSectionGradeFilter('complete')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                          sectionGradeFilter === 'complete'
                            ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Complete ({studentGrades.filter(s => Object.keys(s.grades).length === courses.length && courses.length > 0).length})
                      </button>
                      <button
                        onClick={() => setSectionGradeFilter('incomplete')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                          sectionGradeFilter === 'incomplete'
                            ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Incomplete / Missing ({studentGrades.filter(s => Object.keys(s.grades).length < courses.length).length})
                      </button>
                    </div>

                    <button
                      onClick={handleGenerateResults}
                      disabled={generatingResults || students.length === 0}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                    >
                      {generatingResults ? 'Generating...' : 'Generate Results'}
                    </button>
                    <button
                      onClick={exportToExcel}
                      disabled={studentGrades.length === 0}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/10"
                    >
                      <Download size={14} />
                      Export Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Grades Table */}
              {loadingSectionData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Loading grades...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Student Name</th>
                        {courses.map((course) => (
                          <th key={course.id} className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap">
                            <div>{course.name}</div>
                            {course.teacher_name && (
                              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                                {course.teacher_name}
                              </div>
                            )}
                          </th>
                        ))}
                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Total</th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Average</th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Rank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {studentGrades
                        .filter((student) => {
                          const gradeCount = Object.keys(student.grades).length;
                          if (sectionGradeFilter === 'complete') return gradeCount === courses.length && courses.length > 0;
                          if (sectionGradeFilter === 'incomplete') return gradeCount < courses.length;
                          return true;
                        })
                        .map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800 dark:text-white">{student.name}</div>
                          </td>
                          {courses.map((course) => (
                            <td key={course.id} className="px-4 py-4 text-center">
                              {student.grades[course.id] ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-semibold text-slate-800 dark:text-white">
                                    {student.grades[course.id].score}
                                  </span>
                                  {student.grades[course.id].score && (
                                    <CheckCircle2 className="text-emerald-500" size={14} />
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-4 text-center font-semibold text-slate-800 dark:text-white">
                            {student.total ? student.total.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-4 text-center font-semibold text-slate-800 dark:text-white">
                            {student.average ? `${student.average.toFixed(2)}%` : '-'}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {student.rank ? (
                              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-bold">
                                {student.rank}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {studentGrades.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-slate-500 dark:text-slate-400">No grades found for this section</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
            }`}>
            <CheckCircle2 className="text-emerald-500" size={20} />
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
