import { uiText, uiError, localizeHtml } from "../localization";
import { useTranslation } from 'react-i18next';
import { Plus, UserPlus, X, Check, ArrowLeft, MoreVertical, CheckCircle, XCircle, Trash2, Printer, Eye, Edit2, Loader2, FileText, Download, Upload, Users, Calendar, Clock, BookOpen, FileCheck, AlertCircle, CheckCircle2, MessageSquare, Filter, Lock, Unlock, AlertTriangle } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { registerUser, getBranchTeachers, approveTeacher, revokeTeacher, deleteTeacher, promoteTeacher, updateUser, resetUserPIN, removeTeacherPromotion, replaceUserDocument } from '../services/schoolAdminService';
import api from '../services/api';
import classService from '../services/classService';
import { StaffProfileModal } from '../components/StaffProfileModal';
import subjectService, { CourseWithGrade } from '../services/subjectService';
import { getVPTeachers, getLeaderboard, rateTeacher, resetLeaderboard, getVPAnnualPlans, reviewVPAnnualPlan, getWeeklyPlans, getVPAnnualPlanById, getVPWeeklyPlanById } from '../services/vicePrincipalService';
import { Star, Trophy, RefreshCcw, Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { TeacherAttendanceModal } from '../components/TeacherAttendanceModal';
import { formatEthiopianLabel, gregorianToEthiopian, ethiopianToGregorianIso } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { exportToExcel } from '../utils/exportUtils';

const isTeacherActive = (status?: string | null) => {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'approved';
};

const isTeacherPending = (status?: string | null) => {
  const s = String(status || '').toLowerCase();
  return s === 'pending';
};

const MultiSelectDropdown = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  shortDisplay = false
}: {
  options: string[];
  selectedValues: string[];
  onChange: (value: string, checked: boolean) => void;
  placeholder?: string;
  shortDisplay?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-left flex justify-between items-center outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="text-slate-700 dark:text-slate-200 break-words">
          {(selectedValues.length === 0 ? uiText(placeholder) : (shortDisplay ? uiText("{{value0}} selected", {value0: selectedValues.length}) : uiText("{{value0}} ({{value1}} selected)", {value0: selectedValues.join(', '), value1: selectedValues.length})))}
        </span>
        <span className="text-slate-400 font-bold ml-2">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-72 overflow-y-auto z-20 p-2 space-y-1">
            {options.map((option) => {
              const isChecked = selectedValues.includes(option);
              return (
                <label
                  key={option}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md cursor-pointer text-sm text-slate-800 dark:text-slate-200 select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onChange(option, e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>{uiText(option)}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const Teachers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useUser();
  const isSuperviseRoute = location.pathname === '/teachers';
  const isAdmin = role === 'school-admin' || role === 'super-admin' || role === 'academic-manager';
  const canRegisterTeacher = !isSuperviseRoute && (role === 'school-admin' || role === 'super-admin' || role === 'academic-manager');
  const isVP = role === 'vice-principal';

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successModal, setSuccessModal] = useState<{ show: boolean; data: any }>({ show: false, data: null });
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [attendanceTeacher, setAttendanceTeacher] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'annual-plans' | 'weekly-plans' | 'teachers' | 'leaderboard'>(
    isSuperviseRoute ? 'annual-plans' : 'teachers'
  );
  const [annualPlans, setAnnualPlans] = useState<any[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedAnnualPlan, setSelectedAnnualPlan] = useState<any | null>(null);
  const [selectedWeeklyPlan, setSelectedWeeklyPlan] = useState<any | null>(null);
  const [gradeSelectModal, setGradeSelectModal] = useState<{
    show: boolean;
    teacherName: string;
    subject: string;
    planType: 'annual' | 'weekly';
    plans: Array<{ grade: string; submitted?: boolean; status: string; plan_id?: string }>;
  } | null>(null);
  const [loadingSpecificPlanId, setLoadingSpecificPlanId] = useState<string | null>(null);

  const handleViewSpecificPlan = async (planId: string | undefined, planType: 'annual' | 'weekly', fallbackPlan: any) => {
    if (!planId || planId === fallbackPlan?.id) {
      if (planType === 'annual') setSelectedAnnualPlan(fallbackPlan);
      else setSelectedWeeklyPlan(fallbackPlan);
      return;
    }
    setLoadingSpecificPlanId(planId);
    try {
      if (planType === 'annual') {
        const res = await getVPAnnualPlanById(planId);
        setSelectedAnnualPlan(res.data || res);
      } else {
        const res = await getVPWeeklyPlanById(planId);
        setSelectedWeeklyPlan(res.data || res);
      }
    } catch (err) {
      console.error('Failed to load specific plan:', err);
      if (planType === 'annual') setSelectedAnnualPlan(fallbackPlan);
      else setSelectedWeeklyPlan(fallbackPlan);
    } finally {
      setLoadingSpecificPlanId(null);
    }
  };

  // Filters matching Grade Management structure
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(new Date());
  const [weeklyPlanFilter, setWeeklyPlanFilter] = useState<'all' | 'submitted' | 'not_submitted' | 'unlocked'>('all');
  const [weeklyPlanSearch, setWeeklyPlanSearch] = useState('');
  const [weeklyGradeFilter, setWeeklyGradeFilter] = useState<string>('all');

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  };

  const formatEthWeekRangeStr = (date: Date) => {
    const { monday, sunday } = getWeekRange(date);
    const ethMon = gregorianToEthiopian(monday);
    const ethSun = gregorianToEthiopian(sunday);
    const monthNames = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];
    if (ethMon.month === ethSun.month) {
      return `${ethMon.day} - ${ethSun.day} ${monthNames[ethMon.month - 1]} ${ethMon.year} E.C.`;
    } else {
      return `${ethMon.day} ${monthNames[ethMon.month - 1]} - ${ethSun.day} ${monthNames[ethSun.month - 1]} ${ethMon.year === ethSun.year ? `${ethMon.year} E.C.` : `${ethMon.year} / ${ethSun.year} E.C.`}`;
    }
  };

  const isCurrentWeek = (date: Date) => {
    const { monday: m1 } = getWeekRange(date);
    const { monday: m2 } = getWeekRange(new Date());
    return m1.toDateString() === m2.toDateString();
  };

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedWeekDate(new Date());
    } else {
      const newDate = new Date(selectedWeekDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      setSelectedWeekDate(newDate);
    }
  };

  // Dynamic week generator starting from Current Week (auto-advances dynamically as weeks pass)
  const getRecentWeekEndings = () => {
    const list: string[] = [];
    const today = new Date();
    const day = today.getDay();
    let diff = 4 - day; // 4 is Thursday (Week Ending day in Ethiopian academic calendar)
    if (diff < 0) diff += 7;
    const currentThursday = new Date(today);
    currentThursday.setDate(today.getDate() + diff);

    // [0] = Current Week (top item), [-1..-4] = Upcoming weeks, [1] = Previous Week
    const offsets = [0, -1, -2, -3, -4, 1];
    for (const i of offsets) {
      const d = new Date(currentThursday);
      d.setDate(currentThursday.getDate() - i * 7);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      list.push(`${yyyy}-${mm}-${dd}`);
    }
    return list;
  };

  const [annualPlanFilter, setAnnualPlanFilter] = useState<'all' | 'submitted' | 'not_submitted' | 'unlocked'>('all');
  const [annualPlanSearch, setAnnualPlanSearch] = useState('');
  const [annualGradeFilter, setAnnualGradeFilter] = useState<string>('all');

  const availableAnnualGrades = useMemo(() => {
    const gradesSet = new Set<string>();
    annualPlans.forEach(p => {
      if (p.grade_statuses && Array.isArray(p.grade_statuses)) {
        p.grade_statuses.forEach((g: any) => { if (g.grade) gradesSet.add(g.grade); });
      } else if (p.grade) {
        p.grade.split(',').forEach((g: string) => { if (g.trim()) gradesSet.add(g.trim()); });
      }
    });
    return Array.from(gradesSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [annualPlans]);

  const availableWeeklyGrades = useMemo(() => {
    const gradesSet = new Set<string>();
    weeklyPlans.forEach(p => {
      if (p.grade_statuses && Array.isArray(p.grade_statuses)) {
        p.grade_statuses.forEach((g: any) => { if (g.grade) gradesSet.add(g.grade); });
      } else if (p.grade_section || p.grade) {
        (p.grade_section || p.grade).split(',').forEach((g: string) => { if (g.trim()) gradesSet.add(g.trim()); });
      }
    });
    return Array.from(gradesSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [weeklyPlans]);
  const [reviewModal, setReviewModal] = useState<{
    show: boolean;
    planId: string;
    planType: 'annual' | 'weekly';
    status: 'Approved' | 'Revision Required';
    feedback: string;
  }>({ show: false, planId: '', planType: 'annual', status: 'Approved', feedback: '' });

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardGradeFilter, setLeaderboardGradeFilter] = useState('');
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const LEADERBOARD_ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    educationLevel: '',
    specialty: '',
    dob: '',
    previousSchool: '',
    experienceYears: '',
    role: 'teacher' as 'teacher' | 'librarian' | 'vice-principal'
  });
  const [phoneError, setPhoneError] = useState('');
  const [emergencyPhoneError, setEmergencyPhoneError] = useState('');
  const [copied, setCopied] = useState<'digitalId' | 'password' | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ show: boolean; action: 'approve' | 'revoke' | 'delete'; teacher: any }>({ show: false, action: 'approve', teacher: null });
  const [processing, setProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);


  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promotionTarget, setPromotionTarget] = useState<any | null>(null);
  const [promotionForm, setPromotionForm] = useState<{
    roles: string[];
    hodGrades: string[];
    hodSubjects: string[];
    htGrades: string[];
    htSectionsByGrade: Record<string, string[]>;
    beforeSchool: {
      days: string[];
      startTime: string;
      endTime: string;
      useConfiguredRate: boolean;
      extraPayAmount?: string;
    };
  }>({
    roles: [],
    hodGrades: [],
    hodSubjects: [],
    htGrades: [],
    htSectionsByGrade: {},
    beforeSchool: {
      days: [],
      startTime: '07:00',
      endTime: '08:00',
      useConfiguredRate: true,
    },
  });
  const [promoting, setPromoting] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [sectionsMap, setSectionsMap] = useState<Record<string, string[]>>({});
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allCoursesWithGrade, setAllCoursesWithGrade] = useState<CourseWithGrade[]>([]);

  const getDefaultPromotionForm = () => ({
    roles: [] as string[],
    hodGrades: [] as string[],
    hodSubjects: [] as string[],
    htGrades: [] as string[],
    htSectionsByGrade: {} as Record<string, string[]>,
    beforeSchool: {
      days: [] as string[],
      startTime: '07:00',
      endTime: '08:00',
      useConfiguredRate: true,
      extraPayAmount: ''
    }
  });

  const getPromotionFormFromProfile = (promotion: any) => {
    if (!promotion) return getDefaultPromotionForm();

    const activeRoles = promotion.roles || (promotion.promotionType ? [promotion.promotionType] : []);
    const hod = promotion.headOfDepartment || (activeRoles.includes('head-of-department') ? promotion : {});
    const ht = promotion.homeTeacher || (activeRoles.includes('home-teacher') ? promotion : {});
    const bs = promotion.beforeSchool || (activeRoles.includes('before-school-educator') ? promotion.beforeSchool : {});

    return {
      roles: activeRoles,
      hodGrades: hod.grades || [],
      hodSubjects: hod.subjects || [],
      htGrades: ht.grades || [],
      htSectionsByGrade: ht.sections || {},
      beforeSchool: {
        days: bs?.days || [],
        startTime: bs?.startTime || '07:00',
        endTime: bs?.endTime || '08:00',
        useConfiguredRate: bs?.useConfiguredRate ?? true,
        extraPayAmount: bs?.extraPayAmount != null ? String(bs.extraPayAmount) : ''
      }
    };
  };

  const isTeacherPromoted = (teacher: any) => {
    const promo = teacher.staffProfile?.promotion;
    if (!promo) return false;
    if (Array.isArray(promo.roles)) {
      return promo.roles.length > 0;
    }
    return !!promo.promotionType;
  };

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboardData();
    } else if (activeTab === 'annual-plans') {
      fetchAnnualPlansData();
    } else if (activeTab === 'weekly-plans') {
      fetchWeeklyPlansData(selectedWeekDate);
    }
  }, [activeTab, isSuperviseRoute, selectedWeekDate]);

  const fetchAnnualPlansData = async () => {
    try {
      setPlansLoading(true);
      const res = await getVPAnnualPlans();
      setAnnualPlans(res.data || res || []);
    } catch (err) {
      console.error('Error fetching annual plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchWeeklyPlansData = async (targetWeekDate?: Date) => {
    try {
      setPlansLoading(true);
      const dateToUse = targetWeekDate || selectedWeekDate;
      const dateStr = dateToUse.toISOString().split('T')[0];
      const res = await getWeeklyPlans(undefined, undefined, dateStr);
      setWeeklyPlans(res.data || res || []);
    } catch (err) {
      console.error('Error fetching weekly plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleReviewPlanSubmit = async (status: 'Approved' | 'Revision Required', customFeedback?: string) => {
    const { planId, planType, feedback } = reviewModal;
    const finalFeedback = customFeedback !== undefined ? customFeedback : feedback;
    try {
      setProcessing(true);
      if (planType === 'annual') {
        await reviewVPAnnualPlan(planId, {
          status,
          feedback: finalFeedback || (status === 'Approved' ? 'Accepted by Academic Manager' : 'Revision Required')
        });
        await fetchAnnualPlansData();
      }
      setReviewModal({ show: false, planId: '', planType: 'annual', status: 'Approved', feedback: '' });
      if (selectedAnnualPlan?.id === planId) setSelectedAnnualPlan(null);
      if (selectedWeeklyPlan?.id === planId) setSelectedWeeklyPlan(null);
    } catch (err: any) {
      alert(uiText(err?.response?.data?.message || err?.message || 'Failed to review plan'));
    } finally {
      setProcessing(false);
    }
  };

  const fetchLeaderboardData = async () => {
    try {
      setLeaderboardLoading(true);
      const data = await getLeaderboard();
      setLeaderboardData(data);
    } catch (err: any) {
      console.error('Failed to fetch leaderboard:', err);
      alert(uiError(err.response?.data?.error?.message || 'Failed to load leaderboard'));
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleRateTeacher = async (teacherId: string, rating: number) => {
    try {
      await rateTeacher(teacherId, rating);
      fetchLeaderboardData();
    } catch (err: any) {
      alert(uiError(err.response?.data?.error?.message || 'Failed to rate teacher'));
    }
  };

  const handleResetLeaderboard = async () => {
    if (!window.confirm('Are you sure you want to reset all teacher points and votes? This will start a new semester leaderboard.')) {
      return;
    }
    try {
      await resetLeaderboard();
      fetchLeaderboardData();
    } catch (err: any) {
      alert(uiError(err.response?.data?.error?.message || 'Failed to reset leaderboard'));
    }
  };

  const fetchSubjects = async (branchId?: string) => {
    try {
      const subs = await subjectService.getAllSubjects();
      console.log('[DEBUG] Fetched subjects from server:', subs);

      let filtered = subs || [];
      if (branchId) {
        filtered = filtered.filter((s: any) => {
          const subBranch = s.branch_id || s.branchId;
          return !subBranch || subBranch === branchId;
        });
      }

      // Transform snake_case to camelCase for consistency
      const transformed = filtered.map((s: any) => ({
        ...s,
        gradeLevel: s.grade_level || s.gradeLevel // Handle both formats
      }));
      setAllSubjects(transformed);
    } catch (err) {
      console.error('Failed to fetch subjects for promotion UI', err);
    }

    // Also fetch real courses from the courses table (for HoD modal)
    try {
      const courses = await subjectService.getCoursesWithGrade();
      console.log('[DEBUG] Fetched courses-with-grade from server:', courses);
      setAllCoursesWithGrade(courses || []);
    } catch (err) {
      console.error('Failed to fetch courses-with-grade for HoD modal', err);
    }
  };

  const fetchClasses = async (branchId?: string) => {
    try {
      const resp = await classService.getAllClasses();
      let classes = resp.data || resp || [];
      console.log('[DEBUG] Fetched classes from server:', classes);

      if (branchId) {
        classes = classes.filter((c: any) => {
          const classBranch = c.branch_id || c.branchId;
          return !classBranch || classBranch === branchId;
        });
      }

      const map: Record<string, Set<string>> = {};

      classes.forEach((c: any) => {
        const rawGrade = c.grade || c.name || c.className || '';
        const rawSection = c.section || '';
        let gradeKey = String(rawGrade).trim();
        let section = String(rawSection).trim();

        if (!gradeKey) {
          const name = String(c.name || c.className || '');
          const match = name.match(/^(Grade\s+\d+)([A-Z0-9])?$/i);
          if (match) {
            gradeKey = match[1];
            section = section || (match[2] || '');
          } else {
            const m2 = name.match(/^(.*?\d+)([A-Z0-9])$/i);
            if (m2) {
              gradeKey = m2[1];
              section = section || (m2[2] || '');
            }
          }
        }

        gradeKey = gradeKey.trim();
        const digitMatch = gradeKey.match(/^(\d+)$/);
        if (digitMatch) {
          gradeKey = `Grade ${digitMatch[1]}`;
        } else {
          const parts = gradeKey.match(/grade\s*(\d+)/i);
          if (parts) {
            gradeKey = `Grade ${parts[1]}`;
          }
        }

        if (!gradeKey) return;
        if (!map[gradeKey]) map[gradeKey] = new Set<string>();
        if (section) map[gradeKey].add(section);
      });

      const grades = Object.keys(map).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      const smap: Record<string, string[]> = {};
      grades.forEach(g => { smap[g] = Array.from(map[g]).sort(); });
      console.log('[DEBUG] Sections map:', smap);
      setAllGrades(grades);
      setSectionsMap(smap);
    } catch (err) {
      console.error('Failed to fetch classes for promotion UI', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use different endpoint based on role
      const response = isVP ? await getVPTeachers() : await getBranchTeachers();

      const teachers = (response.data || []).map((teacher: any) => {
        const rawProfile = teacher.staff_profile;
        let parsedProfile = rawProfile;
        if (typeof rawProfile === 'string' && rawProfile.length > 0) {
          try {
            parsedProfile = JSON.parse(rawProfile);
          } catch {
            parsedProfile = rawProfile;
          }
        }

        return {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          digitalId: teacher.digital_id,
          zkDeviceId: teacher.zk_device_id || teacher.zkDeviceId,
          status: teacher.status,
          userId: teacher.user_id,
          branchId: teacher.branch_id,
          createdAt: teacher.created_at,
          staffProfile: parsedProfile,
          todayAttendanceStatus: teacher.today_attendance_status,
          todayAttendanceCount: Number(teacher.today_attendance_count || 0),
          // VP-specific fields
          classesAssigned: teacher.classes_assigned || '0',
          plansSubmitted: teacher.plans_submitted || '0',
          plansPending: teacher.plans_pending || '0',
          document_file_name: teacher.document_file_name,
          document_file_size: teacher.document_file_size,
          document_mime_type: teacher.document_mime_type,
        };
      });
      setTeachers(teachers);
      return teachers;
    } catch (err: any) {
      console.error('Failed to fetch teachers:', err);
      setError(uiError(err.response?.data?.error?.message || 'Failed to load teachers'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!confirmAction.teacher) return;

    setProcessing(true);
    try {
      const userId = confirmAction.teacher.userId;

      if (confirmAction.action === 'approve') {
        await approveTeacher(userId);
      } else if (confirmAction.action === 'revoke') {
        await revokeTeacher(userId);
      } else if (confirmAction.action === 'delete') {
        await deleteTeacher(userId);
      }

      setConfirmAction({ show: false, action: 'approve', teacher: null });
      setActionMenu(null);
      fetchTeachers();
    } catch (err: any) {
      console.error('Action failed:', err);
      const errorMsg = err.response?.status === 404
        ? 'Backend route not implemented yet. Contact backend team to implement: PATCH /school-admin/users/{userId}/status'
        : err.response?.data?.error?.message || 'Action failed';
      alert(uiError(errorMsg));
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (teacher: any) => {
    setEditingStaff(teacher);
    setEditFormData({
      name: teacher.name || '',
      email: teacher.email || ''
    });
    setGeneratedPassword(null);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSubmitting(true);
    try {
      const cleanEditName = editFormData.name.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      await updateUser(editingStaff.userId, {
        name: cleanEditName,
        email: editFormData.email.trim().toLowerCase()
      });
      alert(uiText('Teacher details updated successfully!'));
      setShowEditModal(false);
      setEditingStaff(null);
      fetchTeachers();
    } catch (err: any) {
      alert(uiError(err.response?.data?.error?.message || 'Failed to update teacher'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingStaff) return;
    setResettingPassword(true);
    try {
      const result = await resetUserPIN(editingStaff.userId);
      const newPIN = result?.newPIN;
      if (newPIN) {
        setGeneratedPassword(newPIN);
      } else {
        alert(uiText('Password reset succeeded'));
      }
    } catch (err: any) {
      alert(uiError(err.response?.data?.error?.message || 'Failed to reset password'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handlePrintCredentials = () => {
    const { user, temporaryPassword } = successModal.data;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(localizeHtml(`
      <html>
        <head>
          <title>Staff Credentials - ${user.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; }
            .school { font-size: 18px; font-weight: bold; }
            .title { font-size: 14px; color: #555; margin-top: 4px; }
            .field { margin-bottom: 16px; }
            .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #888; letter-spacing: 1px; }
            .value { font-size: 16px; font-weight: bold; margin-top: 4px; }
            .pin-box { background: #fff8e1; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center; }
            .pin { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #b45309; font-family: monospace; }
            .warning { font-size: 11px; color: #b45309; margin-top: 8px; }
            .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school">Ziquala Abo School Portal</div>
            <div class="title">Staff Login Credentials</div>
          </div>
          <div class="field">
            <div class="label">Full Name</div>
            <div class="value" data-user-content>${user.name}</div>
          </div>
          <div class="field">
            <div class="label">Email</div>
            <div class="value" data-user-content>${user.email}</div>
          </div>
          <div class="field">
            <div class="label">Digital ID (Username)</div>
            <div class="value" data-user-content style="font-family: monospace; color: #2563eb;">${user.digitalId}</div>
          </div>
          <div class="pin-box">
            <div class="label">🔑 4-Digit PIN</div>
            <div class="pin" data-user-content>${temporaryPassword}</div>
            <div class="warning">⚠️ Change this PIN after first login</div>
          </div>
          <div class="field">
            <div class="label">Status</div>
            <div class="value">${user.status}</div>
          </div>
          <div class="footer">
            Printed on ${formatEthiopianLabel(new Date())} · Keep this document confidential
          </div>
        </body>
      </html>
    `));
    printWindow.document.close();
    printWindow.print();
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setEmergencyPhoneError('');
    let hasError = false;

    if (!formData.phoneNumber) {
      setPhoneError('Phone number is required');
      hasError = true;
    } else if (!/^[79]\d{8}$/.test(formData.phoneNumber)) {
      setPhoneError('Phone must start with 9 or 7 and be exactly 9 digits');
      hasError = true;
    }

    if (!formData.emergencyContactPhone) {
      setEmergencyPhoneError('Emergency contact phone is required');
      hasError = true;
    } else if (!/^[79]\d{8}$/.test(formData.emergencyContactPhone)) {
      setEmergencyPhoneError('Phone must start with 9 or 7 and be exactly 9 digits');
      hasError = true;
    }

    if (!selectedFile) {
      alert(uiText('Please upload a document. Document upload is mandatory for staff registration.'));
      return;
    }

    if (hasError) return;

    setCreating(true);
    try {
      const cleanName = formData.name.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const cleanEmergencyName = formData.emergencyContactName.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const cleanSpecialty = formData.specialty.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const cleanPreviousSchool = formData.previousSchool.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

      const response = await registerUser({
        name: cleanName,
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        staffProfile: {
          phoneNumber: `+251${formData.phoneNumber}`,
          emergencyContactName: cleanEmergencyName,
          emergencyContactPhone: formData.emergencyContactPhone ? `+251${formData.emergencyContactPhone}` : undefined,
          educationLevel: formData.educationLevel,
          specialty: cleanSpecialty,
          dob: formData.dob,
          previousSchool: cleanPreviousSchool,
          experienceYears: formData.experienceYears,
          registeredAt: new Date().toISOString()
        }
      }, selectedFile);

      // Transform to match expected structure
      const transformedData = {
        user: {
          digitalId: response.data.user.digital_id,
          name: response.data.user.name,
          email: response.data.user.email,
          status: response.data.user.status
        },
        temporaryPassword: response.data.temporaryPassword
      };

      setShowAddModal(false);
      setFormData({ name: '', email: '', phoneNumber: '', emergencyContactName: '', emergencyContactPhone: '', educationLevel: '', specialty: '', dob: '', previousSchool: '', experienceYears: '', role: 'teacher' });
      setSelectedFile(null);
      setPhoneError('');
      setEmergencyPhoneError('');
      setSuccessModal({ show: true, data: transformedData });
      fetchTeachers();
    } catch (err: any) {
      console.error('Failed to create teacher:', err);
      alert(uiError(err.response?.data?.error?.message || 'Failed to create teacher'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Derive all unique grades from the leaderboard for the filter dropdown
  const allLeaderboardGrades = Array.from(
    new Set(leaderboardData.flatMap(row => row.grades_taught ?? []))
  ).sort((a, b) => {
    // Natural sort: extract numbers so 'Grade 9' < 'Grade 10'
    const num = (s: string) => parseInt(s.replace(/\D/g, '')) || 0;
    return num(a) - num(b) || a.localeCompare(b);
  });

  // Calculate paginated and filtered leaderboard data
  const filteredLeaderboardData = leaderboardData.filter(row => {
    const matchesName = row.teacher_name.toLowerCase().includes(leaderboardSearch.toLowerCase());
    const matchesGrade = leaderboardGradeFilter === '' || (row.grades_taught ?? []).includes(leaderboardGradeFilter);
    return matchesName && matchesGrade;
  });

  const totalLeaderboardPages = Math.ceil(filteredLeaderboardData.length / LEADERBOARD_ITEMS_PER_PAGE) || 1;
  const currentLeaderboardData = filteredLeaderboardData.slice(
    (leaderboardPage - 1) * LEADERBOARD_ITEMS_PER_PAGE,
    leaderboardPage * LEADERBOARD_ITEMS_PER_PAGE
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold uppercase tracking-wider transition-colors mb-2"
          >
            <ArrowLeft size={14} />{uiText(" Back ")}</button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {(isSuperviseRoute ? uiText(t("teachers.supervise", "Supervise")) : uiText(t("teachers.title", "Teachers")))}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {(isSuperviseRoute ? uiText(t("teachers.superviseSubtitle", "Review and accept Annual and Weekly Lesson Plans submitted by teachers")) : uiText(t("teachers.subtitle", "Manage teaching staff and assignments")))}
          </p>
        </div>

        {canRegisterTeacher && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-bold shadow-lg shadow-blue-500/20 dark:shadow-none hover:shadow-blue-500/30 active:scale-[0.98] shrink-0"
          >
            <UserPlus size={18} />{uiText(" Register Teacher ")}</button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{uiError(error)}</p>
        </div>
      )}

      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 gap-2 sm:gap-4 overflow-x-auto">
        {isSuperviseRoute ? (
          <>
            <button
              onClick={() => setActiveTab('annual-plans')}
              className={`pb-2.5 px-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'annual-plans'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Calendar size={16} />
              <span>{uiText("Annual Plans")}</span>
              {annualPlans.filter(p => p.status === 'Pending').length > 0 && (
                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                  {annualPlans.filter(p => p.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('weekly-plans')}
              className={`pb-2.5 px-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'weekly-plans'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Clock size={16} />
              <span>{uiText("Weekly Plans")}</span>
              {weeklyPlans.filter(p => p.status === 'Pending').length > 0 && (
                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                  {weeklyPlans.filter(p => p.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`pb-2.5 px-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'leaderboard'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Trophy size={16} />
              <span>{t("teachers.leaderboard", "Leaderboard")}</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`pb-2.5 px-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'teachers'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Users size={16} />
              <span>{t("teachers.teachersList", "Teachers")}</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`pb-2.5 px-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'leaderboard'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Trophy size={16} />
              <span>{t("teachers.leaderboard", "Leaderboard")}</span>
            </button>
          </>
        )}
      </div>

      {activeTab === 'teachers' && (
        <div className="space-y-4">
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {teachers.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-500 border border-slate-100 dark:border-slate-800 shadow-sm">
                {t("teachers.noTeachersFound", "No teachers found. Register your first teacher.")}
              </div>
            ) : (
              teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedStaff(teacher)}
                      className="flex items-center gap-3 text-left min-w-0"
                    >
                      <div className="w-10 h-10 shrink-0 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                        {teacher.name?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-slate-800 dark:text-white truncate">{teacher.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{teacher.email}</p>
                      </div>
                    </button>
                    <div className="shrink-0">
                      {isAdmin && !isTeacherPending(teacher.status) ? (
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ show: true, action: isTeacherActive(teacher.status) ? 'revoke' : 'approve', teacher })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                            isTeacherActive(teacher.status)
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                              : 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                          }`}
                        >
                          {uiText(teacher.status)}
                        </button>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                            isTeacherActive(teacher.status)
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                              : isTeacherPending(teacher.status)
                              ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                              : 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                          }`}
                        >
                          {uiText(teacher.status)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 uppercase font-semibold">{t("teachers.colDigitalId", "Digital ID")}:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{teacher.digitalId}</span>
                      {teacher.zkDeviceId && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-[10px] font-bold">{uiText(" ZK: ")}{uiText(teacher.zkDeviceId)}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 flex-wrap">
                      {teacher.status === 'Pending' && (
                        <button
                          onClick={() => setConfirmAction({ show: true, action: 'approve', teacher })}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <CheckCircle size={14} />{uiText(" Approve ")}</button>
                      )}
                      <button
                        onClick={async () => {
                          setPromotionTarget(teacher);
                          setPromotionForm(getPromotionFormFromProfile(teacher.staffProfile?.promotion));
                          await fetchSubjects(teacher.branchId);
                          await fetchClasses(teacher.branchId);
                          setShowPromoteModal(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${isTeacherPromoted(teacher) ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                      >
                        {(isTeacherPromoted(teacher) ? uiText('Promoted') : uiText('Promote'))}
                      </button>
                      <button
                        onClick={() => setSelectedStaff(teacher)}
                        className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={uiText("View Registration Details")}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(teacher)}
                        className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={uiText("Edit User")}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ show: true, action: 'delete', teacher })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title={uiText("Delete User")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colTeacher", "Teacher")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colEmail", "Email")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colDigitalId", "Digital ID")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colStatus", "Status")}</th>
                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colActions", "Actions")}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                        {t("teachers.noTeachersFound", "No teachers found. Register your first teacher.")}
                      </td>
                    </tr>
                  ) : (
                    teachers.map((teacher, idx) => (
                      <tr key={teacher.id ? `${teacher.id}-${idx}` : `teacher-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <button type="button" onClick={() => setSelectedStaff(teacher)} className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                              {teacher.name?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                            </div>
                            <span className="font-bold text-slate-800 dark:text-white">{teacher.name}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{teacher.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono text-slate-600 dark:text-slate-400">{teacher.digitalId}</p>
                            {teacher.zkDeviceId && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-[10px] font-bold tracking-wider">{uiText(" ZK: ")}{uiText(teacher.zkDeviceId)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isAdmin && !isTeacherPending(teacher.status) ? (
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ show: true, action: isTeacherActive(teacher.status) ? 'revoke' : 'approve', teacher })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                                isTeacherActive(teacher.status)
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                                  : 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                              }`}
                            >
                              {uiText(teacher.status)}
                            </button>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                                isTeacherActive(teacher.status)
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60'
                                  : isTeacherPending(teacher.status)
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'
                                  : 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60'
                              }`}
                            >
                              {uiText(teacher.status)}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {teacher.status === 'Pending' ? (
                                <button
                                  onClick={() => setConfirmAction({ show: true, action: 'approve', teacher })}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                                >
                                  <CheckCircle size={14} />{uiText(" Approve ")}</button>
                              ) : null}
                              <button
                                onClick={async () => {
                                  setPromotionTarget(teacher);
                                  setPromotionForm(getPromotionFormFromProfile(teacher.staffProfile?.promotion));
                                  await fetchSubjects(teacher.branchId);
                                  await fetchClasses(teacher.branchId);
                                  setShowPromoteModal(true);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${isTeacherPromoted(teacher) ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                title={isTeacherPromoted(teacher) ? 'Edit promotion' : 'Promote'}
                              >
                                {(isTeacherPromoted(teacher) ? uiText('Promoted') : uiText('Promote'))}
                              </button>
                              <button
                                onClick={() => setSelectedStaff(teacher)}
                                className="p-1.5 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-950/30 rounded-lg transition-colors"
                                title={uiText("View Registration Details")}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => openEditModal(teacher)}
                                className="p-1.5 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-950/30 rounded-lg transition-colors"
                                title={uiText("Edit User")}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setConfirmAction({ show: true, action: 'delete', teacher })}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                title={uiText("Delete User")}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={20} /> {t("teachers.semesterLeaderboard", "Semester Leaderboard")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{t("teachers.leaderboardFormula", "Points = (Student Votes) + (VP Rating × 100) + (Weekly Plan Rating Points)")}</p>
              </div>
              <button
                type="button"
                onClick={handleResetLeaderboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-lg text-sm font-bold transition-colors self-start sm:self-auto"
              >
                <RefreshCcw size={16} /> {t("teachers.resetSemester", "Reset Semester")}
              </button>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={leaderboardSearch}
                  onChange={(e) => { setLeaderboardSearch(e.target.value); setLeaderboardPage(1); }}
                  placeholder={t("teachers.searchTeacherByName", "Search teacher by name…")}
                  className="w-full pl-8 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <select
                title={uiText("Filter leaderboard by grade")}
                value={leaderboardGradeFilter}
                onChange={(e) => { setLeaderboardGradeFilter(e.target.value); setLeaderboardPage(1); }}
                className="py-2 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-700 dark:text-slate-300"
              >
                <option value="">{t("teachers.allGrades", "All Grades")}</option>
                {allLeaderboardGrades.map(grade => (
                  <option key={grade} value={grade}>{uiText(grade)}</option>
                ))}
              </select>
              {(leaderboardSearch || leaderboardGradeFilter) && (
                <button
                  onClick={() => { setLeaderboardSearch(''); setLeaderboardGradeFilter(''); setLeaderboardPage(1); }}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 transition"
                >{uiText(" Clear ")}</button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colRank", "Rank")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{uiText("Teacher")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colStudentVotes", "Student Votes")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colPlanRating", "Plan Rating")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colAdminRating", "Admin Rating")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colGrades", "Grades")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colTotalPoints", "Total Points")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboardLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">{t("teachers.loadingLeaderboard", "Loading leaderboard…")}</td>
                  </tr>
                ) : currentLeaderboardData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      {(leaderboardSearch || leaderboardGradeFilter ? uiText("No teachers found{{value0}}{{value1}}.", {value0: leaderboardGradeFilter ? ` teaching ${leaderboardGradeFilter}` : '', value1: leaderboardSearch ? ` matching "${leaderboardSearch}"` : ''}) : uiText(t("teachers.noLeaderboardData", "No data available for the leaderboard.")))}
                    </td>
                  </tr>
                ) : (
                  currentLeaderboardData.map((row) => {
                    const globalRank = filteredLeaderboardData.findIndex(r => r.teacher_id === row.teacher_id) + 1;
                    return (
                      <tr key={row.teacher_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black ${globalRank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            globalRank === 2 ? 'bg-slate-100 text-slate-600' :
                              globalRank === 3 ? 'bg-orange-100 text-orange-700' :
                                'text-slate-400'
                            }`}>
                            #{globalRank}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{row.teacher_name}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{uiText(row.student_votes)}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{uiText(row.plan_rating_sum)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                                onClick={() => handleRateTeacher(row.teacher_id, star)}
                                className={`p-1 transition-transform hover:scale-110 ${star <= row.vp_rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
                              >
                                <Star size={18} fill={star <= row.vp_rating ? 'currentColor' : 'none'} />
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(row.grades_taught ?? []).length === 0 ? (
                              <span className="text-xs text-slate-400 italic">—</span>
                            ) : (
                              (row.grades_taught as string[]).map(grade => (
                                <button
                                  key={grade}
                                  type="button"
                                  title={`Filter by grade ${grade}`}
                                  onClick={() => { setLeaderboardGradeFilter(grade === leaderboardGradeFilter ? '' : grade); setLeaderboardPage(1); }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${grade === leaderboardGradeFilter
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                    }`}
                                >
                                  {uiText(grade)}
                                </button>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-xl text-slate-800 dark:text-white">{uiText(row.total_points)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!leaderboardLoading && filteredLeaderboardData.length > LEADERBOARD_ITEMS_PER_PAGE && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                {t("teachers.showingTeachers", { from: (leaderboardPage - 1) * LEADERBOARD_ITEMS_PER_PAGE + 1, to: Math.min(leaderboardPage * LEADERBOARD_ITEMS_PER_PAGE, filteredLeaderboardData.length), total: filteredLeaderboardData.length, defaultValue: `Showing ${(leaderboardPage - 1) * LEADERBOARD_ITEMS_PER_PAGE + 1}–${Math.min(leaderboardPage * LEADERBOARD_ITEMS_PER_PAGE, filteredLeaderboardData.length)} of ${filteredLeaderboardData.length} teachers` })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={uiText("Previous page")}
                  onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                  disabled={leaderboardPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("teachers.pageOf", { current: leaderboardPage, total: totalLeaderboardPages, defaultValue: `Page ${leaderboardPage} of ${totalLeaderboardPages}` })}</span>
                <button
                  type="button"
                  title={uiText("Next page")}
                  onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                  disabled={leaderboardPage === totalLeaderboardPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Annual Plans View */}
      {activeTab === 'annual-plans' && (
        <div className="space-y-6">
          {/* Search and Status Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={uiText("Search annual plans...")}
                  value={annualPlanSearch}
                  onChange={(e) => setAnnualPlanSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Grade Filter */}
              <div className="relative">
                <select
                  value={annualGradeFilter}
                  onChange={(e) => setAnnualGradeFilter(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm"
                >
                  <option value="all">{uiText("All Grades")}</option>
                  {availableAnnualGrades.map(g => (
                    <option key={g} value={g}>{uiText(g)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 overflow-x-auto">
              <Filter size={13} className="text-slate-400 ml-1 shrink-0" />
              {([
                { key: 'all',           label: 'All' },
                { key: 'submitted',     label: 'Approved' },
                { key: 'not_submitted', label: 'Pending' },
                { key: 'unlocked',      label: 'Revision Requested' },
              ] as const).map(({ key, label }) => {
                const submittedCount = annualPlans.filter(p => p.status === 'Approved').length;
                const notSubmittedCount = annualPlans.filter(p => p.status === 'Not Submitted' || p.status === 'Pending').length;
                const unlockedCount = annualPlans.filter(p => p.status === 'Revision Required').length;
                const count = key === 'submitted' ? submittedCount : key === 'not_submitted' ? notSubmittedCount : key === 'unlocked' ? unlockedCount : annualPlans.length;

                return (
                  <button
                    key={key}
                    onClick={() => setAnnualPlanFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${
                      annualPlanFilter === key
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {label}
                    <span className="ml-1 opacity-70">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Chips */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400" />{uiText(" Total Annual Plans: ")}{annualPlans.length}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={11} />{uiText(" Approved: ")}{annualPlans.filter(p => p.status === 'Approved').length}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <AlertTriangle size={11} />{uiText(" Pending: ")}{annualPlans.filter(p => p.status === 'Not Submitted' || p.status === 'Pending').length}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 rounded-full text-[11px] font-bold text-rose-700 dark:text-rose-400">
              <Unlock size={11} />{uiText(" Revision Requested: ")}{annualPlans.filter(p => p.status === 'Revision Required').length}
            </span>
          </div>

          {plansLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (() => {
            const filteredAnnualPlans = annualPlans
              .filter(plan => {
                if (annualGradeFilter === 'all') return true;
                const statuses: Array<{ grade: string; submitted: boolean }> = plan.grade_statuses || [];
                if (statuses.length > 0) {
                  return statuses.some(g => g.grade.toLowerCase() === annualGradeFilter.toLowerCase());
                }
                return plan.grade && plan.grade.toLowerCase().includes(annualGradeFilter.toLowerCase());
              })
              .filter(plan => {
                const statuses: Array<{ grade: string; submitted: boolean; status?: string }> = plan.grade_statuses || [];
                if (annualPlanFilter === 'submitted') {
                  return statuses.length > 0 ? statuses.some(g => g.status === 'Approved') : plan.status === 'Approved';
                }
                if (annualPlanFilter === 'not_submitted') {
                  return statuses.length > 0 ? statuses.some(g => g.status === 'Not Submitted' || g.status === 'Pending') : (plan.status === 'Not Submitted' || plan.status === 'Pending');
                }
                if (annualPlanFilter === 'unlocked') {
                  return plan.status === 'Revision Required' || (statuses.length > 0 && statuses.some(g => g.status === 'Revision Required'));
                }
                return true;
              })
              .filter(plan => {
                const q = annualPlanSearch.toLowerCase();
                if (!q) return true;
                return (
                  (plan.teacher_name && plan.teacher_name.toLowerCase().includes(q)) ||
                  (plan.subject && plan.subject.toLowerCase().includes(q)) ||
                  (plan.grade && plan.grade.toLowerCase().includes(q)) ||
                  (plan.academic_year && plan.academic_year.toLowerCase().includes(q))
                );
              });

            return filteredAnnualPlans.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <Calendar className="mx-auto text-slate-400" size={40} />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{uiText("No Annual Plans Found")}</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  {(annualPlans.length === 0 ? uiText("Teachers' annual plan submissions will appear here.") : uiText('No annual plans match your current search or filter criteria.'))}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4">{uiText("Teacher")}</th>
                        <th className="px-6 py-4">{uiText("Subject / Grade")}</th>
                        <th className="px-6 py-4">{uiText("Academic Year")}</th>
                        <th className="px-6 py-4">{uiText("Workload")}</th>
                        <th className="px-6 py-4">{uiText("Status")}</th>
                        <th className="px-6 py-4 text-right">{uiText("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAnnualPlans.map((plan) => {
                        const isApproved = plan.status === 'Approved';
                        const isNotSubmitted = plan.status === 'Not Submitted';
                        const gradeStatuses: Array<{ grade: string; submitted: boolean; status: string; plan_id?: string }> = plan.grade_statuses || [];
                        let displayGrades = annualPlanFilter === 'submitted'
                          ? gradeStatuses.filter(g => g.submitted)
                          : annualPlanFilter === 'not_submitted'
                          ? gradeStatuses.filter(g => !g.submitted)
                          : gradeStatuses;

                        if (annualGradeFilter !== 'all') {
                          displayGrades = displayGrades.filter(g => g.grade.toLowerCase() === annualGradeFilter.toLowerCase());
                        }
                        return (
                          <tr key={plan.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isNotSubmitted ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 dark:text-white">{plan.teacher_name || 'Teacher'}</div>
                              <div className="text-xs text-slate-500">{plan.teacher_digital_id || 'N/A'}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">{plan.teacher_email || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                {plan.subject || 'Subject'}
                              </div>
                              {displayGrades.length > 0 ? (
                                <div className="flex flex-col gap-1 text-xs">
                                  {displayGrades.map((g, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        if (g.submitted && g.plan_id) {
                                          handleViewSpecificPlan(g.plan_id, 'annual', plan);
                                        }
                                      }}
                                      disabled={!g.submitted || !g.plan_id}
                                      className={`flex items-center gap-1.5 whitespace-nowrap text-left rounded-md px-1 py-0.5 transition-all ${
                                        g.submitted && g.plan_id
                                          ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer group'
                                          : 'cursor-default'
                                      }`}
                                      title={g.submitted && g.plan_id ? `Click to view ${g.grade} Annual Plan` : undefined}
                                    >
                                      <span className={g.submitted ? 'text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline' : 'text-slate-500 dark:text-slate-400 font-medium'}>
                                        {g.grade}
                                      </span>
                                      {g.submitted ? (
                                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                                      ) : (
                                        <XCircle size={13} className="text-rose-400 shrink-0" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ) : plan.grade ? (
                                <div className="flex flex-col gap-1 text-xs">
                                  {plan.grade.split(',').map((g: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap">
                                      <span className={!isNotSubmitted ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}>
                                        {g.trim()}
                                      </span>
                                      {!isNotSubmitted ? (
                                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle size={13} className="text-rose-400 shrink-0" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                              {plan.academic_year || '2018 E.C.'}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                              <div><span className="font-bold text-slate-800 dark:text-slate-200">{plan.working_days_year || 180}</span>{uiText(" Days/Yr")}</div>
                              <div><span className="font-bold text-slate-800 dark:text-slate-200">{plan.periods_year || 160}</span>{uiText(" Periods (")}{plan.periods_week || 4}{uiText("/wk)")}</div>
                            </td>
                            <td className="px-6 py-4">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-extrabold border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 size={12} />{uiText(" Approved by ")}{plan.reviewer_name || 'Dept Head'}
                                </span>
                              ) : plan.status === 'Revision Required' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-extrabold border border-rose-200 dark:border-rose-800">
                                  <Unlock size={12} />{uiText(" Revision Requested ")}</span>
                              ) : isNotSubmitted ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-extrabold border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle size={12} />{uiText(" Not Submitted ")}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded-full text-xs font-extrabold border border-sky-200 dark:border-sky-800">
                                  <Clock size={12} />{uiText(" Pending Review ")}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isNotSubmitted ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold italic">{uiText("No Plan Received")}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const submittedGrades = (plan.grade_statuses || []).filter((g: any) => g.submitted && g.plan_id);
                                    if (submittedGrades.length > 1) {
                                      setGradeSelectModal({
                                        show: true,
                                        teacherName: plan.teacher_name || 'Teacher',
                                        subject: plan.subject || 'Subject',
                                        planType: 'annual',
                                        plans: (plan.grade_statuses || []).filter((g: any) => g.submitted)
                                      });
                                    } else if (submittedGrades.length === 1) {
                                      handleViewSpecificPlan(submittedGrades[0].plan_id, 'annual', plan);
                                    } else {
                                      setSelectedAnnualPlan(plan);
                                    }
                                  }}
                                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title={uiText("View Details")}
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Weekly Plans View */}
      {activeTab === 'weekly-plans' && (
        <div className="space-y-6">
          {/* Header Controls & Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            {/* Calendar Week Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{uiText("Ethiopian Academic Week")}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatEthWeekRangeStr(selectedWeekDate)}
                  </p>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => navigateWeek('prev')}
                  className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                  title={uiText("Previous Week")}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateWeek('today')}
                  disabled={isCurrentWeek(selectedWeekDate)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isCurrentWeek(selectedWeekDate)
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800'
                  }`}
                >{uiText(" Current Week ")}</button>
                <button
                  type="button"
                  onClick={() => navigateWeek('next')}
                  className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                  title={uiText("Next Week")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search & Grade */}
              <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={uiText("Search weekly plans...")}
                    value={weeklyPlanSearch}
                    onChange={(e) => setWeeklyPlanSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Grade Filter */}
                <div className="relative">
                  <select
                    value={weeklyGradeFilter}
                    onChange={(e) => setWeeklyGradeFilter(e.target.value)}
                    className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm"
                  >
                    <option value="all">{uiText("All Grades")}</option>
                    {availableWeeklyGrades.map(g => (
                      <option key={g} value={g}>{uiText(g)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 overflow-x-auto">
                <Filter size={13} className="text-slate-400 ml-1 shrink-0" />
                {([
                  { key: 'all',           label: 'All' },
                  { key: 'submitted',     label: 'Approved' },
                  { key: 'not_submitted', label: 'Pending / Not Submitted' },
                  { key: 'unlocked',      label: 'Revision Requested' },
                ] as const).map(({ key, label }) => {
                  const approvedCount = weeklyPlans.filter(p => p.status === 'Approved').length;
                  const notSubmittedCount = weeklyPlans.filter(p => p.status === 'Not Submitted' || p.status === 'Pending').length;
                  const unlockedCount = weeklyPlans.filter(p => p.status === 'Revision Required').length;
                  const count = key === 'submitted' ? approvedCount : key === 'not_submitted' ? notSubmittedCount : key === 'unlocked' ? unlockedCount : weeklyPlans.length;

                  return (
                    <button
                      key={key}
                      onClick={() => setWeeklyPlanFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${
                        weeklyPlanFilter === key
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {label}
                      <span className="ml-1 opacity-70">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Chips */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400" />{uiText(" Total: ")}{weeklyPlans.length}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={11} />{uiText(" Approved: ")}{weeklyPlans.filter(p => p.status === 'Approved').length}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle size={11} />{uiText(" Pending / Not Submitted: ")}{weeklyPlans.filter(p => p.status === 'Not Submitted' || p.status === 'Pending').length}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 rounded-full text-[11px] font-bold text-rose-700 dark:text-rose-400">
                <Unlock size={11} />{uiText(" Revision Requested: ")}{weeklyPlans.filter(p => p.status === 'Revision Required').length}
              </span>
            </div>

            {plansLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : (() => {
              const filteredWeeklyPlans = weeklyPlans
                .filter(plan => {
                  if (weeklyGradeFilter === 'all') return true;
                  const statuses: Array<{ grade: string; submitted: boolean }> = plan.grade_statuses || [];
                  if (statuses.length > 0) {
                    return statuses.some(g => g.grade.toLowerCase() === weeklyGradeFilter.toLowerCase());
                  }
                  return (plan.grade_section || plan.grade || '').toLowerCase().includes(weeklyGradeFilter.toLowerCase());
                })
                .filter(plan => {
                  const statuses: Array<{ grade: string; submitted: boolean; status?: string }> = plan.grade_statuses || [];
                  if (weeklyPlanFilter === 'submitted') {
                    return statuses.length > 0 ? statuses.some(g => g.status === 'Approved') : plan.status === 'Approved';
                  }
                  if (weeklyPlanFilter === 'not_submitted') {
                    return statuses.length > 0 ? statuses.some(g => g.status === 'Not Submitted' || g.status === 'Pending') : (plan.status === 'Not Submitted' || plan.status === 'Pending');
                  }
                  if (weeklyPlanFilter === 'unlocked') {
                    return plan.status === 'Revision Required' || (statuses.length > 0 && statuses.some(g => g.status === 'Revision Required'));
                  }
                  return true;
                })
                .filter(plan => {
                  const q = weeklyPlanSearch.toLowerCase();
                  if (!q) return true;
                  return (
                    (plan.teacher_name && plan.teacher_name.toLowerCase().includes(q)) ||
                    (plan.subject && plan.subject.toLowerCase().includes(q)) ||
                    (plan.course_name && plan.course_name.toLowerCase().includes(q)) ||
                    (plan.topic && plan.topic.toLowerCase().includes(q)) ||
                    (plan.chapter && plan.chapter.toLowerCase().includes(q)) ||
                    (plan.grade && plan.grade.toLowerCase().includes(q))
                  );
                });

              return filteredWeeklyPlans.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <Clock className="mx-auto text-slate-400" size={40} />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{uiText("No Weekly Plans Found")}</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    {(weeklyPlans.length === 0 ? uiText('Weekly lesson plans submitted by teachers will appear here.') : uiText('No weekly plans match your current search or filter criteria.'))}
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-6 py-4">{uiText("Teacher")}</th>
                          <th className="px-6 py-4">{uiText("Course / Topic")}</th>
                          <th className="px-6 py-4">{uiText("Date / Periods")}</th>
                          <th className="px-6 py-4">{uiText("Status")}</th>
                          <th className="px-6 py-4 text-right">{uiText("View")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredWeeklyPlans.map((plan) => {
                          const isApproved = plan.status === 'Approved';
                          const isRevisionRequired = plan.status === 'Revision Required';
                          const isNotSubmitted = plan.status === 'Not Submitted';
                          const gradeStatuses: Array<{ grade: string; submitted: boolean; status: string; plan_id?: string }> = plan.grade_statuses || [];
                          let displayGrades = weeklyPlanFilter === 'submitted'
                            ? gradeStatuses.filter(g => g.status === 'Approved')
                            : weeklyPlanFilter === 'not_submitted'
                            ? gradeStatuses.filter(g => g.status === 'Not Submitted' || g.status === 'Pending')
                            : weeklyPlanFilter === 'unlocked'
                            ? gradeStatuses.filter(g => g.status === 'Revision Required')
                            : gradeStatuses;

                          if (weeklyGradeFilter !== 'all') {
                            displayGrades = displayGrades.filter(g => g.grade.toLowerCase() === weeklyGradeFilter.toLowerCase());
                          }
                          return (
                            <tr key={plan.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isNotSubmitted ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 dark:text-white">{plan.teacher_name || 'Teacher'}</div>
                                <div className="text-xs text-slate-500">{plan.teacher_digital_id || 'N/A'}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500">{plan.teacher_email || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                                  {plan.subject || plan.course_name || 'Weekly Lesson Plan'}
                                </div>
                                {plan.topic && (
                                  <div className="text-xs text-slate-500 mb-1">
                                    {plan.topic || plan.chapter || 'Plan Details'}
                                  </div>
                                )}
                                {displayGrades.length > 0 ? (
                                  <div className="flex flex-col gap-1 text-xs">
                                    {displayGrades.map((g, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          if (g.plan_id) {
                                            handleViewSpecificPlan(g.plan_id, 'weekly', plan);
                                          }
                                        }}
                                        disabled={!g.plan_id}
                                        className={`flex items-center gap-1.5 whitespace-nowrap text-left rounded-md px-1 py-0.5 transition-all ${
                                          g.plan_id
                                            ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer group'
                                            : 'cursor-default'
                                        }`}
                                        title={g.plan_id ? `Click to view ${g.grade} Weekly Plan` : undefined}
                                      >
                                        <span className={g.status === 'Approved' ? 'text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline' : g.status === 'Revision Required' ? 'text-rose-600 dark:text-rose-400 font-bold group-hover:underline' : 'text-slate-500 dark:text-slate-400 font-medium'}>
                                          {g.grade}
                                        </span>
                                        {g.status === 'Approved' ? (
                                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                                        ) : g.status === 'Revision Required' ? (
                                          <Unlock size={13} className="text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                                        ) : (
                                          <XCircle size={13} className="text-amber-400 shrink-0" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                ) : (plan.grade_section || plan.grade) ? (
                                  <div className="flex flex-col gap-1 text-xs">
                                    {(plan.grade_section || plan.grade).split(',').map((g: string, idx: number) => (
                                      <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap">
                                        <span className={isApproved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : isRevisionRequired ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}>
                                          {g.trim()}
                                        </span>
                                        {isApproved ? (
                                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                        ) : isRevisionRequired ? (
                                          <Unlock size={13} className="text-rose-500 shrink-0" />
                                        ) : (
                                          <XCircle size={13} className="text-amber-400 shrink-0" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                                <div><span className="font-bold text-slate-800 dark:text-slate-200">{(plan.date ? uiText(new Date(plan.date).toLocaleDateString()) : uiText('N/A'))}</span></div>
                                <div>{plan.periods_week || plan.period_count || 1}{uiText(" Period(s)")}</div>
                              </td>
                              <td className="px-6 py-4">
                                {isApproved ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-extrabold border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 size={12} />{uiText(" Approved by ")}{plan.reviewer_name || 'Dept Head'}
                                  </span>
                                ) : isRevisionRequired ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-extrabold border border-rose-200 dark:border-rose-800">
                                    <Unlock size={12} />{uiText(" Revision Requested ")}</span>
                                ) : isNotSubmitted ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-extrabold border border-amber-200 dark:border-amber-800">
                                    <AlertTriangle size={12} />{uiText(" Not Submitted ")}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded-full text-xs font-extrabold border border-sky-200 dark:border-sky-800">
                                    <Clock size={12} />{uiText(" Pending Review ")}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isNotSubmitted ? (
                                  <span className="text-xs text-amber-600 dark:text-amber-400 font-bold italic">{uiText("No Plan Received")}</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const submittedGrades = (plan.grade_statuses || []).filter((g: any) => g.plan_id);
                                      if (submittedGrades.length > 1) {
                                        setGradeSelectModal({
                                          show: true,
                                          teacherName: plan.teacher_name || 'Teacher',
                                          subject: plan.subject || plan.course_name || 'Weekly Lesson Plan',
                                          planType: 'weekly',
                                          plans: submittedGrades
                                        });
                                      } else if (submittedGrades.length === 1) {
                                        handleViewSpecificPlan(submittedGrades[0].plan_id, 'weekly', plan);
                                      } else {
                                        setSelectedWeeklyPlan(plan);
                                      }
                                    }}
                                    className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title={uiText("View Details")}
                                  >
                                    <Eye size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Annual Plan Review Modal (Academic Manager / VP) ── */}
      {selectedAnnualPlan && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-5xl my-4 print:my-0 print:shadow-none print:border-none print:w-full printable-document-modal">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-t-[2rem] print:hidden">
              <div>
                <h3 className="font-black text-white uppercase tracking-tight text-lg">{uiText("Annual Plan Review")}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-bold">
                  {selectedAnnualPlan.teacher_name || selectedAnnualPlan.teacherName || 'Assigned Teacher'} · {selectedAnnualPlan.subject || '—'} · {selectedAnnualPlan.grade || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const teacherName = selectedAnnualPlan.teacher_name || selectedAnnualPlan.teacherName || 'Assigned Teacher';
                    const subject = selectedAnnualPlan.subject || '—';
                    const grade = selectedAnnualPlan.grade || '—';
                    const academicYear = selectedAnnualPlan.academic_year || '2018 E.C.';
                    const periodsWeek = selectedAnnualPlan.periods_week || selectedAnnualPlan.periodsPerWeek || 4;
                    const workingDays = selectedAnnualPlan.working_days_year || 180;
                    const periodsYear = selectedAnnualPlan.periods_year || 160;
                    const durationPeriod = selectedAnnualPlan.duration_period || '45 minutes';

                    const items = Array.isArray(selectedAnnualPlan.items) ? selectedAnnualPlan.items : [];

                    const matrix: any[][] = [
                      ['ZIQUALA ABO 1ST PRIMARY SCHOOL ANNUAL LESSON PLAN FORM'],
                      [`Teacher Name: ${teacherName}`, `Subject: ${subject}`, `Grade: ${grade}`, `Academic Year: ${academicYear}`],
                      [`Periods / Week: ${periodsWeek}`, `Working Days / Year: ${workingDays}`, `Periods / Year: ${periodsYear}`, `Duration / Period: ${durationPeriod}`],
                      [],
                      ['MONTH', 'WEEK', '# PERIODS', 'UNIT', 'MAIN CONTENT', 'SUB CONTENT', 'COMPETENCE', 'METHOD', 'AID', 'EVALUATION', 'REMARK']
                    ];

                    if (items.length > 0) {
                      items.forEach((item: any, idx: number) => {
                        matrix.push([
                          item.month || '—',
                          item.week || `Week ${(idx % 4) + 1}`,
                          item.periods || item.periods_week || '—',
                          item.unit || item.chapter_unit || '—',
                          item.topic || item.topic_title || item.mainContent || '—',
                          item.subTopic || item.subContent || '—',
                          item.competence || '—',
                          item.method || item.teaching_method || '—',
                          item.aids || item.teaching_aids || '—',
                          item.evaluation || '—',
                          item.assessment || item.remark || '—'
                        ]);
                      });
                    } else {
                      matrix.push(['—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—']);
                    }

                    exportToExcel([{ name: 'Annual Lesson Plan', matrix }], `Annual_Plan_${teacherName.replace(/\s+/g, '_')}_${grade.replace(/\s+/g, '_')}`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md"
                >
                  <Printer size={14} />{uiText(" Print / Export Excel (.xlsx) ")}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} />{uiText(" Print PDF ")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnnualPlan(null)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-2 text-slate-800 dark:text-slate-200">
              {/* Plan Summary / Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60">
                {[
                  { label: 'Academic Year', value: selectedAnnualPlan.academic_year || '2018 E.C.' },
                  { label: 'Subject', value: selectedAnnualPlan.subject || '—' },
                  { label: 'Grade', value: selectedAnnualPlan.grade || '—' },
                  { label: 'Periods / Week', value: selectedAnnualPlan.periods_week || selectedAnnualPlan.periodsPerWeek || 4 },
                  { label: 'Working Days / Year', value: selectedAnnualPlan.working_days_year || 180 },
                  { label: 'Total Periods / Year', value: selectedAnnualPlan.periods_year || 160 },
                  { label: 'Duration / Period', value: selectedAnnualPlan.duration_period || '45 minutes' },
                  { label: 'Weeks Planned', value: Array.isArray(selectedAnnualPlan.items) ? selectedAnnualPlan.items.length : 40 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
                    <p className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {selectedAnnualPlan.feedback && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300">{uiText("Feedback / Remarks:")}</span>
                  <p className="text-amber-900 dark:text-amber-200">{selectedAnnualPlan.feedback}</p>
                </div>
              )}

              {/* Yearly Matrix */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                  <span>📅</span>{uiText(" Yearly Matrix ")}</h4>
                {Array.isArray(selectedAnnualPlan.items) && selectedAnnualPlan.items.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left min-w-[1200px] text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          {['Month','Week','# Periods','Unit','Main Content','Sub Content','Competence','Method','Aid','Evaluation','Remark'].map(h => (
                            <th key={h} className="px-3 py-2.5 font-black uppercase tracking-wide whitespace-nowrap border-r border-slate-700 last:border-r-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAnnualPlan.items.map((item: any, idx: number) => {
                          const isFirst = item.week === 1 || !selectedAnnualPlan.items.slice(0, idx).some((i: any) => i.month === item.month);
                          const monthRows = selectedAnnualPlan.items.filter((i: any) => i.month === item.month).length;
                          return (
                            <tr key={idx} className={`border-b border-slate-100 dark:border-slate-700 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/30'}`}>
                              {isFirst ? (
                                <td className="px-3 py-2 font-black text-violet-700 dark:text-violet-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 bg-violet-50 dark:bg-violet-900/10" rowSpan={monthRows}>{item.month || '—'}</td>
                              ) : null}
                              <td className="px-3 py-2 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-700 whitespace-nowrap">{uiText("Week ")}{item.week || idx + 1}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.noOfPeriods || item.periods || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.unit || item.chapter || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.mainContent || item.topic || item.content || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.subContent || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.competence || item.objectives || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.teachingMethod || item.method || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.teachingAid || item.aid || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">{item.evaluation || '—'}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700 last:border-r-0">{item.remark || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">{uiText(" No plan items provided in this submission. ")}</div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-b-[2rem] print:hidden">
              <button
                type="button"
                onClick={() => setSelectedAnnualPlan(null)}
                className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all"
              >{uiText(" Close ")}</button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewModal({
                      show: true,
                      planId: selectedAnnualPlan.id,
                      planType: 'annual',
                      status: 'Revision Required',
                      feedback: ''
                    });
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <X size={14} />{uiText(" Request Revision ")}</button>
                <button
                  type="button"
                  onClick={() => {
                    reviewModal.planId = selectedAnnualPlan.id;
                    reviewModal.planType = 'annual';
                    handleReviewPlanSubmit('Approved', 'Accepted by Academic Manager');
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Check size={14} />{uiText(" Accept & Approve ")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Official Weekly Plan Document Modal (Academic Manager / VP) ── */}
      {selectedWeeklyPlan && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-6xl my-4 print:my-0 print:shadow-none print:border-none print:w-full printable-document-modal">
            {/* Header Banner */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white rounded-t-[2rem] print:hidden">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 block">{uiText("Official Weekly Lesson Plan Document")}</span>
                <h3 className="font-black text-white text-lg tracking-tight uppercase">{uiText(" Ziquala Abo 1st Primary School Weekly Lesson Plan Form ")}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const teacherName = selectedWeeklyPlan.teacher_name || selectedWeeklyPlan.teacherName || 'Assigned Teacher';
                    const subject = selectedWeeklyPlan.subject || '—';
                    const gradeSection = selectedWeeklyPlan.grade_section || selectedWeeklyPlan.gradeSection || selectedWeeklyPlan.grade || '—';
                    const chapterUnit = selectedWeeklyPlan.chapter_unit || selectedWeeklyPlan.chapterUnit || selectedWeeklyPlan.chapter || selectedWeeklyPlan.unit || '—';
                    const topicTitle = selectedWeeklyPlan.topic_title || selectedWeeklyPlan.topicTitle || selectedWeeklyPlan.topic || '—';
                    const dateFrom = selectedWeeklyPlan.date_from || selectedWeeklyPlan.date ? (selectedWeeklyPlan.date_from || new Date(selectedWeeklyPlan.date).toLocaleDateString()) : '—';
                    const dateTo = selectedWeeklyPlan.date_to || selectedWeeklyPlan.date ? (selectedWeeklyPlan.date_to || new Date(selectedWeeklyPlan.date).toLocaleDateString()) : '—';
                    const periodsWeek = selectedWeeklyPlan.periods_per_week || selectedWeeklyPlan.periodsPerWeek || selectedWeeklyPlan.periods_week || '—';
                    const status = selectedWeeklyPlan.status || 'Pending';

                    const dailyList = (Array.isArray(selectedWeeklyPlan.daily_activities || selectedWeeklyPlan.dailyActivities) && (selectedWeeklyPlan.daily_activities || selectedWeeklyPlan.dailyActivities).length > 0)
                      ? (selectedWeeklyPlan.daily_activities || selectedWeeklyPlan.dailyActivities)
                      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => ({
                          day,
                          content: selectedWeeklyPlan.content || selectedWeeklyPlan.topic || '—',
                          competence: selectedWeeklyPlan.objectives || '—',
                          timeDuration: selectedWeeklyPlan.time_duration || selectedWeeklyPlan.timeDuration || '45 mins',
                          teacherIntro: selectedWeeklyPlan.teacher_activity || selectedWeeklyPlan.teacherActivity || '—',
                          teacherPresentation: selectedWeeklyPlan.presentation || 'Core presentation',
                          teacherSummary: selectedWeeklyPlan.summary || 'Summary',
                          teacherAssessment: selectedWeeklyPlan.evaluation || '—',
                          studentActivity: selectedWeeklyPlan.student_activity || selectedWeeklyPlan.studentActivity || '—',
                          teachingMethod: selectedWeeklyPlan.teaching_method || selectedWeeklyPlan.teachingMethod || selectedWeeklyPlan.method || '—',
                          teachingAid: selectedWeeklyPlan.teaching_aids || selectedWeeklyPlan.teachingAids || selectedWeeklyPlan.aid || '—',
                          evaluationRemark: selectedWeeklyPlan.remark || '—'
                        }));

                    const matrix: any[][] = [
                      ['ZIQUALA ABO 1ST PRIMARY SCHOOL WEEKLY LESSON PLAN FORM'],
                      [`Teacher Name: ${teacherName}`, `Subject / Lesson Type: ${subject}`, `Grade & Section: ${gradeSection}`, `Status: ${status}`],
                      [`Chapter / Unit: ${chapterUnit}`, `Topic / Title: ${topicTitle}`, `Date Range: ${dateFrom} to ${dateTo}`, `Periods / Week: ${periodsWeek}`],
                      [],
                      ['Day (ቀን)', 'Content & Outcome (ይዘት እና ብቃት)', 'Time (ጊዜ)', 'Teacher Activity (የመምህሩ ተግባር)', 'Student Activity (የተማሪው)', 'Method (ማስተማሪያ ዘዴ)', 'Aid (መርጃ መሣሪያ)', 'Remark (ምዘና)']
                    ];

                    dailyList.forEach((act: any) => {
                      const teacherActivityStr = `1. Intro: ${act.teacherIntro || act.intro || '—'}\n2. Presentation: ${act.teacherPresentation || act.presentation || '—'}\n3. Summary: ${act.teacherSummary || act.summary || '—'}\n4. Assessment: ${act.teacherAssessment || act.evaluation || '—'}`;
                      const contentCompetenceStr = `Content: ${act.content || '—'}\nOutcome: ${act.competence || '—'}`;
                      matrix.push([
                        act.day || '—',
                        contentCompetenceStr,
                        act.timeDuration || '45 mins',
                        teacherActivityStr,
                        act.studentActivity || '—',
                        act.teachingMethod || '—',
                        act.teachingAid || '—',
                        act.evaluationRemark || '—'
                      ]);
                    });

                    exportToExcel(
                      [{ name: 'Weekly Lesson Plan', matrix }],
                      `Weekly_Plan_${teacherName.replace(/\s+/g, '_')}_${gradeSection.replace(/\s+/g, '_')}`
                    );
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md"
                >
                  <Printer size={14} />{uiText(" Print / Export Excel (.xlsx) ")}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} />{uiText(" Print PDF ")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeeklyPlan(null)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-2 text-slate-800 dark:text-slate-200">
              {/* Document Header Table Block */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 font-black text-slate-800 dark:text-white uppercase tracking-wider text-center border-b border-slate-300 dark:border-slate-700">{uiText(" ZIQUALA ABO 1ST PRIMARY SCHOOL WEEKLY LESSON PLAN FORM ")}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-slate-200 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Teacher Name")}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedWeeklyPlan.teacher_name || selectedWeeklyPlan.teacherName || 'Assigned Teacher'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Subject / Lesson Type")}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{selectedWeeklyPlan.subject || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Chapter / Unit")}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedWeeklyPlan.chapter_unit || selectedWeeklyPlan.chapterUnit || selectedWeeklyPlan.chapter || selectedWeeklyPlan.unit || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Topic / Title")}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedWeeklyPlan.topic_title || selectedWeeklyPlan.topicTitle || selectedWeeklyPlan.topic || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Grade & Section")}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedWeeklyPlan.grade_section || selectedWeeklyPlan.gradeSection || selectedWeeklyPlan.grade || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Date Range")}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {(selectedWeeklyPlan.date_from || selectedWeeklyPlan.date ? (selectedWeeklyPlan.date_from || new Date(selectedWeeklyPlan.date).toLocaleDateString()) : uiText('—'))}{uiText(" to ")}{(selectedWeeklyPlan.date_to || selectedWeeklyPlan.date ? (selectedWeeklyPlan.date_to || new Date(selectedWeeklyPlan.date).toLocaleDateString()) : uiText('—'))}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Periods / Week")}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedWeeklyPlan.periods_per_week || selectedWeeklyPlan.periodsPerWeek || selectedWeeklyPlan.periods_week || '—'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{uiText("Status")}</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      selectedWeeklyPlan.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      selectedWeeklyPlan.status === 'Revision Required' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>{uiText(selectedWeeklyPlan.status)}</span>
                  </div>
                </div>
              </div>

              {selectedWeeklyPlan.dean_feedback && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300">{uiText("Feedback / Remarks:")}</span>
                  <p className="text-amber-900 dark:text-amber-200">{selectedWeeklyPlan.dean_feedback}</p>
                </div>
              )}

              {/* 5-Day Matrix Table matching paper layout with 4 sub-rows for Teacher Activity */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 print:hidden">{uiText("📅 Daily Lesson Plan Matrix Table")}</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-700">
                  <table className="w-full text-left min-w-[1100px] text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white border-b border-slate-700">
                        <th className="px-3 py-2.5 font-black uppercase w-20 border-r border-slate-700 text-center">{uiText("Day (ቀን)")}</th>
                        <th className="px-3 py-2.5 font-black uppercase w-56 border-r border-slate-700">{uiText("Content & Outcome (ይዘት እና ብቃት)")}</th>
                        <th className="px-2 py-2.5 font-black uppercase w-20 border-r border-slate-700 text-center">{uiText("Time (ጊዜ)")}</th>
                        <th className="px-3 py-2.5 font-black uppercase w-60 border-r border-slate-700">{uiText("Teacher Activity (የመምህሩ ተግባር)")}</th>
                        <th className="px-3 py-2.5 font-black uppercase border-r border-slate-700">{uiText("Student Activity (የተማሪው)")}</th>
                        <th className="px-3 py-2.5 font-black uppercase border-r border-slate-700">{uiText("Method (ማስተማሪያ ዘዴ)")}</th>
                        <th className="px-3 py-2.5 font-black uppercase border-r border-slate-700">{uiText("Aid (መርጃ መሣሪያ)")}</th>
                        <th className="px-3 py-2.5 font-black uppercase">{uiText("Remark (ምዘና)")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
                      {(Array.isArray(selectedWeeklyPlan.daily_activities || selectedWeeklyPlan.dailyActivities) && (selectedWeeklyPlan.daily_activities || selectedWeeklyPlan.dailyActivities).length > 0
                        ? (selectedWeeklyPlan.daily_activities || selectedWeeklyPlan.dailyActivities)
                        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => ({
                            day,
                            content: selectedWeeklyPlan.content || selectedWeeklyPlan.topic || '—',
                            competence: selectedWeeklyPlan.objectives || '—',
                            timeDuration: selectedWeeklyPlan.time_duration || selectedWeeklyPlan.timeDuration || '45 mins',
                            teacherIntro: selectedWeeklyPlan.teacher_activity || selectedWeeklyPlan.teacherActivity || '—',
                            teacherPresentation: selectedWeeklyPlan.presentation || 'Core presentation',
                            teacherSummary: selectedWeeklyPlan.summary || 'Summary',
                            teacherAssessment: selectedWeeklyPlan.evaluation || '—',
                            studentActivity: selectedWeeklyPlan.student_activity || selectedWeeklyPlan.studentActivity || '—',
                            teachingMethod: selectedWeeklyPlan.teaching_method || selectedWeeklyPlan.teachingMethod || selectedWeeklyPlan.method || '—',
                            teachingAid: selectedWeeklyPlan.teaching_aids || selectedWeeklyPlan.teachingAids || selectedWeeklyPlan.aid || '—',
                            evaluationRemark: selectedWeeklyPlan.remark || '—'
                          }))
                      ).map((act: any, idx: number) => (
                        <Fragment key={idx}>
                          {/* Sub-row 1: Introduction */}
                          <tr className="bg-white dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700">
                            <td rowSpan={4} className="px-3 py-3 font-black text-center text-blue-800 dark:text-blue-400 border-r border-slate-300 dark:border-slate-700 align-middle bg-slate-50/80 dark:bg-slate-800/40">
                              <span className="text-sm">{uiText(act.day)}</span>
                            </td>
                            <td rowSpan={4} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 align-top space-y-2 max-w-[200px]">
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 block border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">{uiText("Content (ይዘት)")}</span>
                                <p className="font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{act.content || '—'}</p>
                              </div>
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-[9px] font-black uppercase text-slate-400 block border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">{uiText("Expected Outcome / Competence (ብቃት)")}</span>
                                <p className="font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{act.competence || '—'}</p>
                              </div>
                            </td>
                            <td rowSpan={4} className="px-2 py-3 font-bold text-center text-slate-600 dark:text-slate-400 border-r border-slate-300 dark:border-slate-700 align-middle whitespace-nowrap">
                              {act.timeDuration || '45 mins'}
                            </td>
                            <td className="px-3 py-2 border-r border-b border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/20">
                              <span className="text-[9px] font-black uppercase text-blue-700 dark:text-blue-400 block">{uiText("1. Intro (መግቢያ)")}</span>
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
                              <span className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-400 block">{uiText("2. Presentation (አቀራረብ)")}</span>
                              <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{act.teacherPresentation || '—'}</p>
                            </td>
                          </tr>

                          {/* Sub-row 3: Summary */}
                          <tr className="bg-white dark:bg-slate-900">
                            <td className="px-3 py-2 border-r border-b border-slate-200 dark:border-slate-800 bg-violet-50/30 dark:bg-violet-950/20">
                              <span className="text-[9px] font-black uppercase text-violet-700 dark:text-violet-400 block">{uiText("3. Summary (ማጠቃለያ)")}</span>
                              <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{act.teacherSummary || '—'}</p>
                            </td>
                          </tr>

                          {/* Sub-row 4: Assessment */}
                          <tr className="bg-white dark:bg-slate-900">
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/20">
                              <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 block">{uiText("4. Assessment (ምዘና)")}</span>
                              <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{act.teacherAssessment || '—'}</p>
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Approvals Footer Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 print:bg-white print:border-slate-400">
                <div className="border border-dashed border-slate-300 dark:border-slate-700 p-3 rounded-xl text-center print:border-solid print:border-slate-400">
                  <p className="text-[10px] font-black uppercase text-slate-400">{uiText("Teacher Signature & Date")}</p>
                  <p className="font-bold text-slate-800 dark:text-white text-xs mt-2">{selectedWeeklyPlan.teacher_name || selectedWeeklyPlan.teacherName || 'Assigned Teacher'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{uiText("Date: ")}{(selectedWeeklyPlan.created_at ? uiText(new Date(selectedWeeklyPlan.created_at).toLocaleDateString()) : uiText(selectedWeeklyPlan.date || '—'))}</p>
                </div>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 p-3 rounded-xl text-center print:border-solid print:border-slate-400">
                  <p className="text-[10px] font-black uppercase text-slate-400">{uiText("Department Head Signature & Date")}</p>
                  <p className="font-bold text-slate-800 dark:text-white text-xs mt-2">{(selectedWeeklyPlan.status === 'Approved' ? uiText('Verified & Approved') : uiText('Pending Approval'))}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{uiText("Date: ")}{(selectedWeeklyPlan.updated_at ? uiText(new Date(selectedWeeklyPlan.updated_at).toLocaleDateString()) : uiText('—'))}</p>
                </div>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 p-3 rounded-xl text-center print:border-solid print:border-slate-400">
                  <p className="text-[10px] font-black uppercase text-slate-400">{uiText("Principal / VP Signature & Date")}</p>
                  <p className="font-bold text-slate-800 dark:text-white text-xs mt-2">{(selectedWeeklyPlan.status === 'Approved' ? uiText('Signed for Academic Oversight') : uiText('Awaiting Review'))}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{uiText("Date: ")}{(selectedWeeklyPlan.updated_at ? uiText(new Date(selectedWeeklyPlan.updated_at).toLocaleDateString()) : uiText('—'))}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-b-[2rem] print:hidden">
              <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>{uiText(" Official Lesson Plan Matrix Document View ")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <Printer size={14} />{uiText(" Print ")}</button>
                <button
                  type="button"
                  onClick={() => setSelectedWeeklyPlan(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors"
                >{uiText(" Close ")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewModal.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{uiText("Request Plan Revision")}</h3>
              <button
                type="button"
                onClick={() => setReviewModal({ show: false, planId: '', planType: 'annual', status: 'Approved', feedback: '' })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{uiText(" Reason for Revision / Feedback for Teacher: ")}</label>
              <textarea
                value={reviewModal.feedback}
                onChange={(e) => setReviewModal({ ...reviewModal, feedback: e.target.value })}
                placeholder={uiText("Please state what needs to be revised or corrected in this plan...")}
                rows={4}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModal({ show: false, planId: '', planType: 'annual', status: 'Approved', feedback: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >{uiText(" Cancel ")}</button>
              <button
                type="button"
                disabled={processing}
                onClick={() => handleReviewPlanSubmit('Revision Required')}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center gap-1"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}{uiText(" Submit Revision Request ")}</button>
            </div>
          </div>
        </div>
      )}

      <TeacherAttendanceModal
        open={Boolean(attendanceTeacher)}
        teacher={attendanceTeacher}
        onClose={() => setAttendanceTeacher(null)}
      />

      {/* Modal to Select Specific Grade Plan */}
      {gradeSelectModal?.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">
                  Select Grade Submission
                </span>
                <h3 className="font-bold text-white text-base">
                  {gradeSelectModal.teacherName} · {gradeSelectModal.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGradeSelectModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                This teacher has submitted plans for multiple grades. Select which grade plan you want to view:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {gradeSelectModal.plans.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const planType = gradeSelectModal.planType;
                      setGradeSelectModal(null);
                      handleViewSpecificPlan(g.plan_id, planType, null);
                    }}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-105 transition-transform">
                        <FileText size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          {g.grade} Plan
                        </span>
                        <span className={`text-[11px] font-semibold ${
                          g.status === 'Approved' ? 'text-emerald-600 dark:text-emerald-400' :
                          g.status === 'Revision Required' ? 'text-rose-600 dark:text-rose-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`}>
                          Status: {g.status || 'Submitted'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                      View <ChevronRight size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setGradeSelectModal(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">
                  {(formData.role === 'vice-principal' ? uiText('Register Vice Principal') : (formData.role === 'librarian' ? uiText('Register Librarian') : uiText(t("teachers.registerNewTeacher", "Register New Teacher"))))}
                </h3>
              </div>
              <button type="button" title={uiText("Close register teacher dialog")} onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAddTeacher}>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.role", "Role")}</label>
                <select
                  required
                  title={uiText("Select staff role")}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="vice-principal">{uiText("Vice Principal")}</option>
                  <option value="teacher">{t("teachers.roleTeacher", "Teacher")}</option>
                  <option value="librarian">{t("teachers.roleLibrarian", "Librarian")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.fullName", "Full Name")}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                  onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, name: c }); }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("teachers.fullNamePlaceholder", "e.g. Ato Bekele Tesfaye")}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.emailAddress", "Email Address")}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={uiText("teacher@school.com")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PhoneInput
                  label={t("teachers.phoneNumber", "Phone Number")}
                  value={formData.phoneNumber}
                  onChange={(val) => setFormData({ ...formData, phoneNumber: val })}
                  error={phoneError}
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.emergencyContactName", "Emergency Contact Name")}</label>
                  <input
                    type="text"
                    required
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, emergencyContactName: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("teachers.emergencyContactPlaceholder", "Contact person")}
                  />
                </div>
                <PhoneInput
                  label={t("teachers.emergencyContactPhone", "Emergency Contact Phone")}
                  value={formData.emergencyContactPhone}
                  onChange={(val) => setFormData({ ...formData, emergencyContactPhone: val })}
                  error={emergencyPhoneError}
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.educationStatus", "Education Status")}</label>
                  <select
                    title={uiText("Select education level")}
                    value={formData.educationLevel}
                    onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t("teachers.selectLevel", "Select level")}</option>
                    <option value="Diploma">{t("teachers.diploma", "Diploma")}</option>
                    <option value="Degree">{t("teachers.degree", "Degree")}</option>
                    <option value="Master">{t("teachers.master", "Master")}</option>
                    <option value="PhD">{t("teachers.phd", "PhD")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.specialtyCourse", "Specialty / Course")}</label>
                  <input
                    type="text"
                    title={uiText("Specialty or course taught")}
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, specialty: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("teachers.specialtyPlaceholder", "Math, English, Biology...")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.dob", "Date of Birth")}</label>
                  <EthiopianDatePicker
                    value={formData.dob}
                    onChange={(val) => setFormData({ ...formData, dob: val })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.previousSchool", "Previous School")}</label>
                  <input
                    type="text"
                    required
                    value={formData.previousSchool}
                    onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, previousSchool: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("teachers.previousSchoolPlaceholder", "Previous School")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t("teachers.experienceYears", "Experience (Years)")}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("teachers.experiencePlaceholder", "e.g. 5")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {t("teachers.staffDocument", "Staff Document (Mandatory, PDF or Image, max 2MB)")}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert(uiText('File size exceeds the 2MB limit.'));
                          e.target.value = '';
                          setSelectedFile(null);
                        } else {
                          setSelectedFile(file);
                        }
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t("teachers.pinGenerationNote", "Note: A 4-digit PIN will be auto-generated. Teacher will need School Admin approval to login.")}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                  disabled={creating}
                >
                  {t("teachers.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  <span>{(creating ? uiText(t('teachers.creating', 'Creating...')) : uiText(t('teachers.createTeacher', 'Create Teacher')))}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StaffProfileModal
        open={!!selectedStaff}
        title={uiText("Teacher Staff Details")}
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onRefresh={async () => {
          const freshList = await fetchTeachers();
          if (freshList) {
            const updated = freshList.find((t: any) => t.id === selectedStaff.id);
            if (updated) setSelectedStaff(updated);
          }
        }}
      />

      {/* Promote Modal */}
      {showPromoteModal && promotionTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{uiText("Promote ")}{promotionTarget.name}</h3>
                <p className="text-sm text-slate-500">{uiText("Choose the new responsibility for this teacher")}</p>
              </div>
              <button type="button" title={uiText("Close")} onClick={() => setShowPromoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Promotion Roles")}</label>
                <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promotionForm.roles.includes('home-teacher')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPromotionForm(prev => {
                          const nextRoles = checked ? [...prev.roles, 'home-teacher'] : prev.roles.filter(r => r !== 'home-teacher');
                          return { ...prev, roles: nextRoles };
                        });
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{uiText("Home Teacher (takes attendance for assigned sections)")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promotionForm.roles.includes('head-of-department')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPromotionForm(prev => {
                          const nextRoles = checked ? [...prev.roles, 'head-of-department'] : prev.roles.filter(r => r !== 'head-of-department');
                          return { ...prev, roles: nextRoles };
                        });
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{uiText("Head of Department (manage subjects for selected grades)")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promotionForm.roles.includes('before-school-educator')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPromotionForm(prev => {
                          const nextRoles = checked ? [...prev.roles, 'before-school-educator'] : prev.roles.filter(r => r !== 'before-school-educator');
                          return { ...prev, roles: nextRoles };
                        });
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{uiText("Before-school Educator (extra pay configured by super-admin)")}</span>
                  </label>
                </div>
              </div>

              {promotionForm.roles.includes('head-of-department') && (
                <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{uiText("Head of Department Settings")}</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Step 1 — Select Grades")}</label>
                    <p className="text-xs text-slate-500">{uiText("Choose which grades this department head will oversee.")}</p>
                    <MultiSelectDropdown
                      options={allGrades}
                      selectedValues={promotionForm.hodGrades}
                      placeholder={uiText("Select Grades")}
                      shortDisplay={true}
                      onChange={(g, checked) => {
                        setPromotionForm(prev => {
                          const nextGrades = checked ? [...prev.hodGrades, g] : prev.hodGrades.filter(x => x !== g);
                          return { ...prev, hodGrades: nextGrades };
                        });
                      }}
                    />
                    {promotionForm.hodGrades.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {promotionForm.hodGrades.map(g => (
                          <span key={g} className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-700">
                            {uiText(g)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const normalizeGrade = (g: string) => {
                      const trimmed = g.trim();
                      return /^\d+$/.test(trimmed) ? `Grade ${trimmed}` : trimmed;
                    };
                    const selectedGradeSet = new Set(promotionForm.hodGrades.map(normalizeGrade));

                    const matchingCourses = selectedGradeSet.size > 0
                      ? allCoursesWithGrade.filter(c => selectedGradeSet.has(normalizeGrade(c.grade_level)))
                      : allCoursesWithGrade;

                    const courseNamesFromCourses = Array.from(new Set(matchingCourses.map(c => c.name))).sort();
                    const courseNamesFromSubjects = Array.from(new Set(allSubjects.map((s: any) => s.name))).sort();

                    const combinedOptions = Array.from(new Set([
                      ...courseNamesFromCourses,
                      ...courseNamesFromSubjects
                    ])).sort();

                    const handleAddCustomSubject = () => {
                      if (!customSubjectInput.trim()) return;
                      const newSub = customSubjectInput.trim();
                      setPromotionForm(prev => {
                        const next = new Set(prev.hodSubjects || []);
                        next.add(newSub);
                        return { ...prev, hodSubjects: Array.from(next) };
                      });
                      setCustomSubjectInput('');
                    };

                    return (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Step 2 — Select Courses / Subjects")}</label>
                          <p className="text-xs text-slate-500">{uiText(" Choose or add the subjects/courses this department head will supervise. ")}</p>
                        </div>

                        {combinedOptions.length > 0 && (
                          <MultiSelectDropdown
                            options={combinedOptions}
                            selectedValues={promotionForm.hodSubjects}
                            placeholder={uiText("Select Courses / Subjects")}
                            shortDisplay={false}
                            onChange={(subName, checked) => {
                              setPromotionForm(prev => {
                                const next = new Set(prev.hodSubjects || []);
                                if (checked) next.add(subName); else next.delete(subName);
                                return { ...prev, hodSubjects: Array.from(next) };
                              });
                            }}
                          />
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customSubjectInput}
                            onChange={(e) => setCustomSubjectInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomSubject();
                              }
                            }}
                            placeholder={uiText("Add custom subject/course name (e.g. Physics)")}
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSubject}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition"
                          >
                            <Plus size={14} />{uiText(" Add ")}</button>
                        </div>

                        {promotionForm.hodSubjects.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs text-slate-400 font-medium">{uiText("Assigned Subjects (")}{promotionForm.hodSubjects.length}):</span>
                            <div className="flex flex-wrap gap-2">
                              {promotionForm.hodSubjects.map(s => (
                                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-700">
                                  {uiText(s)}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPromotionForm(prev => ({
                                        ...prev,
                                        hodSubjects: prev.hodSubjects.filter(x => x !== s)
                                      }));
                                    }}
                                    className="hover:text-emerald-900 dark:hover:text-emerald-100 font-bold ml-0.5"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {promotionForm.roles.includes('home-teacher') && (
                <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{uiText("Home Teacher Settings")}</h4>
                  <p className="text-sm text-slate-600">{uiText("Select grades and sections this teacher will be head of (optional, multi-select).")}</p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Grades")}</label>
                    <MultiSelectDropdown
                      options={allGrades}
                      selectedValues={promotionForm.htGrades}
                      placeholder={uiText("Select Grades")}
                      shortDisplay={true}
                      onChange={(g, checked) => {
                        setPromotionForm(prev => {
                          const nextGrades = checked ? [...prev.htGrades, g] : prev.htGrades.filter(x => x !== g);
                          const nextSectionsByGrade = { ...(prev.htSectionsByGrade || {}) };
                          if (!checked) delete nextSectionsByGrade[g];
                          return { ...prev, htGrades: nextGrades, htSectionsByGrade: nextSectionsByGrade };
                        });
                      }}
                    />
                  </div>
                  {promotionForm.htGrades.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {promotionForm.htGrades.map(g => (
                        <span key={g} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700">
                          {uiText(g)}
                        </span>
                      ))}
                    </div>
                  )}

                  {promotionForm.htGrades.map((g) => (
                    <div key={g} className="space-y-1">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{uiText(g)}</div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(sectionsMap[g] && sectionsMap[g].length > 0) ? (
                          sectionsMap[g].map((s) => {
                            const selected = (promotionForm.htSectionsByGrade && promotionForm.htSectionsByGrade[g] || []).includes(s);
                            return (
                              <label key={s} className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setPromotionForm(prev => {
                                      const sbg = { ...(prev.htSectionsByGrade || {}) };
                                      const arr = sbg[g] ? [...sbg[g]] : [];
                                      if (checked) arr.push(s); else {
                                        const idx = arr.indexOf(s); if (idx >= 0) arr.splice(idx, 1);
                                      }
                                      sbg[g] = arr;
                                      return { ...prev, htSectionsByGrade: sbg };
                                    });
                                  }}
                                  className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span>{uiText(s)}</span>
                              </label>
                            );
                          })
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {promotionForm.roles.includes('before-school-educator') && (
                <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{uiText("Before-school Educator Settings")}</h4>
                  <p className="text-sm text-slate-600">{uiText("Configure before-school educator assignments and extra pay.")}</p>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Days")}</label>
                    <div className="flex flex-wrap gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
                        <label key={d} className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={promotionForm.beforeSchool.days.includes(d)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setPromotionForm(prev => {
                                const days = new Set(prev.beforeSchool.days || []);
                                if (checked) days.add(d); else days.delete(d);
                                return { ...prev, beforeSchool: { ...prev.beforeSchool, days: Array.from(days) } };
                              });
                            }}
                            className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span>{uiText(d)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Start Time")}</label>
                      <input
                        type="time"
                        title={uiText("Start time for before-school session")}
                        value={promotionForm.beforeSchool.startTime}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, startTime: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{uiText("End Time")}</label>
                      <input
                        type="time"
                        title={uiText("End time for before-school session")}
                        value={promotionForm.beforeSchool.endTime}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, endTime: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Pay Rate")}</label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promotionForm.beforeSchool.useConfiguredRate}
                          onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, useConfiguredRate: e.target.checked } }))}
                          className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>{uiText("Use super-admin configured rate")}</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Extra Pay Amount (optional)")}</label>
                    <input
                      type="number"
                      min={0}
                      value={promotionForm.beforeSchool.extraPayAmount || ''}
                      onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, extraPayAmount: e.target.value } }))}
                      disabled={promotionForm.beforeSchool.useConfiguredRate}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={uiText("Leave empty to use configured rate")}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                disabled={promoting}
              >{uiText(" Cancel ")}</button>
              {promotionTarget?.staffProfile?.promotion && (
                <button
                  onClick={async () => {
                    const targetUserId = promotionTarget.user_id || promotionTarget.userId || promotionTarget.id;
                    if (window.confirm('Are you sure you want to remove this teacher\'s promotion?')) {
                      setPromoting(true);
                      try {
                        await removeTeacherPromotion(targetUserId);
                        setShowPromoteModal(false);
                        setPromotionTarget(null);
                        fetchTeachers();
                      } catch (err: any) {
                        console.error('Failed to remove promotion:', err);
                        alert(uiError(err.response?.data?.error?.message || 'Failed to remove promotion'));
                      } finally {
                        setPromoting(false);
                      }
                    }
                  }}
                  className="flex-1 bg-rose-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-50 text-sm"
                  disabled={promoting}
                >
                  {(promoting ? uiText('Removing...') : uiText('Remove Promotion'))}
                </button>
              )}
              <button
                onClick={async () => {
                  setPromoting(true);
                  try {
                    const targetUserId = promotionTarget.user_id || promotionTarget.userId || promotionTarget.id;
                    await promoteTeacher(targetUserId, {
                      roles: promotionForm.roles,
                      headOfDepartment: {
                        grades: promotionForm.hodGrades,
                        subjects: promotionForm.hodSubjects
                      },
                      homeTeacher: {
                        grades: promotionForm.htGrades,
                        sections: promotionForm.htSectionsByGrade
                      },
                      beforeSchool: {
                        days: promotionForm.beforeSchool.days,
                        startTime: promotionForm.beforeSchool.startTime,
                        endTime: promotionForm.beforeSchool.endTime,
                        useConfiguredRate: promotionForm.beforeSchool.useConfiguredRate,
                        extraPayAmount: promotionForm.beforeSchool.extraPayAmount ? Number(promotionForm.beforeSchool.extraPayAmount) : undefined
                      },
                      subjects: promotionForm.hodSubjects,
                      grades: promotionForm.hodGrades
                    });
                    setShowPromoteModal(false);
                    setPromotionTarget(null);
                    fetchTeachers();
                  } catch (err: any) {
                    console.error('Promotion failed:', err);
                    alert(uiError(err.response?.data?.error?.message || 'Promotion failed.'));
                  } finally {
                    setPromoting(false);
                  }
                }}
                className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 text-sm"
                disabled={promoting}
              >
                {(promoting ? uiText('Saving...') : (promotionTarget?.staffProfile?.promotion ? uiText('Save Promotion') : uiText('Promote Teacher')))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                  <Check size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{uiText("Teacher Created Successfully!")}</h3>
                  <p className="text-sm text-slate-500">{uiText("Save the credentials below")}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{uiText("Digital ID (Username)")}</label>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                    {successModal.data?.user?.digitalId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successModal.data?.user?.digitalId);
                      setCopied('digitalId');
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {(copied === 'digitalId' ? uiText('✓ Copied') : uiText('Copy'))}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-5 border-2 border-amber-300 dark:border-amber-700">
                <label className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase block mb-3 flex items-center gap-2">
                  <span className="text-lg">🔑</span>{uiText(" 4-Digit PIN (Save This!) ")}</label>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-3xl font-mono font-black text-amber-700 dark:text-amber-300 tracking-widest">
                    {successModal.data?.temporaryPassword}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successModal.data?.temporaryPassword);
                      setCopied('password');
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-colors shadow-lg"
                  >
                    {(copied === 'password' ? uiText('✓ Copied') : uiText('Copy PIN'))}
                  </button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 font-semibold">{uiText(" ⚠️ This PIN won't be shown again. Teacher must save it for first login. ")}</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{uiText("📋 Next Steps:")}</strong>{uiText(" Approve the teacher from the actions menu to enable login. ")}</p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={handlePrintCredentials}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Printer size={18} />{uiText(" Print ")}</button>
              <button
                onClick={() => setSuccessModal({ show: false, data: null })}
                className="flex-1 bg-slate-900 dark:bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700"
              >{uiText(" Close ")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{uiText(" Confirm ")}{(confirmAction.action === 'approve' ? uiText('Approval') : (confirmAction.action === 'revoke' ? uiText('Revocation') : uiText('Deletion')))}
              </h3>
            </div>

            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400">{uiText(" Are you sure you want to ")}{uiText(confirmAction.action)} <strong>{confirmAction.teacher?.name}</strong>?
              </p>
              {confirmAction.action === 'delete' && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">{uiText(" ⚠️ This action cannot be undone. ")}</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setConfirmAction({ show: false, action: 'approve', teacher: null })}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50"
                disabled={processing}
              >{uiText(" Cancel ")}</button>
              <button
                onClick={handleAction}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm text-white ${confirmAction.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  confirmAction.action === 'revoke' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                disabled={processing}
              >
                {(processing ? uiText('Processing...') : (confirmAction.action === 'approve' ? uiText('Approve') : (confirmAction.action === 'revoke' ? uiText('Revoke') : uiText('Delete'))))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Edit2 size={20} /></div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{uiText("Edit Teacher")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
                title={uiText("Close edit modal")}
                aria-label={uiText("Close edit modal")}
              ><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-name" className="text-xs font-bold text-slate-500 uppercase">{uiText("Full Name")}</label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setEditFormData({ ...editFormData, name: c }); }}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="text-xs font-bold text-slate-500 uppercase">{uiText("Email Address")}</label>
                <input
                  id="edit-email"
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-3 border-t border-b border-slate-100 dark:border-slate-800 py-4 my-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Password Reset")}</label>
                    <p className="text-xs text-slate-500">{uiText("Generate a new 4-digit PIN for this teacher.")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 whitespace-nowrap"
                  >
                    {(resettingPassword ? uiText('Generating...') : uiText('Reset Password'))}
                  </button>
                </div>
                {generatedPassword && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-300">{uiText(" New password generated: ")}<span className="font-mono text-base font-bold text-slate-900 dark:text-white ml-1">{generatedPassword}</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                  disabled={submitting}>{uiText(" Cancel ")}</button>
                <button type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  <span>{(submitting ? uiText('Saving...') : uiText('Save Changes'))}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
