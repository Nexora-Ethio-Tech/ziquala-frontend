import { useState, useEffect, useCallback } from 'react';
import { Clock, Check, X, CreditCard, Eye, EyeOff, Download } from 'lucide-react';
import financeClerkService from '../services/financeService';
import { API_HOST_URL } from '../config/api';

const API = API_HOST_URL || '';

const getToken = () => localStorage.getItem('ziquala_token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

interface PendingApplication {
  id: string;
  applicant_name: string;
  applicant_email?: string;
  applicant_phone?: string;
  parent_name?: string;
  grade_applying?: string;
  status: string;
  registration_fee_status?: string;
  created_at: string;
  transcript_file_name?: string;
}

interface ApprovalPayload {
  reference?: string;
  parentDigitalId?: string;
}

export const FinanceClerkRegistration = () => {
  const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<PendingApplication | null>(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [removeOtherReason, setRemoveOtherReason] = useState('');
  const [approvalData, setApprovalData] = useState({ amount: 0, reference: '', parentDigitalId: '' });
  const [feeSource, setFeeSource] = useState<string>('unknown');
  const [feeLoadError, setFeeLoadError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [approvedApp, setApprovedApp] = useState<any>(null);



  const copyText = async (text: string, label: string) => {
    if (!text || text === 'N/A') return;
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMessage(`${label} copied to clipboard`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (copyError) {
      console.error('Copy failed', copyError);
      setError(`Unable to copy ${label}.`);
    }
  };

  const getStudentCredential = () => ({
    id: approvedApp?.student?.user?.digital_id || approvedApp?.application?.student_id_generated || 'N/A',
    password: approvedApp?.student?.temporaryPassword || approvedApp?.application?.student_password_temp || 'N/A',
  });

  const getParentCredential = () => ({
    id: approvedApp?.parent?.user?.digital_id || approvedApp?.application?.parent_id_generated || 'N/A',
    password: approvedApp?.parent?.temporaryPassword || approvedApp?.application?.parent_password_temp || 'N/A',
  });

  // Fetch pending applications
  const fetchPendingApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API}/api/finance-clerk/applications`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error?.message || errBody?.message || 'Failed to fetch pending applications');
      }

      const result = await response.json();
      setPendingApplications(Array.isArray(result) ? result : (result.data || []));
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingApplications();
  }, [fetchPendingApplications]);


  const loadRegistrationFee = async (grade?: string) => {
    try {
      setLoadingPolicy(true);
      setFeeLoadError(null);
      const fee = await financeClerkService.getGlobalRegistrationFee(grade);
      setApprovalData((prev) => ({ ...prev, amount: Number(fee.amount) || 0 }));
      setFeeSource(fee.source || 'unknown');
      if (!fee.amount || fee.amount <= 0) {
        setFeeLoadError(
          'Registration fee is not configured in system settings. Contact the administrator before approving.'
        );
      }
    } catch (err: any) {
      console.error('Failed to load registration fee:', err);
      setApprovalData((prev) => ({ ...prev, amount: 0 }));
      setFeeSource('unknown');
      setFeeLoadError('Unable to load the registration fee from the database.');
    } finally {
      setLoadingPolicy(false);
    }
  };

  const handleApproveClick = async (app: PendingApplication) => {
    setSelectedApp(app);
    setApprovalData({ amount: 0, reference: '', parentDigitalId: '' });
    setShowApprovalForm(true);
    await loadRegistrationFee(app.grade_applying);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;

    try {
      setApproving(true);
      setError(null);

      const payload: ApprovalPayload = {
        reference: approvalData.reference || undefined,
        parentDigitalId: approvalData.parentDigitalId || undefined,
      };

      const result = await financeClerkService.approveApplication(selectedApp.id, payload);

      setApprovedApp(result);
      setShowCredentials(true);
      setSuccessMessage(`✅ Payment approved! Student ID: ${result.student?.user?.digital_id || result.application?.student_id_generated || 'Generated'}`);

      setPendingApplications(prev => prev.filter(app => app.id !== selectedApp.id));

      // Reset form
      setShowApprovalForm(false);
      setApprovalData({ amount: 0, reference: '', parentDigitalId: '' });
      setSelectedApp(null);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve application');
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadTranscript = (app: PendingApplication) => {
    if (!app.transcript_file_name) {
      alert('No transcript uploaded for this application.');
      return;
    }
    // Open the backend endpoint to download the file directly from DB
    window.open(`${API}/api/school-admin/applications/${app.id}/transcript`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <Clock size={32} className="text-blue-600" />
          </div>
          <p className="text-slate-500 font-semibold">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
          <Check className="text-emerald-600 dark:text-emerald-400" size={20} />
          <p className="text-emerald-700 dark:text-emerald-300 font-semibold">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <X className="text-red-600 dark:text-red-400" size={20} />
          <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
        </div>
      )}

      {/* Applications List */}
      {pendingApplications.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Clock size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold">
            No pending applications awaiting payment
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-lg transition-all"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Student Info */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Student Name
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {app.applicant_name || (app as any).name}
                  </p>
                </div>

                {/* Grade */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Grade
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    Grade {app.grade_applying || 'N/A'}
                  </p>
                </div>

                {/* Parent Name */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Parent/Guardian
                  </p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {app.parent_name || 'Not provided'}
                  </p>
                </div>

                {/* Application Date */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Applied On
                  </p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Email
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {app.applicant_email || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Phone
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {app.applicant_phone || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleApproveClick(app)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                >
                  <Check size={16} />
                  Approve & Proceed to Registration
                </button>

                <button
                  onClick={() => { setSelectedApp(app); setShowRemoveModal(true); setRemoveReason('duplicate'); setRemoveOtherReason(''); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                >
                  <X size={16} />
                  Remove
                </button>

                <button
                  onClick={() => handleDownloadTranscript(app)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all"
                >
                  <Download size={16} />
                  Documents
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Approval Modal */}
      {showApprovalForm && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Approve Payment & Generate Credentials
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Student: {selectedApp.applicant_name || (selectedApp as any).name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Registration Fee (ETB)
                </label>
                <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white">
                  {loadingPolicy ? (
                    <span className="text-sm text-slate-500">Loading fee from database...</span>
                  ) : approvalData.amount > 0 ? (
                    <span className="text-2xl font-black">{approvalData.amount.toLocaleString()} ETB</span>
                  ) : (
                    <span className="text-sm font-semibold text-amber-600">Not configured</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  This fee is set in system configuration and cannot be changed here. Verify the applicant paid this exact amount before approving.
                </p>
                {feeSource !== 'unknown' && approvalData.amount > 0 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Source: {feeSource}
                  </p>
                )}
                {feeLoadError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-semibold">
                    {feeLoadError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Parent ID (optional)
                </label>
                <input
                  type="text"
                  value={approvalData.parentDigitalId}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, parentDigitalId: e.target.value.trim() })
                  }
                  placeholder="Enter existing Parent ID if available"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  If the student has a sibling already registered, enter the parent's existing digital ID here so the student links to the same account instead of creating a new one.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Payment Reference (optional)
                </label>
                <input
                  type="text"
                  value={approvalData.reference}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, reference: e.target.value })
                  }
                  placeholder="e.g., Receipt #12345"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  ✓ This will generate Student ID, Password, Parent ID, and Password
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalForm(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-bold transition-all hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving || approvalData.amount <= 0 || loadingPolicy || !!feeLoadError}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                {approving ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Approve Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Return Application to School Admin</h2>
            <p className="text-sm text-slate-600 mb-4">Please select the reason for returning this application. The School Admin will see this reason.</p>

            <div className="space-y-3 mb-4">
              <label className={`flex items-center gap-3 px-4 py-2 border rounded-lg ${removeReason === 'duplicate' ? 'border-rose-600 bg-rose-50' : 'border-slate-200'}`}>
                <input type="radio" name="removeReason" checked={removeReason === 'duplicate'} onChange={() => setRemoveReason('duplicate')} />
                <span className="font-semibold">Duplicate application</span>
              </label>
              <label className={`flex items-center gap-3 px-4 py-2 border rounded-lg ${removeReason === 'incorrect' ? 'border-rose-600 bg-rose-50' : 'border-slate-200'}`}>
                <input type="radio" name="removeReason" checked={removeReason === 'incorrect'} onChange={() => setRemoveReason('incorrect')} />
                <span className="font-semibold">Incorrect information</span>
              </label>
              <label className={`flex items-center gap-3 px-4 py-2 border rounded-lg ${removeReason === 'already_registered' ? 'border-rose-600 bg-rose-50' : 'border-slate-200'}`}>
                <input type="radio" name="removeReason" checked={removeReason === 'already_registered'} onChange={() => setRemoveReason('already_registered')} />
                <span className="font-semibold">Already registered</span>
              </label>
              <label className={`flex items-center gap-3 px-4 py-2 border rounded-lg ${removeReason === 'other' ? 'border-rose-600 bg-rose-50' : 'border-slate-200'}`}>
                <input type="radio" name="removeReason" checked={removeReason === 'other'} onChange={() => setRemoveReason('other')} />
                <span className="font-semibold">Other</span>
              </label>

              {removeReason === 'other' && (
                <textarea
                  value={removeOtherReason}
                  onChange={(e) => setRemoveOtherReason(e.target.value)}
                  placeholder="Explain reason"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowRemoveModal(false); setSelectedApp(null); }} className="flex-1 px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancel</button>
              <button
                onClick={async () => {
                  if (!selectedApp) return;
                  const reasonText = removeReason === 'other' ? (removeOtherReason || 'Other') : removeReason;
                  try {
                    setLoading(true);
                    await financeClerkService.removeApplication(selectedApp.id, { reason: reasonText });
                    setPendingApplications(prev => prev.filter(a => a.id !== selectedApp.id));
                    setShowRemoveModal(false);
                    setSelectedApp(null);
                    setSuccessMessage('Application returned to School Admin');
                    setTimeout(() => setSuccessMessage(null), 4000);
                  } catch (err: any) {
                    setError(err.message || 'Failed to return application');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold"
              >
                Return Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Display Modal */}
      {approvedApp && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #credential-print-sheet,
              #credential-print-sheet * { visibility: visible !important; }
              #credential-print-sheet {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 12mm 15mm !important;
                background: white !important;
                color: #0f172a !important;
              }
            }
          `}</style>

          <div id="credential-print-sheet" className="hidden print:block fixed inset-0 z-[9999] bg-white text-slate-900">
            <div className="max-w-[180mm] mx-auto pt-[8mm]">
              <h1 className="text-lg font-bold tracking-tight border-b-2 border-slate-800 pb-2 mb-6">
                Login Credentials
              </h1>
              <div className="grid grid-cols-2 gap-x-10 gap-y-5 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Student ID</p>
                  <p className="text-base font-mono font-bold">{getStudentCredential().id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Student Password</p>
                  <p className="text-base font-mono font-bold">{getStudentCredential().password}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Parent ID</p>
                  <p className="text-base font-mono font-bold">{getParentCredential().id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Parent Password</p>
                  <p className="text-base font-mono font-bold">{getParentCredential().password}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="credential-modal-screen fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
                <Check size={24} />
                Payment Approved
              </h2>

              <div className="space-y-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Student ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-bold text-slate-900 dark:text-white flex-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {getStudentCredential().id}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(getStudentCredential().id, 'Student ID')}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Student Password</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold text-slate-900 dark:text-white flex-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {showCredentials ? getStudentCredential().password : '••••••••'}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowCredentials(!showCredentials)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                      aria-label={showCredentials ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showCredentials ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(getStudentCredential().password, 'Student password')}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Parent ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-bold text-slate-900 dark:text-white flex-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {getParentCredential().id}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(getParentCredential().id, 'Parent ID')}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Parent Password</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold text-slate-900 dark:text-white flex-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {showCredentials ? getParentCredential().password : '••••••••'}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(getParentCredential().password, 'Parent password')}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const student = getStudentCredential();
                    const parent = getParentCredential();
                    copyText(
                      `Student ID: ${student.id}\nStudent Password: ${student.password}\nParent ID: ${parent.id}\nParent Password: ${parent.password}`,
                      'All credentials'
                    );
                  }}
                  className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold transition-all"
                >
                  Copy all credentials
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCredentials(true);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
                >
                  Print credentials (A4)
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setApprovedApp(null);
                  setShowCredentials(false);
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinanceClerkRegistration;
