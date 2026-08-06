import { UserPlus, X, Check, ArrowLeft, MoreVertical, CheckCircle, XCircle, Trash2, Printer, Wallet, Edit2, Loader2, FileText, Download, Upload } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { registerUser, getBranchUsers, approveTeacher, revokeTeacher, deleteTeacher, updateUser, resetUserPIN, replaceUserDocument } from '../services/schoolAdminService';
import { StaffProfileModal } from '../components/StaffProfileModal';
import api from '../services/api';

export const FinanceStaff = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const isAdmin = role === 'school-admin' || role === 'super-admin';

  const [financeStaff, setFinanceStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successModal, setSuccessModal] = useState<{ show: boolean; data: any }>({ show: false, data: null });
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
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
    experienceYears: ''
  });
  const [phoneError, setPhoneError] = useState('');
  const [emergencyPhoneError, setEmergencyPhoneError] = useState('');
  const [copied, setCopied] = useState<'digitalId' | 'password' | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ show: boolean; action: 'approve' | 'revoke' | 'delete'; staff: any }>({ show: false, action: 'approve', staff: null });
  const [processing, setProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);


  useEffect(() => {
    fetchFinanceStaff();
  }, []);

  const fetchFinanceStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getBranchUsers('finance-clerk', '');

      const staff = (response.data || []).map((person: any) => ({
        id: person.id,
        name: person.name,
        email: person.email,
        digitalId: person.digital_id || person.digitalId,
        zkDeviceId: person.zk_device_id || person.zkDeviceId,
        status: person.status,
        userId: person.user_id || person.id,
        branchId: person.branch_id,
        createdAt: person.created_at,
        staffProfile: person.staff_profile,
        document_file_name: person.document_file_name,
        document_file_size: person.document_file_size,
        document_mime_type: person.document_mime_type,
      }));
      setFinanceStaff(staff);
      return staff;
    } catch (err: any) {
      console.error('Failed to fetch finance staff:', err);
      setError(err.response?.data?.error?.message || 'Failed to load finance staff');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!confirmAction.staff) return;

    setProcessing(true);
    try {
      const userId = confirmAction.staff.userId;

      if (confirmAction.action === 'approve') {
        await approveTeacher(userId);
      } else if (confirmAction.action === 'revoke') {
        await revokeTeacher(userId);
      } else if (confirmAction.action === 'delete') {
        await deleteTeacher(userId);
      }

      setConfirmAction({ show: false, action: 'approve', staff: null });
      setActionMenu(null);
      fetchFinanceStaff();
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

  const openEditModal = (staff: any) => {
    setEditingStaff(staff);
    setEditFormData({
      name: staff.name || '',
      email: staff.email || ''
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
      alert('Finance Clerk details updated successfully!');
      setShowEditModal(false);
      setEditingStaff(null);
      fetchFinanceStaff();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update finance clerk');
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
          <title>Finance Clerk Credentials - ${user.name}</title>
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
            <div class="school">Ziquala Abo School IMS</div>
            <div class="title">Finance Clerk Login Credentials</div>
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

  const handleAddFinanceClerk = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      alert('Please enter a valid email address (e.g. name@school.com)');
      return;
    }

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
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: 'finance-clerk',
        staffProfile: {
          phoneNumber: `+251${formData.phoneNumber}`,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactPhone: formData.emergencyContactPhone ? `+251${formData.emergencyContactPhone}` : '',
          educationLevel: formData.educationLevel,
          specialty: formData.specialty,
          dob: formData.dob,
          previousSchool: formData.previousSchool,
          experienceYears: formData.experienceYears,
          registeredAt: new Date().toISOString()
        }
      }, selectedFile);

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
      setFormData({ name: '', email: '', phoneNumber: '', emergencyContactName: '', emergencyContactPhone: '', educationLevel: '', specialty: '', dob: '', previousSchool: '', experienceYears: '' });
      setSelectedFile(null);
      setPhoneError('');
      setEmergencyPhoneError('');
      setSuccessModal({ show: true, data: transformedData });
      fetchFinanceStaff();
    } catch (err: any) {
      console.error('Failed to create finance clerk:', err);
      alert(err.response?.data?.error?.message || 'Failed to create finance clerk');
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

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Finance Staff</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage finance clerks and payment administrators</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-bold shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <UserPlus size={20} />
            Add Finance Clerk
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Finance Clerk</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Digital ID</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {financeStaff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No finance clerks found. Add your first finance clerk.
                </td>
              </tr>
            ) : (
              financeStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => setSelectedStaff(staff)} className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                        {staff.name?.split(' ').map((n: string) => n[0]).join('') || 'F'}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">{staff.name}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{staff.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-slate-600 dark:text-slate-400">{staff.digitalId}</p>
                      {staff.zkDeviceId && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-[10px] font-bold tracking-wider">
                          ZK: {staff.zkDeviceId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${staff.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        staff.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {(staff.status === 'Pending' || staff.status === 'Revoked') ? (
                          <button
                            onClick={() => setConfirmAction({ show: true, action: 'approve', staff })}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                        ) : staff.status === 'Approved' ? (
                          <button
                            onClick={() => setConfirmAction({ show: true, action: 'revoke', staff })}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <XCircle size={14} />
                            Revoke
                          </button>
                        ) : null}
                        <button
                          onClick={() => openEditModal(staff)}
                          className="p-1.5 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-950/30 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ show: true, action: 'delete', staff })}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Finance Clerk Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Wallet size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Add New Finance Clerk</h3>
              </div>
              <button
                type="button"
                title="Close add finance clerk modal"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAddFinanceClerk}>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  title="Finance clerk full name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                  onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, name: c }); }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Chaltu Bekele"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. chaltu.bekele@school.com"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                />
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
                    title="Emergency contact person's name"
                    placeholder="Enter emergency contact name"
                    required
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, emergencyContactName: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                    title="Finance clerk specialty or course"
                    placeholder="Enter specialty or course"
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, specialty: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                    title="Previous educational institution"
                    placeholder="Enter previous school name"
                    required
                    value={formData.previousSchool}
                    onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, previousSchool: c }); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Experience (Years)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    title="Years of professional experience"
                    placeholder="Enter years of experience"
                    required
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  <strong>Note:</strong> A 4-digit PIN will be auto-generated. Finance Clerk will need School Admin approval to login.
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
                  className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  <span>{creating ? 'Creating...' : 'Create Finance Clerk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StaffProfileModal
        open={!!selectedStaff}
        title="Finance Clerk Details"
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onRefresh={async () => {
          const freshList = await fetchFinanceStaff();
          if (freshList) {
            const updated = freshList.find((s: any) => s.id === selectedStaff.id);
            if (updated) setSelectedStaff(updated);
          }
        }}
      />

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
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Finance Clerk Created Successfully!</h3>
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
                  ⚠️ This PIN won't be shown again. Finance Clerk must save it for first login.
                </p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>📋 Next Steps:</strong> Approve the finance clerk from the actions menu to enable login.
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
                Are you sure you want to {confirmAction.action} <strong>{confirmAction.staff?.name}</strong>?
              </p>
              {confirmAction.action === 'delete' && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                  ⚠️ This action cannot be undone.
                </p>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setConfirmAction({ show: false, action: 'approve', staff: null })}
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
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Edit Finance Clerk</h3>
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
                    <p className="text-xs text-slate-500">Generate a new 4-digit PIN for this staff member.</p>
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
