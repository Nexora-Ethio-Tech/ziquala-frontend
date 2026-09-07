import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { Save, Lock, ArrowLeft, ChevronRight, Users, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getMyClasses, getClassStudents, bulkEnterGrades, getCourseGrades, getGradingConfigsForGrade, submitCourseGrades, getGradeSubmissions, TeacherClass, ClassStudent } from '../services/teacherService';
import {
  getCurrentECYear,
  ecYearToGregorian,
  getCurrentSemester,
  formatSemester,
  getAvailableGregorianYears,
  gregorianToECYear,
  isYearAccessible,
  isSemesterAccessible,
} from '../utils/ethiopianCalendar';

type GradingMethod = { id: string; label: string; maxWeight: number };

// In-memory score store: { [studentId]: { [methodId]: score } }
type ScoreMap = Record<string, Record<string, number | ''>>;

export const GradeEntry = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gradesLocked, gradeSubmissionOpen } = useUser();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState('');

  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [gradingMethods, setGradingMethods] = useState<GradingMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const [scores, setScores] = useState<ScoreMap>({});
  const [lockedMethods, setLockedMethods] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [submittingGrades, setSubmittingGrades] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedSubmissionMethods, setSelectedSubmissionMethods] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(() => ecYearToGregorian(getCurrentECYear()));
  const [selectedSemester, setSelectedSemester] = useState<'First Semester' | 'Second Semester'>(
    () => formatSemester(getCurrentSemester()) as 'First Semester' | 'Second Semester'
  );

  // Derived: is the currently-selected period accessible?
  const semNum = selectedSemester === 'First Semester' ? 1 : 2;
  const periodBlocked = !isYearAccessible(selectedYear) || !isSemesterAccessible(selectedYear, semNum as 1 | 2);

  const initialClassId = searchParams.get('classId');
  const initialCourseId = searchParams.get('courseId');
  const initialSubject = searchParams.get('subject');

  // Load students and grading config when a class is selected
  const handleSelectClass = useCallback(async (cls: TeacherClass, courseId: string, subject: string) => {
    setSelectedClass(cls);
    setSelectedCourseId(courseId);
    setSelectedSubject(subject);
    setStudents([]);
    setGradingMethods([]);
    setScores({});
    setLockedMethods(new Set());
    setShowSubmitModal(false);
    setSelectedSubmissionMethods(new Set());
    setSaveError('');

    setLoadingStudents(true);
    setLoadingMethods(true);

    const rosterClassId = (cls as any).class_id || cls.id;
    getClassStudents(rosterClassId)
      .then((data) => setStudents(data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));

    // Load grading methods for this grade level, then prefill existing grades
    const gradeLevel = cls.gradeLevel || (cls as any).grade_level || cls.name?.replace(/\D/g, '') || 'default';
    getGradingConfigsForGrade(gradeLevel)
      .then(async (methods) => {
        if (methods.length === 0) {
          setSaveError(`No grading configuration found for Grade ${gradeLevel}. Please ask your admin to configure it in Settings.`);
          setGradingMethods([]);
        } else {
          setGradingMethods(methods);
        }

        // Prefill existing grades for this course
        try {
          const [existing, submissions] = await Promise.all([
            getCourseGrades(courseId, selectedYear, semNum),
            getGradeSubmissions()
          ]);
          const prefill: ScoreMap = {};
          const locks = new Set<string>();
          for (const g of (existing || [])) {
            if (!prefill[g.student_id]) prefill[g.student_id] = {};
            // match by type (method id)
            prefill[g.student_id][g.type] = g.score ?? '';
            if (g.is_submitted) {
              locks.add(g.type);
            }
          }
          // Also check explicit submissions in case there were no grades entered when it was locked
          for (const sub of (submissions || [])) {
            const sameYear = !sub.academic_year || sub.academic_year === selectedYear;
            const sameSemester = sub.semester === undefined || sub.semester === null || Number(sub.semester) === semNum;
            if (sub.course_id === courseId && sameYear && sameSemester && sub.is_locked !== false) {
              locks.add(sub.submission_type);
            }
          }
          setScores(prefill);
          setLockedMethods(locks);
        } catch { /* no prefill */ }
      })
      .catch((err) => {
        setSaveError(`Could not load grading components: ${err?.message || 'Unknown error'}. Please try again.`);
        setGradingMethods([]);
      })
      .finally(() => setLoadingMethods(false));
  }, [selectedYear, semNum]);

  // Load teacher's classes on mount
  useEffect(() => {
    setLoadingClasses(true);
    getMyClasses('grades')
      .then((data) => {
        setClasses(data || []);
        if (initialClassId && initialCourseId && initialSubject && data) {
          const matched = data.find((c: any) => c.id === initialClassId || (c as any).class_id === initialClassId || (c as any).course_id === initialCourseId || (c as any).course_id === initialClassId);
          if (matched) {
            const realCourseId = matched.course_id || initialCourseId;
            handleSelectClass(matched, realCourseId, initialSubject);
          }
        }
      })
      .catch(() => setClassError('Could not load your classes. Please try again.'))
      .finally(() => setLoadingClasses(false));
    // Class discovery should not rerun merely because the teacher changes period.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClassId, initialCourseId, initialSubject]);

  // Reload period-scoped scores and locks when the teacher changes year/semester.
  useEffect(() => {
    if (selectedClass && selectedCourseId && selectedSubject) {
      handleSelectClass(selectedClass, selectedCourseId, selectedSubject);
    }
    // Selection changes are handled directly by handleSelectClass; this effect is
    // intentionally reserved for academic-period changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedSemester]);

  const handleScoreChange = (studentId: string, methodId: string, value: string) => {
    if (lockedMethods.has(methodId) || gradesLocked || !gradeSubmissionOpen) return;
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [methodId]: value === '' ? '' : Number(value) },
    }));
  };

  const getTotal = (studentId: string) => {
    const studentScores = scores[studentId] || {};
    return gradingMethods.reduce((sum, m) => {
      const score = Number(studentScores[m.id] ?? 0);
      const maxPossible = m.maxWeight;
      // Score is entered out of maxWeight, so just sum directly
      return sum + Math.min(score, maxPossible);
    }, 0);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getAssessmentScoreCount = (methodId: string) => students.filter((student) => {
    const score = scores[student.id]?.[methodId];
    return score !== '' && score !== undefined;
  }).length;

  const getInvalidEntries = useCallback(() => {
    const invalidList: Array<{ studentId: string; studentName: string; methodId: string; methodLabel: string; score: number; maxWeight: number }> = [];
    for (const student of students) {
      const studentScores = scores[student.id] || {};
      const studentName = (student.firstName || student.lastName)
        ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
        : ((student as any).name || 'Student');
      for (const method of gradingMethods) {
        if (lockedMethods.has(method.id)) continue;
        const value = studentScores[method.id];
        if (value !== '' && value !== undefined && value !== null) {
          const score = Number(value);
          if (score > method.maxWeight || score < 0) invalidList.push({ studentId: student.id, studentName, methodId: method.id, methodLabel: method.label, score, maxWeight: method.maxWeight });
        }
      }
    }
    return invalidList;
  }, [students, scores, gradingMethods, lockedMethods]);

  const handleSave = async (showConfirmation = true, methodIds?: Set<string>): Promise<boolean> => {
    if (gradesLocked || !gradeSubmissionOpen || !selectedCourseId || periodBlocked) return false;
    const invalidEntries = getInvalidEntries();
    if (invalidEntries.length > 0) {
      setShowValidationErrors(true);
      const firstErr = invalidEntries[0];
      setSaveError(`Cannot save: ${firstErr.studentName}'s ${firstErr.methodLabel} score (${firstErr.score}) exceeds the maximum ${firstErr.maxWeight}.`);
      return false;
    }
    setShowValidationErrors(false);
    setSaving(true);
    setSaveError('');
    try {
      const gradeEntries: Array<{ studentId: string; type: string; score: number; total: number; weight: string }> = [];
      for (const student of students) {
        const studentScores = scores[student.id] || {};
        for (const method of gradingMethods) {
          if (methodIds && !methodIds.has(method.id)) continue;
          if (lockedMethods.has(method.id)) continue; // skip already locked grades
          const score = studentScores[method.id];
          if (score !== '' && score !== undefined) {
            gradeEntries.push({
              studentId: student.id,
              type: method.id,
              score: Number(score),
              total: method.maxWeight,
              weight: String(method.maxWeight),
            });
          }
        }
      }
      if (gradeEntries.length > 0) {
        const semNum = selectedSemester === 'First Semester' ? 1 : 2;
        await bulkEnterGrades({
          courseId: selectedCourseId,
          academicYear: selectedYear,
          semester: semNum,
          grades: gradeEntries,
        });
      }
      if (showConfirmation) showSuccess('Draft grades saved successfully.');
      return true;
    } catch (err: any) {
      setSaveError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to save grades. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSubmitModal = () => {
    if (gradesLocked || !gradeSubmissionOpen || !selectedCourseId || periodBlocked) return;
    setSelectedSubmissionMethods(new Set());
    setShowSubmitModal(true);
  };

  const toggleSubmissionMethod = (methodId: string) => {
    if (lockedMethods.has(methodId) || getAssessmentScoreCount(methodId) === 0) return;
    setSelectedSubmissionMethods((current) => {
      const next = new Set(current);
      if (next.has(methodId)) next.delete(methodId);
      else next.add(methodId);
      return next;
    });
  };

  const handleSubmitGrades = async () => {
    if (gradesLocked || !gradeSubmissionOpen || !selectedCourseId || periodBlocked || selectedSubmissionMethods.size === 0) return;

    const methodsToSubmit = gradingMethods.filter((method) =>
      selectedSubmissionMethods.has(method.id)
      && !lockedMethods.has(method.id)
      && getAssessmentScoreCount(method.id) > 0
    );
    if (methodsToSubmit.length === 0) return;
    const invalidEntries = getInvalidEntries();
    if (invalidEntries.length > 0) {
      setShowValidationErrors(true);
      const firstErr = invalidEntries[0];
      setSaveError(
        `Cannot submit: ${firstErr.studentName}'s ${firstErr.methodLabel} score (${firstErr.score}) exceeds the maximum ${firstErr.maxWeight}.`
      );
      return;
    }
    setShowValidationErrors(false);
    setSubmittingGrades(true);
    setSaveError('');
    try {
      // Save pending score changes first. Unselected assessments remain drafts.
      const saved = await handleSave(false, new Set(methodsToSubmit.map((method) => method.id)));
      if (!saved) return;

      const newLocks = new Set(lockedMethods);
      const failedMethods: string[] = [];

      for (const method of methodsToSubmit) {
        try {
          await submitCourseGrades(selectedCourseId, method.id, {
            academicYear: selectedYear,
            semester: semNum,
          });
          newLocks.add(method.id);
        } catch (err: any) {
          const errMsg = err?.response?.data?.error?.message || err?.response?.data?.message || '';
          if (errMsg.includes('already been submitted')) {
            newLocks.add(method.id);
          } else {
            failedMethods.push(method.id);
          }
        }
      }

      setLockedMethods(newLocks);

      if (failedMethods.length > 0) {
        const failedLabels = gradingMethods
          .filter((method) => failedMethods.includes(method.id))
          .map((method) => method.label)
          .join(', ');
        setSelectedSubmissionMethods(new Set(failedMethods));
        setSaveError(`Some assessments could not be submitted: ${failedLabels}. Please try again.`);
      } else {
        setShowSubmitModal(false);
        setSelectedSubmissionMethods(new Set());
        showSuccess(`${methodsToSubmit.length} assessment${methodsToSubmit.length === 1 ? '' : 's'} submitted and locked successfully.`);
      }
    } finally {
      setSubmittingGrades(false);
    }
  };

  // ── Class selection screen ────────────────────────────────────────────────
  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <Breadcrumbs />
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('gradeEntry.gradeEntry', 'Grade Entry')}</h2>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2">{t('gradeEntry.selectClassAndSubject', 'Select a Class & Subject')}</h3>
          <p className="text-blue-700 dark:text-blue-400 text-sm">{t('gradeEntry.selectClassAndSubjectSub', 'Choose one of your assigned classes and the subject you want to enter grades for.')}</p>
        </div>

        {classError && (
          <div className="flex gap-3 items-center p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-rose-600 text-sm font-medium">
            <AlertCircle size={18} />
            {classError}
          </div>
        )}

        {loadingClasses ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm font-medium">{t('gradeEntry.noClassesAssignedToYou', 'No classes assigned to you yet.')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={(cls as any).course_id || cls.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-100 dark:bg-blue-950/30 p-3 rounded-xl text-blue-600">
                    <Users size={24} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{cls.name}{cls.section ? ` — ${cls.section}` : ''}</h3>
                <p className="text-sm text-slate-500 mb-6">{cls.enrolledStudents ?? '—'} Students Enrolled</p>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Subject</p>
                  {(cls as any).course_id ? (
                    <button
                      onClick={() => handleSelectClass(cls, (cls as any).course_id, cls.subject)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 hover:text-white transition-all text-sm font-medium"
                    >
                      {cls.subject}
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No subject assigned</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Grade entry table ─────────────────────────────────────────────────────
  const isLoading = loadingStudents || loadingMethods;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => { setSelectedClass(null); setSelectedCourseId(null); setSelectedSubject(null); }}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest w-fit"
        >
          <ArrowLeft size={14} />
          Back to Class Selection
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedClass.name}{selectedClass.section ? ` — ${selectedClass.section}` : ''}</h2>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase">
              {selectedSubject}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
              aria-label="Academic Year"
            >
              {getAvailableGregorianYears().map((year) => (
                <option key={year} value={year}>
                  {gregorianToECYear(year)} E.C. ({year})
                </option>
              ))}
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as 'First Semester' | 'Second Semester')}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
              aria-label="Semester"
            >
              <option>First Semester</option>
              <option>Second Semester</option>
            </select>
            {periodBlocked && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-semibold">
                <AlertCircle size={14} />
                This academic period is not yet active — grade entry is disabled.
              </div>
            )}
          </div>
          {gradingMethods.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Assessment methods: {gradingMethods.map(m => `${m.label} (${m.maxWeight})`).join(' → ')}
            </p>
          )}
        </div>

        {!gradesLocked && gradeSubmissionOpen && !isLoading && (
          <div className="flex gap-3">
            <button
              onClick={() => void handleSave()}
              disabled={periodBlocked || saving || submittingGrades || (gradingMethods.length > 0 && gradingMethods.every(m => lockedMethods.has(m.id)))}
              className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-white rounded-xl flex items-center gap-2 font-bold transition-all"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving…' : 'Save Grades'}</span>
            </button>
            <button
              onClick={handleOpenSubmitModal}
              disabled={periodBlocked || saving || submittingGrades || (gradingMethods.length > 0 && gradingMethods.every(m => lockedMethods.has(m.id)))}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all"
            >
              {submittingGrades ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              <span>{submittingGrades ? 'Submitting…' : 'Submit Grades'}</span>
            </button>
          </div>
        )}
      </div>

      {gradingMethods.length > 0 && gradingMethods.every(m => lockedMethods.has(m.id)) && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
          <Lock size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">All Grades Submitted &amp; Locked</p>
            <p className="text-xs opacity-80">All grades for this course have been officially submitted to the administration. They are now locked and cannot be edited anymore.</p>
          </div>
        </div>
      )}

      {gradesLocked && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300">
          <Lock size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Grade Insertion is Currently Locked</p>
            <p className="text-xs opacity-80">The administration has closed the window for grade entry. You can view scores but cannot modify them.</p>
          </div>
        </div>
      )}

      {!gradesLocked && !gradeSubmissionOpen && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-4 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300">
          <Lock size={20} className="text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Grade Submission Window is Closed</p>
            <p className="text-xs opacity-80">The Vice Principal has temporarily closed grade entry and submission.</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-6 py-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="bg-emerald-500 text-white p-1 rounded-full"><Save size={14} /></div>
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}



      {saveError && (
        <div className="flex gap-3 items-center p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 text-sm font-medium">
          <AlertCircle size={18} className="flex-shrink-0" />
          {saveError}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: `${300 + gradingMethods.length * 140}px` }}>
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Digital ID</th>
                  {gradingMethods.map((method) => (
                    <th key={method.id} className="px-4 py-4 text-center w-32">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{method.label}</p>
                      <p className="text-[10px] font-black text-blue-500 mt-0.5">/{method.maxWeight}</p>
                    </th>
                  ))}
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={gradingMethods.length + 3} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No students enrolled in this class.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const total = getTotal(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{(student.firstName || student.lastName) ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : ((student as any).name || 'Student')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-mono text-slate-500">{student.digitalId || (student as any).digital_id || '—'}</p>
                        </td>
                        {gradingMethods.map((method) => {
                          const isLocked = lockedMethods.has(method.id);
                          const val = scores[student.id]?.[method.id];
                          const numVal = val !== '' && val !== undefined && val !== null ? Number(val) : null;
                          const isExceeded = numVal !== null && numVal > method.maxWeight;
                          const isNegative = numVal !== null && numVal < 0;
                          const isInvalid = showValidationErrors && (isExceeded || isNegative);
                          return (
                            <td key={method.id} className="px-4 py-4">
                              <input
                                disabled={gradesLocked || !gradeSubmissionOpen || isLocked}
                                type="number"
                                min={0}
                                max={method.maxWeight}
                                placeholder="0"
                                value={scores[student.id]?.[method.id] ?? ''}
                                onChange={(e) => handleScoreChange(student.id, method.id, e.target.value)}
                                className={`w-full text-center p-2 rounded-lg text-sm outline-none transition-all font-bold ${
                                  isInvalid
                                    ? 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-600 dark:text-rose-300 focus:ring-2 focus:ring-rose-500 animate-pulse shadow-sm shadow-rose-200'
                                    : isLocked
                                    ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500 disabled:opacity-70'
                                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500'
                                }`}
                              />
                              {showValidationErrors && isExceeded && (
                                <span className="block text-[10px] font-black text-rose-600 dark:text-rose-400 text-center mt-1 uppercase tracking-tight">
                                  Exceeds {method.maxWeight}!
                                </span>
                              )}
                              {showValidationErrors && isNegative && (
                                <span className="block text-[10px] font-black text-rose-600 dark:text-rose-400 text-center mt-1 uppercase tracking-tight">
                                  Negative!
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-right">
                          <span className={`font-black text-base ${total >= 80 ? 'text-emerald-600' : total >= 60 ? 'text-blue-600' : total >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>
                            {total}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">/100</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-assessments-title"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 p-6">
              <div>
                <h3 id="submit-assessments-title" className="text-xl font-black text-slate-900 dark:text-white">
                  Choose Assessments to Submit
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedSubject} &bull; {gregorianToECYear(selectedYear)} E.C. &bull; {selectedSemester}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submittingGrades}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-50"
                aria-label="Close submission dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto p-6">
              {gradingMethods.map((method) => {
                const scoreCount = getAssessmentScoreCount(method.id);
                const isLocked = lockedMethods.has(method.id);
                const isAvailable = !isLocked && scoreCount > 0;
                const isSelected = selectedSubmissionMethods.has(method.id);

                return (
                  <label
                    key={method.id}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                      isAvailable
                        ? 'cursor-pointer border-slate-200 hover:border-blue-400 dark:border-slate-700 dark:hover:border-blue-500'
                        : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-800/40'
                    } ${isSelected ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/20' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSubmissionMethod(method.id)}
                      disabled={!isAvailable || submittingGrades}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 dark:text-white">{method.label}</p>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">/{method.maxWeight}</span>
                      </div>
                      <p className={`mt-1 text-xs font-semibold ${
                        isLocked
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : scoreCount === 0
                            ? 'text-slate-400'
                            : scoreCount < students.length
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {isLocked
                          ? 'Already submitted and locked'
                          : scoreCount === 0
                            ? 'No scores entered — unavailable'
                            : `${scoreCount}/${students.length} students scored`}
                      </p>
                    </div>
                  </label>
                );
              })}

              {!gradingMethods.some((method) => !lockedMethods.has(method.id) && getAssessmentScoreCount(method.id) > 0) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                  There are no assessments available to submit. Enter and save at least one score first.
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                <Lock size={18} className="mt-0.5 shrink-0" />
                <p className="text-xs font-semibold leading-relaxed">
                  Only the selected assessments will be submitted and locked. All other assessments will remain editable drafts.
                </p>
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submittingGrades}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitGrades()}
                  disabled={submittingGrades || selectedSubmissionMethods.size === 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingGrades ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle size={17} />}
                  {submittingGrades
                    ? 'Submitting…'
                    : `Submit ${selectedSubmissionMethods.size || ''} Assessment${selectedSubmissionMethods.size === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
