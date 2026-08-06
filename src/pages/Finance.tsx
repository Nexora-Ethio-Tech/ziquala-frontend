
import { CreditCard, ArrowUpRight, ArrowDownRight, Search, FileText, Users, Plus, X, Check, AlertCircle, Bell, History, ShieldCheck, Clock, Filter, ChevronDown, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { exportToCSV } from '../utils/exportUtils';
import { useTranslation } from 'react-i18next';
import { useEffect, useCallback } from 'react';
import FinanceClerkRegistration from '../components/FinanceClerkRegistration';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { ethiopianToGregorianIso, gregorianToEthiopian, getTodayEthiopianDate, getEthiopianYear } from '../utils/ethiopianCalendar';
import { API_HOST_URL } from '../config/api';

const API = API_HOST_URL || '';

const getToken = () => localStorage.getItem('ziquala_token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

interface PaymentLog {
  status: boolean;
  modifiedBy: string;
  approverName: string;
  timestamp: string;
}

interface AuditLogItem extends PaymentLog {
  studentName: string;
  studentId: string;
  section: string;
  category: 'Fees' | 'Staff';
  direction: 'In' | 'Out';
  actionLabel: string;
  amount?: number;
  actionType?: string;
  userRole?: string;
}

type NetProfitSummary = {
  totalIn: number;
  totalOut: number;
  netProfit: number;
  breakdown?: {
    totalIn: number;
    totalExpenses: number;
    totalPayroll: number;
    totalLoans: number;
    totalOut: number;
  };
};

/**
 * Parse a date value safely in LOCAL time so plain YYYY-MM-DD strings
 * (from PostgreSQL DATE columns) are not shifted by the UTC offset.
 */
const parseDateLocal = (value: string): Date | null => {
  if (!value) return null;
  // Plain date string YYYY-MM-DD → parse as local midnight to avoid UTC shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // ISO datetime string → use Date constructor (UTC-based, but includes time)
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value: string) => {
  if (!value) return value;

  // For Ethiopian label: pass the raw string to gregorianToEthiopian.
  // It will shift ISO datetime strings to EAT before converting, so stored
  // UTC timestamps display the correct East Africa day.
  const { year, month, day } = gregorianToEthiopian(value);
  const ETHIOPIAN_MONTHS = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];
  const label = `${day} ${ETHIOPIAN_MONTHS[month - 1]} ${year} E.C.`;

  // Add time display (EAT) only for full datetime strings
  let timeStr = '';
  if (value.includes('T')) {
    const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
    const eatDate = new Date(new Date(value).getTime() + EAT_OFFSET_MS);
    const hh = String(eatDate.getUTCHours()).padStart(2, '0');
    const mm = String(eatDate.getUTCMinutes()).padStart(2, '0');
    timeStr = `${hh}:${mm}`;
  }
  return timeStr ? `${label} · ${timeStr}` : label;
};

export const Finance = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role, user } = useUser();
  const isAdmin = role === 'super-admin' || role === 'school-admin';
  const isSuperAdmin = role === 'super-admin';
  const isClerk = role === 'finance-clerk';
  const canCreateTransaction = isClerk;

  const todayEth = getTodayEthiopianDate();
  const currentECYear = getEthiopianYear(new Date());

  const [showForm, setShowForm] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<{ name: string, logs: PaymentLog[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDateTime, setFromDateTime] = useState(`${currentECYear}-01-01`);
  const [toDateTime, setToDateTime] = useState(todayEth);
  const [netProfitSummary, setNetProfitSummary] = useState<NetProfitSummary | null>(null);
  const [netProfitLoading, setNetProfitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [enrollmentQueue, setEnrollmentQueue] = useState<any[]>([]);

  const [paymentStatus, setPaymentStatus] = useState<Record<string, PaymentLog[]>>({});

  const [activeView, setActiveView] = useState<'main' | 'other-transactions' | 'registration'>('main');
  const [dbSummary, setDbSummary] = useState<any>(null);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'registration' | 'monthly'>('all');
  const [verifiedByFilter, setVerifiedByFilter] = useState('');
  const [txCategory, setTxCategory] = useState('Student Fee');
  const [customCategory, setCustomCategory] = useState('');
  const [otherTxPage, setOtherTxPage] = useState(0);
  const OTHER_TX_PAGE_SIZE = 10;
  const [mainTxPage, setMainTxPage] = useState(0);
  const MAIN_TX_PAGE_SIZE = 15;

  const fetchData = useCallback(async () => {
    if (!isAdmin) return; // finance-clerk uses /finance-dashboard, not this page
    try {
      const [sumRes, txRes] = await Promise.all([
        fetch(`${API}/api/finance/summary`, { headers: authHeaders() }),
        fetch(`${API}/api/finance/transactions`, { headers: authHeaders() })
      ]);
      if (sumRes.ok) {
        setDbSummary(await sumRes.json());
      } else {
        console.error('Finance summary fetch failed:', sumRes.status, await sumRes.text());
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setDbTransactions(Array.isArray(txData) ? txData : []);
      } else {
        console.error('Finance transactions fetch failed:', txRes.status, await txRes.text());
      }
    } catch (err) {
      console.error('Failed to fetch finance data', err);
    }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const matchesRange = (timestamp: string) => {
    if (!timestamp) return true;
    // Use local time parsing to avoid UTC shift on plain date strings
    const current = parseDateLocal(timestamp);
    const fromGregStr = ethiopianToGregorianIso(fromDateTime);
    const toGregStr = ethiopianToGregorianIso(toDateTime);
    const from = fromGregStr ? new Date(fromGregStr + 'T00:00:00') : null;
    const to = toGregStr ? new Date(toGregStr + 'T23:59:59') : null;
    if (!current || !from || !to || Number.isNaN(current.getTime()) || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return true;
    }
    return current >= from && current <= to;
  };

  // Derive unique verified_by names from ALL student-fee transactions
  const uniqueVerifiedBy = Array.from(
    new Set(
      dbTransactions
        .filter(tx => tx.student_id && tx.verified_by)
        .map(tx => (tx.verified_by as string).trim())
        .filter(Boolean)
    )
  ).sort();

  useEffect(() => {
    setOtherTxPage(0);
    setMainTxPage(0);
  }, [searchTerm, fromDateTime, toDateTime, verifiedByFilter, transactionTypeFilter]);

  const isRegistrationType = (type: string) => {
    const t = (type || '').toLowerCase();
    return t.includes('registration');
  };

  const isStudentFeeType = (type: string) => {
    const t = (type || '').toLowerCase();
    return t.includes('monthly') ||
           t.includes('tuition') ||
           t.includes('bus') ||
           t.includes('penalty') ||
           t.includes('payment');
  };

  const otherTransactions = dbTransactions.filter(
    tx => !tx.student_id && !isStudentFeeType(tx.type) && !isRegistrationType(tx.type)
  );

  const filteredOtherTransactions = otherTransactions.filter((tx) => {
    const matchesSearch =
      (tx.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.description || tx.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.verified_by || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.branch_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRange(tx.date) && matchesSearch;
  });

  const totalOtherPages = Math.ceil(filteredOtherTransactions.length / OTHER_TX_PAGE_SIZE);
  const paginatedOtherTransactions = filteredOtherTransactions.slice(
    otherTxPage * OTHER_TX_PAGE_SIZE,
    (otherTxPage + 1) * OTHER_TX_PAGE_SIZE
  );

  const filteredTransactions = dbTransactions.filter((tx) => {
    // Only student-related transactions
    const isStudentRelated = tx.student_id || isStudentFeeType(tx.type) || isRegistrationType(tx.type);
    if (!isStudentRelated) return false;

    const matchesSearch =
      (tx.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.verified_by || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesRange(tx.date) || !matchesSearch) return false;

    // Verified By filter (only for student-fee transactions)
    if (verifiedByFilter && (tx.verified_by || '').trim() !== verifiedByFilter) return false;

    if (activeView === 'main') {
      const type = (tx.type || '').toLowerCase();
      if (transactionTypeFilter === 'registration') {
        return type.includes('registration');
      }
      if (transactionTypeFilter === 'monthly') {
        return !type.includes('registration');
      }
    }
    return true;
  });

  const paginatedMainTransactions = filteredTransactions.slice(
    mainTxPage * MAIN_TX_PAGE_SIZE,
    (mainTxPage + 1) * MAIN_TX_PAGE_SIZE
  );
  const totalMainPages = Math.ceil(filteredTransactions.length / MAIN_TX_PAGE_SIZE);

  const calculateNetProfit = async () => {
    try {
      setNetProfitLoading(true);
      const fromGregStr = ethiopianToGregorianIso(fromDateTime);
      const toGregStr = ethiopianToGregorianIso(toDateTime);

      const params: Record<string, string> = {};
      if (fromGregStr) params.startDate = fromGregStr;
      if (toGregStr) params.endDate = toGregStr;

      const queryStr = new URLSearchParams(params).toString();
      const res = await fetch(`${API}/api/finance/net-profit?${queryStr}`, {
        headers: authHeaders()
      });

      if (res.ok) {
        const body = await res.json();
        setNetProfitSummary(body.data);
      } else {
        console.error('Failed to calculate net profit:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Failed to calculate net profit', err);
    } finally {
      setNetProfitLoading(false);
    }
  };

  const handleExport = () => {
    const ETHIOPIAN_MONTHS_EXP = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];
    const toEthDate = (dateStr: string) => {
      if (!dateStr) return '';
      const d = parseDateLocal(dateStr);
      if (!d) return dateStr;
      const { year, month, day } = gregorianToEthiopian(d);
      return `${day} ${ETHIOPIAN_MONTHS_EXP[month - 1]} ${year} E.C.`;
    };

    const dataToExport = activeView === 'other-transactions'
      ? filteredOtherTransactions.map(tx => ({
        Date_EC: toEthDate(tx.date),
        Type: tx.type,
        Category: tx.amount < 0 ? 'Expense' : 'Income',
        Branch: tx.branch_name || 'Global',
        'Amount (ETB)': tx.amount,
        VerifiedBy: tx.verified_by,
        Description: tx.description || tx.details || ''
      }))
      : filteredTransactions.map(tx => ({
        Category: tx.type,
        Description: tx.student_name,
        ApprovedBy: tx.verified_by,
        Date_EC: toEthDate(tx.date),
        Type: tx.type,
        'Amount (ETB)': tx.amount
      }));

    exportToCSV(dataToExport, activeView === 'other-transactions' ? 'Other_Transactions' : 'Finance_Ledger');
  };

  const togglePayment = (id: string) => {
    const currentLogs = paymentStatus[id] || [];
    const lastStatus = currentLogs.length > 0 ? currentLogs[0].status : false;

    const newLog: PaymentLog = {
      status: !lastStatus,
      modifiedBy: user?.name || 'Unknown Officer',
      approverName: user?.name || 'Unknown Officer',
      timestamp: new Date().toISOString()
    };

    setPaymentStatus(prev => ({
      ...prev,
      [id]: [newLog, ...currentLogs]
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          {t('finance.back')}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-900/20 relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t('finance.totalRevenue')}</p>
            <h3 className="text-4xl font-black tracking-tight">{(dbSummary?.total_revenue || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></h3>
            <div className="mt-8 flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-white/5 w-fit px-3 py-1 rounded-full">
              <ArrowUpRight size={14} />
              <span>+12% {t('finance.trend')}</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CreditCard size={140} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t('finance.pendingFees')}</p>
          <h3 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">{(dbSummary?.pending_fees_count ?? dbSummary?.pending_fees ?? 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">Students</span></h3>
          <div className="mt-8 flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 w-fit px-3 py-1 rounded-full">
            <ArrowDownRight size={14} />
            <span>Unpaid Monthly Fee</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Monthly Fees</p>
          <h3 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">{(dbSummary?.monthly_fees_collected ?? dbSummary?.monthly_fees ?? 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></h3>
          <div className="mt-8 flex items-center gap-2 text-purple-500 text-[10px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 w-fit px-3 py-1 rounded-full">
            <ArrowUpRight size={14} />
            <span>{(dbSummary?.monthly_fees_paid_count ?? 0).toLocaleString()} Students Paid</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Other Transactions</p>
          <h3 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">{(dbSummary?.other_transactions_collected ?? 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></h3>
          <div className="mt-8 flex items-center gap-2 text-indigo-500 text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 w-fit px-3 py-1 rounded-full">
            <ArrowUpRight size={14} />
            <span>Non-Student Tx</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t('finance.registrationFees')}</p>
          <h3 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">{(dbSummary?.registration_fees || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></h3>
          <div className="mt-8 flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 w-fit px-3 py-1 rounded-full">
            <ArrowUpRight size={14} />
            <span>{t('finance.monthlyTarget')}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-6 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
              <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveView('main')}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'main' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  {isAdmin ? t('finance.summaries') : t('finance.transactions')}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveView('other-transactions')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'other-transactions' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    Other Transactions
                  </button>
                )}
                {isClerk && (
                  <button
                    onClick={() => setActiveView('registration')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'registration' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                  >
                    📋 Registrations
                  </button>
                )}
              </div>
              {canCreateTransaction && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                >
                  <Plus size={16} />
                  <span>New TX</span>
                </button>
              )}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder={t('finance.searchLedger')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none w-full sm:w-64 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleExport}
                className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2 whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-2xl border border-blue-100 dark:border-blue-800"
              >
                <FileText size={16} />
                <span>{t('finance.export')}</span>
              </button>
            </div>
          </div>
          {activeView === 'main' && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              {/* ── Fee Type filter ── */}
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type:</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5 border border-slate-200/50 dark:border-slate-700">
                {(['all', 'registration', 'monthly'] as const).map((filter) => {
                  const labels: Record<string, string> = {
                    all: 'All',
                    registration: 'Registration Fee',
                    monthly: 'Monthly Fee',
                  };
                  const isActive = transactionTypeFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTransactionTypeFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md border border-slate-250 dark:border-slate-700'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                })}
              </div>

              {/* ── Verified By filter ── */}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verified By:</span>
                <div className="relative">
                  <select
                    id="verifiedByFilter"
                    value={verifiedByFilter}
                    onChange={(e) => { setVerifiedByFilter(e.target.value); setMainTxPage(0); }}
                    className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer min-w-[160px]"
                  >
                    <option value="">All Officers</option>
                    {uniqueVerifiedBy.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
                {verifiedByFilter && (
                  <button
                    type="button"
                    onClick={() => { setVerifiedByFilter(''); setMainTxPage(0); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 rounded-lg text-[10px] font-black uppercase tracking-wide hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Clear
                  </button>
                )}
              </div>

              {/* Active filter summary badge */}
              {verifiedByFilter && (
                <span className="ml-auto px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  {filteredTransactions.length} result{filteredTransactions.length !== 1 ? 's' : ''} for "{verifiedByFilter}"
                </span>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-[480px]">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{t('finance.from')}</label>
              <EthiopianDatePicker
                value={fromDateTime}
                onChange={setFromDateTime}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">To</label>
              <EthiopianDatePicker
                value={toDateTime}
                onChange={setToDateTime}
              />
            </div>
          </div>
          {isAdmin && activeView === 'main' && (
            <div className="flex flex-col gap-3 lg:ml-auto w-full lg:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end">
                <button
                  onClick={calculateNetProfit}
                  disabled={netProfitLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {netProfitLoading ? 'Calculating…' : 'Net Profit Calculator'}
                </button>
                {netProfitSummary && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-[10px] font-bold text-emerald-700">
                      IN: {netProfitSummary.totalIn.toLocaleString()} ETB
                    </div>
                    <div className="px-3 py-2 bg-rose-50 rounded-lg border border-rose-100 text-[10px] font-bold text-rose-700">
                      OUT: {netProfitSummary.totalOut.toLocaleString()} ETB
                    </div>
                    <div className={`px-3 py-2 rounded-lg border text-[10px] font-bold ${netProfitSummary.netProfit >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                      PROFIT: {netProfitSummary.netProfit.toLocaleString()} ETB
                    </div>
                  </div>
                )}
              </div>
              {netProfitSummary?.breakdown && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest self-center">Breakdown:</span>
                  <span className="px-2.5 py-1 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-700">
                    Fees &amp; Income: {netProfitSummary.breakdown.totalIn.toLocaleString()} ETB
                  </span>
                  <span className="px-2.5 py-1 bg-rose-50 rounded-lg text-[10px] font-bold text-rose-700">
                    Expenses: {netProfitSummary.breakdown.totalExpenses.toLocaleString()} ETB
                  </span>
                  <span className="px-2.5 py-1 bg-orange-50 rounded-lg text-[10px] font-bold text-orange-700">
                    Payroll: {netProfitSummary.breakdown.totalPayroll.toLocaleString()} ETB
                  </span>
                  <span className="px-2.5 py-1 bg-purple-50 rounded-lg text-[10px] font-bold text-purple-700">
                    Loans: {netProfitSummary.breakdown.totalLoans.toLocaleString()} ETB
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          {activeView === 'registration' ? (
            <div className="p-6">
              <FinanceClerkRegistration />
            </div>
          ) : activeView === 'other-transactions' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-300" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Other Transactions</span>
                  <span className="ml-auto text-[10px] font-bold text-slate-300">{filteredOtherTransactions.length} results</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[800px]">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Branch</th>
                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount (ETB)</th>
                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verified By</th>
                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Description/Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {paginatedOtherTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-all duration-200 group/row border-l-4 border-transparent hover:border-blue-500">
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            {formatDateTime(tx.date)}
                          </td>
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                            {tx.type}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              tx.amount < 0
                                ? 'bg-rose-50 text-rose-600 border border-rose-100/50'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                            }`}>
                              {tx.amount < 0 ? 'Expense' : 'Income'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            {tx.branch_name || 'Global'}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold text-xs ${
                            tx.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {tx.amount < 0 ? '-' : ''}{Math.abs(tx.amount).toLocaleString()} ETB
                          </td>
                          <td className="px-6 py-4 text-slate-550 font-semibold text-xs">
                            {tx.verified_by || '—'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">
                            {tx.description || tx.details || '—'}
                          </td>
                        </tr>
                      ))}
                      {filteredOtherTransactions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400">
                            No other transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredOtherTransactions.length > 0 && (
                  <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      {otherTxPage * OTHER_TX_PAGE_SIZE + 1}–{Math.min(filteredOtherTransactions.length, (otherTxPage + 1) * OTHER_TX_PAGE_SIZE)} of {filteredOtherTransactions.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOtherTxPage(p => Math.max(0, p - 1))}
                        disabled={otherTxPage === 0}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold text-slate-600">
                        Page {otherTxPage + 1} of {totalOtherPages}
                      </span>
                      <button
                        onClick={() => setOtherTxPage(p => Math.min(totalOtherPages - 1, p + 1))}
                        disabled={otherTxPage >= totalOtherPages - 1}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : isClerk ? (
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Information</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Settlement Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Alerts & Penalties</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {[].map((student: any) => {
                  const logs = paymentStatus[student.id] || [];
                  const isPaid = logs.length > 0 ? logs[0].status : false;
                  const scholarship = (student as any).isScholarship;
                  const busUser = (student as any).isBusUser;
                  const penalty = (student as any).penaltyFee || 0;
                  const monthly = (student as any).monthlyFee || 0;
                  const bus = (student as any).busFee || 0;
                  const totalExpected = (scholarship ? 0 : monthly) + (busUser ? bus : 0) + penalty;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-all duration-200 group/row border-l-4 border-transparent hover:border-blue-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center text-blue-700 font-black shadow-sm group-hover/row:scale-110 transition-transform duration-300">
                            {student.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{student.name}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-2">
                              Grade {student.grade}
                              {scholarship && (
                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Scholarship</span>
                              )}
                              {busUser && (
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">Bus User</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => !scholarship && !isSuperAdmin && togglePayment(student.id)}
                              disabled={scholarship || isSuperAdmin}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${scholarship
                                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-200/50 hover:shadow-xl hover:shadow-purple-200/50 hover:-translate-y-0.5'
                                  : isPaid
                                    ? 'bg-emerald-100 text-emerald-700 shadow-sm hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                                }`}
                            >
                              {scholarship ? (
                                <Check size={14} />
                              ) : isPaid ? (
                                <Check size={14} />
                              ) : (
                                <div className="w-3.5" />
                              )}
                              <span>{scholarship ? 'COVERED' : isPaid ? 'PAID' : 'PENDING'}</span>
                            </button>

                            {logs.length > 0 && (
                              <button
                                onClick={() => setSelectedHistory({ name: student.name, logs })}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Audit Trail"
                              >
                                <History size={16} />
                              </button>
                            )}
                          </div>

                          {!scholarship && !isPaid && totalExpected > 0 && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Total: {totalExpected.toLocaleString()} ETB
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {!scholarship && !isPaid && (
                          <div className="flex flex-col items-center gap-1">
                            {penalty > 0 && (
                              <div className="flex items-center gap-1 text-rose-500 font-bold text-[10px] animate-pulse">
                                <AlertCircle size={12} />
                                <span>+{penalty} ETB Penalty</span>
                              </div>
                            )}
                            {busUser && (
                              <div className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter">
                                Incl. {bus} ETB Bus Fee
                              </div>
                            )}
                          </div>
                        )}
                        {scholarship && (
                          <div className="text-center text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                            Full Coverage
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isPaid && (
                          <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto">
                            <Bell size={14} />
                            Notify Parent
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <>
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAdmin ? 'Ledger Category' : 'Transaction ID'}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAdmin ? 'Description' : 'Student Name'}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAdmin ? 'Meta Details' : 'Payment Type'}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verified By</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {isAdmin ? (
                  paginatedMainTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-all duration-200 group/row border-l-4 border-transparent hover:border-blue-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shadow-sm group-hover/row:scale-110 transition-transform duration-300 ${tx.type !== 'Expense' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                            {tx.type !== 'Expense' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <span className="font-medium text-slate-800">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{tx.student_name}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">
                          Branch: {tx.branch_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tx.verified_by || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{formatDateTime(tx.date)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${tx.type !== 'Expense' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                        {tx.type === 'Expense' && '-'}
                        {tx.amount.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                ) : (
                  paginatedMainTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-all duration-200 group/row border-l-4 border-transparent hover:border-blue-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shadow-sm group-hover/row:scale-110 transition-transform duration-300 ${tx.type !== 'Expense' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                            {tx.type !== 'Expense' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <span className="font-medium text-slate-800">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{tx.student_name}</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{tx.verified_by}</td>
                      <td className="px-6 py-4 text-slate-500">{formatDateTime(tx.date)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${tx.type !== 'Expense' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                        {tx.type === 'Expense' && '-'}
                        {tx.amount.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                )}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center">
                      <p className="text-sm font-semibold text-slate-400">
                        {verifiedByFilter
                          ? `No transactions found for "${verifiedByFilter}". Try selecting a different finance officer.`
                          : 'No transactions found in the database.'}
                      </p>
                      {verifiedByFilter && (
                        <button
                          type="button"
                          onClick={() => { setVerifiedByFilter(''); setMainTxPage(0); }}
                          className="mt-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                          Clear Filter
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {/* Pagination footer */}
            {filteredTransactions.length > MAIN_TX_PAGE_SIZE && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  Showing {mainTxPage * MAIN_TX_PAGE_SIZE + 1}–{Math.min(filteredTransactions.length, (mainTxPage + 1) * MAIN_TX_PAGE_SIZE)} of {filteredTransactions.length} transactions
                  {verifiedByFilter && <span className="ml-1 text-blue-500">for "{verifiedByFilter}"</span>}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMainTxPage(p => Math.max(0, p - 1))}
                    disabled={mainTxPage === 0}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-400"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Page {mainTxPage + 1} of {totalMainPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMainTxPage(p => Math.min(totalMainPages - 1, p + 1))}
                    disabled={mainTxPage >= totalMainPages - 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-400"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {selectedHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-900/20 border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">Payment Audit Trail</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedHistory.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedHistory(null)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                {selectedHistory.logs.map((log, index) => (
                  <div key={index} className="relative flex items-center gap-6">
                    <div className={`relative z-10 w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-md ${log.status ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                      {log.status ? <Check size={18} /> : <X size={18} />}
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${log.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                          {log.status ? 'Paid' : 'Marked Pending'}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                          <Clock size={12} />
                          {formatDateTime(log.timestamp)}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        Modified by: <span className="text-blue-600">{log.modifiedBy}</span>
                      </p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-1">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Approved by: <span className="text-emerald-600">{log.approverName}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 italic font-medium">Verified by Anti-Corruption Integrity Filter</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">Transparency increases accountability. All actions are immutable and logged.</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Submit New Transaction</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              // Use local YYYY-MM-DD to avoid UTC offset causing previous day to be saved
              const now = new Date();
              const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const data = {
                student_name: f.get('desc'),
                amount: Number(f.get('amount')),
                type: f.get('type'),
                date: localDateStr,
                verified_by: user?.name || 'Unknown',
                branch_id: (user as any).branch_id || 'B001',
                student_id: null
              };
              try {
                const res = await fetch(`${API}/api/finance/transactions`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify(data)
                });
                if (res.ok) {
                  setSuccessMsg('Transaction recorded successfully!');
                  fetchData();
                  setShowForm(false);
                }
              } catch (err) {
                console.error(err);
              }
            }}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                <select
                  name="category"
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="Student Fee">Student Fee</option>
                  <option value="Materials Bought">Materials Bought</option>
                  <option value="Teachers Payment">Teachers Payment</option>
                  <option value="Custom">Custom / Other</option>
                </select>
              </div>

              {txCategory === 'Custom' && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Custom Category Name</label>
                  <input
                    required
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction Name / Description</label>
                <input
                  required
                  name="desc"
                  type="text"
                  placeholder="e.g. Electricity Bill, Stationery Purchase"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                  <select name="type" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="Income">Money In (Income)</option>
                    <option value="Expense">Money Out (Expense)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (ETB)</label>
                  <input
                    required
                    name="amount"
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Confirm Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Enrollment Payments - Finance Clerk */}
      {role === 'finance-clerk' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Pending Enrollment Payments</h3>
                <p className="text-[10px] text-slate-500 font-medium">Students approved for admission awaiting fee payment confirmation</p>
              </div>
            </div>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black">
              {enrollmentQueue.filter(s => !s.confirmed && !s.failed).length} Pending
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {enrollmentQueue.map(student => (
              <div key={student.id} className={`p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${student.confirmed ? 'bg-emerald-50/50 dark:bg-emerald-900/5' : student.failed ? 'bg-rose-50/50 dark:bg-rose-900/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm ${student.confirmed ? 'bg-emerald-500' : student.failed ? 'bg-rose-500' : 'bg-purple-500'}`}>
                    {student.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{student.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Grade {student.grade} • {student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Amount Due</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">{student.amount.toLocaleString()} ETB</p>
                  </div>
                  {student.confirmed ? (
                    <span className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black flex items-center gap-1.5">
                      <Check size={14} /> Passed
                    </span>
                  ) : student.failed ? (
                    <span className="px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-black flex items-center gap-1.5">
                      <X size={14} /> Failed
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEnrollmentQueue(prev => prev.map(s => s.id === student.id ? { ...s, confirmed: true } : s));
                          setSuccessMsg(`✅ ${student.name} marked as Passed (Paid)!`);
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-1.5"
                      >
                        <Check size={14} /> Pass
                      </button>
                      <button
                        onClick={() => {
                          setEnrollmentQueue(prev => prev.map(s => s.id === student.id ? { ...s, failed: true } : s));
                          setSuccessMsg(`❌ ${student.name} marked as Failed (Unpaid)!`);
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-rose-200 dark:shadow-none flex items-center gap-1.5"
                      >
                        <X size={14} /> Fail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {enrollmentQueue.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">No pending enrollment payments.</div>
            )}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-6 right-6 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-in slide-in-from-right-8 max-w-md">
          {successMsg}
        </div>
      )}
    </div>
  );
};
