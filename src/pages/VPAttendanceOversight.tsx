import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Users, MessageSquare, Send, Loader, CheckCircle, AlertCircle, Phone, Trash2, Calendar } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../services/api';
import { getTodayEthiopianDate, formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';

interface AbsentStudent {
  id: string;
  name: string;
  grade: string;
  section: string;
  parentName: string;
  parentPhone: string;
  studentId: string;
  roomTeacher: string;
  status: string;
  totalAbsences?: number;
}

interface SMSMessage {
  selectedStudents: string[];
  message: string;
  sentAt?: string;
  status?: 'idle' | 'sending' | 'sent' | 'error';
}

export const VPAttendanceOversight = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  // Default to today's Ethiopian date for Student Attendance
  const [selectedDate, setSelectedDate] = useState<string>(getTodayEthiopianDate());
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [notifiedStudents, setNotifiedStudents] = useState<Set<string>>(new Set());
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState(
    'Your child is absent from school today. Please contact the school if you have any questions.'
  );
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [smsError, setSmsError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'teachers'>('students');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Live Teacher Attendance & Calendar states
  const [selectedTeacherDate, setSelectedTeacherDate] = useState<string>(getTodayEthiopianDate());
  const [proxies, setProxies] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [nonWorkingReason, setNonWorkingReason] = useState('');
  const [nonWorkingTitle, setNonWorkingTitle] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');

  // Proxy Modal states
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [selectedTeacherForProxy, setSelectedTeacherForProxy] = useState<any>(null);
  const [selectedScheduleForProxy, setSelectedScheduleForProxy] = useState<any>(null);
  const [proxyTeacherId, setProxyTeacherId] = useState('');
  const [proxyCandidates, setProxyCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Re-fetch students when date changes
  useEffect(() => {
    fetchAbsentStudents();
  }, [selectedDate]);

  // Re-fetch teachers when switching to teacher sub-tab or teacher date changes
  useEffect(() => {
    if (activeSubTab === 'teachers') {
      fetchTeachers();
    }
  }, [activeSubTab, selectedTeacherDate]);

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const response = await api.get('/vice-principal/teachers/attendance-oversight', {
        params: { date: selectedTeacherDate }
      });
      const data = response.data?.data || {};
      setIsWorkingDay(data.isWorkingDay !== false);
      setNonWorkingReason(data.reason || '');
      setNonWorkingTitle(data.title || '');
      setDayOfWeek(data.dayOfWeek || '');

      if (data.isWorkingDay !== false) {
        setTeachers(data.teachers || []);
        setProxies(data.proxies || []);
        setSchedules(data.schedules || []);
      } else {
        setTeachers([]);
        setProxies([]);
        setSchedules([]);
      }
    } catch (err) {
      console.error('Error fetching teachers oversight:', err);
      showToast('Failed to load teacher attendance oversight.', 'error');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleUpdateTeacherStatus = async (teacherUserId: string, status: string) => {
    try {
      await api.post('/vice-principal/teachers/attendance', {
        userId: teacherUserId,
        date: selectedTeacherDate,
        status
      });
      showToast(`Attendance status updated to ${status}.`, 'success');
      fetchTeachers();
    } catch (err: any) {
      console.error('Error recording teacher attendance:', err);
      showToast(err.response?.data?.error?.message || 'Failed to update attendance status.', 'error');
    }
  };

  const handleOpenProxyModal = async (teacher: any, schedule: any) => {
    setSelectedTeacherForProxy(teacher);
    setSelectedScheduleForProxy(schedule);
    setProxyTeacherId('');
    setProxyCandidates([]);
    setShowProxyModal(true);
    setLoadingCandidates(true);
    try {
      const response = await api.get('/vice-principal/teachers/proxy-candidates', {
        params: {
          date: selectedTeacherDate,
          className: schedule.class_name,
          section: schedule.section,
          periodNumber: schedule.period_number,
          absentTeacherId: teacher.teacher_id
        }
      });
      setProxyCandidates(response.data?.data || []);
    } catch (err: any) {
      console.error('Error fetching proxy candidates:', err);
      showToast('Failed to load available proxy candidates.', 'error');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleAssignProxy = async () => {
    if (!proxyTeacherId) {
      showToast('Please select a proxy teacher', 'error');
      return;
    }
    if (!selectedTeacherForProxy || !selectedScheduleForProxy) return;

    try {
      await api.post('/vice-principal/teachers/proxy-assignments', {
        absentTeacherId: selectedTeacherForProxy.teacher_id,
        proxyTeacherId,
        date: selectedTeacherDate,
        periodNumber: selectedScheduleForProxy.period_number,
        className: selectedScheduleForProxy.class_name,
        section: selectedScheduleForProxy.section,
        subject: selectedScheduleForProxy.subject
      });

      showToast('Proxy teacher assigned successfully!', 'success');
      setShowProxyModal(false);
      fetchTeachers();
    } catch (err: any) {
      console.error('Error assigning proxy:', err);
      showToast(err.response?.data?.error?.message || 'Failed to assign proxy teacher.', 'error');
    }
  };

  const handleRemoveProxy = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to remove this proxy assignment?')) return;
    try {
      await api.delete(`/vice-principal/teachers/proxy-assignments/${assignmentId}`);
      showToast('Proxy assignment removed successfully.', 'success');
      fetchTeachers();
    } catch (err: any) {
      console.error('Error removing proxy:', err);
      showToast(err.response?.data?.error?.message || 'Failed to remove proxy assignment.', 'error');
    }
  };

  const filteredTeachers = teachers.filter(t => 
    (t.name || '').toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.department || '').toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const fetchAbsentStudents = async () => {
    setLoading(true);
    setError(null);
    setSelectedStudents(new Set());
    setSelectAll(false);
    setNotifiedStudents(new Set());
    try {
      // Send Ethiopian date directly (YYYY-MM-DD E.C.) to backend
      const response = await api.get('/vice-principal/attendance/absences-today', {
        params: { date: selectedDate },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });
      const data = response.data;
      setAbsentStudents(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load absent students data');
      console.error('Error fetching absent students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedStudents(new Set(absentStudents.map(s => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
    setSelectAll(newSelected.size === absentStudents.length && absentStudents.length > 0);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleSendSMS = async () => {
    if (selectedStudents.size === 0) {
      showToast('Please select at least one student', 'error');
      return;
    }

    if (!smsMessage.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    setSmsSending(true);
    setSmsStatus('sending');
    setSmsError(null);

    try {
      // Get phone numbers for selected students
      const selectedData = absentStudents.filter(s => selectedStudents.has(s.id));
      const phoneNumbers = selectedData.map(s => s.parentPhone);

      await api.post('/vice-principal/attendance/send-absence-notification', {
        phoneNumbers,
        message: smsMessage,
        studentIds: Array.from(selectedStudents)
      });

      setSmsStatus('sent');
      showToast(`SMS sent to ${selectedStudents.size} parent(s) successfully!`, 'success');

      // Record successfully notified students
      setNotifiedStudents(prev => {
        const next = new Set(prev);
        selectedStudents.forEach(id => next.add(id));
        return next;
      });

      // Reset modal after 2 seconds
      setTimeout(() => {
        setShowSMSModal(false);
        setSmsMessage('Your child is absent from school today. Please contact the school if you have any questions.');
        setSmsStatus('idle');
        setSelectedStudents(new Set());
        setSelectAll(false);
      }, 2000);
    } catch (err: any) {
      setSmsStatus('error');
      setSmsError(err.message || 'Failed to send SMS notification');
      showToast('Failed to send SMS notification', 'error');
    } finally {
      setSmsSending(false);
    }
  };

  const formatEthiopianDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthVal = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    const months = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];
    
    const monthName = months[monthVal - 1] || '';
    return `${day} ${monthName} ${year} E.C.`;
  };

  return (
    <div className="space-y-6 p-6 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 min-h-screen max-w-[95vw] xl:max-w-[1400px] mx-auto">
      {/* Header */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.2),_transparent_50%)]" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-2">{t("vp.dailyAttendanceMonitoring", "Daily Attendance Monitoring")}</p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
              {t("vp.absenceOversightTitle", "Absence Oversight & Parent Notifications")}
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl font-medium leading-relaxed">
              {t("vp.absenceOversightDesc", "Monitor student absences and send instant SMS notifications to parents.")}
            </p>
          </div>
        </div>
      </section>

      {/* Sub Tabs Container */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 mb-6">
        <button
          onClick={() => setActiveSubTab('students')}
          className={`pb-3 text-sm font-bold tracking-wider uppercase border-b-2 px-1 transition-all ${
            activeSubTab === 'students'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t('vp.studentAttendanceTab', 'Student Attendance')}
        </button>
        <button
          onClick={() => setActiveSubTab('teachers')}
          className={`pb-3 text-sm font-bold tracking-wider uppercase border-b-2 px-1 transition-all ${
            activeSubTab === 'teachers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t('vp.teacherAttendanceTab', 'Teacher Attendance')}
        </button>
      </div>

      {activeSubTab === 'students' && (
        <div className="space-y-6">
          {/* Calendar Selector Bar for Student Attendance */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t("vp.studentAttendanceOversightTitle", "Student Attendance Oversight")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("vp.studentAttendanceOversightDesc", "Daily absent/excused records and limit-exceeded alerts strictly after home teacher submission.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="text-slate-400" size={16} />
                <label htmlFor="studentDatePicker" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.datePicker", "Date Picker:")}</label>
              </div>
              <div className="w-52">
                <EthiopianDatePicker
                  id="studentDatePicker"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                  title="Choose date to review student attendance"
                />
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                {formatEthiopianLabel(selectedDate)}
              </span>
            </div>
          </div>

          {/* Status Summary Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                    <AlertCircle className="text-rose-600 dark:text-rose-400" size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.absentToday", "Absent Today")}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {absentStudents.filter(s => s.status === 'absent').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <CheckCircle className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.excusedToday", "Excused Today")}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {absentStudents.filter(s => s.status === 'excused').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <AlertCircle className="text-amber-600 dark:text-amber-400" size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.exceededLimit", "Limit Exceeded")}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {absentStudents.filter(s => s.status === 'exceeded' || (s.totalAbsences && s.totalAbsences >= 3)).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 flex items-start gap-4">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-bold text-red-900 dark:text-red-300">Error Loading Data</h3>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">{error}</p>
                <button
                  onClick={fetchAbsentStudents}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">{t("vp.loadingAbsences", "Loading absences for selected date...")}</p>
            </div>
          ) : absentStudents.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm">
              <CheckCircle className="mx-auto mb-4 text-emerald-500" size={48} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("vp.noAbsencesRecorded", "No Attendance Issues / Perfect Attendance")}</h3>
              <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {t("vp.perfectAttendanceDesc", "No absent or limit-exceeded students found for this date. Records appear only after homeroom teachers submit attendance.")}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label={selectAll ? 'Deselect all students' : 'Select all students'}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {selectAll ? t('vp.deselectAll', 'Deselect All') : t('vp.selectAll', 'Select All')}
                    </span>
                  </label>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {t("vp.selectedOf", { selected: selectedStudents.size, total: absentStudents.length, defaultValue: `${selectedStudents.size} of ${absentStudents.length} selected` })}
                  </span>
                </div>
                <button
                  onClick={() => setShowSMSModal(true)}
                  disabled={selectedStudents.size === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedStudents.size === 0
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                    }`}
                >
                  <MessageSquare size={18} />
                  {t("vp.sendSMS", { count: selectedStudents.size, defaultValue: `Send SMS (${selectedStudents.size})` })}
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {absentStudents.map((student, idx) => (
                  <div key={`${student.id}-${idx}`} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={(e) => handleSelectStudent(student.id, e.target.checked)} aria-label={`Select ${student.name}`} className="w-5 h-5 rounded border-slate-300 text-indigo-600 cursor-pointer mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg">{student.name}</h3>
                          <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-bold uppercase tracking-widest">
                              {student.grade} - {student.section}
                            </span>
                            {student.status && (
                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-widest ${
                                student.status === 'exceeded' || (student.totalAbsences && student.totalAbsences >= 3)
                                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
                                  : student.status === 'absent'
                                  ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40' 
                                  : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
                              }`}>
                                {student.status === 'exceeded' || (student.totalAbsences && student.totalAbsences >= 3)
                                  ? `Exceeded Limit (${student.totalAbsences || 0} Absences)`
                                  : student.status}
                              </span>
                            )}
                            {notifiedStudents.has(student.id) && (
                              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 rounded text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1">
                                <CheckCircle size={10} />
                                {t("vp.smsSentStatus", "SMS Sent")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.parentGuardian", "Parent/Guardian")}</p>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">{student.parentName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.phoneNumber", "Phone Number")}</p>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">{student.parentPhone}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-4">
                          <p>{t("vp.roomTeacherLabel", "Room Teacher:")} <span className="font-medium text-slate-700 dark:text-slate-300">{student.roomTeacher}</span></p>
                          {student.totalAbsences !== undefined && (
                            <p>Total Absences Traced: <span className="font-bold text-rose-600 dark:text-rose-400">{student.totalAbsences} days</span></p>
                          )}
                        </div>
                      </div>
                      {selectedStudents.has(student.id) && (
                        <CheckCircle className="text-emerald-500 flex-shrink-0 mt-1" size={20} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t("vp.teacherAttendanceProxyTitle", "Teacher Attendance & Proxy Scheduling")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("vp.teacherAttendanceProxyDesc", "View attendance status, closed calendar days, and manage daily proxy substitutions.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="text-slate-400" size={16} />
                <label htmlFor="teacherDatePicker" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.datePicker", "Date Picker:")}</label>
              </div>
              <div className="w-52">
                <EthiopianDatePicker
                  id="teacherDatePicker"
                  value={selectedTeacherDate}
                  onChange={setSelectedTeacherDate}
                  placeholder="YYYY-MM-DD"
                  title="Choose date to review schedules"
                />
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                {formatEthiopianDateString(selectedTeacherDate)} {dayOfWeek ? `(${dayOfWeek})` : ''}
              </span>
            </div>
          </div>

          {/* School Closed / Non-Working Day Banner */}
          {!isWorkingDay ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-10 text-center space-y-4 shadow-sm">
              <div className="inline-flex p-4 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-full">
                <Calendar size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Non-Working Day: {nonWorkingTitle || 'School Closed'}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto text-sm font-medium">
                {nonWorkingReason || 'Today is marked as a weekend or holiday in the School Calendar. Attendance records are not tracked for this date.'}
              </p>
            </div>
          ) : (
            <>
              {/* Teacher Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                      <Users className="text-indigo-600 dark:text-indigo-400" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.totalTeachers", "Total Teachers")}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{teachers.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                      <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.presentToday", "Present Today")}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {teachers.filter(t => t.attendanceStatus === 'present').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                      <AlertCircle className="text-rose-600 dark:text-rose-400" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.absentExcused", "Absent / Excused")}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {teachers.filter(t => t.attendanceStatus === 'absent' || t.attendanceStatus === 'excused').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                      <Users className="text-amber-600 dark:text-amber-400" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t("vp.proxyCoverages", "Proxy Coverages")}</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                        {t("vp.assigned", { count: proxies.length, defaultValue: `${proxies.length} Assigned` })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("vp.searchTeachersDept", "Search teachers by name or department...")}
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full px-6 py-4 rounded-3xl border border-slate-150 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm text-sm"
                />
              </div>

              {/* Teachers List Table */}
              {loadingTeachers ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Loading teachers and proxy timetables...</p>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm">
                  <Users className="mx-auto mb-4 text-slate-400" size={48} />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("vp.noTeachersFound", "No Teachers Found")}</h3>
                  <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                    {t("vp.noTeachersFoundDesc", "No teacher profiles match your current search.")}
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                          <th className="p-4 pl-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("vp.colTeacher", "Teacher")}</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("vp.colDeptSubjects", "Department & Subjects")}</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("vp.colAttendanceStatus", "Attendance Status")}</th>
                          <th className="p-4 pr-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("vp.colSchedulesProxy", "Schedules & Proxy Substitutes")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredTeachers.map((teacher: any) => (
                          <tr key={teacher.teacher_id || teacher.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors align-top">
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-100 dark:border-indigo-900/50">
                                  {teacher.name ? teacher.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'T'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">{teacher.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{teacher.email || 'No Email'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{teacher.department || 'General'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                                {Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : (teacher.subjects || 'N/A')}
                              </p>
                            </td>
                            <td className="p-4">
                              <select
                                value={teacher.attendanceStatus}
                                onChange={(e) => handleUpdateTeacherStatus(teacher.user_id, e.target.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
                                  teacher.attendanceStatus === 'present'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
                                    : teacher.attendanceStatus === 'absent'
                                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800/50'
                                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/50'
                                }`}
                              >
                                <option value="present">{t("vp.present", "Present")}</option>
                                <option value="absent">{t("vp.absent", "Absent")}</option>
                                <option value="excused">{t("vp.excused", "Excused")}</option>
                              </select>
                            </td>
                            <td className="p-4 pr-6">
                              {teacher.attendanceStatus === 'present' ? (
                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  {t("vp.presentNoCover", "Present (No Cover Needed)")}
                                </span>
                              ) : (
                                <div className="space-y-2">
                                  {(() => {
                                    const teacherSchedules = schedules.filter(s => s.teacher_id === teacher.teacher_id);
                                    if (teacherSchedules.length === 0) {
                                      return <span className="text-xs text-slate-400 dark:text-slate-500 italic">No classes scheduled on this day ({dayOfWeek})</span>;
                                    }
                                    return teacherSchedules.map((s, idx) => {
                                      const proxy = proxies.find(p => 
                                        p.absent_teacher_id === teacher.teacher_id && 
                                        p.period_number === s.period_number &&
                                        (p.class_name === s.class_name || `${p.class_name}${p.section}` === s.class_name || p.class_name === `${s.class_name}${s.section || ''}`)
                                      );
                                      return (
                                        <div key={idx} className="flex items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <div className="text-xs font-medium">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">Period {s.period_number}:</span>{' '}
                                            <span className="text-slate-500 dark:text-slate-400">{s.class_name}-{s.section} ({s.subject})</span>
                                          </div>
                                          <div>
                                            {proxy ? (
                                              <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded text-[10px] font-bold">
                                                  Covered by {proxy.proxy_teacher_name}
                                                </span>
                                                <button
                                                  onClick={() => handleRemoveProxy(proxy.id)}
                                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                                                  title="Remove Proxy Cover"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded text-[10px] font-bold">
                                                  Uncovered
                                                </span>
                                                <button
                                                  onClick={() => handleOpenProxyModal(teacher, s)}
                                                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all shadow"
                                                >
                                                  Assign Proxy
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showSMSModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <MessageSquare size={28} />
                    Send Absence Notification
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    SMS will be sent to {selectedStudents.size} parent(s)
                  </p>
                </div>
                <button
                  onClick={() => setShowSMSModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {smsStatus === 'sent' ? (
              <div className="p-8 text-center">
                <CheckCircle className="mx-auto mb-4 text-emerald-500" size={48} />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Messages Sent Successfully!</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  SMS notifications have been sent to {selectedStudents.size} parent(s).
                </p>
                <button
                  onClick={() => setShowSMSModal(false)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3">Selected Students ({selectedStudents.size})</h3>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 max-h-40 overflow-y-auto">
                    <div className="space-y-2 text-sm">
                      {absentStudents
                        .filter((s) => selectedStudents.has(s.id))
                        .map((student) => (
                          <div key={student.id} className="flex items-start gap-2">
                            <span className="text-slate-400">•</span>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{student.name}</p>
                              <p className="text-slate-500 dark:text-slate-400">{student.parentPhone} ({student.parentName})</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-2">SMS Message</label>
                  <textarea
                     value={smsMessage}
                     onChange={(e) => setSmsMessage(e.target.value)}
                     maxLength={160}
                     placeholder="Enter your message here..."
                     className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                     rows={4}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {smsMessage.length}/160 characters
                  </p>
                </div>

                {smsStatus === 'error' && smsError && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4">
                    <p className="text-sm text-red-700 dark:text-red-300">{smsError}</p>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowSMSModal(false)}
                    disabled={smsSending}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendSMS}
                    disabled={smsSending || smsMessage.trim().length === 0}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold transition-colors ${smsSending || smsMessage.trim().length === 0
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                      }`}
                  >
                    {smsSending ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send to {selectedStudents.size} Parent{selectedStudents.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showProxyModal && selectedTeacherForProxy && selectedScheduleForProxy && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md border border-slate-150 dark:border-slate-700 overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-indigo-650 via-indigo-700 to-indigo-800 text-white p-6 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent_60%)] pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h2 className="text-xl font-extrabold flex items-center gap-2.5">
                    <Users size={24} />
                    Assign Proxy Teacher
                  </h2>
                  <p className="text-indigo-100 text-xs mt-1.5 font-medium">
                    Select a coverage replacement for <strong className="text-white">{selectedTeacherForProxy.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowProxyModal(false)}
                  className="text-white/80 hover:text-white transition-colors text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-widest">Class to Cover</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Grade {selectedScheduleForProxy.class_name} - {selectedScheduleForProxy.section}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-widest">Period & Subject</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Period {selectedScheduleForProxy.period_number} • {selectedScheduleForProxy.subject}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="proxyTeacherSelector" className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Select Proxy Teacher
                </label>
                <select
                  id="proxyTeacherSelector"
                  value={proxyTeacherId}
                  onChange={(e) => setProxyTeacherId(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm cursor-pointer font-medium"
                >
                  <option value="">-- Choose a Teacher --</option>
                  {loadingCandidates ? (
                    <option disabled>Loading available teachers...</option>
                  ) : proxyCandidates.length === 0 ? (
                    <option disabled>No available teachers found for this period</option>
                  ) : (
                    <>
                      {/* Recommended Candidates */}
                      {proxyCandidates.some(c => c.teaches_section) && (
                        <optgroup label="⭐ Recommended (Teaches in this section)">
                          {proxyCandidates
                            .filter(c => c.teaches_section)
                            .map(c => (
                              <option key={c.teacher_id} value={c.teacher_id}>
                                {c.name} ({c.department || 'General'})
                              </option>
                            ))
                          }
                        </optgroup>
                      )}
                      {/* Other Candidates */}
                      <optgroup label="Available Teachers">
                        {proxyCandidates
                          .filter(c => !c.teaches_section)
                          .map(c => (
                            <option key={c.teacher_id} value={c.teacher_id}>
                              {c.name} ({c.department || 'General'})
                            </option>
                          ))
                        }
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowProxyModal(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignProxy}
                  disabled={loadingCandidates || !proxyTeacherId}
                  className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/25 transition-colors text-xs disabled:opacity-50"
                >
                  Save Coverage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-2 duration-300">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border backdrop-blur-md ${toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
              }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
