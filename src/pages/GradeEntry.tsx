import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { Save, Lock, ArrowLeft, ChevronRight, Users, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
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
  const { gradesLocked } = useUser();

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
  const [submitted, setSubmitted] = useState(false);
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
            getCourseGrades(courseId),
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
            if (sub.course_id === courseId) {
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
  }, []);

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
  }, [initialClassId, initialCourseId, initialSubject, handleSelectClass]);

  const handleScoreChange = (studentId: string, methodId: string, value: string) => {
    if (lockedMethods.has(methodId) || gradesLocked) return;
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

  const getInvalidEntries = useCallback(() => {
    const invalidList: Array<{
      studentId: string;
      studentName: string;
      methodId: string;
      methodLabel: string;
      score: number;
      maxWeight: number;
    }> = [];

    for (const student of students) {
      const studentScores = scores[student.id] || {};
      const fullName = (student.firstName || student.lastName)
        ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
        : ((student as any).name || 'Student');

      for (const method of gradingMethods) {
        if (lockedMethods.has(method.id)) continue;
        const val = studentScores[method.id];
        if (val !== '' && val !== undefined && val !== null) {
          const numScore = Number(val);
          if (numScore > method.maxWeight || numScore < 0) {
            invalidList.push({
              studentId: student.id,
              studentName: fullName,
              methodId: method.id,
              methodLabel: method.label,
              score: numScore,
              maxWeight: method.maxWeight,
            });
          }
        }
      }
    }

    return invalidList;
  }, [students, scores, gradingMethods, lockedMethods]);

  const handleSave = async () => {
    if (gradesLocked || !selectedCourseId || periodBlocked) return;
    const invalidEntries = getInvalidEntries();
    if (invalidEntries.length > 0) {
      setShowValidationErrors(true);
      const firstErr = invalidEntries[0];
      setSaveError(
        `⚠️ Cannot Save: Score for ${firstErr.studentName} on "${firstErr.methodLabel}" is ${firstErr.score}, which exceeds the maximum allowed weight of ${firstErr.maxWeight}. Please correct the highlighted red field(s) below.`
      );
      return;
    }
    setShowValidationErrors(false);

    setSaving(true);
    setSaveError('');
    try {
      const gradeEntries: Array<{ studentId: string; type: string; score: number; total: number; weight: string }> = [];
      for (const student of students) {
        const studentScores = scores[student.id] || {};
        for (const method of gradingMethods) {
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
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to save grades. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitGrades = async () => {
    if (gradesLocked || !selectedCourseId) return;
    const invalidEntries = getInvalidEntries();
    if (invalidEntries.length > 0) {
      setShowValidationErrors(true);
      const firstErr = invalidEntries[0];
      setSaveError(
        `⚠️ Cannot Submit: Score for ${firstErr.studentName} on "${firstErr.methodLabel}" is ${firstErr.score}, which exceeds the maximum allowed weight of ${firstErr.maxWeight}. Please correct the highlighted red field(s) below.`
      );
      return;
    }
    setShowValidationErrors(false);

    // Confirm with user
    if (!window.confirm('Are you sure you want to Submit? Once submitted, these grades will be LOCKED and visible to the administration, parents, and students. You will not be able to edit them.')) return;
    
    setSubmittingGrades(true);
    setSaveError('');
    try {
      // 1. Save any pending changes first
      await handleSave();
      
      // 2. Lock all unlocked methods
      const newLocks = new Set(lockedMethods);
                for (const method of gradingMethods) {
            if (!lockedMethods.has(method.id)) {
              // Check if there are actually any scores for this method to prevent empty submissions
              const hasScores = students.some(s => scores[s.id]?.[method.id] !== '' && scores[s.id]?.[method.id] !== undefined);
              if (hasScores) {
                try {
                  await submitCourseGrades(selectedCourseId, method.id);
                  newLocks.add(method.id);
                } catch (err: any) {
                  // If already submitted and locked, just add to locks and continue
                  const errMsg = err?.response?.data?.error?.message || err?.response?.data?.message || '';
                  if (errMsg.includes('already been submitted')) {
                    newLocks.add(method.id);
                  } else {
                    throw err;
                  }
                }
              }
            }
          }
      setLockedMethods(newLocks);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to submit and lock grades. Please try again.');
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

        {!gradesLocked && !isLoading && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={periodBlocked || saving || submittingGrades || (gradingMethods.length > 0 && gradingMethods.every(m => lockedMethods.has(m.id)))}
              className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-white rounded-xl flex items-center gap-2 font-bold transition-all"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving…' : 'Save Draft'}</span>
            </button>
            <button
              onClick={handleSubmitGrades}
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

      {submitted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-6 py-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="bg-emerald-500 text-white p-1 rounded-full"><Save size={14} /></div>
          <span className="font-bold text-sm">Grades saved successfully!</span>
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
                                disabled={gradesLocked || isLocked}
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
    </div>
  );
};
