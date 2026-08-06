import { useState, useEffect } from 'react';
import { Landmark, Calendar, FileText, Printer, Shield, ChevronDown, ChevronUp, Bell, Check, AlertCircle, HelpCircle } from 'lucide-react';
import payrollService, { PayrollItem, StaffNotification } from '../services/payrollService';
import loanService, { Loan } from '../services/loanService';
import { useUser } from '../context/UserContext';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';

export const MyFinance = () => {
  const { user } = useUser();
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedSlipId, setExpandedSlipId] = useState<string | null>(null);
  const [expandedSlipDetail, setExpandedSlipDetail] = useState<PayrollItem | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);

  useEffect(() => {
    loadMyFinanceData();
  }, []);

  const loadMyFinanceData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch active loan
      const loan = await loanService.getMyActiveLoan();
      setActiveLoan(loan);

      // 2. Fetch payslips history
      const slips = await payrollService.getMyPayslips();
      setPayslips(slips);

      // 3. Fetch notifications
      const notifs = await payrollService.getMyNotifications();
      setNotifications(notifs);

      // 4. Fetch employee profile for bank and TIN details
      if (user?.id) {
        const profile = await payrollService.getProfile(user.id);
        setMyProfile(profile);
      }

    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load your finance dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlipClick = async (slipId: string, month: string, year: number) => {
    if (expandedSlipId === slipId) {
      setExpandedSlipId(null);
      setExpandedSlipDetail(null);
      return;
    }

    try {
      const detail = await payrollService.getMyPayslip(month, year);
      setExpandedSlipDetail(detail);
      setExpandedSlipId(slipId);
    } catch (err) {
      console.error('Failed to load payslip detail:', err);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await payrollService.markNotificationRead(notifId);
      // Reload notifications list
      const notifs = await payrollService.getMyNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Finance Portal</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Review your monthly salary slips, check your outstanding loan details, and view in-app financial notices.</p>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 dark:border-slate-700 dark:border-t-white rounded-full animate-spin" />
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading your personal finance dashboard...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Loan Status and Notifications */}
          <div className="lg:col-span-1 space-y-6">

            {/* Outstanding Loan Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between">
              <div className="border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-widest">Outstanding Loan Account</h3>
              </div>

              {activeLoan ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Outstanding Balance</span>
                    <strong className="text-2xl font-black text-blue-600 dark:text-blue-400">{activeLoan.remaining_balance.toLocaleString()} ETB</strong>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Total Disbursed:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{activeLoan.amount.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Monthly Payroll Deduction:</span>
                      <span className="font-bold text-rose-500">-{activeLoan.monthly_deduction.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Payment Progress:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{activeLoan.months_paid} / {activeLoan.max_months} Months</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const percent = Math.min(100, Math.round(((activeLoan.amount - activeLoan.remaining_balance) / activeLoan.amount) * 100));
                    return (
                      <div className="space-y-1">
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, no-inline-styles */}
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                          <span>{percent}% Repaid</span>
                          <span>{activeLoan.remaining_balance.toLocaleString()} ETB Left</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
                  <Landmark size={36} className="text-slate-350" />
                  <div>
                    <p className="font-bold uppercase text-[10px] tracking-widest text-slate-500">No Outstanding Loans</p>
                    <p className="text-[10px] mt-1 text-slate-400 font-medium leading-relaxed max-w-[200px] mx-auto">There is no active loan account on your profile. Contact Finance for advance request rules.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Panel */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between">
              <div className="border-b border-slate-50 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-widest">Financial Notifications</h3>
                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-black">{notifications.filter(n => !n.is_read).length} Unread</span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <Bell size={24} className="mx-auto text-slate-300" />
                    <p className="font-bold text-[10px] tracking-wider uppercase">Notifications Empty</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-2xl border transition-all flex items-start gap-3 relative group ${!n.is_read
                          ? 'border-blue-100 bg-blue-50/20 dark:border-blue-950/20'
                          : 'border-slate-50 dark:border-slate-800/80 bg-transparent'
                        }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'loan' ? (
                          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-lg"><Landmark size={12} /></div>
                        ) : (
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-lg"><FileText size={12} /></div>
                        )}
                      </div>
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-slate-800 dark:text-white text-xs">{n.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">{n.message}</p>
                        <span className="text-[8px] text-slate-400 font-bold block mt-1">{formatEthiopianLabel(n.created_at)}</span>
                      </div>

                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="absolute right-3 top-3 p-1 text-blue-500 hover:bg-blue-150 dark:hover:bg-blue-900/40 rounded-lg transition-all"
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Payslips History and Detailed Slip Expansion */}
          <div className="lg:col-span-2 space-y-6">

            {/* Payslips List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-widest">Payslip Archive & History</h3>
              </div>

              {payslips.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-450 space-y-2">
                  <Calendar size={48} />
                  <p className="font-bold uppercase text-[11px] tracking-widest">No finalized payslips exist on your profile yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {payslips.map((slip) => {
                    const isExpanded = expandedSlipId === slip.id;
                    return (
                      <div key={slip.id} className="transition-all">
                        {/* Summary Header */}
                        <div
                          onClick={() => handleSlipClick(slip.id, slip.month, slip.year)}
                          className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
                              <Calendar size={18} />
                            </div>
                            <div>
                              <p className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">{slip.month} {slip.year}</p>
                              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Finalized on: {formatEthiopianLabel(slip.finalized_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 ml-11 sm:ml-0">
                            <div className="text-left sm:text-right">
                              <span className="text-[8px] text-slate-450 font-black uppercase tracking-widest block">Net Payout</span>
                              <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">{Number(slip.net_pay).toLocaleString()} ETB</strong>
                            </div>
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>

                        {/* Expands details */}
                        {isExpanded && expandedSlipDetail && (
                          <div className="px-6 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-800/10 border-t border-slate-50 dark:border-slate-800/60 animate-slide-in">

                            {/* Standard Printable Payslip Design */}
                            <div id={`payslip-print-${slip.id}`} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl mx-auto">

                              {/* School Name & Branding */}
                              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div>
                                  <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase">ZIQUALA ABO SCHOOL IMS</h4>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Official Monthly Salary Slip &bull; {slip.month} {slip.year}</span>
                                </div>
                                <button
                                  onClick={() => window.print()}
                                  className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                                >
                                  <Printer size={12} />
                                  Print Slip
                                </button>
                              </div>

                              {/* Employee & Direct Deposit Details */}
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Employee Name</span>
                                  <strong className="text-slate-850 dark:text-white">{expandedSlipDetail.employee_name}</strong>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Employee digital ID</span>
                                  <strong className="text-slate-850 dark:text-white">{expandedSlipDetail.employee_digital_id || 'N/A'}</strong>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Bank Account Details</span>
                                  <strong className="text-slate-850 dark:text-white">{myProfile?.bank_account || 'Direct Cash'}</strong>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">TIN Tax Number</span>
                                  <strong className="text-slate-850 dark:text-white">{myProfile?.tin_number || 'N/A'}</strong>
                                </div>
                              </div>

                              {/* Ledger breakdown grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">

                                {/* Income parameters */}
                                <div className="space-y-2">
                                  <h5 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-850 pb-1 mb-2">Earnings (+)</h5>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Basic Salary:</span>
                                    <strong className="text-slate-800 dark:text-white">{Number(expandedSlipDetail.basic_salary).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Transport Allowance:</span>
                                    <strong className="text-slate-800 dark:text-white">+{Number(expandedSlipDetail.transport_allowance).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Housing Allowance:</span>
                                    <strong className="text-slate-800 dark:text-white">+{Number(expandedSlipDetail.housing_allowance).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Position Allowance:</span>
                                    <strong className="text-slate-800 dark:text-white">+{Number(expandedSlipDetail.position_allowance).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800/80 pt-2 font-black">
                                    <span className="text-slate-800 dark:text-white">Total Allowances:</span>
                                    <strong className="text-slate-900 dark:text-white">+{(Number(expandedSlipDetail.transport_allowance) + Number(expandedSlipDetail.housing_allowance) + Number(expandedSlipDetail.position_allowance)).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Overtime ({expandedSlipDetail.overtime_hours} hrs):</span>
                                    <strong className="text-slate-800 dark:text-white">+{Number(expandedSlipDetail.overtime_amount).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800/80 pt-2 font-black">
                                    <span className="text-slate-800 dark:text-white">Gross Salary Earnings:</span>
                                    <strong className="text-slate-900 dark:text-white">{Number(expandedSlipDetail.gross_salary).toLocaleString()} ETB</strong>
                                  </div>
                                </div>

                                {/* Deductions parameters */}
                                <div className="space-y-2">
                                  <h5 className="text-[9px] font-black text-rose-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-850 pb-1 mb-2">Deductions (-)</h5>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Absenteeism Penalty ({expandedSlipDetail.absent_days} days):</span>
                                    <strong className="text-rose-500">-{Number(expandedSlipDetail.penalty_amount).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Active Loan Repayments:</span>
                                    <strong className="text-rose-500">-{Number(expandedSlipDetail.loan_deduction).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Income Tax (Ethiopian brackets):</span>
                                    <strong className="text-rose-500">-{Number(expandedSlipDetail.income_tax).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-semibold">Employee Pension (7%):</span>
                                    <strong className="text-rose-500">-{Number(expandedSlipDetail.pension_employee).toLocaleString()} ETB</strong>
                                  </div>
                                  <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800/80 pt-2 font-black">
                                    <span className="text-slate-850 dark:text-white">Total Deductions:</span>
                                    <strong className="text-rose-600">-{Number(expandedSlipDetail.total_deductions).toLocaleString()} ETB</strong>
                                  </div>
                                </div>

                              </div>

                              {/* Net payout final statement */}
                              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3">
                                <div>
                                  <span className="text-[9px] text-slate-455 font-black uppercase tracking-widest block">Net Payout Disbursed</span>
                                  <span className="text-[10px] text-slate-400 font-medium leading-relaxed block mt-0.5">Transferred directly to your designated bank account</span>
                                </div>
                                <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-450">{Number(expandedSlipDetail.net_pay).toLocaleString()} ETB</strong>
                              </div>

                              <div className="text-[9px] text-slate-400 font-semibold text-center mt-4">
                                Verify details. For any discrepancy, contact your branch Finance Administrator within 3 working days.
                              </div>

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default MyFinance;
