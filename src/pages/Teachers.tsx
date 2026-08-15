import { useTranslation } from 'react-i18next';
import { UserPlus, X, Check, ArrowLeft, MoreVertical, CheckCircle, XCircle, Trash2, Printer, Eye, Edit2, Loader2, FileText, Download, Upload } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { registerUser, getBranchTeachers, approveTeacher, revokeTeacher, deleteTeacher, promoteTeacher, updateUser, resetUserPIN, removeTeacherPromotion, replaceUserDocument } from '../services/schoolAdminService';
import api from '../services/api';
import classService from '../services/classService';
import { StaffProfileModal } from '../components/StaffProfileModal';
import subjectService, { CourseWithGrade } from '../services/subjectService';
import { getVPTeachers, getLeaderboard, rateTeacher, resetLeaderboard } from '../services/vicePrincipalService';
import { Star, Trophy, RefreshCcw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { TeacherAttendanceModal } from '../components/TeacherAttendanceModal';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';

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
          {selectedValues.length === 0
            ? placeholder
            : shortDisplay
              ? `${selectedValues.length} selected`
              : `${selectedValues.join(', ')} (${selectedValues.length} selected)`}
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
                  <span>{option}</span>
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
  const { role } = useUser();
  const isAdmin = role === 'school-admin' || role === 'super-admin';
  const isVP = role === 'vice-principal';

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successModal, setSuccessModal] = useState<{ show: boolean; data: any }>({ show: false, data: null });
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [attendanceTeacher, setAttendanceTeacher] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'teachers' | 'leaderboard'>('teachers');
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
    role: 'teacher' as 'teacher' | 'librarian'
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
    if (activeTab === 'leaderboard' && isVP) {
      fetchLeaderboardData();
    }
  }, [activeTab]);

  const fetchLeaderboardData = async () => {
    try {
      setLeaderboardLoading(true);
      const data = await getLeaderboard();
      setLeaderboardData(data);
    } catch (err: any) {
      console.error('Failed to fetch leaderboard:', err);
      alert(err.response?.data?.error?.message || 'Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleRateTeacher = async (teacherId: string, rating: number) => {
    try {
      await rateTeacher(teacherId, rating);
      fetchLeaderboardData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to rate teacher');
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
      alert(err.response?.data?.error?.message || 'Failed to reset leaderboard');
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
      setError(err.response?.data?.error?.message || 'Failed to load teachers');
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
      alert(errorMsg);
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
      await updateUser(editingStaff.userId, {
        name: editFormData.name,
        email: editFormData.email
      });
      alert('Teacher details updated successfully!');
      setShowEditModal(false);
      setEditingStaff(null);
      fetchTeachers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update teacher');
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
        alert('Password reset succeeded');
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handlePrintCredentials = () => {
    const { user, temporaryPassword } = successModal.data;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
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
            <div class="value">${user.name}</div>
          </div>
          <div class="field">
            <div class="label">Email</div>
            <div class="value">${user.email}</div>
          </div>
          <div class="field">
            <div class="label">Digital ID (Username)</div>
            <div class="value" style="font-family: monospace; color: #2563eb;">${user.digitalId}</div>
          </div>
          <div class="pin-box">
            <div class="label">🔑 4-Digit PIN</div>
            <div class="pin">${temporaryPassword}</div>
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
    `);
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
      alert('Please upload a document. Document upload is mandatory for staff registration.');
      return;
    }

    if (hasError) return;

    setCreating(true);
    try {
      const response = await registerUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        staffProfile: {
          phoneNumber: `+251${formData.phoneNumber}`,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactPhone: formData.emergencyContactPhone ? `+251${formData.emergencyContactPhone}` : undefined,
          educationLevel: formData.educationLevel,
          specialty: formData.specialty,
          dob: formData.dob,
          previousSchool: formData.previousSchool,
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
      alert(err.response?.data?.error?.message || 'Failed to create teacher');
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
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t("teachers.title", "Teachers")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t("teachers.subtitle", "Manage teaching staff and assignments")}</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <UserPlus size={20} />
            Register Teacher
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {isVP && (
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 gap-4">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === 'teachers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            All Teachers
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'leaderboard'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <Trophy size={16} /> {t("teachers.leaderboard", "Leaderboard")}
          </button>
        </div>
      )}

      {activeTab === 'teachers' ? (
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
                      {isAdmin && teacher.status !== 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ show: true, action: teacher.status === 'Approved' ? 'revoke' : 'approve', teacher })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${teacher.status === 'Approved' ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'}`}
                        >
                          {teacher.status}
                        </button>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${teacher.status === 'Approved' ? 'bg-green-100 text-green-700' : teacher.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {teacher.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 uppercase font-semibold">{t("teachers.colDigitalId", "Digital ID")}:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{teacher.digitalId}</span>
                      {teacher.zkDeviceId && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-[10px] font-bold">
                          ZK: {teacher.zkDeviceId}
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
                          <CheckCircle size={14} />
                          Approve
                        </button>
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
                        {isTeacherPromoted(teacher) ? 'Promoted' : 'Promote'}
                      </button>
                      <button
                        onClick={() => openEditModal(teacher)}
                        className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ show: true, action: 'delete', teacher })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Delete User"
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
                    teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
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
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-[10px] font-bold tracking-wider">
                                ZK: {teacher.zkDeviceId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isAdmin && teacher.status !== 'Pending' ? (
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ show: true, action: teacher.status === 'Approved' ? 'revoke' : 'approve', teacher })}
                              className={`px-2 py-1 rounded text-xs font-bold uppercase transition-colors ${teacher.status === 'Approved' ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'}`}
                            >
                              {teacher.status}
                            </button>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${teacher.status === 'Approved' ? 'bg-green-100 text-green-700' : teacher.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {teacher.status}
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
                                  <CheckCircle size={14} />
                                  Approve
                                </button>
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
                                {isTeacherPromoted(teacher) ? 'Promoted' : 'Promote'}
                              </button>
                              <button
                                onClick={() => openEditModal(teacher)}
                                className="p-1.5 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-950/30 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setConfirmAction({ show: true, action: 'delete', teacher })}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                title="Delete User"
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
      ) : (
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
                title="Filter leaderboard by grade"
                value={leaderboardGradeFilter}
                onChange={(e) => { setLeaderboardGradeFilter(e.target.value); setLeaderboardPage(1); }}
                className="py-2 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-700 dark:text-slate-300"
              >
                <option value="">{t("teachers.allGrades", "All Grades")}</option>
                {allLeaderboardGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              {(leaderboardSearch || leaderboardGradeFilter) && (
                <button
                  onClick={() => { setLeaderboardSearch(''); setLeaderboardGradeFilter(''); setLeaderboardPage(1); }}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colRank", "Rank")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Teacher</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colStudentVotes", "Student Votes")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colPlanRating", "Plan Rating")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("teachers.colVPRating", "VP Rating")}</th>
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
                      {leaderboardSearch || leaderboardGradeFilter
                        ? `No teachers found${leaderboardGradeFilter ? ` teaching ${leaderboardGradeFilter}` : ''}${leaderboardSearch ? ` matching "${leaderboardSearch}"` : ''}.`
                        : t("teachers.noLeaderboardData", "No data available for the leaderboard.")}
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
                        <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{row.student_votes}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{row.plan_rating_sum}</td>
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
                                  {grade}
                                </button>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-xl text-slate-800 dark:text-white">{row.total_points}</td>
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
                  title="Previous page"
                  onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                  disabled={leaderboardPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("teachers.pageOf", { current: leaderboardPage, total: totalLeaderboardPages, defaultValue: `Page ${leaderboardPage} of ${totalLeaderboardPages}` })}</span>
                <button
                  type="button"
                  title="Next page"
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

      <TeacherAttendanceModal
        open={Boolean(attendanceTeacher)}
        teacher={attendanceTeacher}
        onClose={() => setAttendanceTeacher(null)}
      />

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Register New Teacher</h3>
              </div>
              <button type="button" title="Close register teacher dialog" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAddTeacher}>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                  onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, name: c }); }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Ato Bekele Tesfaye"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="teacher@school.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                <select
                  required
                  title="Select staff role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="teacher">Teacher</option>
                  <option value="librarian">Librarian</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PhoneInput
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(val) => setFormData({ ...formData, phoneNumber: val })}
                  error={phoneError}
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Emergency Contact Name</label>
                  <input
                    type="text"
                    required
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, emergencyContactName: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contact person"
                  />
                </div>
                <PhoneInput
                  label="Emergency Contact Phone"
                  value={formData.emergencyContactPhone}
                  onChange={(val) => setFormData({ ...formData, emergencyContactPhone: val })}
                  error={emergencyPhoneError}
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Education Status</label>
                  <select
                    title="Select education level"
                    value={formData.educationLevel}
                    onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select level</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Degree">Degree</option>
                    <option value="Master">Master</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Specialty / Course</label>
                  <input
                    type="text"
                    title="Specialty or course taught"
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, specialty: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Math, English, Biology..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                  <EthiopianDatePicker
                    value={formData.dob}
                    onChange={(val) => setFormData({ ...formData, dob: val })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Previous School</label>
                  <input
                    type="text"
                    required
                    value={formData.previousSchool}
                    onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, previousSchool: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Previous School"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Experience (Years)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 5"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Staff Document (Mandatory, PDF or Image, max 2MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('File size exceeds the 2MB limit.');
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
                  <strong>Note:</strong> A 4-digit PIN will be auto-generated. Teacher will need School Admin approval to login.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                  disabled={creating}
                >
                  Cancel
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
                  <span>{creating ? 'Creating...' : 'Create Teacher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StaffProfileModal
        open={!!selectedStaff}
        title="Teacher Staff Details"
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
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Promote {promotionTarget.name}</h3>
                <p className="text-sm text-slate-500">Choose the new responsibility for this teacher</p>
              </div>
              <button type="button" title="Close" onClick={() => setShowPromoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Promotion Roles</label>
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
                    <span>Home Teacher (takes attendance for assigned sections)</span>
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
                    <span>Head of Department (manage subjects for selected grades)</span>
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
                    <span>Before-school Educator (extra pay configured by super-admin)</span>
                  </label>
                </div>
              </div>

              {promotionForm.roles.includes('head-of-department') && (
                <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Head of Department Settings</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Step 1 — Select Grades</label>
                    <p className="text-xs text-slate-500">Choose which grades this department head will oversee.</p>
                    <MultiSelectDropdown
                      options={allGrades}
                      selectedValues={promotionForm.hodGrades}
                      placeholder="Select Grades"
                      shortDisplay={true}
                      onChange={(g, checked) => {
                        setPromotionForm(prev => {
                          const nextGrades = checked ? [...prev.hodGrades, g] : prev.hodGrades.filter(x => x !== g);
                          const allowed = new Set(nextGrades);
                          const nextSubjects = prev.hodSubjects.filter(sname => {
                            const s = allSubjects.find(sub => sub.name === sname);
                            return s ? allowed.has(s.gradeLevel) : false;
                          });
                          return { ...prev, hodGrades: nextGrades, hodSubjects: nextSubjects };
                        });
                      }}
                    />
                    {promotionForm.hodGrades.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {promotionForm.hodGrades.map(g => (
                          <span key={g} className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-700">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {promotionForm.hodGrades.length > 0 && (() => {
                    const normalizeGrade = (g: string) => {
                      const trimmed = g.trim();
                      return /^\d+$/.test(trimmed) ? `Grade ${trimmed}` : trimmed;
                    };
                    const selectedGradeSet = new Set(promotionForm.hodGrades.map(normalizeGrade));
                    const filteredCourseNames = Array.from(
                      new Set(
                        allCoursesWithGrade
                          .filter(c => selectedGradeSet.has(normalizeGrade(c.grade_level)))
                          .map(c => c.name)
                      )
                    ).sort();
                    const gradeSet = new Set(promotionForm.hodGrades);
                    const fallbackNames = Array.from(
                      new Set(
                        allSubjects
                          .filter((s: any) => gradeSet.has(s.gradeLevel))
                          .map((s: any) => s.name)
                      )
                    );
                    const courseNames = filteredCourseNames.length > 0 ? filteredCourseNames : fallbackNames;
                    const usingFallback = filteredCourseNames.length === 0 && fallbackNames.length > 0;

                    return (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Step 2 — Select Courses / Subjects</label>
                        <p className="text-xs text-slate-500">
                          {usingFallback
                            ? 'Showing subjects (no courses found in course management for selected grades).'
                            : 'Only courses taught in the selected grades are shown.'}
                        </p>
                        {courseNames.length === 0 ? (
                          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                            No courses found for the selected grades. Please add courses via Course Management (Classes → select class → add course) first.
                          </div>
                        ) : (
                          <>
                            <MultiSelectDropdown
                              options={courseNames as string[]}
                              selectedValues={promotionForm.hodSubjects}
                              placeholder="Select Courses / Subjects"
                              shortDisplay={true}
                              onChange={(subName, checked) => {
                                setPromotionForm(prev => {
                                  const next = new Set(prev.hodSubjects || []);
                                  if (checked) next.add(subName); else next.delete(subName);
                                  return { ...prev, hodSubjects: Array.from(next) };
                                });
                              }}
                            />
                            {promotionForm.hodSubjects.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {promotionForm.hodSubjects.map(s => (
                                  <span key={s} className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-700">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {promotionForm.roles.includes('home-teacher') && (
                <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Home Teacher Settings</h4>
                  <p className="text-sm text-slate-600">Select grades and sections this teacher will be head of (optional, multi-select).</p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Grades</label>
                    <MultiSelectDropdown
                      options={allGrades}
                      selectedValues={promotionForm.htGrades}
                      placeholder="Select Grades"
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
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {promotionForm.htGrades.map((g) => (
                    <div key={g} className="space-y-1">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{g}</div>
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
                                <span>{s}</span>
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
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Before-school Educator Settings</h4>
                  <p className="text-sm text-slate-600">Configure before-school educator assignments and extra pay.</p>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Days</label>
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
                          <span>{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                      <input
                        type="time"
                        title="Start time for before-school session"
                        value={promotionForm.beforeSchool.startTime}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, startTime: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                      <input
                        type="time"
                        title="End time for before-school session"
                        value={promotionForm.beforeSchool.endTime}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, endTime: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Pay Rate</label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promotionForm.beforeSchool.useConfiguredRate}
                          onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, useConfiguredRate: e.target.checked } }))}
                          className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Use super-admin configured rate</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Extra Pay Amount (optional)</label>
                    <input
                      type="number"
                      min={0}
                      value={promotionForm.beforeSchool.extraPayAmount || ''}
                      onChange={(e) => setPromotionForm(prev => ({ ...prev, beforeSchool: { ...prev.beforeSchool, extraPayAmount: e.target.value } }))}
                      disabled={promotionForm.beforeSchool.useConfiguredRate}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Leave empty to use configured rate"
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
              >
                Cancel
              </button>
              {promotionTarget?.staffProfile?.promotion && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to remove this teacher\'s promotion?')) {
                      setPromoting(true);
                      try {
                        await removeTeacherPromotion(promotionTarget.userId);
                        setShowPromoteModal(false);
                        setPromotionTarget(null);
                        fetchTeachers();
                      } catch (err: any) {
                        console.error('Failed to remove promotion:', err);
                        alert(err.response?.data?.error?.message || 'Failed to remove promotion');
                      } finally {
                        setPromoting(false);
                      }
                    }
                  }}
                  className="flex-1 bg-rose-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-50 text-sm"
                  disabled={promoting}
                >
                  {promoting ? 'Removing...' : 'Remove Promotion'}
                </button>
              )}
              <button
                onClick={async () => {
                  setPromoting(true);
                  try {
                    await promoteTeacher(promotionTarget.userId, {
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
                      }
                    });
                    setShowPromoteModal(false);
                    setPromotionTarget(null);
                    fetchTeachers();
                  } catch (err: any) {
                    console.error('Promotion failed:', err);
                    alert(err.response?.data?.error?.message || 'Promotion failed.');
                  } finally {
                    setPromoting(false);
                  }
                }}
                className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 text-sm"
                disabled={promoting}
              >
                {promoting ? 'Saving...' : promotionTarget?.staffProfile?.promotion ? 'Save Promotion' : 'Promote Teacher'}
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
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Teacher Created Successfully!</h3>
                  <p className="text-sm text-slate-500">Save the credentials below</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Digital ID (Username)</label>
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
                    {copied === 'digitalId' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-5 border-2 border-amber-300 dark:border-amber-700">
                <label className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase block mb-3 flex items-center gap-2">
                  <span className="text-lg">🔑</span>
                  4-Digit PIN (Save This!)
                </label>
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
                    {copied === 'password' ? '✓ Copied' : 'Copy PIN'}
                  </button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 font-semibold">
                  ⚠️ This PIN won't be shown again. Teacher must save it for first login.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>📋 Next Steps:</strong> Approve the teacher from the actions menu to enable login.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={handlePrintCredentials}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Printer size={18} />
                Print
              </button>
              <button
                onClick={() => setSuccessModal({ show: false, data: null })}
                className="flex-1 bg-slate-900 dark:bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                Confirm {confirmAction.action === 'approve' ? 'Approval' : confirmAction.action === 'revoke' ? 'Revocation' : 'Deletion'}
              </h3>
            </div>

            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400">
                Are you sure you want to {confirmAction.action} <strong>{confirmAction.teacher?.name}</strong>?
              </p>
              {confirmAction.action === 'delete' && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                  ⚠️ This action cannot be undone.
                </p>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setConfirmAction({ show: false, action: 'approve', teacher: null })}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm text-white ${confirmAction.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  confirmAction.action === 'revoke' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                disabled={processing}
              >
                {processing ? 'Processing...' : confirmAction.action === 'approve' ? 'Approve' : confirmAction.action === 'revoke' ? 'Revoke' : 'Delete'}
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
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Edit Teacher</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
                title="Close edit modal"
                aria-label="Close edit modal"
              ><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-name" className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Password Reset</label>
                    <p className="text-xs text-slate-500">Generate a new 4-digit PIN for this teacher.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 whitespace-nowrap"
                  >
                    {resettingPassword ? 'Generating...' : 'Reset Password'}
                  </button>
                </div>
                {generatedPassword && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      New password generated: <span className="font-mono text-base font-bold text-slate-900 dark:text-white ml-1">{generatedPassword}</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                  disabled={submitting}>
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
