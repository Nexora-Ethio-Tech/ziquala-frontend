
import {
  TrendingUp,
  Users,
  DollarSign,
  Building2,
  Filter,
  Download,
  AlertCircle,
  Zap,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/useStore';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { exportToCSV } from '../utils/exportUtils';
import { dashboardService } from '../services/dashboardService';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';

const trafficColor = (value: number) => {
  if (value >= 90) return { bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Healthy' };
  if (value >= 75) return { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Attention' };
  return { bg: 'bg-rose-50 dark:bg-rose-900/10', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500', label: 'Critical' };
};

const feeTrafficColor = (value: number) => {
  if (value >= 95) return { bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Healthy' };
  if (value >= 80) return { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Attention' };
  return { bg: 'bg-rose-50 dark:bg-rose-900/10', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500', label: 'Critical' };
};

type BranchAnalyticsRow = {
  id: string;
  name: string;
  location: string;
  collected: number;
  expected: number;
  percent: number;
  students: number;
};

type AnalyticsResponse = {
  scope: 'global' | 'branch';
  selectedBranch: BranchAnalyticsRow | null;
  overview: {
    feeCollected: number;
    feeExpected: number;
    feePercent: number;
    studentAttendance: number;
    staffAttendance: number;
    currentStudents: number;
    lastMonthStudents: number;
    enrollmentGrowth: number;
    yearlyStudentCollections: number;
    yearlyStaffPayments: number;
    overdueCount?: number;
    overdueAmount?: number;
  };
  branchPerformance: BranchAnalyticsRow[];
};

export const Analytics = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedBranchId } = useStore();
  const { selectedBranch } = useUser();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardService.getSuperAdminAnalytics(selectedBranchId || null);
        setAnalytics(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedBranchId]);

  const overview = analytics?.overview;
  const feeColor = feeTrafficColor(overview?.feePercent || 0);
  const studentAttColor = trafficColor(overview?.studentAttendance || 0);
  const branchPerformance = selectedBranchId && analytics?.selectedBranch
    ? [analytics.selectedBranch]
    : analytics?.branchPerformance || [];

  const selectedBranchLabel = selectedBranch?.name || analytics?.selectedBranch?.name || 'All Branches';

  const handleExport = () => {
    const dataToExport: any[] = branchPerformance.map(b => ({
      Branch: b.name,
      Collected: typeof b.collected === 'number' ? b.collected.toLocaleString() : b.collected,
      Expected: typeof b.expected === 'number' ? b.expected.toLocaleString() : b.expected,
      Performance: `${b.percent}%`,
      Students: b.students
    }));

    if (overview) {
      dataToExport.push({
        Branch: 'Total Health Summary',
        Collected: `Fee Collected: ${overview.feePercent}%`,
        Expected: `Student Att: ${overview.studentAttendance}%`,
        Performance: `Staff Att: ${overview.staffAttendance}%`,
        Students: `Total Students: ${overview.currentStudents}`
      });
    }

    exportToCSV(dataToExport, 'School_Analytics_Health');
  };

  const metricCardText = useMemo(() => {
    if (selectedBranchId) {
      return `Viewing ${selectedBranchLabel}`;
    }
    return 'Viewing all branches';
  }, [selectedBranchId, selectedBranchLabel]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-bold">
          <Loader2 className="animate-spin" size={18} />
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('analytics.title', 'School Health at a Glance')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('analytics.subtitle', 'Assess in 10 seconds. Green = Good. Yellow = Attention. Red = Act Now.')} {metricCardText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest">
            <Filter size={16} />
            {t('analytics.thisYear', 'This Year')}
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest active:scale-95"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3 text-amber-800 dark:text-amber-200">
          <AlertCircle size={18} />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* The "Big Three" Traffic Light Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Health */}
        <div className={`${feeColor.bg} ${feeColor.border} border-2 rounded-[2.5rem] p-8 transition-all hover:shadow-xl group`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${feeColor.dot} animate-pulse`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${feeColor.text}`}>{feeColor.label}</span>
            </div>
            <DollarSign size={24} className={`${feeColor.text} group-hover:scale-110 transition-transform`} />
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{t('analytics.moneyIn', 'Money In')}</p>
              <h3 className="text-4xl font-black text-slate-800 dark:text-white">{((overview?.feeCollected || 0) / 1000000).toFixed(1)}M <span className="text-base font-bold text-slate-400">ETB</span></h3>
          <div className="mt-6 space-y-3">
            <button 
              onClick={() => {
                const element = document.getElementById('branch-collection-status');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors text-left"
            >
              <span className="text-slate-400">{t('analytics.collectionRate', 'Collection Rate')}</span>
              <span className={feeColor.text}>{overview?.feePercent || 0}%</span>
            </button>
            <div className="h-3 bg-white/50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
              <div
                    className={`h-full rounded-full transition-all duration-1000 ${(overview?.feePercent || 0) >= 95 ? 'bg-emerald-500' : (overview?.feePercent || 0) >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${overview?.feePercent || 0}%` }}
              />
            </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic tracking-wide">{t('analytics.missingPayments', 'Missing Payments')}: {Math.max(0, ((overview?.feeExpected || 0) - (overview?.feeCollected || 0)) / 1000).toFixed(0)}K ETB</p>
          </div>
        </div>

        {/* Daily Pulse */}
        <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-2 rounded-[2.5rem] p-8 transition-all hover:shadow-xl group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('analytics.cashflowPulse', 'Yearly Cashflow Pulse')}</span>
            </div>
            <Users size={24} className="text-slate-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{t('analytics.dailyPulse', 'Daily Pulse')}</p>
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('analytics.students', 'Students')}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t('analytics.collectedThisYear', 'Collected This Year')}</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
                {Number(overview?.yearlyStudentCollections || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ETB</span>
              </h3>
            </div>
            <div className="border-l border-slate-100 dark:border-slate-800 pl-6">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('analytics.staff', 'Staff')}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">{t('analytics.paidThisYear', 'Paid This Year')}</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
                {Number(overview?.yearlyStaffPayments || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ETB</span>
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* {t('analytics.keyTakeaway', 'Key Takeaway')}s */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/30">
            <Zap size={18} />
          </div>
          <h3 className="font-black text-lg uppercase tracking-tight">Key Takeaway</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">{t('analytics.financeAlert', 'Finance Alert')}</span>
            </div>
            <p className="text-sm font-medium text-slate-200">
              <span className="text-amber-400 font-black">{analytics?.overview?.overdueCount || 0} students</span> are over 30 days late on payments totaling <span className="font-black">{(analytics?.overview?.overdueAmount || 0).toLocaleString()} ETB</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Simplified Branch Performance */}
      <div id="branch-collection-status" className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 transition-all duration-500">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8">{t('analytics.branchStatus', 'Branch Collection Status')}</h3>
        <div className="space-y-8">
          {branchPerformance.map((branch, i) => {
            const bColor = trafficColor(branch.percent);
            return (
              <div key={i} className="group space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${bColor.dot} shadow-lg ${bColor.dot.replace('bg-', 'shadow-')}`} />
                    <span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{branch.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md ml-2">{branch.students} Students</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{Number(branch.collected).toLocaleString()} / {Number(branch.expected).toLocaleString()}</span>
                    <span className={`text-xs font-black ${bColor.text}`}>{branch.percent}%</span>
                  </div>
                </div>
                <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${branch.percent >= 90 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : branch.percent >= 75 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'}`}
                    style={{ width: `${branch.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
