import { uiError, uiText } from "../localization";
import { useTranslation } from 'react-i18next';
import { Search, Download, UserPlus, X, Edit2, Trash2, Users, ArrowLeft, CheckCircle2, XCircle, Check, Loader2, GraduationCap, FileText, RefreshCw, UserCog } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import studentService, { type UpdateStudentData } from '../services/studentService';
import classService from '../services/classService';
import { getBranchUsers, updateUser, resetUserPIN, assignStudentToClass, removeStudentFromClass, approveTeacher, revokeTeacher } from '../services/schoolAdminService';
import { useUser } from '../context/UserContext';
import { StudentRegistration } from '../components/StudentRegistration';
import * as sectionService from '../services/sectionService';
import { exportToExcel } from '../utils/exportUtils';
import { getCurrentECYear } from '../utils/ethiopianCalendar';

export const Students = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, user, registrationOpen, setRegistrationOpen } = useUser();
  const isSchoolAdmin = role === 'school-admin';
  const canViewStudentRecord = role === 'school-admin' || role === 'super-admin' || role === 'vice-principal' || role === 'academic-manager';

  const formatGradeDisplay = (grade?: string | null) => {
    const trimmed = String(grade || '').trim();
    if (/^kg/i.test(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(/(\d{1,2})/);
    return match ? `Grade ${match[1]}` : trimmed || '-';
  };

  const getGradeNumber = (grade?: string | null) => {
    const trimmed = String(grade || '').trim();
    if (trimmed.startsWith('Grade ')) {
      return trimmed.replace(/^Grade\s+/i, '');
    }
    return trimmed;
  };

  const formatSectionDisplay = (section?: string | null) => {
    if (!section) return '-';
    const trimmed = section.trim();
    const digits = trimmed.match(/(\d+)/);
    if (digits) return `Section ${digits[1]}`;
    const letter = trimmed.toUpperCase().charAt(0);
    if (letter >= 'A' && letter <= 'Z') return `Section ${letter.charCodeAt(0) - 64}`;
    return `Section ${trimmed}`;
  };

  const getSectionNumber = (section?: string | null) => {
    const digits = String(section || '').trim().match(/(\d+)/);
    if (digits) return digits[1];
    const letter = String(section || '').trim().toUpperCase().charAt(0);
    if (letter >= 'A' && letter <= 'Z') return String(letter.charCodeAt(0) - 64);
    return '';
  };

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filterGrade, setFilterGrade] = useState(() => searchParams.get('grade') || '');
  const [filterSection, setFilterSection] = useState(() => searchParams.get('section') || '');
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') || '');
  const [activeView, setActiveView] = useState<'students' | 'registration' | 'add'>(() => {
    const view = searchParams.get('view');
    if (view === 'registration' || view === 'add') return view;
    return 'students';
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAssignSectionModal, setShowAssignSectionModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; student: any }>({ show: false, student: null });
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [availableSectionsForSingle, setAvailableSectionsForSingle] = useState<sectionService.SectionInfo[]>([]);
  const [selectedSectionForStudent, setSelectedSectionForStudent] = useState('');
  const [assigningSection, setAssigningSection] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [activeStatusDropdownStudentId, setActiveStatusDropdownStudentId] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState<any>({});
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Bulk section & status management state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkTargetGrade, setBulkTargetGrade] = useState('');
  const [availableSections, setAvailableSections] = useState<sectionService.SectionInfo[]>([]);
  const [selectedBulkSectionIds, setSelectedBulkSectionIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [loadingBulkSections, setLoadingBulkSections] = useState(false);
  const [autoDistributing, setAutoDistributing] = useState(false);

  // Bulk status shift & promotion state
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('Graduated');
  const [bulkGraduationYear, setBulkGraduationYear] = useState<string>(() => String(getCurrentECYear()));
  const [filterGraduationYear, setFilterGraduationYear] = useState(() => searchParams.get('gradYear') || '');
  const [bulkStatusUpdating, setBulkStatusUpdating] = useState(false);

  const [showBulkShiftGradeModal, setShowBulkShiftGradeModal] = useState(false);
  const [bulkShiftTargetGrade, setBulkShiftTargetGrade] = useState('');
  const [bulkShiftTargetSection, setBulkShiftTargetSection] = useState('');
  const [bulkShiftUpdating, setBulkShiftUpdating] = useState(false);

  const handlePhoneInput = (value: string) => {
    // Remove any non-digit characters
    let phoneDigits = value.replace(/[^\d]/g, '');

    // If empty, set to just +251
    if (!phoneDigits) {
      setEditFormData({ ...editFormData, parentPhone: '+251' });
      return;
    }

    // Validate: must start with 9 or 7
    if (!/^[97]/.test(phoneDigits)) {
      // If it doesn't start with 9 or 7, clear it
      setEditFormData({ ...editFormData, parentPhone: '+251' });
      return;
    }

    // Limit to 9 digits total
    if (phoneDigits.length > 9) {
      phoneDigits = phoneDigits.substring(0, 9);
    }

    // Combine with country code
    const fullPhone = '+251' + phoneDigits;
    setEditFormData({ ...editFormData, parentPhone: fullPhone });
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleUpdateStatus = async (studentUserId: string, newStatus: string) => {
    try {
      await studentService.updateStudent(studentUserId, { status: newStatus as any });
      setStudents(prev => prev.map(s => s.userId === studentUserId ? { ...s, status: newStatus } : s));
      showToast(uiText("Status updated to {{value0}} successfully!", { value0: uiText(newStatus) }), 'success');
    } catch (err: any) {
      showToast(uiText(getErrorMessage(err, 'Failed to update student status')), 'error');
    } finally {
      setActiveStatusDropdownStudentId(null);
    }
  };

  const getErrorMessage = (err: any, fallback: string) => {
    const payload = err?.response?.data;
    if (typeof payload?.error === 'string') return payload.error;
    if (payload?.error?.message) return payload.error.message;
    if (typeof payload?.message === 'string') return payload.message;
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  };

  const buildReturnTo = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (filterGrade) params.set('grade', filterGrade);
    if (filterSection) params.set('section', filterSection);
    if (filterStatus) params.set('status', filterStatus);
    if (filterGraduationYear) params.set('gradYear', filterGraduationYear);
    if (activeView !== 'students') params.set('view', activeView);
    const qs = params.toString();
    return `/students${qs ? `?${qs}` : ''}`;
  };

  const openStudentRecord = (student: { id: string }) => {
    navigate(`/students/${student.id}/record`, { state: { returnTo: buildReturnTo() } });
  };

  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (filterGrade) next.set('grade', filterGrade);
    if (filterSection) next.set('section', filterSection);
    if (filterStatus) next.set('status', filterStatus);
    if (filterGraduationYear) next.set('gradYear', filterGraduationYear);
    if (activeView !== 'students') next.set('view', activeView);
    setSearchParams(next, { replace: true });
  }, [search, filterGrade, filterSection, filterStatus, filterGraduationYear, activeView, setSearchParams]);

  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudentIds(newSelected);
  };

  const selectAllFiltered = () => {
    if (filtered.length === 0) return;

    const allSelected = filtered.every(s => selectedStudentIds.has(s.id));
    const newSelected = new Set(selectedStudentIds);

    if (allSelected) {
      filtered.forEach(s => newSelected.delete(s.id));
    } else {
      filtered.forEach(s => newSelected.add(s.id));
    }
    setSelectedStudentIds(newSelected);
  };

  const handleBulkUpdateStatus = async (statusToSet?: string) => {
    const targetStatus = statusToSet || bulkTargetStatus;
    if (selectedStudentIds.size === 0) {
      showToast(uiText("Please select at least one student"), 'error');
      return;
    }
    try {
      setBulkStatusUpdating(true);
      const selectedIds = students
        .filter(s => selectedStudentIds.has(s.id))
        .map(s => s.userId || s.id);

      const gradYearToPass = targetStatus === 'Graduated' ? (bulkGraduationYear || String(getCurrentECYear())) : undefined;

      await studentService.bulkUpdateStatus(selectedIds, targetStatus, gradYearToPass);
      showToast(
        uiText("Successfully updated status to {{value0}} for {{value1}} student(s)", {
          value0: uiText(targetStatus),
          value1: selectedStudentIds.size
        }),
        'success'
      );
      setShowBulkStatusModal(false);
      setSelectedStudentIds(new Set());
      fetchStudents();
    } catch (err: any) {
      showToast(uiText(getErrorMessage(err, 'Failed to update student status')), 'error');
    } finally {
      setBulkStatusUpdating(false);
    }
  };

  const handleBulkShiftGrade = async () => {
    if (selectedStudentIds.size === 0) {
      showToast(uiText("Please select at least one student"), 'error');
      return;
    }
    if (!bulkShiftTargetGrade) {
      showToast(uiText("Please select a target grade"), 'error');
      return;
    }
    try {
      setBulkShiftUpdating(true);
      const selectedIds = Array.from(selectedStudentIds);
      await studentService.bulkShiftGrade(selectedIds, bulkShiftTargetGrade, bulkShiftTargetSection || undefined);
      showToast(
        uiText("Successfully shifted {{value0}} student(s) to {{value1}}", {
          value0: selectedStudentIds.size,
          value1: `${bulkShiftTargetGrade}${bulkShiftTargetSection ? ` Section ${bulkShiftTargetSection}` : ''}`
        }),
        'success'
      );
      setShowBulkShiftGradeModal(false);
      setSelectedStudentIds(new Set());
      fetchStudents();
    } catch (err: any) {
      showToast(uiText(getErrorMessage(err, 'Failed to shift student grade')), 'error');
    } finally {
      setBulkShiftUpdating(false);
    }
  };

  const openBulkAssignModal = async () => {
    if (selectedStudentIds.size === 0) {
      showToast(uiText("Please select at least one student"), 'error');
      return;
    }

    const firstStudent = students.find(s => selectedStudentIds.has(s.id));
    const gradeToUse = filterGrade ? `Grade ${filterGrade}` : firstStudent?.grade;
    setBulkTargetGrade(gradeToUse || '');
    setSelectedBulkSectionIds(new Set());
    setAvailableSections([]);
    setShowBulkAssignModal(true);
  };

  const fetchBulkSections = async (grade: string) => {
    try {
      setLoadingBulkSections(true);
      const sections = await sectionService.getAvailableSections(grade);
      setAvailableSections(sections);
      setSelectedBulkSectionIds(new Set());
    } catch (err: any) {
      console.error('Failed to fetch sections:', err);
      showToast(uiText(getErrorMessage(err, 'Failed to fetch sections')), 'error');
    } finally {
      setLoadingBulkSections(false);
    }
  };

  const toggleBulkSectionSelection = (sectionId: string) => {
    const updated = new Set(selectedBulkSectionIds);
    if (updated.has(sectionId)) {
      updated.delete(sectionId);
    } else {
      updated.add(sectionId);
    }
    setSelectedBulkSectionIds(updated);
  };

  const handleBulkAssign = async () => {
    if (selectedBulkSectionIds.size === 0 || selectedStudentIds.size === 0) {
      showToast(uiText("Please select at least one section and one student"), 'error');
      return;
    }

    const targetGrade = bulkTargetGrade || (filterGrade ? `Grade ${filterGrade}` : '');
    const selectedStudentIdsForGrade = students
      .filter((student) =>
        selectedStudentIds.has(student.id) &&
        getGradeNumber(student.grade) === getGradeNumber(targetGrade) &&
        !student.section
      )
      .map((student) => student.id);

    if (selectedStudentIdsForGrade.length === 0) {
      showToast(uiText("No selected unassigned students match the target grade."), 'error');
      return;
    }

    const ignoredCount = selectedStudentIds.size - selectedStudentIdsForGrade.length;
    if (ignoredCount > 0) {
      showToast(uiText("{{value0}} student(s) from {{value1}} will be assigned. {{value2}} selected student(s) were skipped because they are in a different grade or already assigned to a section.", { value0: selectedStudentIdsForGrade.length, value1: targetGrade, value2: ignoredCount }), 'success');
    }

    const selectedSections = availableSections.filter(section => selectedBulkSectionIds.has(section.id));
    const totalAvailableSlots = selectedSections.reduce((sum, section) => sum + Math.max(0, section.available_slots), 0);

    if (totalAvailableSlots === 0) {
      showToast(uiText("No available slots in the selected sections"), 'error');
      return;
    }

    try {
      setBulkAssigning(true);
      const sectionsWithSlots = selectedSections.map(section => ({ ...section }));
      const assignments: Record<string, string[]> = {};
      const studentIds = [...selectedStudentIdsForGrade];

      for (const studentId of studentIds) {
        const availableSections = sectionsWithSlots.filter(section => section.available_slots > 0);
        if (availableSections.length === 0) {
          break;
        }

        const randomIndex = Math.floor(Math.random() * availableSections.length);
        const targetSection = availableSections[randomIndex];

        assignments[targetSection.id] = assignments[targetSection.id] || [];
        assignments[targetSection.id].push(studentId);
        targetSection.available_slots -= 1;
      }

      const assignedCount = Object.values(assignments).reduce((sum, ids) => sum + ids.length, 0);
      const unassignedCount = studentIds.length - assignedCount;

      const bulkResults = await Promise.all(
        Object.entries(assignments).map(async ([sectionId, ids]) => {
          return sectionService.bulkAssignStudents(
            sectionId,
            ids,
            'Bulk assignment from Students list'
          );
        })
      );

      const combinedResults = bulkResults.flatMap(result => result.results);
      const successful = combinedResults.filter(r => r.success).length;
      const failed = combinedResults.filter(r => !r.success).length + unassignedCount;

      showToast(
        uiText("{{value0}} student(s) assigned successfully{{value1}}", { value0: successful, value1: failed > 0 ? `, ${failed} failed` : '' }),
        failed === 0 ? 'success' : 'error'
      );

      setShowBulkAssignModal(false);
      setSelectedStudentIds(new Set());
      setSelectedBulkSectionIds(new Set());
      fetchStudents();
    } catch (err: any) {
      showToast(uiText(getErrorMessage(err, 'Failed to assign section')), 'error');
    } finally {
      setBulkAssigning(false);
    }
  };

  // Fetch sections when grade changes
  useEffect(() => {
    if (bulkTargetGrade && showBulkAssignModal) {
      fetchBulkSections(bulkTargetGrade);
    }
  }, [bulkTargetGrade, showBulkAssignModal]);

  const handleAutoDistribute = async () => {
    if (!filterGrade) {
      showToast(uiText("Select a grade filter first to auto-distribute unassigned students"), 'error');
      return;
    }

    setAutoDistributing(true);
    try {
      const result = await sectionService.autoDistributeStudents(filterGrade);
      if (result.successful === 0 && result.failed === 0) {
        showToast(
          uiText("No unassigned students found for Grade {{value0}}. Ensure students have no section and matching grade.", { value0: filterGrade }),
          'error'
        );
      } else {
        showToast(
          uiText("Auto-distributed {{value0}} student(s){{value1}} for Grade {{value2}}", { value0: result.successful, value1: result.failed > 0 ? `, ${result.failed} failed` : '', value2: filterGrade }),
          result.failed === 0 ? 'success' : 'error'
        );
        fetchStudents();
      }
    } catch (err: any) {
      showToast(uiText(getErrorMessage(err, 'Failed to auto-distribute students')), 'error');
    } finally {
      setAutoDistributing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [filterStatus]);
  useEffect(() => { fetchClasses(); }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the new /school-admin/students endpoint that includes class info
      const response = await studentService.getAllStudents({
        status: filterStatus || undefined
      });

      const data = response || [];
      const transformed = data.map((s: any) => ({
        id: s.student_id || s.id,
        userId: s.user_id || s.userId,
        digitalId: s.digital_id || s.digitalId,
        firstName: s.name?.split(' ')[0] || '',
        lastName: s.name?.split(' ').slice(1).join(' ') || '',
        email: s.email,
        grade: s.grade,
        classId: s.class_id || s.classId,
        className: s.class_name || s.className,
        section: s.class_section || s.section,
        status: s.status,
      }));

      setStudents(transformed);
    } catch (err: any) {
      setError(uiError(err.response?.data?.error?.message || 'Failed to fetch students'));
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAllClasses();
      const transformed = (response.data || []).map((cls: any) => ({
        id: cls.id,
        name: cls.name,
        section: cls.section,
        capacity: cls.capacity,
      }));
      setClasses(transformed);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };


  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      await updateUser(selectedStudent.userId, {
        name: editFormData.name,
        grade: editFormData.grade,
        parentPhone: editFormData.parentPhone
      });
      showToast(uiText("Student updated successfully!"), 'success');
      setShowEditModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err: any) {
      showToast(uiText(err.response?.data?.error?.message || 'Failed to update student'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStudent) return;
    setResettingPassword(true);
    try {
      const result = await resetUserPIN(selectedStudent.userId);
      const newPIN = result?.newPIN;
      if (newPIN) {
        setGeneratedPassword(newPIN);
        showToast(uiText("New password generated: {{value0}}", { value0: newPIN }), 'success');
      } else {
        showToast(uiText("Password reset succeeded"), 'success');
      }
    } catch (err: any) {
      showToast(uiText(err.response?.data?.error?.message || 'Failed to reset password'), 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.student) return;
    try {
      // Use userId for deletion to hit the users delete endpoint
      await studentService.deleteStudent(confirmDelete.student.userId || confirmDelete.student.id);
      showToast(uiText("Student deleted successfully!"), 'success');
      setConfirmDelete({ show: false, student: null });
      fetchStudents();
    } catch (err: any) {
      showToast(uiText(err.response?.data?.error?.message || 'Failed to delete student'), 'error');
    }
  };

  const handleAssignClass = async (classId: string) => {
    if (!selectedStudent) return;
    try {
      await assignStudentToClass(selectedStudent.userId, classId);
      showToast(uiText("Class assigned successfully!"), 'success');
      setShowAssignModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err: any) {
      showToast(uiText(err.response?.data?.error?.message || 'Failed to assign class'), 'error');
    }
  };

  const openEditModal = (student: any) => {
    setSelectedStudent(student);
    setEditFormData({
      name: `${student.firstName} ${student.lastName}`.trim(),
      grade: formatGradeDisplay(student.grade),
      parentPhone: student.parentPhone || '+251'
    });
    setGeneratedPassword(null);
    setShowEditModal(true);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      showToast(uiText("No students to export for the current filters"), 'error');
      return;
    }

    const rows = filtered.map((s) => ({
      Student: `${s.firstName} ${s.lastName}`.trim(),
      'Digital ID': s.digitalId || '',
      Section: formatSectionDisplay(s.section),
      Grade: formatGradeDisplay(s.grade),
      Status: s.status || '',
    }));

    exportToExcel([{ name: 'Students', rows }], 'students');
  };

  const availableGraduationYears = Array.from(
    new Set(students.map(s => s.graduationYear || s.graduation_year).filter(Boolean))
  ).sort().reverse() as string[];

  const filtered = students.filter(s => {
    const matchSearch = !search || `${s.firstName} ${s.lastName} ${s.email} ${s.digitalId}`.toLowerCase().includes(search.toLowerCase());
    const studentGradeNumber = getGradeNumber(s.grade);
    const studentSectionNumber = getSectionNumber(s.section);
    const matchGrade = !filterGrade || studentGradeNumber === filterGrade;
    const matchSection = !filterSection || studentSectionNumber === filterSection;

    let matchStatus = true;
    if (filterStatus === 'ALL') {
      matchStatus = true;
    } else if (filterStatus) {
      matchStatus = (s.status || '').toLowerCase() === filterStatus.toLowerCase();
    } else {
      // Default view when status filter is not set: hide Graduated students so active & graduated don't mix on the same page
      matchStatus = (s.status || '').toLowerCase() !== 'graduated';
    }

    const studentGradYear = s.graduationYear || s.graduation_year;
    const matchGradYear = !filterGraduationYear || studentGradYear === filterGraduationYear;

    return matchSearch && matchGrade && matchSection && matchStatus && matchGradYear;
  });

  return (
    <div className="space-y-6 pb-12">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        {t('students.back')}
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t("students.title","Students")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t("students.subtitle","Manage student records and class assignments")}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isSchoolAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveView('students')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeView === 'students'
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {t('students.title')}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('registration')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeView === 'registration'
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {t('students.pendingApplications')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!registrationOpen) {
                    showToast(uiText("Registration is currently closed"), 'error');
                    return;
                  }
                  setActiveView('add');
                }}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none ${activeView === 'add' ? 'ring-2 ring-blue-300 dark:ring-blue-700' : ''} ${!registrationOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <UserPlus size={18} />
                {t('students.addStudent')}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download size={18} />
            {t('students.export')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("students.searchPlaceholder","Search students...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          aria-label={uiText("Filter by grade")}
          value={filterGrade}
          onChange={(e) => {
            const val = e.target.value;
            setFilterGrade(val);
            if (!val) setFilterSection('');
          }}
          className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("students.allGrades", "All Grades")}</option>
          {['KG 1', 'KG 2', 'KG 3', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
            <option key={g} value={String(g)}>{uiText(g.startsWith('KG') ? g : `Grade ${g}`)}</option>
          ))}
        </select>
        <select
          aria-label={uiText("Filter by section")}
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("students.allSections","All Sections")}</option>
          {[1, 2, 3, 4, 5, 6].map((section) => (
            <option key={section} value={String(section)}>{uiText("Section ")}{section}</option>
          ))}
        </select>
        <select
          aria-label={uiText("Filter by status")}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="">{t("students.statusActiveDefault","Active (Default)")}</option>
          <option value="Active">{uiText("Active")}</option>
          <option value="Graduated">🎓 {uiText("Graduated")}</option>
          <option value="Inactive">{uiText("Inactive")}</option>
          <option value="Suspended">{uiText("Suspended")}</option>
          <option value="ALL">{uiText("All Statuses (Incl. Graduated)")}</option>
        </select>
        {(filterStatus === 'Graduated' || filterStatus === 'ALL' || availableGraduationYears.length > 0) && (
          <select
            aria-label={uiText("Filter by graduation year")}
            value={filterGraduationYear}
            onChange={(e) => setFilterGraduationYear(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
          >
            <option value="">🎓 {uiText("All Graduation Years (ዓ.ም)")}</option>
            {Array.from(new Set([...availableGraduationYears, String(getCurrentECYear())])).sort().reverse().map(yr => (
              <option key={yr} value={yr}>{uiText("Class of ")}{yr} {uiText("ዓ.ም")}</option>
            ))}
          </select>
        )}
        {uiText(isSchoolAdmin && activeView === 'students' && filterGrade && (
          <button
            type="button"
            onClick={handleAutoDistribute}
            disabled={autoDistributing || loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
            title={uiText("Auto-distribute all unassigned Grade {{value0}} students across available sections", { value0: filterGrade })}
          >
            {autoDistributing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}{uiText("Auto-Distribute Unassigned")}</button>
        ))}
      </div>

      {isSchoolAdmin && activeView === 'registration' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("students.pendingApplications","Pending Applications")}</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">{t("students.manageAdmissions","Manage new student admission requests")}</p>
            </div>

          </div>
          <StudentRegistration isAdminView={true} />
        </div>
      ) : isSchoolAdmin && activeView === 'add' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 md:p-8">
          <StudentRegistration
            isAdminView={false}
            onCreated={() => setActiveView('students')}
          />
        </div>
      ) : (
        <>
          {uiText(error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{uiError(error)}</p>
            </div>
          ))}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              {/* Bulk Actions Bar */}
              {selectedStudentIds.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Check size={20} className="text-blue-600" />
                    <span className="font-bold text-sm text-blue-700 dark:text-blue-300">
                      {selectedStudentIds.size}{uiText(" student")}{uiText(selectedStudentIds.size !== 1 ? 's' : '')}{uiText(" selected")}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => setShowBulkStatusModal(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-bold shadow-sm"
                    >
                      <GraduationCap size={16} />{uiText("Shift Status / Graduate")}
                    </button>
                    <button
                      onClick={() => setShowBulkShiftGradeModal(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm"
                    >
                      <RefreshCw size={16} />{uiText("Promote / Shift Grade")}
                    </button>
                    <button
                      onClick={openBulkAssignModal}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
                    >
                      <Users size={16} />{uiText("Assign Section")}
                    </button>
                    <button
                      onClick={() => setSelectedStudentIds(new Set())}
                      className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 transition-colors text-sm font-bold"
                    >{uiText("Clear")}</button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto min-h-[280px]">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {isSchoolAdmin && (
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                        <input
                          type="checkbox"
                          checked={
                            filtered.length > 0 &&
                            filtered.every(s => selectedStudentIds.has(s.id))
                          }
                          onChange={selectAllFiltered}
                          className="rounded cursor-pointer"
                          title={uiText("Select all visible students")}
                          aria-label={uiText("Select all students")}
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("students.colStudent","Student")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("students.colDigitalId", "Digital ID")}</th>
                    {canViewStudentRecord && (
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("students.colRecord","Student Record")}</th>
                    )}
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("students.colSection","Section")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("students.colGrade","Grade")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("students.colStatus", "Status")}</th>
                    {isSchoolAdmin && (
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t("students.colActions", "Actions")}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={(isSchoolAdmin ? 1 : 0) + 5 + (canViewStudentRecord ? 1 : 0) + (isSchoolAdmin ? 1 : 0)} className="px-6 py-12 text-center text-slate-500">{uiText("No students found. Add your first student!")}</td>
                    </tr>
                  ) : (
                    filtered.map((student) => (
                      <tr key={student.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${selectedStudentIds.has(student.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        {isSchoolAdmin && (
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.has(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="rounded cursor-pointer"
                              title={uiText("Select {{value0}}", { value0: student.firstName })}
                              aria-label={uiText("Select {{value0}}", { value0: student.firstName })}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{uiText(student.firstName)} {uiText(student.lastName)}</td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">{uiText(student.digitalId)}</td>
                        {canViewStudentRecord && (
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => openStudentRecord(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-bold transition-colors"
                              title={uiText("View student record")}
                              aria-label={uiText("View record for {{value0}} {{value1}}", { value0: student.firstName, value1: student.lastName })}
                            >
                              <FileText size={14} />{uiText("View")}</button>
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{uiText(formatSectionDisplay(student.section))}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{uiText(formatGradeDisplay(student.grade))}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${
                            student.status === 'Graduated' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                            student.status === 'Active' || student.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                            student.status === 'Inactive' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }`}>
                            {student.status === 'Graduated' && '🎓 '}
                            {uiText(student.status === 'Approved' ? 'ACTIVE' : student.status)}
                            {student.status === 'Graduated' && (student.graduationYear || student.graduation_year) ? ` (${student.graduationYear || student.graduation_year} ዓ.ም)` : ''}
                          </span>
                        </td>
                        {isSchoolAdmin && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => { setSelectedStudent(student); setShowAssignModal(true); }}
                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors"
                                title={uiText("Assign Class")}
                                aria-label={uiText("Assign class")}
                              >
                                <Users size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  setSelectedStudent(student);
                                  setSelectedSectionForStudent('');
                                  setShowAssignSectionModal(true);
                                  try {
                                    const gradeParam = getGradeNumber(student.grade) || student.grade;
                                    const sections = await sectionService.getAvailableSections(gradeParam);
                                    setAvailableSectionsForSingle(sections);
                                    if (sections.length > 0) setSelectedSectionForStudent(sections[0].id);
                                  } catch (err) {
                                    setAvailableSectionsForSingle([]);
                                    showToast(uiText(getErrorMessage(err, 'Failed to fetch sections')), 'error');
                                  }
                                }}
                                className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 rounded-lg transition-colors"
                                title={uiText("Assign Section")}
                                aria-label={uiText("Assign section")}
                              >
                                <GraduationCap size={16} />
                              </button>
                              <div className="relative inline-block">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStatusDropdownStudentId(
                                      activeStatusDropdownStudentId === student.id ? null : student.id
                                    );
                                  }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    activeStatusDropdownStudentId === student.id
                                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                      : 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  }`}
                                  title={uiText("Change Status")}
                                  aria-label={uiText("Change status")}
                                >
                                  <UserCog size={16} />
                                </button>

                                {activeStatusDropdownStudentId === student.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30 bg-transparent cursor-default"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveStatusDropdownStudentId(null);
                                      }}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 z-40 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                                      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/50 mb-1">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{uiText("Change Status")}</p>
                                      </div>
                                      {[
                                        { name: 'Active', color: 'bg-green-500', text: 'text-green-700 dark:text-green-400', bg: 'hover:bg-green-50 dark:hover:bg-green-950/20' },
                                        { name: 'Inactive', color: 'bg-slate-400', text: 'text-slate-700 dark:text-slate-400', bg: 'hover:bg-slate-50 dark:hover:bg-slate-800/50' },
                                        { name: 'Suspended', color: 'bg-red-500', text: 'text-red-700 dark:text-red-400', bg: 'hover:bg-red-50 dark:hover:bg-red-950/20' },
                                        { name: 'Graduated', color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' }
                                      ].map((opt) => (
                                        <button
                                          key={opt.name}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateStatus(student.userId, opt.name);
                                          }}
                                          className={`w-full px-3 py-2 flex items-center justify-between text-left text-sm font-semibold transition-colors ${opt.bg} ${opt.text}`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <span className={`h-2.5 w-2.5 rounded-full ${opt.color}`} />
                                            <span>{opt.name}</span>
                                          </div>
                                          {student.status === opt.name && (
                                            <Check size={14} className="text-slate-600 dark:text-slate-400" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => openEditModal(student)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 rounded-lg transition-colors"
                                title={uiText("Edit student")}
                                aria-label={uiText("Edit student")}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete({ show: true, student })}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
                                title={uiText("Delete student")}
                                aria-label={uiText("Delete student")}
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
          )}
        </>
      )}

      {/* Assign Section Modal (single student) */}
      {uiText(showAssignSectionModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><GraduationCap size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{uiText("Assign Section")}</h3>
                  <p className="text-xs text-slate-500">{uiText(selectedStudent.firstName)} {uiText(selectedStudent.lastName)}{uiText(" — Grade ")}{uiText(selectedStudent.grade)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignSectionModal(false)}
                className="text-slate-400 hover:text-slate-600"
                title={uiText("Close assign section modal")}
                aria-label={uiText("Close assign section modal")}
              ><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-72 overflow-y-auto">
              {availableSectionsForSingle.length === 0 ? (
                <div className="text-center text-slate-500 py-6">{uiText("No sections available for this grade.")}</div>
              ) : (
                <>
                  <div>
                    <label htmlFor="single-section" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{uiText("Select Section")}</label>
                    <select
                      id="single-section"
                      value={selectedSectionForStudent}
                      onChange={(e) => setSelectedSectionForStudent(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium focus:ring-2 focus:ring-blue-500/50 outline-none"
                    >
                      {availableSectionsForSingle.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}{uiText(" (")}{sec.current_count}{uiText("/")}{sec.capacity}{uiText(")")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedSectionForStudent) return showToast(uiText("Please select a section"), 'error');
                        setAssigningSection(true);
                        try {
                          const res = await sectionService.assignStudentToSection(
                            selectedStudent.id,
                            selectedSectionForStudent,
                            'Manual assignment from UI'
                          );
                          if (res.success) {
                            showToast(uiText("Student assigned to section"), 'success');
                            setShowAssignSectionModal(false);
                            fetchStudents();
                          } else {
                            showToast(uiText(res.message || 'Assignment failed'), 'error');
                          }
                        } catch (err: any) {
                          showToast(uiText(getErrorMessage(err, 'Failed to assign section')), 'error');
                        } finally {
                          setAssigningSection(false);
                        }
                      }}
                      disabled={assigningSection}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold"
                    >
                      {uiText(assigningSection ? 'Assigning...' : 'Assign Section')}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setAutoAssigning(true);
                        try {
                          const res = await sectionService.autoAssignStudent(selectedStudent.id);
                          if (res.success) {
                            showToast(uiText('Student auto-assigned to ' + res.toSection), 'success');
                            setShowAssignSectionModal(false);
                            fetchStudents();
                          } else {
                            showToast(uiText(res.message || 'Auto-assign failed'), 'error');
                          }
                        } catch (err: any) {
                          showToast(uiText(getErrorMessage(err, 'Auto-assign failed')), 'error');
                        } finally {
                          setAutoAssigning(false);
                        }
                      }}
                      disabled={autoAssigning}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
                    >
                      {uiText(autoAssigning ? 'Auto-assigning...' : 'Auto-assign')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add Modal */}
      {/* Edit Modal */}
      {uiText(showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Edit2 size={20} /></div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{uiText("Edit Student")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
                title={uiText("Close edit student modal")}
                aria-label={uiText("Close edit student modal")}
              ><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-full-name" className="text-xs font-bold text-slate-500 uppercase">{uiText("Full Name")}</label>
                <input
                  id="edit-full-name"
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{uiText("Password Reset")}</label>
                    <p className="text-sm text-slate-500">{uiText("Generate a new 4-digit password for this student.")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    {uiText(resettingPassword ? 'Generating...' : 'Reset Password')}
                  </button>
                </div>
                {uiText(generatedPassword && (
                  <p className="text-sm text-slate-700 dark:text-slate-300">{uiText("New password: ")}<span className="font-mono text-base text-slate-900 dark:text-white">{uiText(generatedPassword)}</span>
                  </p>
                ))}
              </div>
              <div>
                <label htmlFor="edit-grade" className="text-xs font-bold text-slate-500 uppercase">{uiText("Grade")}</label>
                <select
                  id="edit-grade"
                  value={editFormData.grade || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{uiText("Select Grade")}</option>
                  {['KG 1', 'KG 2', 'KG 3', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                    <option key={g} value={g.startsWith('KG') ? g : `Grade ${g}`}>{uiText(g.startsWith('KG') ? g : `Grade ${g}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-parent-phone" className="text-xs font-bold text-slate-500 uppercase">{uiText("Parent Phone Number")}</label>
                <div className="flex gap-2 mt-1">
                  <div className="flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-600 dark:text-slate-400 min-w-fit">{uiText("+251")}</div>
                  <input
                    id="edit-parent-phone"
                    type="text"
                    placeholder={uiText("912345678")}
                    maxLength={9}
                    value={(editFormData.parentPhone || '+251').replace('+251', '')}
                    onChange={(e) => handlePhoneInput(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                  disabled={submitting}>{uiText("Cancel")}</button>
                <button type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  <span>{uiText(submitting ? 'Saving...' : 'Save Changes')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ))}

      {/* Assign Class Modal */}
      {uiText(showAssignModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Users size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{uiText("Assign Class")}</h3>
                  <p className="text-xs text-slate-500">{uiText(selectedStudent.firstName)} {uiText(selectedStudent.lastName)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600"
                title={uiText("Close assign class modal")}
                aria-label={uiText("Close assign class modal")}
              ><X size={20} /></button>
            </div>
            <div className="p-6 space-y-2 max-h-72 overflow-y-auto">
              {classes.length === 0 ? (
                <p className="text-center text-slate-500 py-4">{uiText("No classes available. Create classes first.")}</p>
              ) : (
                classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleAssignClass(cls.id)}
                    className="w-full p-4 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all"
                  >
                    <p className="font-bold text-slate-800 dark:text-white">{cls.name}{uiText(" — Section ")}{uiText(getSectionNumber(cls.section))}</p>
                    <p className="text-xs text-slate-500 mt-1">{uiText("Capacity: ")}{uiText(cls.capacity)}{uiText(" students")}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ))}


      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{uiText("Confirm Deletion")}</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400">{uiText("Are you sure you want to delete ")}<strong>{uiText(confirmDelete.student?.firstName)} {uiText(confirmDelete.student?.lastName)}</strong>{uiText("? This action cannot be undone.")}</p>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete({ show: false, student: null })}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50"
              >{uiText("Cancel")}</button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700"
              >{uiText("Delete Student")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Section Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <GraduationCap size={24} />{uiText("Bulk Assign Section")}</h3>
                  <p className="text-blue-100 text-xs font-medium mt-1">{selectedStudentIds.size}{uiText(" students selected")}</p>
                </div>
                <button
                  onClick={() => setShowBulkAssignModal(false)}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                  title={uiText("Close")}
                  aria-label={uiText("Close modal")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {loadingBulkSections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="bulk-grade" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{uiText("Target Grade")}</label>
                    <select
                      id="bulk-grade"
                      value={bulkTargetGrade}
                      onChange={(e) => {
                        setBulkTargetGrade(e.target.value);
                        setSelectedBulkSectionIds(new Set());
                      }}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium focus:ring-2 focus:ring-blue-500/50 outline-none"
                    >
                      <option value="">{uiText("-- Select grade --")}</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                        <option key={g} value={`Grade ${g}`}>{uiText("Grade ")}{g}</option>
                      ))}
                    </select>
                  </div>

                  {uiText(bulkTargetGrade && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{uiText("Select Sections")}</label>
                      {availableSections.length === 0 ? (
                        <p className="text-sm text-slate-500">{uiText("No sections available for this grade.")}</p>
                      ) : (
                        <div className="grid gap-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                          {availableSections.map((section) => {
                            const selected = selectedBulkSectionIds.has(section.id);
                            const sectionDisabled = section.available_slots <= 0;
                            return (
                              <label
                                key={section.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700'} ${sectionDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} transition-all`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={sectionDisabled}
                                  onChange={() => toggleBulkSectionSelection(section.id)}
                                  className="mt-1 h-4 w-4 accent-blue-600"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{section.name}</p>
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      {section.available_slots}{uiText(" slot")}{uiText(section.available_slots !== 1 ? 's' : '')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {section.current_count}{uiText("/")}{section.capacity}{uiText(" students assigned")}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {selectedBulkSectionIds.size > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{uiText("Selected sections: ")}{selectedBulkSectionIds.size}{uiText(" · Total available slots: ")}{availableSections.filter(section => selectedBulkSectionIds.has(section.id)).reduce((sum, section) => sum + Math.max(0, section.available_slots), 0)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-6 flex gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-bold text-sm"
                disabled={bulkAssigning}
              >{uiText("Cancel")}</button>
              <button
                onClick={handleBulkAssign}
                disabled={selectedBulkSectionIds.size === 0 || bulkAssigning}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-bold text-sm"
              >
                {bulkAssigning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />{uiText("Assigning...")}</>
                ) : (
                  <>
                    <Check size={16} />{uiText("Assign Students")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status / Graduate Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-emerald-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <GraduationCap size={24} />
                    {uiText("Shift Status / Graduate")}
                  </h3>
                  <p className="text-emerald-100 text-xs font-medium mt-1">
                    {selectedStudentIds.size}{uiText(" student(s) selected")}
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkStatusModal(false)}
                  className="p-2 hover:bg-emerald-700 rounded-lg transition-colors"
                  title={uiText("Close")}
                  aria-label={uiText("Close modal")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="bulk-status-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  {uiText("Target Status")}
                </label>
                <select
                  id="bulk-status-select"
                  value={bulkTargetStatus}
                  onChange={(e) => setBulkTargetStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Graduated">🎓 {uiText("Graduated")}</option>
                  <option value="Active">✅ {uiText("Active")}</option>
                  <option value="Inactive">⏸️ {uiText("Inactive")}</option>
                  <option value="Suspended">⛔ {uiText("Suspended")}</option>
                </select>
              </div>

              {bulkTargetStatus === 'Graduated' && (
                <div>
                  <label htmlFor="bulk-grad-year" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    {uiText("Graduation Year (Ethiopian Calendar - ዓ.ም)")}
                  </label>
                  <input
                    id="bulk-grad-year"
                    type="text"
                    value={bulkGraduationYear}
                    onChange={(e) => setBulkGraduationYear(e.target.value)}
                    placeholder={`e.g. ${getCurrentECYear()} ዓ.ም`}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  {uiText("This will update the status of all {{value0}} selected student(s) to ", { value0: selectedStudentIds.size })}
                  <strong className="font-bold">{uiText(bulkTargetStatus)}</strong>.
                  {bulkTargetStatus === 'Graduated' && uiText(" Graduated students will retain their records but won't be counted in active class lists.")}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-6 flex gap-3">
              <button
                onClick={() => setShowBulkStatusModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-bold text-sm"
                disabled={bulkStatusUpdating}
              >
                {uiText("Cancel")}
              </button>
              <button
                onClick={() => handleBulkUpdateStatus()}
                disabled={bulkStatusUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-bold text-sm shadow-md"
              >
                {bulkStatusUpdating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {uiText("Updating...")}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {uiText("Update Status")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Shift Grade & Section Modal */}
      {showBulkShiftGradeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <RefreshCw size={24} />
                    {uiText("Promote / Shift Grade")}
                  </h3>
                  <p className="text-indigo-100 text-xs font-medium mt-1">
                    {selectedStudentIds.size}{uiText(" student(s) selected")}
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkShiftGradeModal(false)}
                  className="p-2 hover:bg-indigo-700 rounded-lg transition-colors"
                  title={uiText("Close")}
                  aria-label={uiText("Close modal")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="shift-target-grade" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  {uiText("Target Grade")}
                </label>
                <select
                  id="shift-target-grade"
                  value={bulkShiftTargetGrade}
                  onChange={(e) => setBulkShiftTargetGrade(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">{uiText("-- Select Grade --")}</option>
                  {['KG 1', 'KG 2', 'KG 3', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                    <option key={g} value={g}>{uiText(g)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="shift-target-section" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  {uiText("Target Section (Optional)")}
                </label>
                <select
                  id="shift-target-section"
                  value={bulkShiftTargetSection}
                  onChange={(e) => setBulkShiftTargetSection(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">{uiText("-- Keep Unassigned / Default --")}</option>
                  {[1, 2, 3, 4, 5, 6].map(sec => (
                    <option key={sec} value={String(sec)}>{uiText("Section ")}{sec}</option>
                  ))}
                </select>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  {uiText("Shift grade level for all {{value0}} selected student(s).", { value0: selectedStudentIds.size })}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-6 flex gap-3">
              <button
                onClick={() => setShowBulkShiftGradeModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-bold text-sm"
                disabled={bulkShiftUpdating}
              >
                {uiText("Cancel")}
              </button>
              <button
                onClick={handleBulkShiftGrade}
                disabled={!bulkShiftTargetGrade || bulkShiftUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-bold text-sm shadow-md"
              >
                {bulkShiftUpdating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {uiText("Shifting...")}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {uiText("Shift Grade")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Toast */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="text-green-600" size={20} />
              : <XCircle className="text-red-600" size={20} />
            }
            <p className={`text-sm font-bold ${toast.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
              {uiText(toast.message)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
