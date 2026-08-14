import { useTranslation } from 'react-i18next';
import { UserPlus, X, Check, ArrowLeft, MoreVertical, CheckCircle, XCircle, Trash2, Printer, Clock, Edit2, Loader2, FileText, Download, Upload } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { registerUser, getBranchUsers, approveTeacher, revokeTeacher, deleteTeacher, updateUser, resetUserPIN, replaceUserDocument } from '../services/schoolAdminService';
import { StaffProfileModal } from '../components/StaffProfileModal';
import api from '../services/api';

export const LibrarianStaff = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useUser();
  const isAdmin = role === 'school-admin' || role === 'super-admin';

  const [librarianStaff, setLibrarianStaff] = useState<any[]>([]);
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
    fetchLibrarianStaff();
  }, []);

  const fetchLibrarianStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getBranchUsers('librarian', '');

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
      setLibrarianStaff(staff);
      return staff;
    } catch (err: any) {
      console.error('Failed to fetch librarian staff:', err);
      setError(err.response?.data?.error?.message || 'Failed to load librarian staff');
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
      fetchLibrarianStaff();
    } catch (err: any) {
      console.error('Action failed:', err);
      alert(err.response?.data?.error?.message || 'Action failed');
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
      alert('Librarian details updated successfully!');
      setShowEditModal(false);
      setEditingStaff(null);
      fetchLibrarianStaff();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update librarian');
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
          <title>Librarian Credentials - ${user.name}</title>
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
            <div class="school">Ziquala Abo School Portal</div>
            <div class="title">Librarian Login Credentials</div>
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

  const handleAddLibrarian = async (e: React.FormEvent) => {
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
      const result = await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: 'librarian',
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

      const newStaff = {
        id: result.data.user.id,
        name: result.data.user.name,
        email: result.data.user.email,
        digitalId: result.data.user.digital_id,
        status: result.data.user.status,
        userId: result.data.user.id
      };

      setSuccessModal({
        show: true,
        data: {
          user: newStaff,
          temporaryPassword: result.data.temporaryPassword
        }
      });

      setFormData({ name: '', email: '', phoneNumber: '', emergencyContactName: '', emergencyContactPhone: '', educationLevel: '', specialty: '', dob: '', previousSchool: '', experienceYears: '' });
      setSelectedFile(null);
      setPhoneError('');
      setEmergencyPhoneError('');
      setShowAddModal(false);
      fetchLibrarianStaff();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create librarian account');
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-rose-500">
        <XCircle className="mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p>You do not have permission to manage staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {t("librarian.managementTitle", "Librarian Staff Management")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("librarian.managementSubtitle", "Approve, manage, or delete librarian accounts")}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-md"
          >
            <UserPlus size={18} />
            Add Librarian
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-slate-500">Loading...</div>
          </div>
        ) : librarianStaff.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <div className="text-slate-500 text-sm font-medium">{t("librarian.noStaffFound", "No librarian staff found")}</div>
              <p className="text-slate-400 text-xs mt-1">{t("librarian.createFirstAccount", "Create your first librarian account to get started")}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t("teachers.colTeacher", "Name")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t("teachers.colEmail", "Email")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t("teachers.colDigitalId", "Digital ID")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t("teachers.colStatus", "Status")}</th>
                  <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t("teachers.colActions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {librarianStaff.map((staff) => (
                  <tr key={staff.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <button type="button" onClick={() => setSelectedStaff(staff)} className="text-left hover:underline">
                        {staff.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{staff.email}</td>
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
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${staff.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : staff.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}>
                        {staff.status === 'Approved' && <CheckCircle size={12} />}
                        {staff.status === 'Pending' && <Clock size={12} />}
                        {staff.status === 'Revoked' && <XCircle size={12} />}
                        {staff.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin && (
                        <div className="flex items-center gap-2 justify-center">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Librarian Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Add New Librarian</h3>
              </div>
              <button
                type="button"
                title="Close add librarian modal"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddLibrarian} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  title="Librarian full name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                  onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, name: c }); }}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">School Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. john@school.com"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PhoneInput
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(val) => setFormData({ ...formData, phoneNumber: val })}
                  error={phoneError}
                />
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Emergency Contact Name</label>
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Education Status</label>
                  <select title="Select education level" value={formData.educationLevel} onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="">Select level</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Degree">Degree</option>
                    <option value="Master">Master</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Specialty / Course</label>
                  <input
                    type="text"
                    title="Librarian specialty or course"
                    placeholder="Enter specialty or course"
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, specialty: c }); }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date of Birth</label>
                  <EthiopianDatePicker
                    value={formData.dob}
                    onChange={(val) => setFormData({ ...formData, dob: val })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Previous School</label>
                  <input
                    type="text"
                    title="Previous educational institution"
                    placeholder="Enter previous school name"
                    required
                    value={formData.previousSchool}
                    onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '') })}
                    onBlur={(e) => { const c = e.target.value.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); setFormData({ ...formData, previousSchool: c }); }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Experience (Years)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    title="Years of professional experience"
                    placeholder="Enter years of experience"
                    required
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StaffProfileModal
        open={!!selectedStaff}
        title="Librarian Details"
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onRefresh={async () => {
          const freshList = await fetchLibrarianStaff();
          if (freshList) {
            const updated = freshList.find((s: any) => s.id === selectedStaff.id);
            if (updated) setSelectedStaff(updated);
          }
        }}
      />

      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">✓ Librarian Created Successfully</h2>
            <div className="space-y-3 mb-6 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Name:</span>
                <span className="float-right font-medium text-slate-900 dark:text-white">{successModal.data?.user.name}</span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Digital ID:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded font-mono text-blue-600 dark:text-blue-400">
                    {successModal.data?.user.digitalId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successModal.data?.user.digitalId || '');
                      setCopied('digitalId');
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copied === 'digitalId' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">4-Digit PIN:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-2 rounded font-mono text-lg font-bold text-yellow-700 dark:text-yellow-400">
                    {successModal.data?.temporaryPassword}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successModal.data?.temporaryPassword || '');
                      setCopied('password');
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copied === 'password' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSuccessModal({ show: false, data: null })}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrintCredentials}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {confirmAction.action === 'approve' && 'Approve Librarian?'}
              {confirmAction.action === 'revoke' && 'Revoke Access?'}
              {confirmAction.action === 'delete' && 'Delete Librarian?'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              {confirmAction.action === 'approve' && `Approve ${confirmAction.staff?.name} to access the librarian portal?`}
              {confirmAction.action === 'revoke' && `Revoke ${confirmAction.staff?.name}'s access?`}
              {confirmAction.action === 'delete' && `Permanently delete ${confirmAction.staff?.name}'s account?`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction({ show: false, action: 'approve', staff: null })}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${confirmAction.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  confirmAction.action === 'revoke' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                {processing ? 'Processing...' : (
                  confirmAction.action === 'approve' ? 'Approve' :
                    confirmAction.action === 'revoke' ? 'Revoke' :
                      'Delete'
                )}
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
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Edit Librarian</h3>
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
