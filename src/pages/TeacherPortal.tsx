import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Users, Calendar, ArrowRight, ArrowLeft, ClipboardList, FileText, Plus, X, CheckCircle2, XCircle, Loader2, Star, Save, Send, Search, ChevronLeft, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import { getTodayEthiopianDate, gregorianToEthiopian, formatEthiopianLabel } from '../utils/ethiopianCalendar';
import {
  getTeacherDashboard,
  getMyWeeklyPlans,
  submitWeeklyPlan,
  updateWeeklyPlan,
  getMyClasses,
  getClassStudents,
  getDepartmentHeads,
  getDeptPlans,
  reviewDeptPlan,
  submitCommunicationLog,
  getCommunicationLogs,
  getCommunicationLogsByWeek,
  getSchoolAnnouncements,
  submitAnnualPlan,
  getMyAnnualPlans,
  updateAnnualPlan,
  getDeptAnnualPlans,
  reviewDeptAnnualPlan
} from '../services/teacherService';
import {
  getTeacherExams,
  saveTeacherExam,
  updateTeacherExam,
  publishTeacherExam,
  deleteTeacherExam,
  getGradesForExams,
  getCoursesByGradeForExams,
  getTeacherCoursesForExams
} from '../services/examService';

const normalizeGrade = (grade: any): string => {
  if (!grade) return '';
  const trimmed = String(grade).trim();
  return /^\d+$/.test(trimmed) ? `Grade ${trimmed}` : trimmed;
};

const matchGrade = (hodGrades: any[], courseGrade: any): boolean => {
  if (!hodGrades || !Array.isArray(hodGrades)) return false;
  if (!courseGrade) return true;
  const normalizedCourseGrade = normalizeGrade(courseGrade).toLowerCase();
  const rawCourseGrade = String(courseGrade).trim().toLowerCase();
  return hodGrades.some(g => {
    const normG = String(g).trim().toLowerCase();
    return normG === normalizedCourseGrade || normG === rawCourseGrade;
  });
};

export const TeacherPortal = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'exams' | 'dept-tasks'>('overview');
  const [dashboard, setDashboard] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const storeNotices = useStore((state) => state.notices);

  const mergedAnnouncements = (() => {
    const map = new Map<string, any>();
    announcements.forEach((a: any) => {
      const id = String(a.id);
      map.set(id, {
        id,
        title: a.title,
        content: a.content,
        priority: a.priority || 'Normal',
        category: a.category || 'Academic',
        timestamp: a.timestamp || a.created_at || a.time || new Date().toISOString(),
        posted_by_name: a.posted_by_name || 'School Admin'
      });
    });
    storeNotices
      .filter((n) => !n.audience || n.audience.length === 0 || n.audience.includes('teacher') || n.audience.includes('all') || n.audience.includes('academic'))
      .forEach((n) => {
        const id = String(n.id);
        if (!map.has(id)) {
          map.set(id, {
            id,
            title: n.title,
            content: n.content,
            priority: n.priority || 'Normal',
            category: n.category || 'Academic',
            timestamp: n.time || new Date().toISOString(),
            posted_by_name: 'School Admin'
          });
        }
      });
    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  })();
  const [loading, setLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Exams states
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [draftExams, setDraftExams] = useState<any[]>([]);
  const [publishedExams, setPublishedExams] = useState<any[]>([]);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [examForm, setExamForm] = useState({
    title: '',
    examType: 'Mid Exam',
    totalMarks: 100,
    duration: 60,
    instructions: '',
    selectedClass: '',
    selectedSection: '',
    gradeId: '',
    subjectId: '',
    examPassword: '',
    isLocked: false,
    passwordRequired: false,
    questions: [] as any[],
  });

  // Grade and Subject selection states
  const [gradesForExam, setGradesForExam] = useState<any[]>([]);
  const [coursesForGrade, setCoursesForGrade] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Department Tasks states
  const [deptSearch, setDeptSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('Pending');
  const [reviewingPlanId, setReviewingPlanId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [deptPlans, setDeptPlans] = useState<any[]>([]);

  // Dept tasks sub-tab: weekly | annual
  const [deptTaskSubTab, setDeptTaskSubTab] = useState<'weekly' | 'annual'>('weekly');

  // Annual Plan states
  const [annualPlans, setAnnualPlans] = useState<any[]>([]);
  const [deptAnnualPlans, setDeptAnnualPlans] = useState<any[]>([]);
  const [isAnnualModalOpen, setIsAnnualModalOpen] = useState(false);
  const [editingAnnualPlan, setEditingAnnualPlan] = useState<any>(null);
  const [annualSearch, setAnnualSearch] = useState('');
  const [annualDeptFilter, setAnnualDeptFilter] = useState('Pending');
  const [annualReviewRating, setAnnualReviewRating] = useState(0);
  const [annualReviewFeedback, setAnnualReviewFeedback] = useState('');
  const [selectedAnnualForView, setSelectedAnnualForView] = useState<any | null>(null);

  const MONTHS = ['September','October','November','December','January','February','March','April','May','June'];
  const defaultAnnualItems = () => MONTHS.flatMap(month =>
    [1,2,3,4].map(week => ({
      month, week,
      noOfPeriods: '', unit: '', mainContent: '', subContent: '',
      competence: '', teachingMethod: '', teachingAid: '', evaluation: '', remark: ''
    }))
  );

  const emptyAnnualForm = {
    academicYear: '2018 E.C.',
    subject: '',
    grade: '',
    courseId: '',
    workingDaysYear: 180,
    periodsYear: 160,
    periodsWeek: 4,
    durationPeriod: '45 minutes',
    status: 'Pending' as 'Pending' | 'Draft',
    items: defaultAnnualItems()
  };
  const [annualForm, setAnnualForm] = useState(emptyAnnualForm);

  const filteredDeptPlans = deptPlans.filter(plan => {
    const teacherName = plan.teacher_name || plan.teacherName || '';
    const subject = plan.subject || '';
    const matchesSearch = teacherName.toLowerCase().includes(deptSearch.toLowerCase()) || subject.toLowerCase().includes(deptSearch.toLowerCase());
    const matchesFilter = deptFilter === 'All' || plan.status === deptFilter;
    return matchesSearch && matchesFilter;
  });

  const handleApproveDeptPlan = async (id: string, rating: number, feedback: string) => {
    const defaultFeedback = feedback.trim() || 'Approved by Department Head';

    // Optimistic update
    setDeptPlans(prev => prev.map(p => p.id === id ? {
      ...p,
      status: 'Approved',
      dean_rating: rating || null,
      dean_feedback: defaultFeedback
    } : p));

    try {
      const payload: any = { status: 'Approved', feedback: defaultFeedback };
      if (rating > 0) {
        payload.rating = rating;
      }
      await reviewDeptPlan(id, payload);
      showToast('Plan approved successfully!', 'success');
      // Refresh from DB to get accurate state
      fetchDeptPlans();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to approve plan', 'error');
      fetchDeptPlans(); // revert optimistic update with real data
    }
  };

  const handleRejectDeptPlan = async (id: string, rating: number, feedback: string) => {
    if (!feedback.trim()) {
      showToast('Feedback is required to request revision', 'error');
      return;
    }

    // Optimistic update
    setDeptPlans(prev => prev.map(p => p.id === id ? {
      ...p,
      status: 'Revision Required',
      dean_rating: rating || null,
      dean_feedback: feedback
    } : p));

    try {
      const payload: any = { status: 'Revision Required', feedback };
      if (rating > 0) {
        payload.rating = rating;
      }
      await reviewDeptPlan(id, payload);
      showToast('Revision request submitted!', 'success');
      // Refresh from DB
      fetchDeptPlans();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to request revision', 'error');
      fetchDeptPlans(); // revert optimistic update
    }
  };

  const defaultDailyActivities = () => [
    { day: 'Monday', content: '', competence: '', timeDuration: '45 mins', teacherIntro: '', teacherPresentation: '', teacherSummary: '', teacherAssessment: '', studentActivity: '', teachingMethod: '', teachingAid: '', evaluationRemark: '' },
    { day: 'Tuesday', content: '', competence: '', timeDuration: '45 mins', teacherIntro: '', teacherPresentation: '', teacherSummary: '', teacherAssessment: '', studentActivity: '', teachingMethod: '', teachingAid: '', evaluationRemark: '' },
    { day: 'Wednesday', content: '', competence: '', timeDuration: '45 mins', teacherIntro: '', teacherPresentation: '', teacherSummary: '', teacherAssessment: '', studentActivity: '', teachingMethod: '', teachingAid: '', evaluationRemark: '' },
    { day: 'Thursday', content: '', competence: '', timeDuration: '45 mins', teacherIntro: '', teacherPresentation: '', teacherSummary: '', teacherAssessment: '', studentActivity: '', teachingMethod: '', teachingAid: '', evaluationRemark: '' },
    { day: 'Friday', content: '', competence: '', timeDuration: '45 mins', teacherIntro: '', teacherPresentation: '', teacherSummary: '', teacherAssessment: '', studentActivity: '', teachingMethod: '', teachingAid: '', evaluationRemark: '' },
  ];

  const emptyPlan = {
    teacherName: '',
    subject: '',
    chapterUnit: '',
    topicTitle: '',
    gradeSection: '',
    dateFrom: getTodayEthiopianDate(),
    dateTo: getTodayEthiopianDate(),
    periodsPerWeek: '4',
    courseId: '',
    deptHeadId: '',
    status: 'Pending' as 'Pending' | 'Draft',
    dailyActivities: defaultDailyActivities(),
    date: getTodayEthiopianDate(),
    content: '', objectives: '', teacherActivity: '',
    timeDuration: '', studentActivity: '', teachingMethod: '',
    teachingAids: '', evaluation: '', remark: '', weekNumber: 1
  };
  const [activePlanDay, setActivePlanDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [planEditorMode, setPlanEditorMode] = useState<'tabs' | 'full'>('tabs');
  const [planForm, setPlanForm] = useState(emptyPlan);
  const location = useLocation();
  const navigate = useNavigate();

  // Classes, actual assigned courses, and department heads
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]); // actual courses from courses table
  const [deptHeads, setDeptHeads] = useState<any[]>([]);

  // Sub-tab selection for weekly plans
  const [weeklyPlanSubTab, setWeeklyPlanSubTab] = useState<'my-plans' | 'dept-plans' | 'communication-book'>('my-plans');
  // Plan detail expand overlay
  const [selectedPlanForView, setSelectedPlanForView] = useState<any | null>(null);
  // Temporary evaluation rating
  const [reviewRating, setReviewRating] = useState<number>(0);
  // Simulation mode for Department Head role preview
  const [simulateDeanMode, setSimulateDeanMode] = useState<boolean>(false);

  // ─── Communication Book States ───────────────────────────────────────────────
  const [commSections, setCommSections] = useState<any[]>([]);
  const [sentCommStudentIds, setSentCommStudentIds] = useState<string[]>([]);
  const [selectedCommSection, setSelectedCommSection] = useState<any | null>(null);
  const [commStudents, setCommStudents] = useState<any[]>([]);
  const [commStudentsLoading, setCommStudentsLoading] = useState(false);
  const [commPage, setCommPage] = useState(1);
  const COMM_PAGE_SIZE = 8;
  const [globalCommSearch, setGlobalCommSearch] = useState('');
  const [allHomeroomStudents, setAllHomeroomStudents] = useState<any[]>([]);
  const [activeCommStudent, setActiveCommStudent] = useState<any | null>(null);
  const [isCommCardOpen, setIsCommCardOpen] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [commLogSuccess, setCommLogSuccess] = useState(false);
  const defaultCommForm = {
    ratingUniform: 0, ratingMaterials: 0, ratingHomework: 0,
    ratingParticipation: 0, ratingConduct: 0, ratingSocial: 0,
    ratingPunctuality: 0, ratingExcellent: 0, ratingNoteTaking: 0,
    teacherNote: ''
  };
  const [commLogForm, setCommLogForm] = useState(defaultCommForm);
  // ─────────────────────────────────────────────────────────────────────────────

  // localStorage key for draft persistence
  const DRAFT_KEY = 'teacher_plan_draft';

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Load grades for exam creation
  const loadGradesForExam = async () => {
    try {
      setLoadingGrades(true);
      const grades = await getGradesForExams();
      setGradesForExam(Array.isArray(grades) ? grades : []);
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoadingGrades(false);
    }
  };

  // Load courses for selected grade
  const loadCoursesForGrade = async (gradeId: string) => {
    try {
      setLoadingCourses(true);
      const courses = await getCoursesByGradeForExams(gradeId);
      setCoursesForGrade(Array.isArray(courses) ? courses : []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Handle grade selection change
  const handleGradeChange = (gradeId: string) => {
    setExamForm({ ...examForm, gradeId, subjectId: '' });
    if (gradeId) {
      loadCoursesForGrade(gradeId);
    } else {
      setCoursesForGrade([]);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dash, planList, classList, examsData, courseList, announcementList] = await Promise.all([
        getTeacherDashboard().catch(() => null),
        getMyWeeklyPlans().catch(() => []),
        getMyClasses('grades').catch(() => []),
        getTeacherExams().catch(() => ({ draftExams: [], publishedExams: [] })),
        getTeacherCoursesForExams().catch(() => []),   // real assigned courses from DB
        getSchoolAnnouncements().catch(() => [])
      ]);
      setDashboard(dash);
      setPlans(Array.isArray(planList) ? planList : []);
      setMyClasses(Array.isArray(classList) ? classList : []);
      setAnnouncements(Array.isArray(announcementList) ? announcementList : []);

      const rawCourses = Array.isArray(courseList) ? courseList : [];
      if (rawCourses.length === 0) {
        setMyCourses([
          { id: 'c-1', name: 'Algebra', code: 'MATH-11', class_name: 'Grade 11A' },
          { id: 'c-2', name: 'Geometry', code: 'MATH-10', class_name: 'Grade 10B' },
          { id: 'c-3', name: 'Calculus', code: 'MATH-12', class_name: 'Grade 12A' }
        ]);
      } else {
        const uniqueCourses = rawCourses.filter((course: any, index: number, self: any[]) =>
          index === self.findIndex((c: any) => (c.name || '').toLowerCase() === (course.name || '').toLowerCase())
        );
        setMyCourses(uniqueCourses);
      }

      // Load exams from backend
      if (examsData) {
        setDraftExams(Array.isArray(examsData.draftExams) ? examsData.draftExams : []);
        setPublishedExams(Array.isArray(examsData.publishedExams) ? examsData.publishedExams : []);
      }

      const deptHeadsList = await getDepartmentHeads().catch(() => []);
      const rawDeptHeads = Array.isArray(deptHeadsList) ? deptHeadsList : [];
      if (rawDeptHeads.length === 0) {
        setDeptHeads([
          { teacher_id: 'dh-1', name: 'Dr. Girma Bekele', department: 'Mathematics Department', subjects: ['algebra', 'geometry', 'calculus', 'maths'], grades: [] },
          { teacher_id: 'dh-2', name: 'Wz. Aster Tolosa', department: 'Natural Science Department', subjects: ['bio', 'biology', 'chemistry', 'physics', 'science'], grades: [] },
          { teacher_id: 'dh-3', name: 'Abo Chala Kebede', department: 'Social Science Department', subjects: ['history', 'geography', 'civics', 'social science'], grades: [] },
          { teacher_id: 'dh-4', name: 'Mstr. Kassa Hailu', department: 'Languages Department', subjects: ['english', 'amharic', 'oromiffa', 'languages'], grades: [] }
        ]);
      } else {
        setDeptHeads(rawDeptHeads);
      }

      if (dash?.teacherInfo?.is_dean || dash?.teacherInfo?.is_hod || dash?.teacherInfo?.promotion?.promotion_type === 'head-of-department' || (Array.isArray(dash?.teacherInfo?.promotion?.roles) && dash?.teacherInfo?.promotion?.roles.includes('head-of-department')) || (user as any)?.role === 'head-of-department' || (user as any)?.staff_profile?.is_hod) {
        const dPlans = await getDeptPlans().catch(() => []);
        setDeptPlans(Array.isArray(dPlans) ? dPlans : []);
      }
    } catch (err) {
      console.error('Teacher portal error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Separate fetch for dept plans (called when switching to dept-plans sub-tab)
  const fetchDeptPlans = useCallback(async () => {
    try {
      const dPlans = await getDeptPlans().catch(() => []);
      setDeptPlans(Array.isArray(dPlans) ? dPlans : []);
    } catch (err) {
      console.error('Failed to fetch dept plans:', err);
    }
  }, []);

  const fetchDeptAnnualPlans = useCallback(async () => {
    try {
      const data = await getDeptAnnualPlans().catch(() => []);
      setDeptAnnualPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch dept annual plans:', err);
    }
  }, []);

  const fetchMyAnnualPlans = useCallback(async () => {
    try {
      const data = await getMyAnnualPlans().catch(() => []);
      setAnnualPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch annual plans:', err);
    }
  }, []);



  useEffect(() => {
    fetchAll();
    loadGradesForExam();
  }, []);

  // Refresh dept plans from DB whenever the dept-tasks tab is opened
  useEffect(() => {
    if (activeTab === 'dept-tasks') {
      fetchDeptPlans();
      fetchDeptAnnualPlans();
    }
    if (activeTab === 'plans') {
      fetchMyAnnualPlans();
    }
  }, [activeTab, fetchDeptPlans, fetchDeptAnnualPlans, fetchMyAnnualPlans]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'plans') {
      setActiveTab('plans');
      setWeeklyPlanSubTab('my-plans');
    } else if (tab === 'dept-tasks') {
      setActiveTab('dept-tasks');
    } else {
      setActiveTab('overview');
    }
  }, [location.search]);

  // ─── Communication Book Helpers ───────────────────────────────────────────────
  const getWeekEndingThursday = (): string => {
    const today = new Date();
    const day = today.getDay(); // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat
    // Cycle starts on Friday, ends on Thursday.
    // If today is Fri (5), diff = 6. If Thu (4), diff = 0.
    let diff = 4 - day;
    if (diff < 0) {
      diff += 7;
    }
    const thursday = new Date(today);
    thursday.setDate(today.getDate() + diff);
    const yyyy = thursday.getFullYear();
    const mm = String(thursday.getMonth() + 1).padStart(2, '0');
    const dd = String(thursday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Load all homeroom sections + their students for global search
  const fetchAllHomeroomStudents = async (sections: any[]) => {
    const promises = sections.map(s => getClassStudents(s.id).catch(() => []));
    const rosters = await Promise.all(promises);
    const merged: any[] = [];
    rosters.forEach((roster, i) => {
      (Array.isArray(roster) ? roster : []).forEach((st: any) => {
        merged.push({ ...st, sectionName: sections[i].name || sections[i].class_name || `Section ${i + 1}`, sectionId: sections[i].id });
      });
    });
    setAllHomeroomStudents(merged);
  };

  // Load homeroom sections when comm-book tab opens
  useEffect(() => {
    if (weeklyPlanSubTab !== 'communication-book') return;
    
    // Fetch sent communication logs for this week to mark students
    getCommunicationLogsByWeek(getWeekEndingThursday())
      .then(logs => {
        const sentIds = (Array.isArray(logs) ? logs : []).map((l: any) => l.student_id || l.studentId);
        setSentCommStudentIds(sentIds);
      })
      .catch(() => setSentCommStudentIds([]));

    getMyClasses('attendance').then(data => {
      const list = Array.isArray(data) ? data : [];
      const sections = list.map((c: any) => ({
        id: c.id,
        name: c.name || c.class_name,
        section: c.section,
        enrolledStudents: c.enrolledStudents || c.student_count || 0,
      }));
      setCommSections(sections);
      fetchAllHomeroomStudents(sections);
    }).catch(() => { setCommSections([]); setAllHomeroomStudents([]); });
  }, [weeklyPlanSubTab]);

  // Load students when a section is selected AND refresh sent IDs for the current week
  useEffect(() => {
    if (!selectedCommSection) return;
    setCommStudentsLoading(true);
    setCommPage(1);
    // Refresh the sent list every time a section is opened, so the blue "Sent" state is always accurate
    getCommunicationLogsByWeek(getWeekEndingThursday())
      .then(logs => {
        const sentIds = (Array.isArray(logs) ? logs : []).map((l: any) => l.student_id || l.studentId);
        setSentCommStudentIds(sentIds);
      })
      .catch(() => {});
    getClassStudents(selectedCommSection.id).then((data: any) => {
      const list = Array.isArray(data) ? data : [];
      setCommStudents(list.map((s: any) => ({
        id: s.studentId || s.student_id || s.id,
        name: s.studentName || s.student_name || s.name,
        digitalId: s.digitalId || s.digital_id,
        grade: s.grade,
      })));
    }).catch(() => setCommStudents([])).finally(() => setCommStudentsLoading(false));
  }, [selectedCommSection]);

  const openCommCard = async (student: any) => {
    // Block re-opening if already sent this week
    if (sentCommStudentIds.includes(student.id)) {
      showToast('Communication book already sent to this student this week.', 'error');
      return;
    }
    setActiveCommStudent(student);
    setCommLogForm(defaultCommForm);
    setIsCommCardOpen(true);
    setCommLogSuccess(false);
    try {
      const logs = await getCommunicationLogs(student.id);
      const weekEnding = getWeekEndingThursday();
      // Compare only the date portion (first 10 chars) to handle timestamp vs date format
      const existing = Array.isArray(logs) ? logs.find((l: any) => l.week_ending && String(l.week_ending).slice(0, 10) === weekEnding) : null;
      if (existing) {
        setCommLogForm({
          ratingUniform: existing.rating_uniform ?? 0,
          ratingMaterials: existing.rating_materials ?? 0,
          ratingHomework: existing.rating_homework ?? 0,
          ratingParticipation: existing.rating_participation ?? 0,
          ratingConduct: existing.rating_conduct ?? 0,
          ratingSocial: existing.rating_social ?? 0,
          ratingPunctuality: existing.rating_punctuality ?? 0,
          ratingExcellent: existing.rating_excellent ?? 0,
          ratingNoteTaking: existing.rating_note_taking ?? 0,
          teacherNote: existing.teacher_note || '',
        });
      }
    } catch { /* no existing log */ }
  };

  const handleSubmitCommLog = async () => {
    if (!activeCommStudent) return;
    setIsSubmittingLog(true);
    try {
      await submitCommunicationLog({ studentId: activeCommStudent.id, weekEnding: getWeekEndingThursday(), ...commLogForm });
      setCommLogSuccess(true);
      setSentCommStudentIds(prev => [...prev, activeCommStudent.id]);
      showToast(`Communication log sent for ${activeCommStudent.name}!`, 'success');
      setTimeout(() => { setIsCommCardOpen(false); setCommLogSuccess(false); }, 1800);
    } catch {
      showToast('Failed to send log. Please try again.', 'error');
    } finally {
      setIsSubmittingLog(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // Persist draft to localStorage whenever form changes
  const saveDraftLocally = useCallback((form: typeof emptyPlan) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { }
  }, []);

  // Load locally-saved draft (only for new plans)
  const loadLocalDraft = useCallback((): typeof emptyPlan | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const clearLocalDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { } };

  const isCourseAlreadyPlanned = useCallback((courseId: string) => {
    return plans.some(p => (p.course_id || p.courseId) === courseId);
  }, [plans]);

  const filterDeptHeadsForCourse = useCallback((courseId: string) => {
    if (!courseId) return [];
    const selectedCourse = myCourses.find((c: any) => c.id === courseId);
    if (!selectedCourse) return [];

    const subjectName = (selectedCourse.name || '').toLowerCase();
    const courseGrade = selectedCourse.grade_level || selectedCourse.grade || '';

    const filtered = deptHeads.filter((hod: any) => {
      const hodSubjects = Array.isArray(hod.subjects) ? hod.subjects : [];
      const hasSubjectMatch = hodSubjects.some((s: any) => String(s).toLowerCase() === subjectName);
      if (!hasSubjectMatch) return false;

      const hodGrades = Array.isArray(hod.grades) ? hod.grades : [];
      if (hodGrades.length === 0) return true;

      return matchGrade(hodGrades, courseGrade);
    });

    if (filtered.length === 0) {
      return deptHeads.filter((hod: any) => {
        const hodSubjects = Array.isArray(hod.subjects) ? hod.subjects : [];
        return hodSubjects.some((s: any) => String(s).toLowerCase() === subjectName);
      });
    }

    return filtered;
  }, [myCourses, deptHeads]);

  // Auto-fill course and department head if teacher only has one course
  useEffect(() => {
    if (isPlanModalOpen && !editingPlan) {
      const draft = loadLocalDraft();
      if (!draft && myCourses.length === 1) {
        const singleCourse = myCourses[0];
        const subjectName = (singleCourse.name || '').toLowerCase();
        const courseGrade = singleCourse.grade_level || singleCourse.grade || '';

        const matchingHods = deptHeads.filter((hod: any) => {
          const hodSubjects = Array.isArray(hod.subjects) ? hod.subjects : [];
          const hasSubjectMatch = hodSubjects.some((s: any) => String(s).toLowerCase() === subjectName);
          if (!hasSubjectMatch) return false;

          const hodGrades = Array.isArray(hod.grades) ? hod.grades : [];
          if (hodGrades.length === 0) return true;

          return matchGrade(hodGrades, courseGrade);
        });

        const finalHods = matchingHods.length > 0 ? matchingHods : deptHeads.filter((hod: any) => {
          const hodSubjects = Array.isArray(hod.subjects) ? hod.subjects : [];
          return hodSubjects.some((s: any) => String(s).toLowerCase() === subjectName);
        });

        const defaultDeptHeadId = finalHods.length > 0 ? (finalHods[0].teacher_id || finalHods[0].id) : '';

        setPlanForm(prev => ({
          ...prev,
          courseId: singleCourse.id,
          subject: singleCourse.name,
          deptHeadId: defaultDeptHeadId
        }));
      }
    }
  }, [isPlanModalOpen, editingPlan, myCourses, deptHeads, loadLocalDraft]);

  // Save plan as draft (status = Draft) or submit (status = Pending)
  const handleSavePlan = async (targetStatus: 'Draft' | 'Pending') => {
    if (targetStatus === 'Pending') {
      if (!planForm.courseId) {
        showToast('Please select a Course / Subject before submitting.', 'error');
        return;
      }
      if (!planForm.deptHeadId) {
        showToast('Please select a Department Head before submitting.', 'error');
        return;
      }
    }

    setSubmitting(true);
    const payload = { ...planForm, status: targetStatus };
    try {
      if (editingPlan) {
        await updateWeeklyPlan(editingPlan.id, payload);
        showToast(targetStatus === 'Draft' ? 'Draft saved successfully!' : 'Plan submitted for review!', 'success');
      } else {
        await submitWeeklyPlan(payload);
        showToast(targetStatus === 'Draft' ? 'Draft saved! You can continue editing it any time.' : 'Plan submitted for review!', 'success');
      }
      clearLocalDraft();
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      setPlanForm(emptyPlan);
      const planList = await getMyWeeklyPlans();
      setPlans(Array.isArray(planList) ? planList : []);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save plan. Please try again.';
      showToast(msg, 'error');
      console.error('handleSavePlan error:', err);

      const targetId = editingPlan?.id || 'sim-' + Date.now();
      const updatedPlan = {
        id: targetId,
        date: payload.date,
        subject: payload.subject || 'Subject Selected',
        content: payload.content,
        objectives: payload.objectives,
        teacherActivity: payload.teacherActivity,
        teacher_activity: payload.teacherActivity,
        timeDuration: payload.timeDuration,
        time_duration: payload.timeDuration,
        studentActivity: payload.studentActivity,
        student_activity: payload.studentActivity,
        teachingMethod: payload.teachingMethod,
        teaching_method: payload.teachingMethod,
        teachingAids: payload.teachingAids,
        teaching_aids: payload.teachingAids,
        evaluation: payload.evaluation,
        remark: payload.remark,
        status: targetStatus,
        course_id: payload.courseId,
        dept_head_id: payload.deptHeadId,
        dean_feedback: editingPlan?.dean_feedback || '',
        dean_rating: editingPlan?.dean_rating || 0
      };

      if (editingPlan) {
        setPlans(prev => prev.map(p => p.id === targetId ? updatedPlan : p));
      } else {
        setPlans(prev => [updatedPlan, ...prev]);
      }

      if (targetStatus === 'Pending') {
        const deptPlanObj = {
          ...updatedPlan,
          teacher_name: user?.name || 'Assigned Teacher',
          teacherName: user?.name || 'Assigned Teacher'
        };
        setDeptPlans(prev => {
          const exists = prev.some(p => p.id === targetId);
          if (exists) return prev.map(p => p.id === targetId ? deptPlanObj : p);
          return [deptPlanObj, ...prev];
        });
      }

      showToast(targetStatus === 'Draft' ? 'Draft saved successfully!' : 'Plan submitted for review!', 'success');
      clearLocalDraft();
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      setPlanForm(emptyPlan);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    const filled: any = {
      date: plan.date ? new Date(plan.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      content: plan.content || '',
      objectives: plan.objectives || '',
      teacherActivity: plan.teacher_activity || plan.teacherActivity || '',
      timeDuration: plan.time_duration || plan.timeDuration || '',
      studentActivity: plan.student_activity || plan.studentActivity || '',
      teachingMethod: plan.teaching_method || plan.teachingMethod || '',
      teachingAids: plan.teaching_aids || plan.teachingAids || '',
      evaluation: plan.evaluation || '',
      remark: plan.remark || '',
      status: plan.status || 'Draft',
      courseId: plan.course_id || plan.courseId || '',
      subject: plan.subject || '',
      deptHeadId: plan.dept_head_id || plan.deptHeadId || '',
      weekNumber: plan.week_number || plan.weekNumber || 1
    };
    setPlanForm(filled);
    setIsPlanModalOpen(true);
  };

  const filteredHods = planForm.courseId ? filterDeptHeadsForCourse(planForm.courseId) : deptHeads;
  const displayHods = filteredHods.length > 0 ? filteredHods : deptHeads;

  const todaySchedule = dashboard?.todaySchedule || [];
  const pendingPlans = plans.filter(p => p.status === 'Pending').length;
  const isDean = dashboard?.teacherInfo?.is_dean === true || dashboard?.teacherInfo?.is_hod === true || (user as any)?.role === 'head-of-department' || (user as any)?.staff_profile?.is_hod === true || (dashboard?.teacherInfo?.promotion && (dashboard?.teacherInfo?.promotion?.promotion_type === 'head-of-department' || (Array.isArray(dashboard?.teacherInfo?.promotion?.roles) && dashboard?.teacherInfo?.promotion?.roles.includes('head-of-department'))));

  // Exam Handlers
  const handlePublishExam = async (examId: string) => {
    const exam = draftExams.find(e => e.id === examId);
    if (!exam) return;

    if (!exam.selectedClass || !exam.selectedSection) {
      setToast({ show: true, type: 'error', message: 'Please select class and section before publishing' });
      return;
    }

    try {
      setSubmitting(true);
      // Update exam with class and section info before publishing
      if (exam.selectedClass !== exam.class_id) {
        await updateTeacherExam(examId, {
          ...exam,
          classId: exam.selectedClass
        });
      }

      await publishTeacherExam(examId);
      showToast('Exam published successfully!', 'success');

      // Refresh exams from backend
      const examsData = await getTeacherExams();
      setDraftExams(Array.isArray(examsData.draftExams) ? examsData.draftExams : []);
      setPublishedExams(Array.isArray(examsData.publishedExams) ? examsData.publishedExams : []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to publish exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraftExam = async (examId: string) => {
    try {
      setSubmitting(true);
      await deleteTeacherExam(examId);
      showToast('Exam deleted', 'success');

      // Refresh exams from backend
      const examsData = await getTeacherExams();
      setDraftExams(Array.isArray(examsData.draftExams) ? examsData.draftExams : []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDraftExam = (exam: any) => {
    setEditingExam(exam);
    setExamForm({
      title: exam.title || '',
      examType: exam.exam_type || exam.examType || 'Mid Exam',
      totalMarks: exam.total_marks || exam.totalMarks || 100,
      duration: exam.duration_minutes || exam.duration || 60,
      instructions: exam.instructions || '',
      selectedClass: exam.class_id || exam.selectedClass || '',
      selectedSection: exam.selected_section || exam.selectedSection || '',
      gradeId: exam.grade_id || exam.gradeId || '',
      subjectId: exam.subject_id || exam.subjectId || '',
      examPassword: exam.exam_password || exam.examPassword || '',
      isLocked: !!(exam.is_locked || exam.isLocked || exam.exam_password || exam.examPassword),
      passwordRequired: !!(exam.password_required || exam.passwordRequired || exam.exam_password || exam.examPassword),
      questions: exam.questions || []
    });
    setIsExamModalOpen(true);
  };

  const handleSaveExamChanges = async () => {
    if (!examForm.title.trim()) { setToast({ show: true, type: 'error', message: 'Please enter exam title' }); return; }
    if (examForm.isLocked && !examForm.examPassword.trim()) { setToast({ show: true, type: 'error', message: 'Please enter exam password' }); return; }

    try {
      setSubmitting(true);
      if (editingExam) {
        // Update existing draft exam
        await updateTeacherExam(editingExam.id, {
          title: examForm.title,
          examType: examForm.examType,
          totalMarks: examForm.totalMarks,
          duration: examForm.duration,
          instructions: examForm.instructions,
          selectedSection: examForm.selectedSection,
          gradeId: examForm.gradeId,
          subjectId: examForm.subjectId,
          examPassword: examForm.examPassword,
          isLocked: examForm.isLocked,
          passwordRequired: examForm.passwordRequired,
          questions: examForm.questions
        });
        showToast('Exam updated!', 'success');
      } else {
        // Create new exam
        await saveTeacherExam({
          classId: examForm.selectedClass,
          title: examForm.title,
          examType: examForm.examType,
          totalMarks: examForm.totalMarks,
          duration: examForm.duration,
          instructions: examForm.instructions,
          selectedSection: examForm.selectedSection,
          gradeId: examForm.gradeId,
          subjectId: examForm.subjectId,
          examPassword: examForm.examPassword,
          isLocked: examForm.isLocked,
          passwordRequired: examForm.passwordRequired,
          questions: examForm.questions
        });
        showToast('Exam saved!', 'success');
      }

      // Refresh exams from backend
      const examsData = await getTeacherExams();
      setDraftExams(Array.isArray(examsData.draftExams) ? examsData.draftExams : []);
      setPublishedExams(Array.isArray(examsData.publishedExams) ? examsData.publishedExams : []);

      setIsExamModalOpen(false);
      setEditingExam(null);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to save exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-3 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700/50 flex-wrap">
        {(() => {
          const tabs = [
            { id: 'overview', label: 'Overview' },
            { id: 'plans', label: 'Weekly Plans' },
            { id: 'exams', label: 'Exams' },
          ];
          if (isDean) {
            tabs.push({ id: 'dept-tasks', label: 'Department Submissions' });
          }
          return tabs.map(tab => {
            if (tab.id === 'exams') {
              return (
                <button key={tab.id} onClick={() => navigate('/exams')}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-500 hover:text-slate-700`}>
                  {tab.label}
                </button>
              );
            }
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); if (tab.id === 'plans') setWeeklyPlanSubTab('my-plans'); }}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab.label}
              </button>
            );
          });
        })()}
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4 block">Teacher Dashboard</span>
              <h2 className="text-4xl font-black mb-2 tracking-tight">Welcome back, {user?.name?.split(' ')[0]}!</h2>
              <p className="text-slate-400 font-medium">
                Digital ID: <span className="text-white font-mono">{(user as any)?.digitalId || (user as any)?.digital_id || '—'}</span>
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/attendance" className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                  Take Attendance <ArrowRight size={16} />
                </Link>
                <Link to="/schedule" className="bg-white/5 text-white border border-white/10 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                  My Schedule
                </Link>
                <Link to="/grades" className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20">
                  Enter Grades
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-5"><BookOpen size={240} /></div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-6">
            
            <Link to="/schedule" className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors block">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6"><Calendar size={28} /></div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">My Schedule</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white">{todaySchedule.length}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">Classes today · View full schedule →</p>
            </Link>
          </div>

          {/* School Announcements */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden mt-6">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Announcements from School Administration</h3>
                <p className="text-xs text-slate-500 mt-0.5">Important notifications and updates from the administration</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold">{mergedAnnouncements.length} announcement{mergedAnnouncements.length !== 1 ? 's' : ''}</span>
            </div>
            {mergedAnnouncements.length === 0 ? (
              <div className="p-6 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"><AlertCircle size={22} className="text-slate-400" /></div>
                <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">No announcements yet</p>
                <p className="text-xs text-slate-400 mt-1">Check back later for updates from school administration.</p>
              </div>
            ) : (
              <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {mergedAnnouncements.map((ann: any) => {
                  const dateObj = new Date(ann.timestamp);
                  const isValidDate = !isNaN(dateObj.getTime());
                  return (
                    <div key={ann.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-all flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            ann.priority === 'High' 
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {ann.priority || 'Normal'} Priority
                          </span>
                          {ann.category && (
                            <span className="px-2 py-0.5 bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md">
                              {ann.category}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto font-medium">
                            {isValidDate ? `${formatEthiopianLabel(ann.timestamp)} ${dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1.5">{ann.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 font-medium">
                        Posted by: {ann.posted_by_name || 'School Admin'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'plans' ? (
        /* Weekly Plans Tab */
        <div className="space-y-6">
          {/* Sub-tab Switcher & Simulation Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-6 flex-wrap">
              <button
                type="button"
                onClick={() => setWeeklyPlanSubTab('my-plans')}
                className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${weeklyPlanSubTab === 'my-plans'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
              >
                My Weekly Plans
              </button>
              <button
                type="button"
                onClick={() => { setWeeklyPlanSubTab('annual-plans' as any); fetchMyAnnualPlans(); }}
                className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${(weeklyPlanSubTab as any) === 'annual-plans'
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
              >
                📅 Annual Plans
              </button>
              <button
                type="button"
                onClick={() => setWeeklyPlanSubTab('communication-book')}
                className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${weeklyPlanSubTab === 'communication-book'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
              >
                Communication Book
              </button>
            </div>

            {isDean && (
              <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 text-xs font-bold shadow-sm">
                <ShieldCheck size={14} className="text-purple-600 dark:text-purple-400" />
                Department Head
              </div>
            )}
          </div>

          {(weeklyPlanSubTab as any) === 'annual-plans' ? (
            /* ── Annual Plans Sub-Tab ── */
            <div className="animate-in fade-in duration-200 space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><FileText size={160} /></div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-200 mb-2 block">Yearly Lesson Plan</span>
                  <h2 className="text-3xl font-black mb-1 tracking-tight">Annual Plans</h2>
                  <p className="text-violet-100 font-medium text-sm">Submit your full-year curriculum plan for Department Head review.</p>
                </div>
              </div>

              {/* My Annual Plans List */}
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white">My Annual Plans</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{annualPlans.length} plan(s) submitted</p>
                  </div>
                  <button
                    onClick={() => { setEditingAnnualPlan(null); setAnnualForm(emptyAnnualForm); setIsAnnualModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                  >
                    <Plus size={16} /> New Annual Plan
                  </button>
                </div>

                {annualPlans.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-violet-50 dark:bg-violet-900/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText size={28} className="text-violet-400" /></div>
                    <p className="font-bold text-slate-500">No annual plans yet</p>
                    <p className="text-xs text-slate-400 mt-1">Create your first yearly lesson plan and submit it for department head review.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {annualPlans.map((plan: any) => (
                      <div key={plan.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-black text-slate-800 dark:text-white text-sm">{plan.subject} — {plan.grade}</p>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              plan.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : plan.status === 'Revision Required' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : plan.status === 'Draft' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>{plan.status}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Academic Year: {plan.academic_year} · {Array.isArray(plan.items) ? plan.items.length : 0} weeks planned</p>
                          {plan.feedback && <p className="text-xs text-orange-600 mt-1 italic">Feedback: "{plan.feedback}"</p>}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {(plan.status === 'Draft' || plan.status === 'Revision Required') && (
                            <button
                              onClick={() => { setEditingAnnualPlan(plan); setAnnualForm({ ...emptyAnnualForm, ...plan, items: Array.isArray(plan.items) && plan.items.length > 0 ? plan.items : defaultAnnualItems() }); setIsAnnualModalOpen(true); }}
                              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl transition-all"
                            >
                              Edit & Submit
                            </button>
                          )}
                          {plan.status === 'Approved' && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-black"><CheckCircle2 size={14} /> Approved</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : weeklyPlanSubTab === 'communication-book' ? (
            <div className="animate-in fade-in duration-200 space-y-6">

              {/* ── Header Banner ── */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><ClipboardList size={160} /></div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200 mb-2 block">Home Room · Weekly Reports</span>
                  <h2 className="text-3xl font-black mb-1 tracking-tight">Communication Book</h2>
                  <p className="text-emerald-100 font-medium text-sm">Select a section or search a student to send weekly ratings to parents.</p>
                </div>
              </div>

              {/* ── Global Student Search ── */}
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-lg p-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Quick Search — All My Homeroom Students</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Type student name to search across all sections…"
                    value={globalCommSearch}
                    onChange={e => setGlobalCommSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
                {globalCommSearch.trim().length >= 2 && (
                  <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {allHomeroomStudents.filter(s => (s.studentName || s.student_name || s.name || '').toLowerCase().includes(globalCommSearch.toLowerCase())).slice(0, 20).map(s => {
                      const name = s.studentName || s.student_name || s.name;
                      const id = s.studentId || s.student_id || s.id;
                      return (
                        <div key={id} className="flex items-center justify-between px-5 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{s.sectionName} · {s.digitalId || ''}</p>
                          </div>
                          {sentCommStudentIds.includes(id) ? (
                            <button
                              disabled
                              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black rounded-xl cursor-not-allowed flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} /> Sent
                            </button>
                          ) : (
                            <button
                              onClick={() => { setGlobalCommSearch(''); openCommCard({ id, name }); }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1"
                            >
                              <Send size={12} /> Talk to Parent
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {allHomeroomStudents.filter(s => (s.studentName || s.student_name || s.name || '').toLowerCase().includes(globalCommSearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-6 font-medium">No students found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Section Browser or Student Roster ── */}
              {!selectedCommSection ? (
                /* Section Cards */
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">My Homeroom Sections</h3>
                  {commSections.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-12 text-center">
                      <Users className="text-slate-300 dark:text-slate-700 mx-auto mb-4" size={40} />
                      <p className="text-slate-500 font-bold text-sm">No homeroom sections assigned.</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Contact administration if this is incorrect.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {commSections.map(sec => (
                        <button
                          key={sec.id}
                          onClick={() => setSelectedCommSection(sec)}
                          className="group bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-[2rem] p-7 text-left transition-all shadow-sm hover:shadow-xl"
                        >
                          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-all">
                            <Users className="text-emerald-600 group-hover:text-white transition-all" size={26} />
                          </div>
                          <h4 className="text-lg font-black text-slate-800 dark:text-white">{sec.name}</h4>
                          {sec.section && <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Section {sec.section}</p>}
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-3">{sec.enrolledStudents} students · Click to view roster →</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Student Roster */
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        title="Go back to section roster"
                        onClick={() => { setSelectedCommSection(null); setCommStudents([]); setCommPage(1); }}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      >
                        <ArrowLeft size={18} className="text-slate-500" />
                      </button>
                      <div>
                        <h3 className="font-black text-slate-800 dark:text-white">{selectedCommSection.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Student Roster</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">{commStudents.length} students</span>
                  </div>

                  {commStudentsLoading ? (
                    <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
                  ) : commStudents.length === 0 ? (
                    <div className="p-10 text-center"><p className="text-slate-400 font-medium">No students in this section.</p></div>
                  ) : (
                    <>
                      {/* Paginated Table */}
                      <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {commStudents.slice((commPage - 1) * COMM_PAGE_SIZE, commPage * COMM_PAGE_SIZE).map((s, idx) => (
                          <div key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                {((commPage - 1) * COMM_PAGE_SIZE + idx + 1)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{s.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.digitalId || s.grade || '—'}</p>
                              </div>
                            </div>
                            {sentCommStudentIds.includes(s.id) ? (
                              <button
                                disabled
                                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black rounded-xl cursor-not-allowed shadow-sm"
                              >
                                <CheckCircle2 size={13} /> Sent
                              </button>
                            ) : (
                              <button
                                onClick={() => openCommCard(s)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                              >
                                <Send size={13} /> Talk to Parent
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {commStudents.length > COMM_PAGE_SIZE && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-xs text-slate-400 font-bold">Page {commPage} of {Math.ceil(commStudents.length / COMM_PAGE_SIZE)}</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              title="Previous page"
                              disabled={commPage === 1}
                              onClick={() => setCommPage(p => p - 1)}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              title="Next page"
                              disabled={commPage >= Math.ceil(commStudents.length / COMM_PAGE_SIZE)}
                              onClick={() => setCommPage(p => p + 1)}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Talk-to-Parent Rating Card Modal ── */}
              {isCommCardOpen && activeCommStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setIsCommCardOpen(false); }}>
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-t-[2.5rem] flex items-center justify-between">
                      <div>
                        <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest">Communication Book</p>
                        <h3 className="text-white text-xl font-black mt-0.5">{activeCommStudent.name}</h3>
                        <p className="text-emerald-200 text-xs mt-0.5">Week ending: {formatEthiopianLabel(getWeekEndingThursday())}</p>
                      </div>
                      <button
                        type="button"
                        title="Close communication book modal"
                        onClick={() => setIsCommCardOpen(false)}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all"
                      >
                        <X size={20} className="text-white" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      {commLogSuccess ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="text-emerald-500" size={36} />
                          </div>
                          <p className="text-emerald-600 font-black text-lg">Sent to Parent!</p>
                        </div>
                      ) : (
                        <>
                          {/* Metrics Grid */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Rate each area (1–5 stars)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                { key: 'ratingMaterials', label: 'Materials', icon: '📚' },
                                { key: 'ratingUniform', label: 'Uniform', icon: '👔' },
                                { key: 'ratingHomework', label: 'Homework', icon: '📝' },
                                { key: 'ratingParticipation', label: 'Participation', icon: '🙋' },
                                { key: 'ratingConduct', label: 'Conduct', icon: '✅' },
                                { key: 'ratingSocial', label: 'Social', icon: '🤝' },
                                { key: 'ratingPunctuality', label: 'Punctuality', icon: '⏰' },
                                { key: 'ratingExcellent', label: 'Excellent', icon: '⭐' },
                                { key: 'ratingNoteTaking', label: 'Note-taking', icon: '🗒️' },
                              ].map(({ key, label, icon }) => {
                                const val = commLogForm[key as keyof typeof commLogForm] as number;
                                return (
                                  <div key={key} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><span>{icon}</span>{label}</span>
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                          key={star}
                                          type="button"
                                          title={`Rate ${label} as ${star} star${star !== 1 ? 's' : ''}`}
                                          onClick={() => setCommLogForm(f => ({ ...f, [key]: star === val ? 0 : star }))}
                                          className="transition-transform hover:scale-110"
                                        >
                                          <Star
                                            size={22}
                                            className={star <= val ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Teacher Note */}
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Teacher's Observation Note</label>
                            <textarea
                              rows={4}
                              placeholder="Describe the student's performance this week…"
                              value={commLogForm.teacherNote}
                              onChange={e => setCommLogForm(f => ({ ...f, teacherNote: e.target.value }))}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-emerald-500 transition-all resize-none text-slate-800 dark:text-white"
                            />
                          </div>

                          {/* Footer Buttons */}
                          <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsCommCardOpen(false)} className="flex-1 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                              Close
                            </button>
                            <button
                              onClick={handleSubmitCommLog}
                              disabled={isSubmittingLog}
                              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
                            >
                              {isSubmittingLog ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              {isSubmittingLog ? 'Sending…' : 'Send to Parent'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Weekly Plans</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Submit lesson plans for head of department review</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <button onClick={() => {
                    setEditingPlan(null);
                    // Restore locally-saved draft if one exists
                    const draft = loadLocalDraft();
                    setPlanForm(draft ?? emptyPlan);
                    setIsPlanModalOpen(true);
                  }}
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                    <Plus size={18} /> Create New Plan
                  </button>
                  <button onClick={() => {
                    setEditingPlan(null);
                    setPlanForm({ ...emptyPlan, status: 'Pending' });
                    setIsPlanModalOpen(true);
                  }}
                    className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20">
                    <Send size={18} /> Submit New Plan
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      {['Date', 'Subject', 'Content', 'Objectives', 'Method', 'Duration', 'Status', 'Feedback', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {plans.length === 0 ? (
                      <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">No plans yet. Create your first plan!</td></tr>
                    ) : (
                      plans.map((plan: any) => (
                        <tr key={plan.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors">
                          <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">{plan.date?.slice(0, 10)}</td>
                          <td className="px-4 py-4 text-xs font-semibold text-blue-600 dark:text-blue-400">{plan.subject || '—'}</td>
                          <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{plan.content}</td>
                          <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{plan.objectives}</td>
                          <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-[100px] truncate">{plan.teaching_method || plan.teachingMethod}</td>
                          <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">{plan.time_duration || plan.timeDuration}</td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${plan.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                              plan.status === 'Revision Required' ? 'bg-orange-100 text-orange-600' :
                                plan.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                                  'bg-amber-100 text-amber-600'
                              }`}>{plan.status}</span>
                          </td>
                          <td className="px-4 py-4">
                            {plan.dean_feedback ? (
                              <div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{plan.dean_feedback}</p>
                                {plan.dean_rating && (
                                  <div className="flex gap-0.5 mt-1">
                                    {[1, 2, 3].map(n => (
                                      <Star key={n} size={10} className={n <= plan.dean_rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-4 flex gap-2">
                            {(plan.status === 'Draft' || plan.status === 'Revision Required') && (
                              <>
                                <button onClick={() => openEditModal(plan)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors">
                                  Edit
                                </button>
                                <button onClick={async () => {
                                  // Guard: sim-IDs mean the plan was never saved to DB — user must open modal and save properly
                                  if (!plan.id || String(plan.id).startsWith('sim-')) {
                                    showToast('Please open and re-save the plan as a Draft first before submitting.', 'error');
                                    return;
                                  }
                                  const submittedPlan = { ...plan, status: 'Pending', teacher_name: user?.name || 'Assigned Teacher', teacherName: user?.name || 'Assigned Teacher' };
                                  try {
                                    const payload = {
                                      date: plan.date ? new Date(plan.date).toISOString() : new Date().toISOString(),
                                      content: plan.content || '',
                                      objectives: plan.objectives || '',
                                      teacherActivity: plan.teacher_activity || plan.teacherActivity || '',
                                      timeDuration: plan.time_duration || plan.timeDuration || '',
                                      studentActivity: plan.student_activity || plan.studentActivity || '',
                                      teachingMethod: plan.teaching_method || plan.teachingMethod || '',
                                      teachingAids: plan.teaching_aids || plan.teachingAids || '',
                                      evaluation: plan.evaluation || '',
                                      remark: plan.remark || '',
                                      status: 'Pending' as const,
                                      courseId: plan.course_id || plan.courseId || '',
                                      subject: plan.subject || '',
                                      deptHeadId: plan.dept_head_id || plan.deptHeadId || '',
                                      weekNumber: plan.week_number || plan.weekNumber || 1
                                    };
                                    await updateWeeklyPlan(plan.id, payload);
                                    showToast('Plan submitted to Department Head!', 'success');
                                    const updatedPlans = await getMyWeeklyPlans();
                                    setPlans(Array.isArray(updatedPlans) ? updatedPlans : []);
                                  } catch (err: any) {
                                    const msg = err?.message || 'Submission failed. Please try again.';
                                    showToast(msg, 'error');
                                    console.error('Submission error:', err);
                                  }
                                  // Optimistically update local state regardless of API result
                                  setPlans(prev => prev.map(p => p.id === plan.id ? submittedPlan : p));
                                  setDeptPlans(prev => {
                                    const exists = prev.some(p => p.id === plan.id);
                                    if (exists) return prev.map(p => p.id === plan.id ? submittedPlan : p);
                                    return [submittedPlan, ...prev];
                                  });
                                }}
                                  className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1">
                                  <CheckCircle2 size={14} /> Submit
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'dept-tasks' ? (
        /* Department Tasks Tab */
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Department Tasks</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Manage and review plans submitted by teachers in your department</p>
            </div>
          </div>

          {/* Dept-tasks sub-tabs: Weekly | Annual */}
          <div className="flex gap-6 mb-8 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setDeptTaskSubTab('weekly')}
              className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                deptTaskSubTab === 'weekly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              📋 Weekly Plans
            </button>
            <button
              onClick={() => { setDeptTaskSubTab('annual'); fetchDeptAnnualPlans(); }}
              className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                deptTaskSubTab === 'annual' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              📅 Annual Plans
            </button>
          </div>

          {deptTaskSubTab === 'annual' ? (
            /* ── Annual Plans Review (Dept Head) ── */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by teacher or subject…"
                    value={annualSearch}
                    onChange={e => setAnnualSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <select
                  title="Filter annual plans by status"
                  value={annualDeptFilter}
                  onChange={e => setAnnualDeptFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 dark:text-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Revision Required">Revision Required</option>
                </select>
              </div>

              {deptAnnualPlans.filter(p => {
                const name = (p.teacher_name || '').toLowerCase();
                const subj = (p.subject || '').toLowerCase();
                const q = annualSearch.toLowerCase();
                const matchSearch = !annualSearch || name.includes(q) || subj.includes(q);
                const matchStatus = annualDeptFilter === 'All' || p.status === annualDeptFilter;
                return matchSearch && matchStatus;
              }).length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="text-slate-300 dark:text-slate-700 mx-auto mb-4" size={40} />
                  <p className="text-slate-500 font-bold">No annual plans to review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {deptAnnualPlans.filter(p => {
                    const name = (p.teacher_name || '').toLowerCase();
                    const subj = (p.subject || '').toLowerCase();
                    const q = annualSearch.toLowerCase();
                    const matchSearch = !annualSearch || name.includes(q) || subj.includes(q);
                    const matchStatus = annualDeptFilter === 'All' || p.status === annualDeptFilter;
                    return matchSearch && matchStatus;
                  }).map((plan: any) => (
                    <div
                      key={plan.id}
                      onClick={() => { setSelectedAnnualForView(plan); setAnnualReviewRating(plan.rating || 0); setAnnualReviewFeedback(plan.feedback || ''); }}
                      className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-800 transition-all p-6 space-y-4 cursor-pointer group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-2 h-full bg-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                        <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight group-hover:text-violet-600 transition-colors">{plan.teacher_name}</h3>
                        <p className="text-xs text-slate-500 font-bold mt-1">{plan.subject} — {plan.grade}</p>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-500">Academic Year: <span className="font-bold text-slate-700 dark:text-slate-300">{plan.academic_year}</span></p>
                        <p className="text-slate-500">Weeks: <span className="font-bold text-slate-700 dark:text-slate-300">{Array.isArray(plan.items) ? plan.items.length : 0}</span></p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          plan.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : plan.status === 'Revision Required' ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'
                        }`}>{plan.status}</span>
                        {plan.rating ? (
                          <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= plan.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />)}</div>
                        ) : null}
                      </div>
                      <div className="text-center pt-1"><span className="text-[10px] font-black text-violet-600 uppercase tracking-widest group-hover:underline">Review Annual Plan →</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search teacher or subject..."
              value={deptSearch}
              onChange={e => setDeptSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1 md:flex-none">
              <label htmlFor="deptFilter" className="sr-only">Filter lesson plans by status</label>
              <select
                id="deptFilter"
                title="Filter lesson plans by status"
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Revision Required">Revision Required</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeptPlans.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500 font-bold">No plans matching the search/filter criteria.</p>
              </div>
            ) : (
              filteredDeptPlans.map((plan: any) => (
                <div
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlanForView(plan);
                    setReviewRating(plan.dean_rating || plan.rating || 0);
                    setReviewFeedback(plan.dean_feedback || plan.feedback || '');
                  }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-900 transition-all p-6 space-y-4 group cursor-pointer relative overflow-hidden"
                >
                  {/* Interactive hover indicator */}
                  <div className="absolute top-0 right-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Header */}
                  <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                      {plan.teacher_name || plan.teacherName}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">{plan.subject || '—'}</p>
                  </div>

                  {/* Plan Details Preview */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Date</label>
                      <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{plan.date?.slice(0, 10)}</p>
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Topic / Content</label>
                      <p className="text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5 font-medium">{plan.content}</p>
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Objectives</label>
                      <p className="text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5 font-medium">{plan.objectives}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${plan.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : plan.status === 'Revision Required'
                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                            : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}
                    >
                      {plan.status}
                    </span>

                    {(plan.dean_rating || plan.rating) ? (
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map(star => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= (plan.dean_rating || plan.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Feedback comment preview */}
                  {(plan.dean_feedback || plan.feedback) && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Comments</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5 font-medium">
                        {plan.dean_feedback || plan.feedback}
                      </p>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest group-hover:underline">
                      View & Evaluate Plan →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
            </>
          )} {/* end deptTaskSubTab conditional */}
        </div>
      ) : null}

      {/* Plan Modal (Ziquala Abo Weekly Form) */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-6xl my-4">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 text-white rounded-2xl"><FileText size={22} /></div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 block">Ziquala Abo 1st Primary School</span>
                  <h3 className="font-black text-white text-lg tracking-tight">
                    {editingPlan ? 'Edit Weekly Lesson Plan Sheet' : 'Weekly Lesson Plan Form'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsPlanModalOpen(false); setEditingPlan(null); }}
                className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {editingPlan && editingPlan.status === 'Revision Required' && (editingPlan.dean_feedback || editingPlan.feedback) && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-orange-800 dark:text-orange-400 uppercase tracking-wider">Revision Required from Department Head</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1 font-medium leading-relaxed">
                      "{editingPlan.dean_feedback || editingPlan.feedback}"
                    </p>
                  </div>
                </div>
              )}

              {/* Header Info Block */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">📋 Document Header Information</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ziquala Abo Primary School Official Format</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Teacher's Name</label>
                    <input
                      type="text"
                      placeholder="Teacher Name"
                      value={planForm.teacherName || (user as any)?.name || ''}
                      onChange={e => setPlanForm({ ...planForm, teacherName: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Subject / Course</label>
                    <select
                      value={planForm.courseId || ''}
                      onChange={e => {
                        const selectedCourseId = e.target.value;
                        const selectedCourse = myCourses.find((c: any) => c.id === selectedCourseId);
                        const newSubject = selectedCourse?.name || '';
                        const matchingHods = filterDeptHeadsForCourse(selectedCourseId);
                        let newDeptHeadId = matchingHods.length > 0 ? (matchingHods[0].teacher_id || matchingHods[0].id) : '';
                        setPlanForm({ ...planForm, courseId: selectedCourseId, subject: newSubject, deptHeadId: newDeptHeadId });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Course / Subject</option>
                      {myCourses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Chapter / Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. Unit 3: Linear Equations"
                      value={planForm.chapterUnit || ''}
                      onChange={e => setPlanForm({ ...planForm, chapterUnit: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Topic / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Solving 2-step equations"
                      value={planForm.topicTitle || ''}
                      onChange={e => setPlanForm({ ...planForm, topicTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Grade & Section</label>
                    <input
                      type="text"
                      placeholder="e.g. Grade 7 Section A"
                      value={planForm.gradeSection || ''}
                      onChange={e => setPlanForm({ ...planForm, gradeSection: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Periods / Week</label>
                    <input
                      type="text"
                      placeholder="e.g. 4 Periods"
                      value={planForm.periodsPerWeek || ''}
                      onChange={e => setPlanForm({ ...planForm, periodsPerWeek: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Date (From)</label>
                    <input
                      type="date"
                      value={planForm.dateFrom || planForm.date}
                      onChange={e => setPlanForm({ ...planForm, dateFrom: e.target.value, date: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Date (To)</label>
                    <input
                      type="date"
                      value={planForm.dateTo || planForm.date}
                      onChange={e => setPlanForm({ ...planForm, dateTo: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Department Head Reviewer</label>
                    <select
                      value={planForm.deptHeadId || ''}
                      onChange={e => setPlanForm({ ...planForm, deptHeadId: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    >
                      <option value="">Select Department Head</option>
                      {displayHods.map((hod: any) => (
                        <option key={hod.teacher_id || hod.id} value={hod.teacher_id || hod.id}>
                          {hod.name} {hod.department ? `— ${hod.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* View Mode & Quick Controls Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">📅 Daily Activities Breakdown (Monday – Friday)</h4>
                </div>
                <div className="flex items-center gap-2">
                  {/* Editor Mode Switcher */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPlanEditorMode('tabs')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${planEditorMode === 'tabs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      Single Day Tabs
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanEditorMode('full')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${planEditorMode === 'full' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      📊 Full Matrix Grid View
                    </button>
                  </div>
                </div>
              </div>

              {planEditorMode === 'tabs' ? (
                <>
                  {/* Day Tabs */}
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d: any) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setActivePlanDay(d)}
                        className={`flex-1 min-w-[90px] py-2 rounded-xl text-xs font-black transition-all ${
                          activePlanDay === d
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  {/* Single Day Form */}
                  {(() => {
                    const dayActIndex = planForm.dailyActivities.findIndex((a: any) => a.day === activePlanDay);
                    const act = planForm.dailyActivities[dayActIndex] || {
                      day: activePlanDay, content: '', competence: '', timeDuration: '45 mins',
                      teacherIntro: '', teacherPresentation: '', teacherSummary: '', teacherAssessment: '',
                      studentActivity: '', teachingMethod: '', teachingAid: '', evaluationRemark: ''
                    };

                    const updateDayAct = (field: string, val: string) => {
                      const newArr = [...planForm.dailyActivities];
                      if (dayActIndex >= 0) {
                        newArr[dayActIndex] = { ...newArr[dayActIndex], [field]: val };
                      } else {
                        newArr.push({ day: activePlanDay, [field]: val } as any);
                      }
                      setPlanForm({ ...planForm, dailyActivities: newArr });
                    };

                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5">
                        <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 flex-wrap gap-2">
                          <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase">Configuring {activePlanDay}'s Lesson Plan</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Time Duration:</span>
                            <input
                              type="text"
                              placeholder="e.g. 45 mins"
                              value={act.timeDuration || ''}
                              onChange={e => updateDayAct('timeDuration', e.target.value)}
                              className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-28 font-bold text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Lesson Content (የትምህርት ይዘት)</label>
                            <textarea
                              rows={3}
                              placeholder="Specify main topic & sub-topics to cover on this day…"
                              value={act.content || ''}
                              onChange={e => updateDayAct('content', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Expected Outcome / Competence (የሚጠበቅ ውጤት / ብቃት)</label>
                            <textarea
                              rows={3}
                              placeholder="What specific skills or knowledge should students gain?"
                              value={act.competence || ''}
                              onChange={e => updateDayAct('competence', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* 4 Phases of Teacher Activity */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 space-y-3">
                          <label className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider block">
                            Teacher Activity (የመምህሩ ተግባር - 4 Phases)
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase block mb-1">1. Introduction (መግቢያ)</span>
                              <textarea
                                rows={2}
                                placeholder="Warm-up, attendance & review previous lesson…"
                                value={act.teacherIntro || ''}
                                onChange={e => updateDayAct('teacherIntro', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </div>
                            <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                              <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase block mb-1">2. Lesson Presentation (ትምህርት አቀራረብ)</span>
                              <textarea
                                rows={2}
                                placeholder="Core explanation, examples, and demonstration…"
                                value={act.teacherPresentation || ''}
                                onChange={e => updateDayAct('teacherPresentation', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </div>
                            <div className="p-3 bg-violet-50/40 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900/30">
                              <span className="text-[10px] font-black text-violet-700 dark:text-violet-400 uppercase block mb-1">3. Summary (ማጠቃለያ)</span>
                              <textarea
                                rows={2}
                                placeholder="Wrap-up & key takeaways consolidation…"
                                value={act.teacherSummary || ''}
                                onChange={e => updateDayAct('teacherSummary', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </div>
                            <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                              <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase block mb-1">4. Assessment / Evaluation (ምዘና)</span>
                              <textarea
                                rows={2}
                                placeholder="Check understanding, oral questions or quiz…"
                                value={act.teacherAssessment || ''}
                                onChange={e => updateDayAct('teacherAssessment', e.target.value)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Student Activity & Teaching Method */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Student Activity (የተማሪው ተግባር)</label>
                            <textarea
                              rows={2}
                              placeholder="e.g. Note-taking, asking questions, group work"
                              value={act.studentActivity || ''}
                              onChange={e => updateDayAct('studentActivity', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                            />
                            {/* Preset chips */}
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {['Listening & Note taking', 'Group Discussion', 'Solving Exercises', 'Asking Questions'].map(chip => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => updateDayAct('studentActivity', act.studentActivity ? `${act.studentActivity}, ${chip}` : chip)}
                                  className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 hover:text-blue-700 rounded-md font-medium text-slate-600 dark:text-slate-300 transition-all"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Teaching Method (ማስተማሪያ ዘዴ)</label>
                            <textarea
                              rows={2}
                              placeholder="e.g. Demonstration, Question & Answer, Lecture"
                              value={act.teachingMethod || ''}
                              onChange={e => updateDayAct('teachingMethod', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                            />
                            {/* Preset chips */}
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {['Demonstration', 'Question & Answer', 'Group Discussion', 'Explanation', 'Brainstorming'].map(chip => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => updateDayAct('teachingMethod', act.teachingMethod ? `${act.teachingMethod}, ${chip}` : chip)}
                                  className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 hover:text-blue-700 rounded-md font-medium text-slate-600 dark:text-slate-300 transition-all"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Teaching Aid & Evaluation */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Teaching Aid / Materials (መርጃ መሣሪያ)</label>
                            <textarea
                              rows={2}
                              placeholder="e.g. Textbook, Chalk/Whiteboard, Charts, Models"
                              value={act.teachingAid || ''}
                              onChange={e => updateDayAct('teachingAid', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                            />
                            {/* Preset chips */}
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {['Textbook & Guide', 'Whiteboard / Blackboard', 'Charts & Diagrams', 'Real Objects'].map(chip => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => updateDayAct('teachingAid', act.teachingAid ? `${act.teachingAid}, ${chip}` : chip)}
                                  className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 hover:text-blue-700 rounded-md font-medium text-slate-600 dark:text-slate-300 transition-all"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Evaluation / Remark (ምዘና)</label>
                            <textarea
                              rows={2}
                              placeholder="Daily observations or remarks…"
                              value={act.evaluationRemark || ''}
                              onChange={e => updateDayAct('evaluationRemark', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* Full Interactive Matrix Grid View */
                <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-700">
                  <table className="w-full text-left min-w-[1200px] text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white border-b border-slate-700 text-[11px] font-black uppercase">
                        <th className="px-3 py-3 w-20 border-r border-slate-700 text-center">Day (ቀን)</th>
                        <th className="px-3 py-3 w-56 border-r border-slate-700">Content & Outcome (ይዘት እና ብቃት)</th>
                        <th className="px-2 py-3 w-20 border-r border-slate-700 text-center">Time (ጊዜ)</th>
                        <th className="px-3 py-3 w-64 border-r border-slate-700">Teacher Activity (የመምህሩ ተግባር)</th>
                        <th className="px-3 py-3 border-r border-slate-700">Student Activity (የተማሪው)</th>
                        <th className="px-3 py-3 border-r border-slate-700">Method (ዘዴ)</th>
                        <th className="px-3 py-3 border-r border-slate-700">Aid (መርጃ)</th>
                        <th className="px-3 py-3">Remark (ምዘና)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((dayName, dayIdx) => {
                        const dayActIndex = planForm.dailyActivities.findIndex((a: any) => a.day === dayName);
                        const act = planForm.dailyActivities[dayActIndex] || {
                          day: dayName, content: '', competence: '', timeDuration: '45 mins',
                          teacherIntro: '', teacherPresentation: '', teacherSummary: '', teacherAssessment: '',
                          studentActivity: '', teachingMethod: '', teachingAid: '', evaluationRemark: ''
                        };

                        const updateDayAct = (field: string, val: string) => {
                          const newArr = [...planForm.dailyActivities];
                          if (dayActIndex >= 0) {
                            newArr[dayActIndex] = { ...newArr[dayActIndex], [field]: val };
                          } else {
                            newArr.push({ day: dayName, [field]: val } as any);
                          }
                          setPlanForm({ ...planForm, dailyActivities: newArr });
                        };

                        return (
                          <tr key={dayName} className={dayIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-800/40'}>
                            <td className="px-3 py-3 font-black text-center text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800 align-top">
                              {dayName}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 align-top space-y-2">
                              <textarea
                                rows={2}
                                placeholder="Lesson Content…"
                                value={act.content || ''}
                                onChange={e => updateDayAct('content', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none text-slate-800 dark:text-white font-medium"
                              />
                              <textarea
                                rows={2}
                                placeholder="Expected Outcome…"
                                value={act.competence || ''}
                                onChange={e => updateDayAct('competence', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none text-slate-600 dark:text-slate-300"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 align-top">
                              <input
                                type="text"
                                value={act.timeDuration || ''}
                                onChange={e => updateDayAct('timeDuration', e.target.value)}
                                className="w-full p-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 align-top space-y-1.5">
                              <input
                                type="text"
                                placeholder="1. Intro"
                                value={act.teacherIntro || ''}
                                onChange={e => updateDayAct('teacherIntro', e.target.value)}
                                className="w-full p-1.5 bg-blue-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-white"
                              />
                              <input
                                type="text"
                                placeholder="2. Presentation"
                                value={act.teacherPresentation || ''}
                                onChange={e => updateDayAct('teacherPresentation', e.target.value)}
                                className="w-full p-1.5 bg-indigo-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-white"
                              />
                              <input
                                type="text"
                                placeholder="3. Summary"
                                value={act.teacherSummary || ''}
                                onChange={e => updateDayAct('teacherSummary', e.target.value)}
                                className="w-full p-1.5 bg-violet-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-white"
                              />
                              <input
                                type="text"
                                placeholder="4. Assessment"
                                value={act.teacherAssessment || ''}
                                onChange={e => updateDayAct('teacherAssessment', e.target.value)}
                                className="w-full p-1.5 bg-amber-50/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 align-top">
                              <textarea
                                rows={4}
                                placeholder="Student Activity…"
                                value={act.studentActivity || ''}
                                onChange={e => updateDayAct('studentActivity', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 align-top">
                              <textarea
                                rows={4}
                                placeholder="Method…"
                                value={act.teachingMethod || ''}
                                onChange={e => updateDayAct('teachingMethod', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 align-top">
                              <textarea
                                rows={4}
                                placeholder="Aid…"
                                value={act.teachingAid || ''}
                                onChange={e => updateDayAct('teachingAid', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <textarea
                                rows={4}
                                placeholder="Remark…"
                                value={act.evaluationRemark || ''}
                                onChange={e => updateDayAct('evaluationRemark', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end bg-slate-50 dark:bg-slate-800/80 rounded-b-[2rem]">
              <button
                type="button"
                onClick={() => { setIsPlanModalOpen(false); setEditingPlan(null); }}
                className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePlan('Draft')}
                disabled={submitting}
                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                {editingPlan ? 'Update Draft' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSavePlan('Pending')}
                disabled={submitting}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                {editingPlan ? 'Submit for Review' : 'Submit Plan'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Exam Modal */}
      {isExamModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 border border-slate-100 dark:border-slate-800">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl flex justify-between items-center z-10">
              <h3 className="text-xl font-black text-white uppercase tracking-wide">{editingExam ? '✏️ Edit Exam' : '📝 Create New Exam'}</h3>
              <button
                type="button"
                title="Close exam modal"
                onClick={() => { setIsExamModalOpen(false); setEditingExam(null); }}
                className="text-white hover:bg-white/20 p-1 rounded"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {/* Exam Title */}
              <div>
                <label htmlFor="examTitle" className="text-xs font-bold text-slate-500 uppercase">Exam Title</label>
                <input id="examTitle" type="text" placeholder="e.g., Mid Exam - Mathematics"
                  value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Grade & Subject Selection */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-700">
                <div>
                  <label htmlFor="examGrade" className="text-xs font-bold text-slate-500 uppercase">Grade Level</label>
                  {loadingGrades ? (
                    <div className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-400">Loading...</div>
                  ) : (
                    <select id="examGrade" value={examForm.gradeId} onChange={e => handleGradeChange(e.target.value)}
                      className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select Grade</option>
                      {gradesForExam.map(grade => (
                        <option key={grade.id} value={grade.id}>{grade.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label htmlFor="examSubject" className="text-xs font-bold text-slate-500 uppercase">Subject/Course</label>
                  {examForm.gradeId && loadingCourses ? (
                    <div className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-400">Loading...</div>
                  ) : examForm.gradeId && coursesForGrade.length > 0 ? (
                    <div className="mt-1 p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg space-y-2">
                      {coursesForGrade.map(course => (
                        <label key={course.id} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" name="examSubject" value={course.id}
                            checked={examForm.subjectId === course.id}
                            onChange={e => setExamForm({ ...examForm, subjectId: e.target.value })}
                            className="w-4 h-4 text-blue-600 rounded-full" />
                          <span className="text-slate-700 dark:text-slate-300">{course.name} ({course.code})</span>
                        </label>
                      ))}
                    </div>
                  ) : examForm.gradeId ? (
                    <div className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-400">No courses available for this grade</div>
                  ) : (
                    <div className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-400">Select a grade first</div>
                  )}
                </div>
              </div>

              {/* Exam Type & Total Marks & Duration */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="examType" className="text-xs font-bold text-slate-500 uppercase">Type</label>
                  <select id="examType" value={examForm.examType} onChange={e => setExamForm({ ...examForm, examType: e.target.value })}
                    className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Mid Exam</option>
                    <option>Final Exam</option>
                    <option>Quiz</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="totalMarks" className="text-xs font-bold text-slate-500 uppercase">Total Marks</label>
                  <input id="totalMarks" type="number" min="10" max="1000"
                    value={examForm.totalMarks} onChange={e => setExamForm({ ...examForm, totalMarks: parseInt(e.target.value) })}
                    className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="duration" className="text-xs font-bold text-slate-500 uppercase">Duration (min)</label>
                  <input id="duration" type="number" min="15" max="600"
                    value={examForm.duration} onChange={e => setExamForm({ ...examForm, duration: parseInt(e.target.value) })}
                    className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Class & Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="examClass" className="text-xs font-bold text-slate-500 uppercase">Class</label>
                  <select id="examClass" value={examForm.selectedClass} onChange={e => {
                    const selected = myClasses.find((c: any) => c.id === e.target.value);
                    setExamForm({ ...examForm, selectedClass: e.target.value, selectedSection: '' });
                  }}
                    className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Class</option>
                    {myClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name || c.class_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="examSection" className="text-xs font-bold text-slate-500 uppercase">Section</label>
                  <input id="examSection" type="text" placeholder="e.g., A, B, C"
                    value={examForm.selectedSection} onChange={e => setExamForm({ ...examForm, selectedSection: e.target.value })}
                    className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label htmlFor="examInstructions" className="text-xs font-bold text-slate-500 uppercase">Instructions for Students</label>
                <textarea id="examInstructions" rows={3} placeholder="e.g., Answer all questions. No calculators allowed. Duration: 1 hour"
                  value={examForm.instructions} onChange={e => setExamForm({ ...examForm, instructions: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* Password Protection Section */}
              <div className="p-4 bg-amber-50 dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <input id="isLocked" type="checkbox" checked={examForm.isLocked}
                    onChange={e => setExamForm({ ...examForm, isLocked: e.target.checked, passwordRequired: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded" />
                  <label htmlFor="isLocked" className="text-xs font-bold text-slate-500 uppercase cursor-pointer flex-1">
                    🔒 Lock This Exam (Requires Password)
                  </label>
                </div>
                {examForm.isLocked && (
                  <>
                    <div>
                      <label htmlFor="examPassword" className="text-xs font-bold text-slate-500 uppercase">Exam Password</label>
                      <input id="examPassword" type="password" placeholder="Enter exam password (students will need this)"
                        value={examForm.examPassword} onChange={e => setExamForm({ ...examForm, examPassword: e.target.value })}
                        className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-700 border border-amber-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">ℹ️ Students must enter this password to access the exam. If they leave and return, they'll need to enter it again.</p>
                  </>
                )}
              </div>

              {/* Questions Builder - Simple version */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Questions Preview</label>
                <p className="text-xs text-slate-500 mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  {examForm.questions.length === 0 ? 'No questions added yet. This feature will be available in the full version.' : `${examForm.questions.length} questions configured`}
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-800 p-6 rounded-b-2xl flex gap-3 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => { setIsExamModalOpen(false); setEditingExam(null); }}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveExamChanges} disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingExam ? 'Update Exam' : 'Save Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Details & Evaluation Modal (Ziquala Abo Matrix Format) */}
      {selectedPlanForView && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-6xl my-4 print:my-0 print:shadow-none print:border-none print:w-full">
            
            {/* Header Banner */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white rounded-t-[2rem] print:hidden">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 block">Official Weekly Lesson Plan Document</span>
                <h3 className="font-black text-white text-lg tracking-tight uppercase">
                  Ziquala Abo 1st Primary School Weekly Lesson Plan Form
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md"
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanForView(null)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-2">
              
              {/* Document Header Table Block */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 font-black text-slate-800 dark:text-white uppercase tracking-wider text-center border-b border-slate-300 dark:border-slate-700">
                  ZIQUALA ABO 1ST PRIMARY SCHOOL WEEKLY LESSON PLAN FORM
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-slate-200 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Teacher Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPlanForView.teacher_name || selectedPlanForView.teacherName || 'Assigned Teacher'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Subject / Lesson Type</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{selectedPlanForView.subject || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Chapter / Unit</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPlanForView.chapter_unit || selectedPlanForView.chapterUnit || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Topic / Title</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPlanForView.topic_title || selectedPlanForView.topicTitle || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Grade & Section</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPlanForView.grade_section || selectedPlanForView.gradeSection || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Date Range</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPlanForView.date_from || selectedPlanForView.date || '—'} to {selectedPlanForView.date_to || selectedPlanForView.date || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Periods / Week</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPlanForView.periods_per_week || selectedPlanForView.periodsPerWeek || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Status</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      selectedPlanForView.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      selectedPlanForView.status === 'Revision Required' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>{selectedPlanForView.status}</span>
                  </div>
                </div>
              </div>

              {/* 5-Day Matrix Table matching paper layout with 4 sub-rows for Teacher Activity */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 print:hidden">📅 Daily Lesson Plan Matrix Table</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-700">
                  <table className="w-full text-left min-w-[1100px] text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white border-b border-slate-700">
                        <th className="px-3 py-2.5 font-black uppercase w-20 border-r border-slate-700 text-center">Day (ቀን)</th>
                        <th className="px-3 py-2.5 font-black uppercase w-56 border-r border-slate-700">Content & Outcome (ይዘት እና ብቃት)</th>
                        <th className="px-2 py-2.5 font-black uppercase w-20 border-r border-slate-700 text-center">Time (ጊዜ)</th>
                        <th className="px-3 py-2.5 font-black uppercase w-60 border-r border-slate-700">Teacher Activity (የመምህሩ ተግባር)</th>
                        <th className="px-3 py-2.5 font-black uppercase border-r border-slate-700">Student Activity (የተማሪው)</th>
                        <th className="px-3 py-2.5 font-black uppercase border-r border-slate-700">Method (ማስተማሪያ ዘዴ)</th>
                        <th className="px-3 py-2.5 font-black uppercase border-r border-slate-700">Aid (መርጃ መሣሪያ)</th>
                        <th className="px-3 py-2.5 font-black uppercase">Remark (ምዘና)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
                      {(Array.isArray(selectedPlanForView.daily_activities || selectedPlanForView.dailyActivities)
                        ? (selectedPlanForView.daily_activities || selectedPlanForView.dailyActivities)
                        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => ({
                            day,
                            content: selectedPlanForView.content || '—',
                            competence: selectedPlanForView.objectives || '—',
                            timeDuration: selectedPlanForView.time_duration || selectedPlanForView.timeDuration || '45 mins',
                            teacherIntro: selectedPlanForView.teacher_activity || selectedPlanForView.teacherActivity || '—',
                            teacherPresentation: 'Core presentation',
                            teacherSummary: 'Summary',
                            teacherAssessment: selectedPlanForView.evaluation || '—',
                            studentActivity: selectedPlanForView.student_activity || selectedPlanForView.studentActivity || '—',
                            teachingMethod: selectedPlanForView.teaching_method || selectedPlanForView.teachingMethod || '—',
                            teachingAid: selectedPlanForView.teaching_aids || selectedPlanForView.teachingAids || '—',
                            evaluationRemark: selectedPlanForView.remark || '—'
                          }))
                      ).map((act: any, idx: number) => (
                        <React.Fragment key={idx}>
                          {/* Sub-row 1: Introduction */}
                          <tr className="bg-white dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700">
                            <td rowSpan={4} className="px-3 py-3 font-black text-center text-blue-800 dark:text-blue-400 border-r border-slate-300 dark:border-slate-700 align-middle bg-slate-50/80 dark:bg-slate-800/40">
                              <span className="text-sm">{act.day}</span>
                            </td>
                            <td rowSpan={4} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 align-top space-y-2 max-w-[200px]">
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 block border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">Content (ይዘት)</span>
                                <p className="font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{act.content || '—'}</p>
                              </div>
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-[9px] font-black uppercase text-slate-400 block border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">Expected Outcome / Competence (ብቃት)</span>
                                <p className="font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{act.competence || '—'}</p>
                              </div>
                            </td>
                            <td rowSpan={4} className="px-2 py-3 font-bold text-center text-slate-600 dark:text-slate-400 border-r border-slate-300 dark:border-slate-700 align-middle whitespace-nowrap">
                              {act.timeDuration || '45 mins'}
                            </td>
                            <td className="px-3 py-2 border-r border-b border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/20">
                              <span className="text-[9px] font-black uppercase text-blue-700 dark:text-blue-400 block">1. Intro (መግቢያ)</span>
                              <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{act.teacherIntro || '—'}</p>
                            </td>
                            <td rowSpan={4} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 align-top text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-w-[160px]">
                              {act.studentActivity || '—'}
                            </td>
                            <td rowSpan={4} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 align-top text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-w-[140px]">
                              {act.teachingMethod || '—'}
                            </td>
                            <td rowSpan={4} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 align-top text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-w-[140px]">
                              {act.teachingAid || '—'}
                            </td>
                            <td rowSpan={4} className="px-3 py-3 align-top text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-w-[140px]">
                              {act.evaluationRemark || '—'}
                            </td>
                          </tr>

                          {/* Sub-row 2: Lesson Presentation */}
                          <tr className="bg-white dark:bg-slate-900">
                            <td className="px-3 py-2 border-r border-b border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                              <span className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-400 block">2. Presentation (አቀራረብ)</span>
                              <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{act.teacherPresentation || '—'}</p>
                            </td>
                          </tr>

                          {/* Sub-row 3: Summary */}
                          <tr className="bg-white dark:bg-slate-900">
                            <td className="px-3 py-2 border-r border-b border-slate-200 dark:border-slate-800 bg-violet-50/30 dark:bg-violet-950/20">
                              <span className="text-[9px] font-black uppercase text-violet-700 dark:text-violet-400 block">3. Summary (ማጠቃለያ)</span>
                              <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{act.teacherSummary || '—'}</p>
                            </td>
                          </tr>

                          {/* Sub-row 4: Assessment */}
                          <tr className="bg-white dark:bg-slate-900">
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/20">
                              <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 block">4. Assessment (ምዘና)</span>
                              <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{act.teacherAssessment || '—'}</p>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Approvals Footer Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 print:bg-white print:border-slate-400">
                <div className="border border-dashed border-slate-300 dark:border-slate-700 p-3 rounded-xl text-center print:border-solid print:border-slate-400">
                  <p className="text-[10px] font-black uppercase text-slate-400">Teacher Signature & Date</p>
                  <p className="font-bold text-slate-800 dark:text-white text-xs mt-2">{selectedPlanForView.teacher_name || selectedPlanForView.teacherName || 'Assigned Teacher'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Date: {selectedPlanForView.created_at ? new Date(selectedPlanForView.created_at).toLocaleDateString() : selectedPlanForView.date || '—'}</p>
                </div>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 p-3 rounded-xl text-center print:border-solid print:border-slate-400">
                  <p className="text-[10px] font-black uppercase text-slate-400">Department Head Signature & Date</p>
                  <p className="font-bold text-slate-800 dark:text-white text-xs mt-2">{selectedPlanForView.status === 'Approved' ? 'Verified & Approved' : 'Pending Approval'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Date: {selectedPlanForView.updated_at ? new Date(selectedPlanForView.updated_at).toLocaleDateString() : '—'}</p>
                </div>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 p-3 rounded-xl text-center print:border-solid print:border-slate-400">
                  <p className="text-[10px] font-black uppercase text-slate-400">Principal / VP Signature & Date</p>
                  <p className="font-bold text-slate-800 dark:text-white text-xs mt-2">{selectedPlanForView.status === 'Approved' ? 'Signed for Academic Oversight' : 'Awaiting Review'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Date: {selectedPlanForView.updated_at ? new Date(selectedPlanForView.updated_at).toLocaleDateString() : '—'}</p>
                </div>
              </div>

              {/* Interactive Evaluation Section for Dept Head */}
              <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-4 print:hidden">
                <h4 className="text-xs font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest">✍️ Department Head Evaluation & Rating</h4>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Rating (1–3 Stars)</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star size={24} className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Feedback / Revision Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Provide revision instructions or feedback…"
                    value={reviewFeedback}
                    onChange={e => setReviewFeedback(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 dark:text-white"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => {
                      handleApproveDeptPlan(selectedPlanForView.id, reviewRating, reviewFeedback);
                      setSelectedPlanForView(null);
                    }}
                    className="flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md shadow-emerald-500/20"
                  >
                    ✓ Approve Plan
                  </button>
                  <button
                    onClick={() => {
                      if (!reviewFeedback.trim()) {
                        showToast('Please enter revision comments first!', 'error');
                        return;
                      }
                      handleRejectDeptPlan(selectedPlanForView.id, reviewRating, reviewFeedback);
                      setSelectedPlanForView(null);
                    }}
                    className="flex-1 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md shadow-orange-500/20"
                  >
                    ⟲ Request Revision
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'
            }`}>
            {toast.type === 'success' ? <CheckCircle2 className="text-green-600" size={20} /> : <XCircle className="text-red-600" size={20} />}
            <p className={`text-sm font-bold ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{toast.message}</p>
          </div>
        </div>
      )}

      {/* ── Annual Plan Editor Modal (Teacher) ── */}
      {isAnnualModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-6xl my-4">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-violet-600 to-purple-700 rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 text-white rounded-2xl"><FileText size={20} /></div>
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight">
                    {editingAnnualPlan ? 'Edit Annual Plan' : 'New Yearly Lesson Plan'}
                  </h3>
                  <p className="text-xs text-violet-200 font-bold uppercase tracking-widest">Submit for Department Head review</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsAnnualModalOpen(false); setEditingAnnualPlan(null); }}
                className="p-2 hover:bg-white/20 rounded-xl text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Revision notice */}
              {editingAnnualPlan?.status === 'Revision Required' && editingAnnualPlan?.feedback && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl flex gap-3">
                  <AlertCircle size={18} className="text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-orange-800 uppercase tracking-wider">Department Head Feedback</p>
                    <p className="text-sm text-orange-700 mt-1">"{editingAnnualPlan.feedback}"</p>
                  </div>
                </div>
              )}

              {/* Header Metadata */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">📋 Plan Header Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Academic Year</label>
                    <input value={annualForm.academicYear} onChange={e => setAnnualForm(f => ({ ...f, academicYear: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Subject</label>
                    <select value={annualForm.courseId} onChange={e => {
                      const c = myCourses.find((x: any) => x.id === e.target.value);
                      setAnnualForm(f => ({ ...f, courseId: e.target.value, subject: c?.name || f.subject }));
                    }} className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                      <option value="">Select course…</option>
                      {myCourses.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.class_name ? ` — ${c.class_name}` : ''}</option>)}
                    </select>
                    {!annualForm.courseId && (
                      <input placeholder="Or type subject…" value={annualForm.subject} onChange={e => setAnnualForm(f => ({ ...f, subject: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Grade</label>
                    <input value={annualForm.grade} onChange={e => setAnnualForm(f => ({ ...f, grade: e.target.value }))}
                      placeholder="e.g. Grade 9" className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Duration / Period</label>
                    <input value={annualForm.durationPeriod} onChange={e => setAnnualForm(f => ({ ...f, durationPeriod: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Working Days/Year</label>
                    <input type="number" value={annualForm.workingDaysYear} onChange={e => setAnnualForm(f => ({ ...f, workingDaysYear: +e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Periods / Year</label>
                    <input type="number" value={annualForm.periodsYear} onChange={e => setAnnualForm(f => ({ ...f, periodsYear: +e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Periods / Week</label>
                    <input type="number" value={annualForm.periodsWeek} onChange={e => setAnnualForm(f => ({ ...f, periodsWeek: +e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
              </div>

              {/* 11-Column Matrix */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">📅 Yearly Matrix — September to June</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <table className="w-full text-left min-w-[1400px] text-xs">
                    <thead>
                      <tr className="bg-violet-600 text-white">
                        {['Month','Week','# Periods','Unit','Main Content','Sub Content','Competence (Learning Outcome)','Teaching Method','Teaching Aid','Evaluation','Remark'].map(h => (
                          <th key={h} className="px-3 py-3 font-black uppercase tracking-wide whitespace-nowrap border-r border-violet-500 last:border-r-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {annualForm.items.map((item, idx) => {
                        const isFirstWeekOfMonth = item.week === 1;
                        const monthRows = annualForm.items.filter(i => i.month === item.month).length;
                        return (
                          <tr key={idx} className={`border-b border-slate-100 dark:border-slate-700 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                            {isFirstWeekOfMonth ? (
                              <td className="px-3 py-2 font-black text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/10 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap" rowSpan={monthRows}>
                                {item.month}
                              </td>
                            ) : null}
                            <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-700 text-center font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Week {item.week}</td>
                            {['noOfPeriods','unit','mainContent','subContent','competence','teachingMethod','teachingAid','evaluation','remark'].map(field => (
                              <td key={field} className="px-1 py-1 border-r border-slate-100 dark:border-slate-700 last:border-r-0">
                                <input
                                  type="text"
                                  value={(item as any)[field]}
                                  onChange={e => {
                                    const newItems = [...annualForm.items];
                                    (newItems[idx] as any)[field] = e.target.value;
                                    setAnnualForm(f => ({ ...f, items: newItems }));
                                  }}
                                  className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-violet-300 focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg outline-none transition-all text-slate-800 dark:text-slate-200 min-w-[80px]"
                                  placeholder="—"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
              <button
                onClick={() => { setIsAnnualModalOpen(false); setEditingAnnualPlan(null); }}
                className="px-6 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setSubmitting(true);
                    const payload = { ...annualForm, status: 'Draft' };
                    if (editingAnnualPlan) { await updateAnnualPlan(editingAnnualPlan.id, payload); }
                    else { await submitAnnualPlan(payload); }
                    showToast('Draft saved!', 'success');
                    setIsAnnualModalOpen(false); setEditingAnnualPlan(null);
                    fetchMyAnnualPlans();
                  } catch (e: any) { showToast(e?.message || 'Failed to save draft', 'error'); }
                  finally { setSubmitting(false); }
                }}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
              >
                <Save size={16} /> Save Draft
              </button>
              <button
                onClick={async () => {
                  if (!annualForm.subject && !annualForm.courseId) { showToast('Please enter a subject or select a course.', 'error'); return; }
                  if (!annualForm.grade) { showToast('Please enter a grade.', 'error'); return; }
                  try {
                    setSubmitting(true);
                    const payload = { ...annualForm, status: 'Pending' };
                    if (editingAnnualPlan) { await updateAnnualPlan(editingAnnualPlan.id, payload); }
                    else { await submitAnnualPlan(payload); }
                    showToast('Annual plan submitted for review!', 'success');
                    setIsAnnualModalOpen(false); setEditingAnnualPlan(null);
                    fetchMyAnnualPlans();
                  } catch (e: any) { showToast(e?.message || 'Failed to submit plan', 'error'); }
                  finally { setSubmitting(false); }
                }}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-violet-500/20"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Annual Plan Review Modal (Dept Head) ── */}
      {selectedAnnualForView && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-5xl my-4">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-[2rem]">
              <div>
                <h3 className="font-black text-white uppercase tracking-tight text-lg">Annual Plan Review</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-bold">
                  {selectedAnnualForView.teacher_name} · {selectedAnnualForView.subject} · {selectedAnnualForView.grade}
                </p>
              </div>
              <button onClick={() => setSelectedAnnualForView(null)} className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Plan Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                {[
                  { label: 'Academic Year', value: selectedAnnualForView.academic_year },
                  { label: 'Subject', value: selectedAnnualForView.subject },
                  { label: 'Grade', value: selectedAnnualForView.grade },
                  { label: 'Periods / Week', value: selectedAnnualForView.periods_week },
                  { label: 'Working Days / Year', value: selectedAnnualForView.working_days_year },
                  { label: 'Total Periods / Year', value: selectedAnnualForView.periods_year },
                  { label: 'Duration / Period', value: selectedAnnualForView.duration_period },
                  { label: 'Weeks Planned', value: Array.isArray(selectedAnnualForView.items) ? selectedAnnualForView.items.length : 0 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
                    <p className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Matrix Preview */}
              {Array.isArray(selectedAnnualForView.items) && selectedAnnualForView.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">📅 Yearly Matrix</h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left min-w-[1200px] text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          {['Month','Week','# Periods','Unit','Main Content','Sub Content','Competence','Method','Aid','Evaluation','Remark'].map(h => (
                            <th key={h} className="px-3 py-2.5 font-black uppercase tracking-wide whitespace-nowrap border-r border-slate-700 last:border-r-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAnnualForView.items.map((item: any, idx: number) => {
                          const isFirst = item.week === 1;
                          const monthRows = selectedAnnualForView.items.filter((i: any) => i.month === item.month).length;
                          return (
                            <tr key={idx} className={`border-b border-slate-100 dark:border-slate-700 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/30'}`}>
                              {isFirst ? (
                                <td className="px-3 py-2 font-black text-violet-700 dark:text-violet-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 bg-violet-50 dark:bg-violet-900/10" rowSpan={monthRows}>{item.month}</td>
                              ) : null}
                              <td className="px-3 py-2 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-700 whitespace-nowrap">Week {item.week}</td>
                              {['noOfPeriods','unit','mainContent','subContent','competence','teachingMethod','teachingAid','evaluation','remark'].map(f => (
                                <td key={f} className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700 last:border-r-0">{item[f] || <span className="text-slate-300">—</span>}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Review Panel */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">✍️ Your Review</h4>
                {/* Star Rating */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rating (1–5 Stars)</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => setAnnualReviewRating(star)}
                        className={`p-1.5 rounded-xl transition-all ${annualReviewRating >= star ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-300'}`}>
                        <Star size={24} className={annualReviewRating >= star ? 'fill-amber-400' : ''} />
                      </button>
                    ))}
                    {annualReviewRating > 0 && (
                      <span className="self-center text-xs font-black text-amber-600">{['','Poor','Fair','Good','Very Good','Excellent'][annualReviewRating]}</span>
                    )}
                  </div>
                </div>
                {/* Feedback */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Feedback / Comments</label>
                  <textarea
                    rows={4}
                    value={annualReviewFeedback}
                    onChange={e => setAnnualReviewFeedback(e.target.value)}
                    placeholder="Write your detailed feedback here…"
                    className="w-full mt-2 px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-violet-500 transition-all resize-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end flex-wrap">
              <button onClick={() => setSelectedAnnualForView(null)}
                className="px-6 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Close
              </button>
              <button
                onClick={async () => {
                  if (!annualReviewFeedback.trim()) { showToast('Feedback is required when requesting revision.', 'error'); return; }
                  try {
                    setSubmitting(true);
                    await reviewDeptAnnualPlan(selectedAnnualForView.id, { status: 'Revision Required', feedback: annualReviewFeedback, rating: annualReviewRating || undefined });
                    showToast('Revision request sent.', 'success');
                    setSelectedAnnualForView(null);
                    fetchDeptAnnualPlans();
                  } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
                  finally { setSubmitting(false); }
                }}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                <XCircle size={16} /> Request Revision
              </button>
              <button
                onClick={async () => {
                  try {
                    setSubmitting(true);
                    const fb = annualReviewFeedback.trim() || 'Approved by Department Head';
                    await reviewDeptAnnualPlan(selectedAnnualForView.id, { status: 'Approved', feedback: fb, rating: annualReviewRating || undefined });
                    showToast('Annual plan approved!', 'success');
                    setSelectedAnnualForView(null);
                    fetchDeptAnnualPlans();
                  } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
                  finally { setSubmitting(false); }
                }}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Approve Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

