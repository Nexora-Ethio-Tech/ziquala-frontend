
import { Users, GraduationCap, Clock, TrendingUp, Lock, Unlock, Megaphone, Plus, X, Bell, Book, BookOpen, AlertTriangle, ShieldAlert, ArrowRight, ArrowLeft, Trash2, Edit, Calendar, CheckCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/useStore';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '../services/dashboardService';
import { getDashboard as getSchoolAdminDashboard, getAtRiskStudents, getUpcomingEvents, createEvent, updateEvent, deleteEvent, type AtRiskStudent, type Event } from '../services/schoolAdminService';
import { getTodayEthiopianDate, formatEthiopianLabel, gregorianToEthiopian, ethiopianToGregorianIso } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import settingsService from '../services/settingsService';
import { userService } from '../services/userService';
import api from '../services/api';

const StatCard = ({ icon: Icon, label, value, trend, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700' : ''}`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`${color} p-2 md:p-3 rounded-lg text-white`}>
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
      {trend && (
        <span className="text-emerald-500 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold md:font-medium uppercase md:normal-case tracking-wider md:tracking-normal">{label}</h3>
    <p className="text-xl md:text-2xl font-black md:font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
  </div>
);

export const Dashboard = () => {
  const { role, gradesLocked, setGradesLocked, branches, setSelectedBranch, user } = useUser();
  const { selectedBranchId, setSelectedBranchId, notices, addNotice, deleteNotice } = useStore();
  const { t } = useTranslation();
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [watchlistExpanded, setWatchlistExpanded] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [eventEthDate, setEventEthDate] = useState('');
  const [noticeExpiryEthDate, setNoticeExpiryEthDate] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('all');
  const [postingNotice, setPostingNotice] = useState(false);
  const isSuperAdmin = role === 'super-admin';

  const handleToggleGradesLock = async (newVal: boolean) => {
    try {
      await settingsService.updateSystemSettings({
        grades_locked: newVal ? 'true' : 'false'
      });
      setGradesLocked(newVal);
      setSuccessMessage(newVal ? 'Grade insertion is now locked' : 'Grade insertion is now open');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to toggle grades lock', err);
      setError(err.response?.data?.message || 'Failed to update grades lock state');
    }
  };

  // API Integration: Fetch real dashboard stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [schoolAdminStats, setSchoolAdminStats] = useState<any>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchReportLoading, setBranchReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending Approvals Modal states and fetch logic
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingUsersList, setPendingUsersList] = useState<any[]>([]);
  const [fetchingPending, setFetchingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    setFetchingPending(true);
    setPendingError(null);
    try {
      const response = await userService.getAllUsers({ status: 'Pending' });
      const list = response.data || response || [];
      const filtered = list.filter((u: any) => 
        ['academic-manager', 'school-admin', 'vice-principal'].includes(u.role)
      );
      setPendingUsersList(filtered);
    } catch (err: any) {
      console.error('Failed to fetch pending users:', err);
      setPendingError(err.message || 'Failed to load pending users');
    } finally {
      setFetchingPending(false);
    }
  };

  useEffect(() => {
    if (showPendingModal) {
      fetchPendingUsers();
    }
  }, [showPendingModal]);

  const handlePendingUserStatus = async (userId: string, newStatus: 'Approved' | 'Revoked') => {
    setUpdatingUserId(userId);
    try {
      await userService.updateUserStatus(userId, newStatus);
      setSuccessMessage(`User status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchPendingUsers();
      
      // Refresh dashboard count
      if (role === 'super-admin') {
        const response = await dashboardService.getSuperAdminDashboard();
        if (response.success) {
          setDashboardStats(response.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to update status', err);
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingUserId(null);
    }
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      setError(null);
      try {
        if (role === 'super-admin') {
          const response = await dashboardService.getSuperAdminDashboard();
          if (response.success) {
            setDashboardStats(response.data);
          }
        } else if (role === 'school-admin') {
          const [dashboardData, atRiskData, eventsData, noticesRes] = await Promise.all([
            getSchoolAdminDashboard(),
            getAtRiskStudents(),
            getUpcomingEvents(5),
            api.get('/school-admin/notices').catch(() => ({ data: { data: [] } }))
          ]);
          setSchoolAdminStats(dashboardData);
          setAtRiskStudents(atRiskData.students || []);
          setUpcomingEvents(eventsData || []);
          // Seed the notice store with persisted notices from the database
          const rawNotices: any[] = noticesRes.data?.data || [];
          const { setNotices: _setNotices } = useStore.getState();
          if (rawNotices.length > 0) {
            const mapped = rawNotices.map((n: any) => ({
              id: n.id,
              title: n.title,
              content: n.content,
              priority: n.priority || 'Normal',
              time: n.created_at || new Date().toISOString(),
              category: (n.category || 'Academic') as any,
              audience: n.audience === 'all'
                ? ['super-admin','academic-manager','school-admin','vice-principal','teacher','student','parent','librarian']
                : String(n.audience || 'all').split(',').map((r: string) => r.trim()),
            }));
            _setNotices(mapped);
          }
        }
      } catch (err: any) {
        console.error('❌ Dashboard API Error:', err);
        setError(err.message || 'Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [role]);


  // Event Management Handlers
  const refreshEvents = async () => {
    try {
      const eventsData = await getUpcomingEvents(5);
      setUpcomingEvents(eventsData || []);
    } catch (err) {
      console.error('Failed to refresh events:', err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const gregDate = ethiopianToGregorianIso(eventEthDate);
    if (!gregDate) {
      setError('Please select a valid Ethiopian date.');
      return;
    }
    try {
      await createEvent({
        title: formData.get('title') as string,
        date: gregDate,
        type: formData.get('type') as string,
        description: formData.get('description') as string || undefined
      });
      setShowEventModal(false);
      setEventEthDate('');
      refreshEvents();
      setSuccessMessage('Event created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) return;
    const formData = new FormData(e.currentTarget);
    const gregDate = ethiopianToGregorianIso(eventEthDate);
    if (!gregDate) {
      setError('Please select a valid Ethiopian date.');
      return;
    }
    try {
      await updateEvent(editingEvent.id, {
        title: formData.get('title') as string,
        date: gregDate,
        type: formData.get('type') as string,
        description: formData.get('description') as string || undefined
      });
      setShowEventModal(false);
      setEditingEvent(null);
      setEventEthDate('');
      refreshEvents();
      setSuccessMessage('Event updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;
    try {
      await deleteEvent(deletingEvent.id);
      setUpcomingEvents(prev => prev.filter(e => e.id !== deletingEvent.id));
      setShowDeleteConfirm(false);
      setDeletingEvent(null);
      setSuccessMessage('Event deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setShowDeleteConfirm(false);
      setDeletingEvent(null);
      setError(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const isAdmin = role === 'super-admin' || role === 'school-admin';
  const isVP = role === 'vice-principal';
  const selectedBranch = selectedBranchId ? branches.find((branch) => branch.id === selectedBranchId) || null : null;
  const [branchReports, setBranchReports] = useState<any[]>([]);
  const selectedBranchReport = selectedBranch
    ? branchReports.find((report) => report?.branchId === selectedBranch.id) || null
    : null;
  const selectedBranchTeacherCount = selectedBranchReport?.totalTeachers ?? 0;

  // Fetch branch reports for Super Admin
  useEffect(() => {
    const fetchBranchReports = async () => {
      if (role === 'super-admin' && branches.length > 0) {
        setBranchReportLoading(true);
        console.log('🔍 Fetching branch reports for', branches.length, 'branches');
        try {
          const { getBranchReport } = await import('../services/branchService');
          const reports = await Promise.all(
            branches.map(async (branch) => {
              try {
                console.log('📊 Fetching report for branch:', branch.name, branch.id);
                const report = await getBranchReport(branch.id);
                console.log('✅ Report received for', branch.name, ':', report);
                return report;
              } catch (err) {
                console.error('❌ Failed to fetch report for', branch.name, ':', err);
                return null;
              }
            })
          );
          const validReports = reports.filter(r => r !== null);
          console.log('📈 Total valid reports:', validReports.length, '/', branches.length);
          setBranchReports(validReports);
        } catch (err) {
          console.error('❌ Failed to fetch branch reports:', err);
          setBranchReports([]);
        } finally {
          setBranchReportLoading(false);
        }
      }
    };
    fetchBranchReports();
  }, [role, branches]);

  if (role === 'super-admin') {
    // Use ONLY real API data - no fallback
    const branchHealth = branches
      .map((branch) => {
        // Now report is the actual data object, not wrapped in response
        const report = branchReports.find(r => r?.branchId === branch.id);
        console.log('🏥 Branch Health for', branch.name, '- Report found:', !!report, report);

        if (!report) {
          return null; // Skip branches without API data
        }

        return {
          ...branch,
          students: report.totalStudents,
          teachers: report.totalTeachers,
          attendance: report.attendanceRate?.toFixed(1),
          isHighRisk: Number(report.attendanceRate || 0) < 80,
          risk: Number(report.attendanceRate || 0) < 80 ? 'Needs Attention' : 'Normal'
        };
      })
      .filter((branch): branch is NonNullable<typeof branch> => Boolean(branch)); // Remove null entries


    if (!selectedBranch) {
      const monitoredBranches = branchHealth.length || dashboardStats?.totalBranches || branches.length;
      const teacherCount = dashboardStats?.usersByRole?.find((r: any) => r.role === 'teacher')?.count || 0;
      const totalStudentsCount = dashboardStats?.totalStudents || 0;
      const teacherAttendance = dashboardStats?.teacherAttendanceRate ?? 0;
      const studentAttendance = dashboardStats?.studentAttendanceRate ?? 0;
      const branchesNeedingAttention = branchHealth.filter((b) => b.isHighRisk).length;

      return (
        <div className="space-y-8">
          <section className="bg-slate-950 text-white rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-slate-200/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.24),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.2),_transparent_28%)]" />
            <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-300">{t('dashboard.networkOverview')}</p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{t('dashboard.aggregateTitle')}</h1>
                <p className="text-slate-300 max-w-2xl text-sm md:text-base">
                  {t('dashboard.aggregateDesc')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('dashboard.selectedBranch')}</p>
                  <p className="font-black text-white text-sm">{t('dashboard.none')}</p>
                </div>
                <button
                  onClick={() => {
                    if (branches && branches.length > 0) {
                      setSelectedBranchId(branches[0].id);
                      setSelectedBranch(branches[0]);
                    } else {
                      console.warn('No branches available to drill into');
                    }
                  }}
                  disabled={!branches || branches.length === 0}
                  className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
                >
                  {t('dashboard.drillBranch')}
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-4 text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 mt-2">{t("dashboard.loadingStats","Loading dashboard stats...")}</p>
              </div>
            ) : error ? (
              <div className="col-span-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">⚠️ Using mock data (API: {error})</p>
              </div>
            ) : null}
            <StatCard
              icon={Users}
              label={t('dashboard.totalStudents')}
              value={dashboardStats?.totalStudents?.toLocaleString() || "0"}
              trend={dashboardStats?.totalStudents > 0 ? "+4.3%" : undefined}
              color="bg-blue-600"
            />
            <StatCard
              icon={GraduationCap}
              label={t('dashboard.totalTeachers')}
              value={dashboardStats?.usersByRole?.find((r: any) => r.role === 'teacher')?.count || "0"}
              color="bg-purple-600"
            />
            <StatCard
              icon={Clock}
              label={t("dashboard.totalBranches","Total Branches")}
              value={dashboardStats?.totalBranches?.toString() || "0"}
              color="bg-orange-500"
            />
            <StatCard
              icon={TrendingUp}
              label={t("dashboard.pendingApprovals","Pending Approvals")}
              value={dashboardStats?.pendingUsers?.toString() || "0"}
              color="bg-emerald-600"
              onClick={() => setShowPendingModal(true)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("dashboard.superAdminSnapshot","Super Admin Snapshot")}</h3>
                  <p className="text-sm text-slate-500">{t('dashboard.snapshotSub', 'A clean, high-level view of all branches and network health.')}</p>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('dashboard.branchesMonitored', '{{count}} branches monitored', { count: monitoredBranches })}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{t('dashboard.totalStudents', 'Total Students')}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStudentsCount.toLocaleString()}</p>
                </div>
                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{t('dashboard.totalTeachers', 'Total Teachers')}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{teacherCount.toLocaleString()}</p>
                </div>
                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{t('dashboard.teacherAttendance', 'Teacher Attendance')}</p>
                  <p className={`text-2xl font-black ${Number(teacherAttendance) >= 80 ? 'text-emerald-600' : Number(teacherAttendance) >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {loading ? '...' : `${teacherAttendance}%`}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">{t('dashboard.studentAttendance', 'Student Attendance')}</p>
                  <p className={`text-2xl font-black ${Number(studentAttendance) >= 80 ? 'text-emerald-600' : Number(studentAttendance) >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {loading ? '...' : `${studentAttendance}%`}
                  </p>
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('dashboard.branchHealth')}</h3>
                  <p className="text-sm text-slate-500">{t('dashboard.aggregateSnapshot')}</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{t('dashboard.aggregateOnly')}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[680px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('dashboard.branch')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.students')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.teachers')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.attendance')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">{t('dashboard.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {branchReportLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-sm text-slate-500 mt-2">{t("dashboard.loadingBranchReports","Loading branch reports...")}</p>
                          </div>
                        </td>
                      </tr>
                    ) : branchHealth.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <div className="text-sm text-slate-500">No branch reports are available yet. Please refresh or check your branch report configuration.</div>
                        </td>
                      </tr>
                    ) : branchHealth.map((branch) => (
                      <tr key={branch?.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">{branch?.name?.[0] || ''}</div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{branch?.name || ''}</p>
                              <p className="text-xs text-slate-500">{branch?.location || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{branch?.students ?? 0}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{branch?.teachers ?? 0}</td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{branch?.attendance ?? 0}%</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              if (branch) {
                                setSelectedBranchId(branch.id);
                                setSelectedBranch(branch);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${branch?.risk === 'Normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                          >
                            {branch?.risk || ''}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Branches Needing Attention */}
            {branchesNeedingAttention > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-800/40 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-amber-100 dark:border-amber-800/30 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/10">
                  <div>
                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300">⚠️ Branches Needing Attention</h3>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Branches with attendance below the academic follow-up threshold.</p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-100 dark:bg-amber-900/40 px-3 py-1 rounded-full">
                    {branchesNeedingAttention} branch{branchesNeedingAttention !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="divide-y divide-amber-50 dark:divide-amber-900/20">
                  {branchHealth.filter(b => b.isHighRisk).map((branch) => (
                    <div key={branch.id} className="p-4 flex items-center justify-between hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-sm">
                          {branch.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{branch.name}</p>
                          <p className="text-xs text-slate-500">{branch.location || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400">Attendance</p>
                          <p className="font-black text-rose-600">{branch.attendance ?? '0'}%</p>
                        </div>
                        <button
                          onClick={() => { setSelectedBranchId(branch.id); setSelectedBranch(branch); }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>{/* end grid grid-cols-1 gap-6 */}

          {/* Pending Approvals Modal */}
          {showPendingModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{t("dashboard.pendingApprovals","Pending Approvals")}</h3>
                      <p className="text-xs text-slate-500">Academic Managers, School Admins, and Vice Principals waiting for activation.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPendingModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-950/10">
                  {fetchingPending ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="inline-block w-10 h-10 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 mt-4">Fetching pending applications...</p>
                    </div>
                  ) : pendingError ? (
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-center">
                      <p className="text-sm text-rose-800 dark:text-rose-200">{pendingError}</p>
                      <button
                        onClick={fetchPendingUsers}
                        className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : pendingUsersList.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">All caught up!</h4>
                      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">No pending Academic Manager, School Admin, or Vice Principal accounts require approval at this time.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingUsersList.map((pendingUser) => (
                        <div
                          key={pendingUser.id}
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                  {pendingUser.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{pendingUser.name}</h4>
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">{pendingUser.digital_id || pendingUser.digitalId || '—'}</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                {pendingUser.role}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-3">
                              <div className="flex justify-between">
                                <span>{t("dashboard.emailLabel","Email:")}</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 break-all">{pendingUser.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{t("dashboard.registeredLabel","Registered:")}</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {pendingUser.created_at ? new Date(pendingUser.created_at).toLocaleDateString() : '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-5 pt-4 border-t border-slate-50 dark:border-slate-800">
                            <button
                              disabled={updatingUserId !== null}
                              onClick={() => handlePendingUserStatus(pendingUser.id, 'Revoked')}
                              className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              disabled={updatingUserId !== null}
                              onClick={() => handlePendingUserStatus(pendingUser.id, 'Approved')}
                              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {updatingUserId === pendingUser.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <CheckCircle size={14} />
                              )}
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/20">
                  <button
                    onClick={() => setShowPendingModal(false)}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <section className="bg-slate-950 text-white rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-slate-200/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.24),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.2),_transparent_28%)]" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-300">{t('dashboard.branchControl')}</p>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{selectedBranch.name}</h1>
              <p className="text-slate-300 max-w-2xl text-sm md:text-base">
                {t('dashboard.branchDesc')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('dashboard.currentBranch')}</p>
                <p className="font-black text-white text-sm">{selectedBranch.location}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedBranchId(null);
                  setSelectedBranch(null);
                }}
                className="px-4 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                {t('dashboard.backNetwork')}
              </button>
            </div>
          </div>
        </section>

        {/* Power of Three: Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Users size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.students')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedBranchReport?.totalStudents ?? 0}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">{t("dashboard.branchStudentTotal","Branch-wide student total")}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl"><GraduationCap size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.teachers')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedBranchTeacherCount}</p>
            <p className="text-xs text-slate-500 font-bold mt-1">{t("dashboard.teachingStaff","Teaching staff in branch")}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl"><Clock size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.attendance')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedBranchReport?.attendance ? `${selectedBranchReport.attendance}%` : 'N/A'}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">{t("dashboard.branchAttendanceRate","Branch attendance rate")}</p>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Message for School Admin */}
      {role === 'school-admin' && user && (
        <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100 mb-1">{t("dashboard.welcomeBack","Welcome back,")}</p>
              <h2 className="text-2xl md:text-3xl font-black">{user.name}</h2>
              <p className="text-blue-100 mt-2 flex items-center gap-2">
                <span className="font-semibold">
                  {(() => {
                    const branchId = (user as any).branchId;
                    console.log('🔍 Debug - User branchId:', branchId);
                    console.log('🔍 Debug - Branches array:', branches);
                    const foundBranch = branches.find(b => b.id === branchId);
                    console.log('🔍 Debug - Found branch:', foundBranch);
                    return foundBranch?.name || 'School';
                  })()}
                </span>
                <span className="text-blue-300">•</span>
                <span className="text-sm">{formatEthiopianLabel(new Date())}</span>
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl font-black">{user.name?.charAt(0)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {(isVP || isSuperAdmin) && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-300 ${gradesLocked
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${gradesLocked ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
              }`}>
              {gradesLocked ? <Lock size={24} /> : <Unlock size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                {gradesLocked ? t("dashboard.gradeLocked","Grade Insertion is LOCKED") : t("dashboard.gradeOpen","Grade Insertion is OPEN")}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {gradesLocked
                  ? 'System is currently performing averages and ranking.'
                  : 'Teachers can currently enter and modify student grades.'}
                {isSuperAdmin && ' (Super Admin: Read-only access)'}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {isVP && (
              <button
                onClick={() => {
                  alert('Calculating Student Ranks for all sections...');
                }}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
              >
                <TrendingUp size={18} />
                Calculate Ranks
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => handleToggleGradesLock(!gradesLocked)}
                className={`w-full sm:w-auto px-6 py-2 rounded-lg font-bold transition-colors ${gradesLocked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
              >
                {gradesLocked ? t('dashboard.openInsertion','Open Insertion') : t('dashboard.closeInsertion','Close Insertion')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {role === 'librarian' ? (
          <>
            <StatCard
              icon={Book}
              label="Total Books"
              value="2,450"
              color="bg-blue-600"
            />
            <StatCard
              icon={BookOpen}
              label="Active Loans"
              value="184"
              trend="+12%"
              color="bg-purple-600"
            />
            <StatCard
              icon={AlertTriangle}
              label="Overdue Books"
              value="12"
              color="bg-rose-500"
            />
            <StatCard
              icon={Users}
              label="Visitors Today"
              value="42"
              color="bg-emerald-500"
            />
          </>
        ) : role === 'school-admin' && schoolAdminStats ? (
          <>
            <StatCard
              icon={Users}
              label={t("dashboard.totalStudents","Total Students")}
              value={schoolAdminStats.totalStudents?.toLocaleString() || '0'}
              trend="+4.3%"
              color="bg-blue-600"
            />
            <StatCard
              icon={GraduationCap}
              label={t("dashboard.totalTeachers","Total Teachers")}
              value={schoolAdminStats.totalTeachers?.toString() || '0'}
              color="bg-purple-600"
            />
            <StatCard
              icon={Clock}
              label={t("dashboard.totalClasses","Total Classes")}
              value={schoolAdminStats.totalClasses?.toString() || '0'}
              color="bg-orange-500"
            />
            <StatCard
              icon={TrendingUp}
              label={t("dashboard.pendingApplications","Pending Applications")}
              value={schoolAdminStats.pendingApplications?.toString() || '0'}
              color="bg-emerald-500"
            />
          </>
        ) : loading ? (
          <div className="col-span-4 text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-2">{t("dashboard.loading","Loading dashboard...")}</p>
          </div>
        ) : null}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <Megaphone size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("dashboard.noticeBoardTitle","School Notice Board")}</h3>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowNoticeModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 md:p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] md:text-xs font-bold"
            >
              <Plus size={14} className="md:w-4 md:h-4" />
              <span className="hidden xs:inline">{t("dashboard.postNotice","Post Notice")}</span>
              <span className="xs:hidden">{t("dashboard.post","Post")}</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {notices.filter(n => !role || !n.audience || n.audience.includes(role)).map((notice) => (
            <div key={notice.id} className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    {notice.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${notice.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                    {notice.priority}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">{notice.time}</span>
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          try {
                            await api.delete(`/school-admin/notices/${notice.id}`);
                          } catch (err) {
                            console.error('Failed to delete notice from API:', err);
                          }
                          deleteNotice(notice.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {notice.expiresAt && (() => {
                    // expiresAt is stored as an Ethiopian calendar string (YYYY-MM-DD E.C.)
                    // from the EthiopianDatePicker, so display it directly without
                    // re-converting through gregorianToEthiopian (which would shift the year ~7 years back).
                    const ethMonths = ['Meskerem','Tikimt','Hidar','Tahsas','Tir','Yekatit','Megabit','Miazia','Ginbot','Sene','Hamle','Nehase','Pagume'];
                    const parts = notice.expiresAt.split('-');
                    if (parts.length === 3) {
                      const [yr, mo, dy] = parts.map(Number);
                      const label = `${dy} ${ethMonths[mo - 1] ?? ''} ${yr} E.C.`;
                      return <span className="text-[10px] text-rose-400 italic font-medium">Expires: {label}</span>;
                    }
                    // Fallback: if not in Ethiopian string format, try Gregorian conversion
                    return <span className="text-[10px] text-rose-400 italic font-medium">Expires: {formatEthiopianLabel(notice.expiresAt)}</span>;
                  })()}
                </div>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{notice.title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {notice.content}
              </p>
              {isAdmin && notice.audience && notice.audience.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("dashboard.audienceLabel","Audience:")}</span>
                  {notice.audience.includes('all') || notice.audience.length >= 5 ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-violet-100 text-violet-700 uppercase">All Users</span>
                  ) : (
                    notice.audience
                      .filter((a: string) => !['school-admin','super-admin'].includes(a))
                      .map((a: string) => (
                        <span key={a} className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">{a}</span>
                      ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setWatchlistExpanded(!watchlistExpanded)}
                className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <ShieldAlert size={20} className="text-rose-600" />
                Priority Watchlist
                <div className={`transition-transform duration-300 ${watchlistExpanded ? 'rotate-90' : ''}`}>
                  <ArrowRight size={18} className="text-slate-400" />
                </div>
              </button>
              <Link to="/analytics" className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest">
                Full Report
              </Link>
            </div>
            {watchlistExpanded && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                {atRiskStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500">No at-risk students at this time</p>
                  </div>
                ) : (
                  atRiskStudents.slice(0, 4).map((student) => (
                    <div key={student.student_id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${student.risk_level === 'High' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{student.grade} • {student.risk_level} Risk</p>
                          <p className="text-[10px] text-slate-500 mt-1">{student.risk_factor}</p>
                        </div>
                      </div>
                      <Link to={`/students/${student.student_id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all">
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t("dashboard.upcomingEvents","Upcoming Events")}</h3>
            {role === 'school-admin' && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setEventEthDate(getTodayEthiopianDate());
                  setShowEventModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Plus size={14} />
                Add Event
              </button>
            )}
          </div>
          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">No upcoming events scheduled</p>
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const eventDate = new Date(event.date);
                const day = eventDate.getDate();
                const month = eventDate.toLocaleDateString('en-US', { month: 'short' });
                return (
                  <div key={event.id} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{day}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{month}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{event.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{event.type}</p>
                      {event.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{event.description}</p>
                      )}
                    </div>
                    {role === 'school-admin' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingEvent(event);
                            if (event.date) {
                              const ethD = gregorianToEthiopian(new Date(event.date));
                              setEventEthDate(`${ethD.year}-${String(ethD.month).padStart(2,'0')}-${String(ethD.day).padStart(2,'0')}`);
                            } else {
                              setEventEthDate(getTodayEthiopianDate());
                            }
                            setShowEventModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit Event"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingEvent(event);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showNoticeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">{t('modals.postNoticeTitle', 'Post New Notice')}</h3>
              <button
                type="button"
                title="Close notice modal"
                onClick={() => { setShowNoticeModal(false); setNoticeExpiryEthDate(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4 flex-1 overflow-y-auto" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const title = formData.get('title') as string;
              const content = formData.get('content') as string;
              const priority = formData.get('priority') as string;
              const category = formData.get('category') as string;
              const expiresAt = (formData.get('expiresAt') as string) || undefined;

              // Map UI audience selection to role arrays
              const audienceRoleMap: Record<string, string[]> = {
                all: ['super-admin', 'academic-manager', 'school-admin', 'vice-principal', 'teacher', 'student', 'parent', 'librarian'],
                teacher: ['teacher', 'school-admin', 'super-admin'],
                academic: ['academic-manager', 'school-admin', 'vice-principal', 'teacher', 'super-admin'],
                'parent-student': ['parent', 'student', 'school-admin', 'super-admin'],
              };
              const audienceRoles = audienceRoleMap[selectedAudience] || audienceRoleMap.all;

              setPostingNotice(true);
              try {
                // POST to backend to persist + trigger SSE broadcast
                await api.post('/school-admin/notices', {
                  title,
                  content,
                  priority,
                  category,
                  expiresAt,
                  audience: selectedAudience,
                });
                // Also add locally for immediate display
                addNotice({
                  title,
                  content,
                  priority: priority as any,
                  category: category as any,
                  expiresAt,
                  audience: audienceRoles,
                });
              } catch (err) {
                // Fallback: add locally if API fails
                addNotice({
                  title,
                  content,
                  priority: priority as any,
                  category: category as any,
                  expiresAt,
                  audience: audienceRoles,
                });
              } finally {
                setPostingNotice(false);
              }
              setShowNoticeModal(false);
              setNoticeExpiryEthDate('');
              setSelectedAudience('all');
            }}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.noticeTitle', 'Notice Title')}</label>
                <input name="title" required type="text" placeholder="e.g. Public Holiday Announcement" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.category', 'Category')}</label>
                  <select
                    name="category"
                    title="Select notice category"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="Academic">Academic</option>
                    <option value="General">General</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.priority', 'Priority')}</label>
                  <select
                    name="priority"
                    title="Select notice priority level"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              {/* Audience targeting */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Users size={12} />
                  {t('modals.targetAudience', 'Target Audience')}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'all', label: `🌐 ${t('modals.audienceAll','All Users')}`, desc: t('modals.audienceAllDesc','Everyone receives this notice') },
                    { value: 'teacher', label: `👨‍🏫 ${t('modals.audienceTeachers','Teachers Only')}`, desc: t('modals.audienceTeachersDesc','Only teachers see this') },
                    { value: 'academic', label: `📚 ${t('modals.audienceAcademic','Academic Team')}`, desc: t('modals.audienceAcademicDesc','Academic managers, administrators, and teachers') },
                    { value: 'parent-student', label: `👨‍👩‍👧 ${t('modals.audienceParents','Parents & Students')}`, desc: t('modals.audienceParentsDesc','Parents and students see this') },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedAudience(opt.value)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all ${
                        selectedAudience === opt.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-1">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 hidden sm:block">{opt.desc}</span>
                      {selectedAudience === opt.value && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.content', 'Content')}</label>
                <textarea name="content" required rows={4} placeholder="Write the details of the notice here..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.expiryDate', 'Expiry Date (Ethiopian Calendar)')}</label>
                <EthiopianDatePicker
                  value={noticeExpiryEthDate}
                  onChange={(gregorianIso) => {
                    setNoticeExpiryEthDate(gregorianIso);
                  }}
                  placeholder="Select Ethiopian expiry date"
                  className="w-full"
                />
                <input name="expiresAt" type="hidden" value={noticeExpiryEthDate} />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={postingNotice}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {postingNotice ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Bell size={18} />
                  )}
                  <span>{postingNotice ? t('modals.publishing', 'Publishing...') : t('modals.publishNotice', 'Publish Notice')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-bold">{successMessage}</span>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-red-50/50 dark:bg-red-900/20">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('modals.deleteEvent', 'Delete Event')}</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-slate-100">"{deletingEvent?.title}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingEvent(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">
                {editingEvent ? t('modals.editEventTitle','Edit Event') : t('modals.addEventTitle','Create New Event')}
              </h3>
              <button
                type="button"
                title="Close event modal"
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                  setEventEthDate('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4 flex-1 overflow-y-auto" onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.eventTitle', 'Event Title')}</label>
                <input
                  name="title"
                  required
                  type="text"
                  defaultValue={editingEvent?.title}
                  placeholder="e.g. Parent-Teacher Meeting"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.dateEth', 'Date (Ethiopian)')}</label>
                  <EthiopianDatePicker
                    value={eventEthDate}
                    onChange={setEventEthDate}
                    placeholder="YYYY-MM-DD"
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.type', 'Type')}</label>
                  <select
                    name="type"
                    title="Select event type"
                    required
                    defaultValue={editingEvent?.type}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Event">Event</option>
                    <option value="Exam">Exam</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('modals.description', 'Description (Optional)')}</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingEvent?.description || ''}
                  placeholder="Event details..."
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2">
                  <Calendar size={18} />
                  <span>{editingEvent ? t('modals.updateEvent', 'Update Event') : t('modals.createEvent', 'Create Event')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
