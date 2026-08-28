import { useTranslation } from 'react-i18next';
import { Building, Palette, Save, HelpCircle, CreditCard, GraduationCap, Plus, Trash2, AlertCircle, Lock, Unlock, CheckCircle, Shield, Mail } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppearance, type UIStyle } from '../context/AppearanceContext';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import { getGradingConfigs, publishGradingConfigs } from '../services/schoolAdminService';
import settingsService, { type BranchGradeFee, type BranchProfitSummary, type MonthlyProfitTarget } from '../services/settingsService';
import { authService } from '../services/authService';
import { SettingsSubTabs, SettingsPanel } from '../components/settings/SettingsSubTabs';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { SUPER_ADMIN_SUBTABS, getDefaultSubTab, getSubTabLabel } from './settings/subtabConfig';

const MultiSelectDropdown = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  disabled = false,
  className = ''
}: {
  options: { value: string, label: string }[];
  selectedValues: string[];
  onChange: (value: string, checked: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-left flex justify-between items-center outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="text-slate-700 dark:text-slate-200 truncate pr-2">
          {selectedValues.length === 0
            ? placeholder
            : `${selectedValues.length} selected`}
        </span>
        <span className="text-slate-400 font-bold ml-2">▼</span>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto z-20 p-2 space-y-1">
            {options.map((option) => {
              const isChecked = selectedValues.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onChange(option.value, e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const Settings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('General');
  const location = useLocation();
  const { style, setStyle, autoDarkMode, setAutoDarkMode } = useAppearance();
  const { schoolName, setSchoolName, schoolMotto, setSchoolMotto, role, branches, gradesLocked, setGradesLocked, registrationOpen, setRegistrationOpen, user } = useUser();
  const { selectedBranchId } = useStore();

  // Finance Module Settings & Auditing State
  const [financeAuditLog, setFinanceAuditLog] = useState<any[]>([]);
  const [systemEmail, setSystemEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; year_name: string; is_active: boolean }>>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [generalSaving, setGeneralSaving] = useState(false);
  const [branchGradeFees, setBranchGradeFees] = useState<BranchGradeFee[]>([]);
  const [feeBranchId, setFeeBranchId] = useState('');
  const [feeGrade, setFeeGrade] = useState('KG 1');
  const [feeGrades, setFeeGrades] = useState<string[]>(['KG 1']);
  const [feeMonthly, setFeeMonthly] = useState(5000);
  const [feeRegistration, setFeeRegistration] = useState(2500);
  const [feeBus, setFeeBus] = useState(1200);
  const [profitTargets, setProfitTargets] = useState<MonthlyProfitTarget[]>([]);
  const [profitTargetBranchId, setProfitTargetBranchId] = useState('');
  const [profitTargetMonth, setProfitTargetMonth] = useState('1');
  const [profitTargetAmount, setProfitTargetAmount] = useState('500000');
  const [profitSummary, setProfitSummary] = useState<BranchProfitSummary | null>(null);
  const [profitSummaryLoading, setProfitSummaryLoading] = useState(false);
  // Manual overrides for student income and staff payout (editable by super admin)
  const [manualStudentIncome, setManualStudentIncome] = useState<string>('');
  const [manualStaffPayout, setManualStaffPayout] = useState<string>('');
  const [studentIncomeEdited, setStudentIncomeEdited] = useState(false);
  const [staffPayoutEdited, setStaffPayoutEdited] = useState(false);
  // Lock target editing after 4th of each Gregorian month
  const isTargetSettingLocked = (() => { const d = new Date().getDate(); return d > 4; })();
  const [smtpSettings, setSmtpSettings] = useState({ smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_from: '' });
  const [smtpPass, setSmtpPass] = useState('gdgg eify uzec fhox');
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState('');
  const [dailyPenaltyRate, setDailyPenaltyRate] = useState<number>(150);
  const [maxLoanMonths, setMaxLoanMonths] = useState<number>(3);
  const [loanDeductionPct, setLoanDeductionPct] = useState<number>(30);
  const [studentLatePenaltyRate, setStudentLatePenaltyRate] = useState<number>(150);
  const [studentRegistrationFee, setStudentRegistrationFee] = useState<number>(0);
  const [studentPaymentDeadline, setStudentPaymentDeadline] = useState<number>(10);
  const [staffSalaryDeadline, setStaffSalaryDeadline] = useState<number>(28);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeSuccessMsg, setFinanceSuccessMsg] = useState('');
  const [financeErrorMsg, setFinanceErrorMsg] = useState('');

  const currentBranchScopeId = role === 'super-admin'
    ? selectedBranchId || undefined
    : selectedBranchId || (user as any)?.branchId || branches[0]?.id || undefined;

  const applySystemSettings = useCallback((settings: Record<string, string>) => {
    if (settings.school_name_oromic !== undefined) {
      setSchoolName({
        oromic: settings.school_name_oromic || '',
        amharic: settings.school_name_amharic || '',
        english: settings.school_name_english || '',
      });
    }
    if (settings.school_motto_oromic !== undefined) {
      setSchoolMotto({
        oromic: settings.school_motto_oromic || '',
        amharic: settings.school_motto_amharic || '',
        english: settings.school_motto_english || '',
      });
    }
    if (settings.system_email !== undefined) setSystemEmail(settings.system_email);
    if (settings.phone !== undefined) setPhone(settings.phone);
    if (settings.address !== undefined) setAddress(settings.address);
    if (settings.grades_locked !== undefined) {
      setGradesLocked(settings.grades_locked === 'true');
    }
    if (settings.registration_open !== undefined) {
      setRegistrationOpen(settings.registration_open !== 'false');
    }
    if (settings.active_academic_year_id) {
      setSelectedAcademicYearId(settings.active_academic_year_id);
    }
  }, [setSchoolName, setSchoolMotto, setGradesLocked, setRegistrationOpen]);

  const loadGeneralSettings = async () => {
    const [settings, years] = await Promise.all([
      settingsService.getSystemSettings(),
      settingsService.getAcademicYears(),
    ]);
    applySystemSettings(settings);
    setAcademicYears(years);
    const active = years.find((y: { is_active: boolean }) => y.is_active);
    if (active) setSelectedAcademicYearId(active.id);
  };

  const loadFeeStructure = async (branchId?: string) => {
    const fees = await settingsService.getBranchGradeFees({ branchId });
    setBranchGradeFees(fees);
  };

  const loadProfitTargets = async (branchId?: string) => {
    const targets = await settingsService.getProfitTargets(branchId ? { branchId } : undefined);
    setProfitTargets(targets);
  };

  useEffect(() => {
    if (role === 'super-admin') {
      loadFinanceSettings();
      loadGeneralSettings().catch(console.error);
      loadFeeStructure(currentBranchScopeId).catch(console.error);
      loadProfitTargets(currentBranchScopeId).catch(console.error);
      settingsService.getSmtpSettings().then((saved) => {
        setSmtpSettings(prev => ({
          smtp_host: saved.smtp_host || prev.smtp_host,
          smtp_port: saved.smtp_port || prev.smtp_port,
          smtp_user: saved.smtp_user || prev.smtp_user,
          smtp_from: saved.smtp_from || prev.smtp_from,
        }));
      }).catch(console.error);
    } else if (role === 'school-admin') {
      // School Admin: load finance settings for read-only viewing of assigned policy
      loadFinanceSettings();
      // Show only the currently assigned branch's fee structures and profit targets
      loadFeeStructure(currentBranchScopeId).catch(console.error);
      loadProfitTargets(currentBranchScopeId).catch(console.error);
    }
  }, [role, currentBranchScopeId]);

  useEffect(() => {
    const defaultBranchId = selectedBranchId || (role !== 'super-admin' ? (user as any)?.branchId || branches[0]?.id : branches[0]?.id);
    if (branches.length > 0) {
      if (!feeBranchId || !branches.some(b => b.id === feeBranchId)) {
        setFeeBranchId(defaultBranchId);
      }
      if (!profitTargetBranchId || !branches.some(b => b.id === profitTargetBranchId)) {
        setProfitTargetBranchId(defaultBranchId);
      }
    }
  }, [branches, feeBranchId, profitTargetBranchId, selectedBranchId, role, user]);

  const loadProfitSummary = useCallback(async () => {
    if (!profitTargetBranchId || (role !== 'super-admin' && role !== 'school-admin')) return;
    setProfitSummaryLoading(true);
    try {
      const summary = await settingsService.getBranchProfitSummary({
        branchId: profitTargetBranchId,
        ethiopianMonth: Number(profitTargetMonth),
      });
      setProfitSummary(summary);
      // Populate manual overrides only if user hasn't edited them yet
      if (!studentIncomeEdited) setManualStudentIncome(String(Math.round(summary.student_income)));
      if (!staffPayoutEdited) setManualStaffPayout(String(Math.round(summary.staff_payout)));
      // Compute suggested target from (possibly overridden) values
      const income = studentIncomeEdited ? Number(manualStudentIncome) : Math.round(summary.student_income);
      const payout = staffPayoutEdited ? Number(manualStaffPayout) : Math.round(summary.staff_payout);
      setProfitTargetAmount(
        summary.saved_target != null
          ? String(summary.saved_target)
          : String(income + payout)
      );
    } catch (err) {
      console.error('Failed to load profit summary:', err);
      setProfitSummary(null);
    } finally {
      setProfitSummaryLoading(false);
    }
  }, [profitTargetBranchId, profitTargetMonth, role, studentIncomeEdited, staffPayoutEdited, manualStudentIncome, manualStaffPayout]);

  useEffect(() => {
    
  }, [role, profitTargetBranchId, profitTargetMonth, activeTab, loadProfitSummary]);

  const loadFinanceSettings = async () => {
    try {
      const settings: any[] = [];

      const penalty = settings.find((s: any) => s.key === 'daily_penalty_rate');
      if (penalty) setDailyPenaltyRate(Number(penalty.value));

      const maxLoan = settings.find(s => s.key === 'max_loan_months');
      if (maxLoan) setMaxLoanMonths(Number(maxLoan.value));

      const deduction = settings.find(s => s.key === 'loan_deduction_percentage');
      if (deduction) setLoanDeductionPct(Number(deduction.value));

      const studentPenalty = settings.find(s => s.key === 'student_late_penalty_rate');
      if (studentPenalty) setStudentLatePenaltyRate(Number(studentPenalty.value));

      const registrationFee = settings.find(s => s.key === 'student_registration_fee');
      if (registrationFee) setStudentRegistrationFee(Number(registrationFee.value));

      const studentDeadlineSetting = settings.find(s => s.key === 'student_payment_deadline');
      if (studentDeadlineSetting) setStudentPaymentDeadline(Number(studentDeadlineSetting.value));

      const staffDeadlineSetting = settings.find(s => s.key === 'staff_salary_deadline');
      if (staffDeadlineSetting) setStaffSalaryDeadline(Number(staffDeadlineSetting.value));

      const audit: any[] = [];
      setFinanceAuditLog(audit);
    } catch (err) {
      console.error('Failed to load finance settings:', err);
    }
  };

  const handleUpdateFinanceSetting = async (key: string, value: number) => {
    setFinanceLoading(true);
    setFinanceSuccessMsg('');
    setFinanceErrorMsg('');
    try {
      // update settings
      setFinanceSuccessMsg(`Setting '${key.replace(/_/g, ' ')}' updated successfully!`);
      await loadFinanceSettings();
      setTimeout(() => setFinanceSuccessMsg(''), 4000);
    } catch (err: any) {
      setFinanceErrorMsg(err.response?.data?.error?.message || 'Failed to update setting');
    } finally {
      setFinanceLoading(false);
    }
  };


  const tabs = useMemo(() => [
    { id: 'General', icon: Building },
    { id: 'Security', icon: Lock },
        ...(role !== 'super-admin' ? [{ id: 'Grading System', icon: GraduationCap }] : []),
    { id: 'Appearance', icon: Palette },
  ], [role]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get('tab');
    if (requestedTab && tabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
      return;
    }

    if (location.hash) {
      const hashTab = location.hash.replace('#', '');
      const matched = tabs.find((tab) => tab.id.toLowerCase() === hashTab.toLowerCase());
      if (matched) {
        setActiveTab(matched.id);
      }
    }
  }, [location.search, location.hash, tabs]);

  // ─── Grading Systems (multi-system support) ──────────────────────────────
  type GradingMethod = { id: string; label: string; maxWeight: number };
  type GradingSystem = {
    id: string;
    name: string;
    grades: string[]; // which grades this system applies to
    methods: GradingMethod[];
    published: boolean;
  };
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [expandedSystemId, setExpandedSystemId] = useState<string | null>(null);
  // Draft form for creating a new system
  const [draftName, setDraftName] = useState('');
  const [draftGrades, setDraftGrades] = useState<string[]>([]);
  const [draftMethods, setDraftMethods] = useState<GradingMethod[]>([]);
  const [draftNewLabel, setDraftNewLabel] = useState('');
  const [draftNewWeight, setDraftNewWeight] = useState(10);
  const [showNewSystemForm, setShowNewSystemForm] = useState(false);
  // Legacy (keep for non-breaking compat with publish logic)
  const [gradeConfigs, setGradeConfigs] = useState<Record<string, GradingMethod[]>>({});
  const [gradingLoading, setGradingLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('branding');

  const superAdminSubTabs = role === 'super-admin' ? SUPER_ADMIN_SUBTABS[activeTab] : undefined;
  const showSubSection = (subId: string) =>
    !superAdminSubTabs || activeSubTab === subId;

  useEffect(() => {
    if (role !== 'super-admin') return;
    const subTabs = SUPER_ADMIN_SUBTABS[activeTab];
    if (!subTabs) return;
    if (!subTabs.some((tab) => tab.id === activeSubTab)) {
      setActiveSubTab(getDefaultSubTab(activeTab));
    }
  }, [activeTab, role, activeSubTab]);

  const groupConfigsIntoSystems = (dbConfigs: Record<string, GradingMethod[]>): GradingSystem[] => {
    const systemMap = new Map<string, { name: string; grades: string[]; methods: GradingMethod[] }>();
    const grades = Object.keys(dbConfigs).sort((a, b) => parseInt(a) - parseInt(b));

    grades.forEach((grade) => {
      const methods = dbConfigs[grade] || [];
      if (methods.length === 0) return;

      const key = JSON.stringify(methods.map(m => ({ label: m.label, maxWeight: m.maxWeight })));

      if (systemMap.has(key)) {
        systemMap.get(key)!.grades.push(grade);
      } else {
        systemMap.set(key, {
          name: `Grade ${grade} Grading System`,
          grades: [grade],
          methods: JSON.parse(JSON.stringify(methods)),
        });
      }
    });

    const systems: GradingSystem[] = [];
    if (systemMap.size === 0) {
      systems.push({
        id: 'system-default',
        name: 'General Grading System',
        grades: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        methods: [
          { id: 'quiz-1', label: 'Quiz 1', maxWeight: 10 },
          { id: 'mid-exam', label: 'Mid Exam', maxWeight: 30 },
          { id: 'assignment', label: 'Assignment', maxWeight: 10 },
          { id: 'final-exam', label: 'Final Exam', maxWeight: 50 },
        ],
        published: false
      });
    } else {
      systemMap.forEach((sys) => {
        systems.push({
          id: `system-${Math.random().toString(36).substr(2, 9)}`,
          name: sys.name,
          grades: sys.grades,
          methods: sys.methods,
          published: true,
        });
      });
    }
    return systems;
  };

  const isValidGradingSystems = (val: any): val is GradingSystem[] => {
    return Array.isArray(val) && val.length > 0 && val.every(s =>
      s &&
      typeof s.id === 'string' &&
      typeof s.name === 'string' &&
      Array.isArray(s.grades) &&
      Array.isArray(s.methods)
    );
  };

  // Load grading configs from backend on mount
  // Always use fresh DB data as source of truth; localStorage is only a draft fallback
  useEffect(() => {
    if (role === 'school-admin') {
      setGradingLoading(true);
      getGradingConfigs()
        .then((dbConfigs) => {
          setGradeConfigs(dbConfigs || {});
          // Always reconstruct from the live DB data so teachers see exactly what was published
          const reconstructed = groupConfigsIntoSystems(dbConfigs || {});
          setGradingSystems(reconstructed);
          // Sync localStorage so future sessions start with the real published state
          localStorage.setItem('ziquala_grading_systems', JSON.stringify(reconstructed));
        })
        .catch(() => {
          const stored = localStorage.getItem('ziquala_grading_systems');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (isValidGradingSystems(parsed)) {
                setGradingSystems(parsed);
              }
            } catch { /* ignore */ }
          }
        })
        .finally(() => setGradingLoading(false));
    }
  }, [role]);


  const saveGeneralSettings = async () => {
    setGeneralSaving(true);
    setSuccessMessage('');
    try {
      await settingsService.updateSystemSettings({
        school_name_oromic: schoolName.oromic,
        school_name_amharic: schoolName.amharic,
        school_name_english: schoolName.english,
        school_motto_oromic: schoolMotto.oromic,
        school_motto_amharic: schoolMotto.amharic,
        school_motto_english: schoolMotto.english,
        system_email: systemEmail,
        phone,
        address,
        grades_locked: gradesLocked ? 'true' : 'false',
        registration_open: registrationOpen ? 'true' : 'false',
        active_academic_year_id: selectedAcademicYearId || '',
      });
      if (selectedAcademicYearId) {
        const active = academicYears.find((y) => y.is_active);
        if (!active || active.id !== selectedAcademicYearId) {
          await settingsService.activateAcademicYear(selectedAcademicYearId);
          await loadGeneralSettings();
        }
      }
      setSuccessMessage('System settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setSuccessMessage(err.response?.data?.error?.message || 'Failed to save system settings');
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setGeneralSaving(false);
    }
  };

  const persistGlobalToggle = async (key: 'grades_locked' | 'registration_open', value: boolean) => {
    if (role !== 'super-admin') return;
    try {
      await settingsService.updateSystemSettings({
        [key]: value ? 'true' : 'false',
      });
    } catch (err) {
      console.error('Failed to persist toggle', err);
    }
  };

  const handleApplyFeeConfig = async () => {
    if (!feeBranchId) {
      setFinanceErrorMsg('Please select a branch');
      return;
    }
    if (!feeGrade) {
      setFinanceErrorMsg('Please select a grade level');
      return;
    }
    setFinanceLoading(true);
    try {
      await settingsService.upsertBranchGradeFee({
        branchId: feeBranchId,
        gradeLevel: feeGrade,
        monthlyFee: feeMonthly,
        registrationFee: feeRegistration,
        busFee: feeBus,
      });
      await loadFeeStructure();
      setFinanceSuccessMsg('Fee configuration applied for Grade ' + feeGrade);
      setTimeout(() => setFinanceSuccessMsg(''), 4000);
    } catch (err: any) {
      setFinanceErrorMsg(err.response?.data?.error?.message || 'Failed to save fee configuration');
    } finally {
      setFinanceLoading(false);
    }
  };

  const handleDeleteFeeConfig = async (id: string) => {
    if (!window.confirm('Delete this fee configuration? This cannot be undone.')) return;
    try {
      await settingsService.deleteBranchGradeFee(id);
      setFinanceSuccessMsg('Fee configuration removed.');
      setTimeout(() => setFinanceSuccessMsg(''), 3000);
    } catch (err: any) {
      setFinanceErrorMsg(err.response?.data?.error?.message || 'Failed to delete fee configuration');
    } finally {
      await loadFeeStructure();
    }
  };

  const handleSetProfitTarget = async () => {
    if (!profitTargetBranchId) {
      setFinanceErrorMsg('Select a branch first');
      return;
    }
    setFinanceLoading(true);
    try {
      await settingsService.upsertProfitTarget({
        branchId: profitTargetBranchId,
        ethiopianMonth: Number(profitTargetMonth),
        targetAmount: Number(profitTargetAmount),
      });
      await loadProfitTargets();
      await loadProfitSummary();
      setFinanceSuccessMsg('Monthly profit target saved for this branch');
      setTimeout(() => setFinanceSuccessMsg(''), 4000);
    } catch (err: any) {
      setFinanceErrorMsg(err.response?.data?.error?.message || 'Failed to save profit target');
    } finally {
      setFinanceLoading(false);
    }
  };

  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    setSmtpMessage('');
    try {
      const payload: Record<string, string> = { ...smtpSettings };
      if (smtpPass.trim()) payload.smtp_pass = smtpPass;
      await settingsService.updateSmtpSettings(payload);
      setSmtpPass('');
      setSmtpMessage('SMTP settings saved');
    } catch (err: any) {
      setSmtpMessage(err.response?.data?.error?.message || 'Failed to save SMTP settings');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpTestEmail) return;
    setSmtpSaving(true);
    setSmtpMessage('');
    try {
      const result = await settingsService.testSmtpSettings(smtpTestEmail);
      setSmtpMessage(result.message || 'Test email sent');
    } catch (err: any) {
      setSmtpMessage(err.response?.data?.error?.message || 'SMTP test failed');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSaveDraftSystems = (updatedSystems: GradingSystem[]) => {
    localStorage.setItem('ziquala_grading_systems', JSON.stringify(updatedSystems));
    setSuccessMessage('Grading systems saved locally as draft. Click Publish on any card to update teachers.');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleSaveChanges = async () => {
    if (activeTab === 'Grading System') {
      handleSaveDraftSystems(gradingSystems);
    } else if (activeTab === 'General' && role === 'super-admin') {
      await saveGeneralSettings();
    } else if (activeTab === 'Security' && role === 'super-admin' && activeSubTab === 'smtp') {
      await handleSaveSmtp();
    } else if (activeTab === 'Security') {
      setSuccessMessage('Use the form above to change your password.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setSuccessMessage('No changes to save for this tab.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handlePublishSystem = async (systemId: string) => {
    const system = gradingSystems.find((s) => s.id === systemId);
    if (!system) return;

    const totalWeight = system.methods.reduce((sum, m) => sum + m.maxWeight, 0);
    if (totalWeight !== 100) {
      setSuccessMessage(`Error: Total weight must be exactly 100% (currently ${totalWeight}%).`);
      setTimeout(() => setSuccessMessage(''), 5000);
      return;
    }

    if (system.grades.length === 0) {
      setSuccessMessage('Error: You must select at least one grade to publish this grading system.');
      setTimeout(() => setSuccessMessage(''), 5000);
      return;
    }

    setGradingLoading(true);
    let publishedCount = 0;
    let failedGrades: string[] = [];

    for (const grade of system.grades) {
      try {
        await publishGradingConfigs(grade, system.methods);
        publishedCount++;
      } catch (err) {
        console.error(`Failed to publish grading config for Grade ${grade}`, err);
        failedGrades.push(grade);
      }
    }

    // Update status in local systems list
    const updated = gradingSystems.map((s) =>
      s.id === systemId ? { ...s, published: failedGrades.length === 0 } : s
    );
    setGradingSystems(updated);
    localStorage.setItem('ziquala_grading_systems', JSON.stringify(updated));

    if (failedGrades.length === 0) {
      setSuccessMessage(`Grading system "${system.name}" successfully published for Grade(s): ${system.grades.join(', ')}!`);
    } else {
      setSuccessMessage(`Published for ${publishedCount} grade(s). Failed for Grade(s): ${failedGrades.join(', ')}.`);
    }
    setGradingLoading(false);
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const handleDeleteSystem = (systemId: string) => {
    if (window.confirm('Are you sure you want to delete this grading system? This will not undo database changes until you re-publish other systems for the impacted grades.')) {
      const updated = gradingSystems.filter((s) => s.id !== systemId);
      setGradingSystems(updated);
      localStorage.setItem('ziquala_grading_systems', JSON.stringify(updated));
      setSuccessMessage('Grading system deleted from drafts.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleCreateSystem = () => {
    if (!draftName.trim()) {
      alert('Please enter a grading system name.');
      return;
    }
    if (draftGrades.length === 0) {
      alert('Please select at least one grade level.');
      return;
    }
    const newSystem: GradingSystem = {
      id: `system-${Math.random().toString(36).substr(2, 9)}`,
      name: draftName,
      grades: [...draftGrades],
      methods: [...draftMethods],
      published: false,
    };
    const updated = [...gradingSystems, newSystem];
    setGradingSystems(updated);
    localStorage.setItem('ziquala_grading_systems', JSON.stringify(updated));

    // Reset draft form
    setDraftName('');
    setDraftGrades([]);
    setDraftMethods([]);
    setShowNewSystemForm(false);
    setExpandedSystemId(newSystem.id); // auto-expand newly created system

    setSuccessMessage('New grading system added to drafts.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };


  const ethiopianMonths = [
    { id: '1', ge: 'Meskerem', am: 'መስከረም' },
    { id: '2', ge: 'Tikimt', am: 'ጥቅምት' },
    { id: '3', ge: 'Hidar', am: 'ኅዳር' },
    { id: '4', ge: 'Tahisas', am: 'ታኅሣሥ' },
    { id: '5', ge: 'Tir', am: 'ጥር' },
    { id: '6', ge: 'Yekatit', am: 'የካቲት' },
    { id: '7', ge: 'Megabit', am: 'መጋቢት' },
    { id: '8', ge: 'Miyazya', am: 'ሚያዝያ' },
    { id: '9', ge: 'Ginbot', am: 'ግንቦት' },
    { id: '10', ge: 'Sene', am: 'ሰኔ' },
    { id: '11', ge: 'Hamle', am: 'ሐምሌ' },
    { id: '12', ge: 'Nehase', am: 'ነሐሴ' },
    { id: '13', ge: 'Pagumē', am: 'ጳጉሜን' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('settings.title')}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{t('settings.subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="w-full lg:w-60 flex overflow-x-auto lg:flex-col no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 gap-3 lg:space-y-2 pb-4 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20 dark:shadow-white/10 translate-x-1'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/30 lg:bg-transparent border border-transparent'
                }`}
            >
              <tab.icon size={18} />
              <span className="whitespace-nowrap">{t(`settings.tabs.${tab.id.startsWith('Grading') ? 'Grading' : tab.id}`, tab.id)}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden transition-all duration-500 flex flex-col min-h-[520px] max-h-[calc(100vh-4rem)]">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              {superAdminSubTabs ? t(`settings.subtabs.${activeSubTab}`, getSubTabLabel(activeTab, activeSubTab)) : t(`settings.tabs.${activeTab.startsWith('Grading') ? 'Grading' : activeTab}`, activeTab)}
              <span className="text-slate-400 font-bold text-sm normal-case tracking-normal ml-2">
                {superAdminSubTabs ? `· ${t(`settings.tabs.${activeTab.startsWith('Grading') ? 'Grading' : activeTab}`, activeTab)}` : t('settings.configuration')}
              </span>
            </h3>
            <button className="text-blue-600 dark:text-blue-400 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:underline bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl">
              <HelpCircle size={16} />
              <span>{t('settings.needHelp')}</span>
            </button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto">
            {successMessage && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {superAdminSubTabs && (
              <SettingsSubTabs tabs={superAdminSubTabs} active={activeSubTab} onChange={setActiveSubTab} />
            )}

            {activeTab === 'General' && (
              <SettingsPanel>
                <div className="space-y-6">
                  {showSubSection('branding') && (
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('settings.schoolNameLabel')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label htmlFor="school-name-oromic" className="text-[9px] font-bold text-slate-400 uppercase">{t('settings.languages.oromic')}</label>
                            <input
                              id="school-name-oromic"
                              type="text"
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              value={schoolName.oromic}
                              onChange={(e) => role === 'super-admin' && setSchoolName({ ...schoolName, oromic: e.target.value })}
                              disabled={role !== 'super-admin'}
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="school-name-amharic" className="text-[9px] font-bold text-slate-400 uppercase">{t('settings.languages.amharic')}</label>
                            <input
                              id="school-name-amharic"
                              type="text"
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              value={schoolName.amharic}
                              onChange={(e) => role === 'super-admin' && setSchoolName({ ...schoolName, amharic: e.target.value })}
                              disabled={role !== 'super-admin'}
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="school-name-english" className="text-[9px] font-bold text-slate-400 uppercase">{t('settings.languages.english')}</label>
                            <input
                              id="school-name-english"
                              type="text"
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              value={schoolName.english}
                              onChange={(e) => role === 'super-admin' && setSchoolName({ ...schoolName, english: e.target.value })}
                              disabled={role !== 'super-admin'}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('settings.schoolMottoLabel')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label htmlFor="school-motto-oromic" className="text-[9px] font-bold text-slate-400 uppercase">{t('settings.languages.oromic')}</label>
                            <input
                              id="school-motto-oromic"
                              type="text"
                              title="School motto in Oromic"
                              aria-label="School motto in Oromic"
                              placeholder="Enter Oromic motto"
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 italic"
                              value={schoolMotto.oromic}
                              onChange={(e) => role === 'super-admin' && setSchoolMotto({ ...schoolMotto, oromic: e.target.value })}
                              disabled={role !== 'super-admin'}
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="school-motto-amharic" className="text-[9px] font-bold text-slate-400 uppercase">{t('settings.languages.amharic')}</label>
                            <input
                              id="school-motto-amharic"
                              type="text"
                              title="School motto in Amharic"
                              aria-label="School motto in Amharic"
                              placeholder="Enter Amharic motto"
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 italic"
                              value={schoolMotto.amharic}
                              onChange={(e) => role === 'super-admin' && setSchoolMotto({ ...schoolMotto, amharic: e.target.value })}
                              disabled={role !== 'super-admin'}
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="school-motto-english" className="text-[9px] font-bold text-slate-400 uppercase">{t('settings.languages.english')}</label>
                            <input
                              id="school-motto-english"
                              type="text"
                              title="School motto in English"
                              aria-label="School motto in English"
                              placeholder="Enter English motto"
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 italic"
                              value={schoolMotto.english}
                              onChange={(e) => role === 'super-admin' && setSchoolMotto({ ...schoolMotto, english: e.target.value })}
                              disabled={role !== 'super-admin'}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showSubSection('contact') && (
                    <>
                      <div className="space-y-1">
                        <label htmlFor="system-email" className="text-[10px] font-bold text-slate-500 uppercase">System Email</label>
                        <input
                          id="system-email"
                          type="email"
                          value={systemEmail}
                          onChange={(e) => role === 'super-admin' && setSystemEmail(e.target.value)}
                          disabled={role !== 'super-admin'}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="phone-number" className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                        <input
                          id="phone-number"
                          type="text"
                          value={phone}
                          onChange={(e) => role === 'super-admin' && setPhone(e.target.value)}
                          disabled={role !== 'super-admin'}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="academic-year" className="text-[10px] font-bold text-slate-500 uppercase">Academic Year</label>
                        <select
                          id="academic-year"
                          value={selectedAcademicYearId}
                          onChange={(e) => role === 'super-admin' && setSelectedAcademicYearId(e.target.value)}
                          disabled={role !== 'super-admin' || academicYears.length === 0}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select academic year</option>
                          {academicYears.map((y) => (
                            <option key={y.id} value={y.id}>
                              {y.year_name}{y.is_active ? ' (Current)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="school-address" className="text-[10px] font-bold text-slate-500 uppercase">School Address</label>
                        <textarea
                          id="school-address"
                          rows={3}
                          value={address}
                          onChange={(e) => role === 'super-admin' && setAddress(e.target.value)}
                          disabled={role !== 'super-admin'}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}

                  {role !== 'super-admin' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-500 text-[10px] font-bold flex items-center gap-2">
                      <Lock size={14} />
                      Some global branding settings are restricted to Super Admins.
                    </div>
                  )}
                </div>
              </SettingsPanel>
            )}

            {activeTab === 'Security' && (
              <SettingsPanel>
                <div className="space-y-8">
                  {showSubSection('password') && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                          <Shield size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-white">Change Password</h4>
                          <p className="text-xs text-slate-500">Update your password to keep your account secure</p>
                        </div>
                      </div>

                      {passwordSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
                          <CheckCircle className="text-green-600" size={20} />
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">Password changed successfully!</p>
                        </div>
                      )}

                      {passwordError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                          <AlertCircle className="text-red-600" size={20} />
                          <p className="text-sm text-red-800 dark:text-red-200 font-medium">{passwordError}</p>
                        </div>
                      )}

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setPasswordError('');
                          setPasswordSuccess(false);

                          // Validation
                          if (passwordForm.newPassword.length < 5) {
                            setPasswordError('New password must be at least 5 characters long');
                            return;
                          }
                          if (!/[A-Z]/.test(passwordForm.newPassword)) {
                            setPasswordError('New password must contain at least one uppercase letter');
                            return;
                          }
                          if (!/[a-z]/.test(passwordForm.newPassword)) {
                            setPasswordError('New password must contain at least one lowercase letter');
                            return;
                          }
                          if (!/[0-9]/.test(passwordForm.newPassword)) {
                            setPasswordError('New password must contain at least one number');
                            return;
                          }
                          if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                            setPasswordError('New passwords do not match');
                            return;
                          }
                          if (passwordForm.currentPassword === passwordForm.newPassword) {
                            setPasswordError('New password must be different from current password');
                            return;
                          }

                          setPasswordLoading(true);
                          try {
                            await authService.changePassword(
                              passwordForm.currentPassword,
                              passwordForm.newPassword
                            );
                            setPasswordSuccess(true);
                            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setTimeout(() => setPasswordSuccess(false), 5000);
                          } catch (err: any) {
                            setPasswordError(err.response?.data?.error?.message || 'Failed to change password');
                          } finally {
                            setPasswordLoading(false);
                          }
                        }}
                        className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800"
                      >
                        <div className="space-y-1">
                          <label htmlFor="current-password" className="text-xs font-bold text-slate-500 uppercase">{t("settings.currentPassword","Current Password")}</label>
                          <div className="relative">
                            <input
                              id="current-password"
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              disabled={passwordLoading}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label htmlFor="new-password" className="text-xs font-bold text-slate-500 uppercase">{t("settings.newPassword","New Password")}</label>
                            <input
                              id="new-password"
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              minLength={5}
                              disabled={passwordLoading}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="confirm-password" className="text-xs font-bold text-slate-500 uppercase">Confirm New Password</label>
                            <input
                              id="confirm-password"
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              required
                              minLength={5}
                              disabled={passwordLoading}
                            />
                          </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                          <p className="text-xs font-bold text-blue-800 dark:text-blue-200 mb-2">Password Requirements:</p>
                          <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                            <li className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${passwordForm.newPassword.length >= 5 ? 'bg-green-500' : 'bg-slate-300'}`} />
                              At least 5 characters long
                            </li>
                            <li className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(passwordForm.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`} />
                              Contains uppercase letter
                            </li>
                            <li className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(passwordForm.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`} />
                              Contains lowercase letter
                            </li>
                            <li className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(passwordForm.newPassword) ? 'bg-green-500' : 'bg-slate-300'}`} />
                              Contains number
                            </li>
                          </ul>
                        </div>

                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {passwordLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Changing Password...</span>
                            </>
                          ) : (
                            <>
                              <Lock size={18} />
                              <span>Change Password</span>
                            </>
                          )}
                        </button>
                      </form>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Use strong passwords</p>
                          <p className="text-xs text-slate-500">Combine letters, numbers, and special characters to ensure account safety.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {role === 'super-admin' && showSubSection('smtp') && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                          <Mail size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-white">SMTP / Email</h4>
                          <p className="text-xs text-slate-500">Outgoing mail for admissions and notifications</p>
                        </div>
                      </div>
                      {smtpMessage && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
                          {smtpMessage}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <label htmlFor="smtp-host" className="text-xs font-bold text-slate-500 uppercase">SMTP Host</label>
                          <input
                            id="smtp-host"
                            value={smtpSettings.smtp_host}
                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="smtp-port" className="text-xs font-bold text-slate-500 uppercase">SMTP Port</label>
                          <input
                            id="smtp-port"
                            value={smtpSettings.smtp_port}
                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="smtp-user" className="text-xs font-bold text-slate-500 uppercase">SMTP User</label>
                          <input
                            id="smtp-user"
                            value={smtpSettings.smtp_user}
                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="smtp-from" className="text-xs font-bold text-slate-500 uppercase">From Address</label>
                          <input
                            id="smtp-from"
                            value={smtpSettings.smtp_from}
                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label htmlFor="smtp-password" className="text-xs font-bold text-slate-500 uppercase">SMTP Password (leave blank to keep current)</label>
                          <input
                            id="smtp-password"
                            type="password"
                            value={smtpPass}
                            onChange={(e) => setSmtpPass(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label htmlFor="smtp-test-email" className="text-xs font-bold text-slate-500 uppercase">Test recipient email</label>
                          <div className="flex gap-2">
                            <input
                              id="smtp-test-email"
                              type="email"
                              value={smtpTestEmail}
                              onChange={(e) => setSmtpTestEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                            />
                            <button
                              type="button"
                              onClick={handleTestSmtp}
                              disabled={smtpSaving || !smtpTestEmail}
                              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                            >
                              Send Test
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </SettingsPanel>
            )}

            {activeTab === 'Grading System' && (
              <SettingsPanel>
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Grading Systems</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configure assessment weights and grading formats for multiple grades</p>
                    </div>
                    {!showNewSystemForm && (
                      <button
                        onClick={() => {
                          setDraftName('');
                          setDraftGrades([]);
                          setDraftMethods([
                            { id: 'quiz-1', label: 'Quiz 1', maxWeight: 10 },
                            { id: 'mid-exam', label: 'Mid Exam', maxWeight: 30 },
                            { id: 'assignment', label: 'Assignment', maxWeight: 10 },
                            { id: 'final-exam', label: 'Final Exam', maxWeight: 50 },
                          ]);
                          setShowNewSystemForm(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        <Plus size={16} />
                        Add New System
                      </button>
                    )}
                  </div>

                  {/* Create New System Form */}
                  {showNewSystemForm && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 space-y-6 animate-in slide-in-from-top duration-300">
                      <div className="flex justify-between items-center border-b border-slate-105 dark:border-slate-800 pb-3">
                        <h5 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Create New Grading System</h5>
                        <button
                          onClick={() => setShowNewSystemForm(false)}
                          className="text-slate-400 hover:text-slate-650 text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Name Input */}
                      <div className="space-y-1">
                        <label htmlFor="draft-system-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Name</label>
                        <input
                          id="draft-system-name"
                          type="text"
                          placeholder="e.g. Primary School (1-4) Grading"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Grade Checkboxes */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Applies to Grades</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => {
                            const isChecked = draftGrades.includes(g);
                            return (
                              <label key={g} className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${isChecked ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 hover:bg-slate-550'}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setDraftGrades([...draftGrades, g]);
                                    } else {
                                      setDraftGrades(draftGrades.filter(x => x !== g));
                                    }
                                  }}
                                  className="hidden"
                                />
                                <span>G{g}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Methods Setup */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assessment Components</label>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${draftMethods.reduce((sum, m) => sum + m.maxWeight, 0) === 100 ? 'bg-emerald-105 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            Total: {draftMethods.reduce((sum, m) => sum + m.maxWeight, 0)}%
                          </span>
                        </div>

                        <div className="space-y-2">
                          {draftMethods.map((m, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                              <input
                                type="text"
                                value={m.label}
                                placeholder="Method name"
                                aria-label="Grading method name"
                                onChange={(e) => {
                                  const updated = [...draftMethods];
                                  updated[idx].label = e.target.value;
                                  setDraftMethods(updated);
                                }}
                                className="flex-1 bg-transparent border-none text-xs font-bold outline-none"
                              />
                              <input
                                type="number"
                                value={m.maxWeight}
                                placeholder="Weight"
                                aria-label="Maximum weight percentage"
                                onChange={(e) => {
                                  const updated = [...draftMethods];
                                  updated[idx].maxWeight = parseInt(e.target.value) || 0;
                                  setDraftMethods(updated);
                                }}
                                className="w-16 bg-slate-50 dark:bg-slate-800 text-center text-xs font-black py-1 rounded border border-slate-200 text-blue-600 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setDraftMethods(draftMethods.filter((_, i) => i !== idx))}
                                title="Delete method"
                                className="text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add component name..."
                            value={draftNewLabel}
                            onChange={(e) => setDraftNewLabel(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Weight %"
                            value={draftNewWeight}
                            onChange={(e) => setDraftNewWeight(parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center"
                          />
                          <button
                            onClick={() => {
                              if (!draftNewLabel) return;
                              setDraftMethods([...draftMethods, {
                                id: draftNewLabel.toLowerCase().replace(/\s+/g, '-'),
                                label: draftNewLabel,
                                maxWeight: draftNewWeight
                              }]);
                              setDraftNewLabel('');
                            }}
                            className="bg-slate-900 dark:bg-blue-600 text-white px-3 rounded-lg text-xs font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                        <button
                          onClick={handleCreateSystem}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 shadow-md shadow-blue-500/20"
                        >
                          Save Grading System
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Saved Grading Systems */}
                  <div className="space-y-4">
                    {gradingSystems.map((system) => {
                      const isExpanded = expandedSystemId === system.id;
                      const methods = system.methods || [];
                      const grades = system.grades || [];
                      const totalWeight = methods.reduce((sum, m) => sum + (m?.maxWeight || 0), 0);

                      return (
                        <div key={system.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden transition-all shadow-sm">
                          {/* Card Header (Expand/Collapse Toggle) */}
                          <div
                            onClick={() => setExpandedSystemId(isExpanded ? null : system.id)}
                            className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors select-none"
                          >
                            <div className="space-y-1">
                              <h5 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                {system.name}
                                {system.published ? (
                                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Published</span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Draft</span>
                                )}
                              </h5>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                Grades: {[...grades].sort((a, b) => parseInt(a) - parseInt(b)).join(', ') || 'None selected'} · {methods.length} components
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${totalWeight === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {totalWeight}%
                              </span>
                              <div className={`p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 transition-transform duration-305 ${isExpanded ? 'rotate-180' : ''}`}>
                                <Plus size={16} />
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 space-y-6 bg-slate-50/30 dark:bg-slate-800/10">
                              {/* Edit System Name */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Name</label>
                                <input
                                  type="text"
                                  value={system.name}
                                  placeholder="Enter system name"
                                  aria-label="Grading system name"
                                  onChange={(e) => {
                                    const updated = gradingSystems.map(s =>
                                      s.id === system.id ? { ...s, name: e.target.value, published: false } : s
                                    );
                                    setGradingSystems(updated);
                                  }}
                                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Edit Grades */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Applies to Grades</label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => {
                                    const isChecked = grades.includes(g);
                                    return (
                                      <label key={g} className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${isChecked ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 hover:bg-slate-550'}`}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const updatedGrades = e.target.checked
                                              ? [...grades, g]
                                              : grades.filter(x => x !== g);
                                            const updated = gradingSystems.map(s =>
                                              s.id === system.id ? { ...s, grades: updatedGrades, published: false } : s
                                            );
                                            setGradingSystems(updated);
                                          }}
                                          className="hidden"
                                        />
                                        <span>G{g}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Edit Methods */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assessment Components</label>
                                  <span className={`text-[10px] font-black px-3 py-1 rounded-full ${totalWeight === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    Total Weight: {totalWeight}%
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                  {methods.map((method, idx) => (
                                    <div key={method.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 transition-all hover:border-blue-200 group">
                                      <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                        {idx + 1}
                                      </div>
                                      <input
                                        type="text"
                                        value={method.label}
                                        placeholder="Method name"
                                        aria-label="Grading method name"
                                        onChange={(e) => {
                                          const updatedMethods = [...methods];
                                          updatedMethods[idx].label = e.target.value;
                                          const updated = gradingSystems.map(s =>
                                            s.id === system.id ? { ...s, methods: updatedMethods, published: false } : s
                                          );
                                          setGradingSystems(updated);
                                        }}
                                        className="flex-1 bg-transparent font-bold text-slate-800 dark:text-white outline-none text-xs"
                                      />
                                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded-lg border border-slate-200">
                                        <input
                                          type="number"
                                          value={method.maxWeight}
                                          placeholder="0"
                                          aria-label="Maximum weight percentage"
                                          onChange={(e) => {
                                            const updatedMethods = [...methods];
                                            updatedMethods[idx].maxWeight = parseInt(e.target.value) || 0;
                                            const updated = gradingSystems.map(s =>
                                              s.id === system.id ? { ...s, methods: updatedMethods, published: false } : s
                                            );
                                            setGradingSystems(updated);
                                          }}
                                          className="bg-transparent font-black text-blue-600 w-12 text-center outline-none text-xs"
                                        />
                                        <span className="text-[9px] font-black text-slate-400">%</span>
                                      </div>
                                      <button
                                        type="button"
                                        title="Delete method"
                                        onClick={() => {
                                          const updatedMethods = system.methods.filter((_, i) => i !== idx);
                                          const updated = gradingSystems.map(s =>
                                            s.id === system.id ? { ...s, methods: updatedMethods, published: false } : s
                                          );
                                          setGradingSystems(updated);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-colors"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Quick Presets for this system */}
                                <div className="pt-2">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-2">Preset Quick Add</span>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { label: 'Quiz 1', weight: 5 },
                                      { label: 'Test 1', weight: 10 },
                                      { label: 'Mid Exam', weight: 25 },
                                      { label: 'Quiz 2', weight: 5 },
                                      { label: 'Assignment', weight: 5 },
                                      { label: 'Final Exam', weight: 50 },
                                    ].map((preset) => (
                                      <button
                                        key={preset.label}
                                        onClick={() => {
                                          const exists = system.methods.some(m => m.label.toLowerCase() === preset.label.toLowerCase());
                                          let updatedMethods = [...system.methods];
                                          if (exists) {
                                            updatedMethods = updatedMethods.map(m =>
                                              m.label.toLowerCase() === preset.label.toLowerCase() ? { ...m, maxWeight: preset.weight } : m
                                            );
                                          } else {
                                            updatedMethods.push({
                                              id: preset.label.toLowerCase().replace(/\s+/g, '-'),
                                              label: preset.label,
                                              maxWeight: preset.weight
                                            });
                                          }
                                          const updated = gradingSystems.map(s =>
                                            s.id === system.id ? { ...s, methods: updatedMethods, published: false } : s
                                          );
                                          setGradingSystems(updated);
                                        }}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                                      >
                                        + {preset.label} ({preset.weight}%)
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Custom Component Adder */}
                                <div className="flex gap-2 pt-2">
                                  <input
                                    type="text"
                                    placeholder="Add custom component name..."
                                    id={`custom-comp-${system.id}`}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Weight"
                                    id={`custom-weight-${system.id}`}
                                    className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-center"
                                  />
                                  <button
                                    onClick={() => {
                                      const labelInput = document.getElementById(`custom-comp-${system.id}`) as HTMLInputElement;
                                      const weightInput = document.getElementById(`custom-weight-${system.id}`) as HTMLInputElement;
                                      const label = labelInput?.value;
                                      const weight = parseInt(weightInput?.value) || 0;
                                      if (!label) return;

                                      const updatedMethods = [...system.methods, {
                                        id: label.toLowerCase().replace(/\s+/g, '-'),
                                        label,
                                        maxWeight: weight
                                      }];
                                      const updated = gradingSystems.map(s =>
                                        s.id === system.id ? { ...s, methods: updatedMethods, published: false } : s
                                      );
                                      setGradingSystems(updated);

                                      if (labelInput) labelInput.value = '';
                                      if (weightInput) weightInput.value = '';
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl text-xs font-bold"
                                  >
                                    Add Component
                                  </button>
                                </div>
                              </div>

                              {totalWeight !== 100 && (
                                <div className="flex gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800/50 text-rose-600">
                                  <AlertCircle size={20} className="flex-shrink-0" />
                                  <p className="text-xs font-medium">Warning: The total weight for this system is currently <strong>{totalWeight}%</strong>. It must equal exactly 100% before publishing.</p>
                                </div>
                              )}

                              {/* Card Action Buttons */}
                              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
                                <button
                                  onClick={() => handleDeleteSystem(system.id)}
                                  className="text-rose-600 hover:text-rose-800 text-xs font-black uppercase tracking-wider flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 px-4 py-2 rounded-xl"
                                >
                                  <Trash2 size={14} />
                                  Delete System
                                </button>
                                <button
                                  onClick={() => handlePublishSystem(system.id)}
                                  disabled={gradingLoading || totalWeight !== 100}
                                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <CheckCircle size={14} />
                                  Publish System
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SettingsPanel>
            )}


            {activeTab === 'Appearance' && (
              <SettingsPanel>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['Standard', 'Modern', 'Compact', 'Classic'] as UIStyle[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setStyle(t)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${style === t ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                      >
                        <p className="font-bold text-sm">{t}</p>
                      </button>
                    ))}
                  </div>
                  <div
                    onClick={() => setAutoDarkMode(!autoDarkMode)}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Automatic Dark Mode</p>
                      <p className="text-xs text-slate-500">Switch theme based on system preferences.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${autoDarkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoDarkMode ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
              </SettingsPanel>
            )}

            {activeTab === 'Grading System' && role === 'super-admin' && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center gap-2">
                <AlertCircle size={14} />
                READ-ONLY: Grading configurations are managed at the School Admin level.
              </div>
            )}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              {activeTab === 'Grading System' && (
                <button
                  onClick={handleSaveChanges}
                  disabled={gradingLoading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  <Save size={18} />
                  <span>Save Draft Systems</span>
                </button>
              )}
              {(activeTab === 'General' || (activeTab === 'Security' && role === 'super-admin' && activeSubTab === 'smtp')) && (
                <button
                  onClick={handleSaveChanges}
                  disabled={generalSaving || smtpSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 dark:shadow-none"
                >
                  <Save size={18} />
                  <span>{generalSaving || smtpSaving ? 'Saving…' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

