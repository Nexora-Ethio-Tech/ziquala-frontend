
import { Users, GraduationCap, Clock, TrendingUp, Lock, Unlock, Megaphone, Plus, X, Bell, Book, BookOpen, AlertTriangle, ShieldAlert, ArrowRight, ArrowLeft, Trash2, Edit, Calendar, CheckCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/useStore';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '../services/dashboardService';
import { getDashboard as getSchoolAdminDashboard, getBranchTeachers, getBranchUsers, getAtRiskStudents, getUpcomingEvents, createEvent, updateEvent, deleteEvent, type AtRiskStudent, type Event } from '../services/schoolAdminService';
import classService from '../services/classService';
import settingsService from '../services/settingsService';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
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
  const [selectedAtRiskStudent, setSelectedAtRiskStudent] = useState<AtRiskStudent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const [data, studentsRes, teachersRes, classesRes, pendingStudentsRes, atRiskData, eventsData] = await Promise.all([
            getSchoolAdminDashboard(),
            getBranchUsers('student', 'Approved'),
            getBranchTeachers(),
            classService.getAllClasses(),
            getBranchUsers('student', 'Pending'),
            getAtRiskStudents(),
            getUpcomingEvents(5)
          ]);

          // Handle different response formats
          const approvedCount = Array.isArray(studentsRes) ? studentsRes.length : (studentsRes?.data?.length || 0);
          const teachersCount = Array.isArray(teachersRes) ? teachersRes.filter((t: any) => t.status === 'Approved').length : ((teachersRes?.data || []).filter((t: any) => t.status === 'Approved').length || 0);
          const classesCount = Array.isArray(classesRes) ? classesRes.length : (classesRes?.data?.length || 0);
          const pendingCount = Array.isArray(pendingStudentsRes) ? pendingStudentsRes.length : (pendingStudentsRes?.data?.length || 0);

          setSchoolAdminStats({
            ...data,
            totalStudents: approvedCount,
            totalTeachers: teachersCount,
            totalClasses: classesCount,
            pendingApplications: pendingCount
          });
          setAtRiskStudents(atRiskData.students || []);
          setUpcomingEvents(eventsData || []);
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
    try {
      await createEvent({
        title: formData.get('title') as string,
        date: formData.get('date') as string,
        type: formData.get('type') as string,
        description: formData.get('description') as string || undefined
      });
      setShowEventModal(false);
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
    try {
      await updateEvent(editingEvent.id, {
        title: formData.get('title') as string,
        date: formData.get('date') as string,
        type: formData.get('type') as string,
        description: formData.get('description') as string || undefined
      });
      setShowEventModal(false);
      setEditingEvent(null);
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

  const selectedBranchReport = selectedBranchId
    ? branchReports.find((report) => report?.branchId === selectedBranchId || report?.branch?.id === selectedBranchId) || null
    : null;

  const totalBranchStaff = dashboardStats?.usersByRole?.reduce(
    (sum: number, role: any) => sum + Number(role.count || 0),
    0
  ) ?? 0;

  const selectedBranchStaffCount = selectedBranchReport
    ? (
      selectedBranchReport.totalStaff ?? selectedBranchReport.usersByRole?.reduce(
        (sum: number, role: any) => sum + Number(role.count || 0),
        0
      ) ?? 0
    )
    : 0;

  const selectedBranchTeacherCount = selectedBranchReport
    ? (
      selectedBranchReport.totalTeachers ??
      (selectedBranchReport.usersByRole?.find((role: any) => role.role === 'teacher')?.count ?? 0)
    )
    : 0;

  const selectedBranchStaffRoles = selectedBranchReport?.usersByRole?.filter((role: any) => {
    const normalized = (role.role || '').toString().toLowerCase();
    return normalized !== 'teacher' && normalized !== 'student';
  }) || [];

  // Fetch branch reports for Super Admin
  useEffect(() => {
    const fetchBranchReports = async () => {
      if (role === 'super-admin' && branches.length > 0) {
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
        }
      }
    };
    fetchBranchReports();
  }, [role, branches]);

  if (role === 'super-admin') {
    // Use ONLY real API data - no fallback
    const branchHealth = branches.map((branch) => {
      // Now report is the actual data object, not wrapped in response
      const report = branchReports.find(
        (r) => r?.branchId === branch.id || r?.branch?.id === branch.id
      );
      console.log('🏥 Branch Health for', branch.name, '- Report found:', !!report, report);

      if (!report) {
        return null; // Skip branches without API data
      }

      const teacherCount = (
        report.totalTeachers ?? report.usersByRole?.find((role: any) => role.role === 'teacher')?.count
      ) || 0;
      const staffCount = report.totalStaff ?? report.usersByRole?.reduce(
        (sum: number, role: any) => sum + Number(role.count || 0),
        0
      ) ?? 0;

      return {
        ...branch,
        students: report.totalStudents,
        teachers: teacherCount,
        staff: staffCount,
        attendance: report.attendanceRate?.toFixed(1),
        finance: report.netProfit > 0 ? 'Stable' : 'Attention',
        risk: report.attendanceRate < 85 ? 'Attendance' : 'Normal'
      };
    }).filter(Boolean); // Remove null entries


    if (!selectedBranch) {
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
            {loading ? (
              <div className="col-span-5 text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 mt-2">Loading dashboard stats...</p>
              </div>
            ) : error ? (
              <div className="col-span-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
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
              icon={Users}
              label="Total Branch Staff"
              value={totalBranchStaff.toLocaleString?.() || totalBranchStaff.toString()}
              color="bg-slate-600"
            />
            <StatCard
              icon={Clock}
              label="Total Branches"
              value={dashboardStats?.totalBranches?.toString() || "0"}
              color="bg-orange-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Pending Approvals"
              value={dashboardStats?.pendingUsers?.toString() || "0"}
              color="bg-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('dashboard.branchHealth')}</h3>
                  <p className="text-sm text-slate-500">{t('dashboard.aggregateSnapshot')}</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{t('dashboard.aggregateOnly')}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[780px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('dashboard.branch')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.students')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.teachers')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.attendance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {branchHealth.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-sm text-slate-500 mt-2">Loading branch reports...</p>
                          </div>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


          </div>
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

        {/* Branch Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Users size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.students')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedBranchReport?.totalStudents ?? 0}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">+2.1% this term</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl"><GraduationCap size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.teachers')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedBranchTeacherCount}</p>
            <p className="text-xs text-slate-500 font-bold mt-1">Teaching staff only</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><Users size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Staff</p>
                <p className="text-xs text-slate-500 mt-1">Role breakdown for this branch</p>
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedBranchStaffCount}</p>
            {selectedBranchStaffRoles.length ? (
              <div className="mt-4 space-y-2">
                {selectedBranchStaffRoles.map((role: any) => (
                  <div key={role.role} className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">{role.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                    <span className="font-black">{role.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-bold mt-1">All branch employees</p>
            )}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl"><Clock size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.attendance')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedBranchReport?.attendance ? `${selectedBranchReport.attendance}%` : 'N/A'}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">+0.7% vs last week</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Switch Branch</h3>
                <p className="text-xs text-slate-500">Select another branch to inspect</p>
              </div>
            </div>
            <div className="p-6 space-y-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => {
                    setSelectedBranchId(branch.id);
                    setSelectedBranch(branch);
                  }}
                  className={`w-full p-3 rounded-xl text-left text-sm font-bold transition-all ${branch.id === selectedBranch.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 border border-transparent hover:border-slate-200'}`}>
                  {branch.name}
                </button>
              ))}
            </div>
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
              <p className="text-sm font-medium text-blue-100 mb-1">Welcome back,</p>
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
                <span className="text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
                Grade Insertion is {gradesLocked ? 'LOCKED' : 'OPEN'}
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
            {((role as string) === 'school-admin' || isSuperAdmin) && (
              <button
                onClick={() => handleToggleGradesLock(!gradesLocked)}
                className={`w-full sm:w-auto px-6 py-2 rounded-lg font-bold transition-colors ${gradesLocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
              >
                {gradesLocked ? 'Open Insertion' : 'Close Insertion'}
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
              label="Total Students"
              value={schoolAdminStats.totalStudents?.toLocaleString() || '0'}
              trend="+4.3%"
              color="bg-blue-600"
            />
            <StatCard
              icon={GraduationCap}
              label="Total Teachers"
              value={schoolAdminStats.totalTeachers?.toString() || '0'}
              color="bg-purple-600"
            />
            <StatCard
              icon={Clock}
              label="Total Classes"
              value={schoolAdminStats.totalClasses?.toString() || '0'}
              color="bg-orange-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Pending Applications"
              value={schoolAdminStats.pendingApplications?.toString() || '0'}
              color="bg-emerald-500"
            />
          </>
        ) : loading ? (
          <div className="col-span-4 text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-2">Loading dashboard...</p>
          </div>
        ) : null}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <Megaphone size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">School Notice Board</h3>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowNoticeModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 md:p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] md:text-xs font-bold"
            >
              <Plus size={14} className="md:w-4 md:h-4" />
              <span className="hidden xs:inline">Post Notice</span>
              <span className="xs:hidden">Post</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {notices.filter(n => !role || !n.audience || n.audience.includes(role)).map((notice) => (
            <div key={notice.id} className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${notice.category === 'Logistics' ? 'bg-amber-100 text-amber-700' :
                    notice.category === 'Finance' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
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
                        onClick={() => deleteNotice(notice.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {notice.expiresAt && <span className="text-[10px] text-rose-400 italic font-medium">Expires: {formatEthiopianLabel(notice.expiresAt)}</span>}
                </div>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{notice.title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {notice.content}
              </p>
              {notice.category === 'Logistics' && (notice as any).driverName && (
                <p className="text-[10px] font-bold text-amber-600 mt-2">Posted by: {(notice as any).driverName}</p>
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
                    <div 
                      key={student.student_id} 
                      onClick={() => setSelectedAtRiskStudent(student)}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${student.risk_level === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{student.grade} • {student.risk_level} Risk</p>
                          <p className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold mt-0.5">{student.risk_factor}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAtRiskStudent(student);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="View 1st Semester Detailed Results"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Upcoming Events</h3>
            {role === 'school-admin' && (
              <button
                onClick={() => {
                  setEditingEvent(null);
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Post New Notice</h3>
              <button type="button" title="Close notice modal" onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addNotice({
                title: formData.get('title') as string,
                content: formData.get('content') as string,
                priority: formData.get('priority') as any,
                category: formData.get('category') as any,
                expiresAt: formData.get('expiresAt') as string,
                audience: ['super-admin', 'school-admin', 'vice-principal', 'teacher', 'student', 'parent']
              });
              setShowNoticeModal(false);
            }}>
              <div className="space-y-1">
                <label htmlFor="notice-title" className="text-[10px] font-bold text-slate-500 uppercase">Notice Title</label>
                <input id="notice-title" name="title" required type="text" placeholder="e.g. Public Holiday Announcement" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="notice-category" className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                  <select id="notice-category" name="category" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="Academic">Academic</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="notice-priority" className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                  <select id="notice-priority" name="priority" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="notice-content" className="text-[10px] font-bold text-slate-500 uppercase">Content</label>
                <textarea id="notice-content" name="content" required rows={4} placeholder="Write the details of the notice here..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label htmlFor="notice-expiry" className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date (Ethiopian Calendar)</label>
                <EthiopianDatePicker
                  value=""
                  onChange={(gregorianDate) => {
                    // Set the hidden input for form submission
                    const input = document.querySelector('input[name="expiresAt"]') as HTMLInputElement;
                    if (input) input.value = gregorianDate;
                  }}
                  placeholder="Select Ethiopian date"
                />
                <input
                  name="expiresAt"
                  type="hidden"
                  defaultValue=""
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2">
                  <Bell size={18} />
                  <span>Publish Notice</span>
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
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Delete Event</h3>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button type="button" title="Close event modal" onClick={() => {
                setShowEventModal(false);
                setEditingEvent(null);
              }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}>
              <div className="space-y-1">
                <label htmlFor="event-title" className="text-[10px] font-bold text-slate-500 uppercase">Event Title</label>
                <input
                  id="event-title"
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
                  <label htmlFor="event-date" className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                  <input
                    id="event-date"
                    name="date"
                    required
                    type="date"
                    defaultValue={editingEvent?.date}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="event-type" className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                  <select
                    id="event-type"
                    name="type"
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
                <label htmlFor="event-description" className="text-[10px] font-bold text-slate-500 uppercase">Description (Optional)</label>
                <textarea
                  id="event-description"
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
                  <span>{editingEvent ? 'Update Event' : 'Create Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* At-Risk Student Detail Modal */}
      {selectedAtRiskStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">First Semester Academic Performance</h3>
                  <p className="text-xs text-slate-500 font-medium">Priority Watchlist Student Detailed Results</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAtRiskStudent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Student Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {selectedAtRiskStudent.risk_level} Risk (&lt; 50%)
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedAtRiskStudent.digital_id || 'N/A'}</span>
                  </div>
                  <h4 className="text-xl font-black text-white">{selectedAtRiskStudent.name}</h4>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{selectedAtRiskStudent.grade} • {selectedAtRiskStudent.risk_factor}</p>
                </div>

                <div className="text-left sm:text-right bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10 w-full sm:w-auto">
                  <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">1st Sem Average</p>
                  <p className={`text-2xl font-black ${Number(selectedAtRiskStudent.average_grade) < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedAtRiskStudent.average_grade}%
                  </p>
                </div>
              </div>

              {/* Course Scores Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Course Breakdown ({selectedAtRiskStudent.courses?.length || 0} Subjects)
                  </h5>
                  <span className="text-xs font-semibold text-rose-500">Passing Grade: 50%</span>
                </div>

                {!selectedAtRiskStudent.courses || selectedAtRiskStudent.courses.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500">No course grades recorded yet for this semester.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-800">
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4 text-center">Score / Max</th>
                          <th className="py-3 px-4 text-center">Percentage</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                        {selectedAtRiskStudent.courses.map((course) => (
                          <tr key={course.course_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 dark:text-slate-100 capitalize">{course.course_name}</span>
                              {course.course_code && (
                                <span className="block text-[10px] text-slate-400 font-mono">{course.course_code}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {course.score} / {course.total}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-black ${course.percentage < 50 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {course.percentage}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                course.percentage < 50
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {course.percentage < 50 ? 'Needs Improvement' : 'Passing'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <Link
                to={`/students/${selectedAtRiskStudent.student_id}`}
                onClick={() => setSelectedAtRiskStudent(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>View Full Student Profile</span>
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedAtRiskStudent(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
