import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, AlertCircle, UserCheck, UserPlus, ShieldAlert, Users, Building2, X, Edit2, Trash2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useUser, type UserRole } from '../context/UserContext';
import { userService } from '../services/userService';
import { branchService } from '../services/branchService';
import { useStore } from '../context/useStore';
export const Staff = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role: currentUserRole, selectedBranch } = useUser();
  const { selectedBranchId } = useStore();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [managingStaff, setManagingStaff] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({ role: 'school-admin', name: '', email: '', branchId: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [successModal, setSuccessModal] = useState<{ show: boolean; data: any }>({ show: false, data: null });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; userId: string; userName: string }>({ show: false, userId: '', userName: '' });
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const staffTabs = [
    { label: 'Teachers', path: 'teachers' },
    { label: 'Librarian Staff', path: 'librarian' }
  ];

  useEffect(() => {
    if (currentUserRole !== 'super-admin') return;
    const init = async () => {
      const branchList = await fetchBranches();
      await fetchUsers(branchList);
    };
    init();
  }, [roleFilter, statusFilter, currentUserRole, selectedBranchId]);

  useEffect(() => {
    if (currentUserRole === 'super-admin' && selectedBranchId) {
      setCreateForm((current) => {
        if (current.branchId === selectedBranchId) {
          return current;
        }
        return { ...current, branchId: selectedBranchId };
      });
    }
  }, [currentUserRole, selectedBranchId]);

  if (currentUserRole !== 'super-admin' && currentUserRole !== 'academic-manager' && currentUserRole !== 'school-admin') {
    return (
      <div className="p-8 text-center text-rose-500">
        <ShieldAlert className="mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p>You do not have permission to view staff management.</p>
      </div>
    );
  }

  if (currentUserRole === 'super-admin' && !selectedBranchId) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 md:p-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] mb-4">
              <Users size={14} />
              Branch Required
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t("staff.title", "Staff Management")}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm md:text-base leading-6">
              Select a branch first to view and manage the academic and library staff assigned to it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/branches')}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700 text-sm font-bold"
              >
                <Building2 size={18} />
                Choose Branch
              </button>
              <button
                onClick={() => navigate('/dashboard/super-admin')}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 text-sm font-bold"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUserRole === 'school-admin' || currentUserRole === 'academic-manager') {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t("staff.title", "Staff Management")}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t("staff.subtitle", "Manage the teaching and library teams from one academic workspace.")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {staffTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={`/staff/${tab.path}`}
              className={({ isActive }) =>
                `rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-bold text-center transition ${isActive ? 'bg-white text-slate-900 shadow dark:bg-slate-950 dark:text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {t(`nav.${tab.path}`, tab.label)}
            </NavLink>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }


  const fetchBranches = async () => {
    try {
      const response = await branchService.getAllBranches();
      const list = response.data || [];
      setBranches(list);
      return list;
    } catch (err) {
      console.error('❌ Error fetching branches:', err);
      return [];
    }
  };

  const fetchUsers = async (branchList?: any[]) => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (roleFilter) filters.role = roleFilter;
      if (statusFilter) filters.status = statusFilter;
      if (currentUserRole === 'super-admin' && selectedBranchId) {
        filters.branchId = selectedBranchId;
      }
      const response = await userService.getAllUsers(filters);
      const resolvedBranches = branchList || branches;

      // 🔐 SECURITY: Super Admin can ONLY see users they create:
      // - Super Admins (system-level)
      // - Academic Managers (system-level academic oversight)
      // - School Admins (created by Super Admin, assigned to branches)
      // - Vice Principals (created by Super Admin)
      // School Admin creates and manages branch-level academic users.
      const MANAGEABLE_ROLES = currentUserRole === 'super-admin'
        ? ['super-admin', 'academic-manager', 'school-admin', 'vice-principal']
        : ['academic-manager', 'vice-principal', 'teacher', 'librarian', 'storekeeper'];

      const transformed = (response.data || [])
        .filter((u: any) => MANAGEABLE_ROLES.includes(u.role))
        .map((u: any) => {
          const branchId = u.branch_id || u.branchId;
          const matched = resolvedBranches.find((b: any) => b.id === branchId);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            digitalId: u.digital_id || u.digitalId,
            zkDeviceId: u.zk_device_id || u.zkDeviceId,
            branchId,
            branchName: matched?.name || (branchId ? 'Unknown Branch' : 'All Branches'),
          };
        });
      setStaffList(transformed);
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  if (currentUserRole !== 'super-admin' && currentUserRole !== 'school-admin' && currentUserRole !== 'academic-manager') {
    return (
      <div className="p-8 text-center text-rose-500">
        <ShieldAlert className="mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p>You do not have permission to view staff management.</p>
      </div>
    );
  }

  const handleUpdateStatus = async (userId: string, status: 'Approved' | 'Pending' | 'Revoked') => {
    try {
      await userService.updateUserStatus(userId, status);
      const branchList = await fetchBranches();
      fetchUsers(branchList);
      setToast({ show: true, message: 'Status updated successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    } catch (err: any) {
      console.error('❌ Error updating status:', err);
      setErrorModal({ show: true, message: err.response?.data?.error?.message || 'Failed to update status' });
    }
  };

  const confirmDelete = async () => {
    try {
      await userService.deleteUser(deleteModal.userId);
      setDeleteModal({ show: false, userId: '', userName: '' });
      const branchList = await fetchBranches();
      fetchUsers(branchList);
      setToast({ show: true, message: 'User deleted successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    } catch (err: any) {
      console.error('❌ Error deleting user:', err);
      setDeleteModal({ show: false, userId: '', userName: '' });
      setErrorModal({ show: true, message: err.response?.data?.error?.message || 'Failed to delete user' });
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
      await userService.updateUser(editingStaff.id, {
        name: editFormData.name,
        email: editFormData.email
      });
      setToast({ show: true, message: 'User updated successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      setShowEditModal(false);
      setEditingStaff(null);
      const branchList = await fetchBranches();
      fetchUsers(branchList);
    } catch (err: any) {
      setErrorModal({ show: true, message: err.response?.data?.error?.message || 'Failed to update user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingStaff) return;
    setResettingPassword(true);
    try {
      const result = await userService.resetUserPassword(editingStaff.id);
      const temporaryPassword = result?.temporaryPassword || result?.data?.temporaryPassword;
      if (temporaryPassword) {
        setGeneratedPassword(temporaryPassword);
      } else {
        setToast({ show: true, message: 'Password reset succeeded', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
      }
    } catch (err: any) {
      setErrorModal({ show: true, message: err.response?.data?.error?.message || 'Failed to reset password' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate email before submitting
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail(createForm.email)) {
      setErrorModal({ show: true, message: 'Please enter a valid email address' });
      return;
    }

    // Format name: Capitalize first letter of each word, rest lowercase
    const formattedName = createForm.name
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    if (!formattedName) {
      setErrorModal({ show: true, message: 'Name is required' });
      return;
    }

    setCreating(true);
    try {
      // Backend has conflicting validation - dedicated endpoints shouldn't require role field
      const data: any = {
        name: formattedName,
        email: createForm.email,
        branchId: currentUserRole === 'super-admin' && selectedBranchId ? selectedBranchId : createForm.branchId
      };

      console.log('📤 Sending data:', data);
      console.log('🎯 Endpoint:', createForm.role);

      let response;
      if (createForm.role === 'school-admin') {
        response = await userService.createSchoolAdmin(data);
      } else if (createForm.role === 'vice-principal') {
        response = await userService.createVicePrincipal(data);
      } else if (createForm.role === 'academic-manager') {
        response = await userService.createAcademicManager(data);
      }

      console.log('✅ User created:', response);
      const payload = response?.data?.user != null ? response.data : response;
      setShowCreateModal(false);
      setCreateForm({ role: 'school-admin', name: '', email: '', branchId: '', password: '' });
      setSuccessModal({
        show: true,
        data: {
          user: payload.user,
          temporaryPassword: payload.temporaryPassword ?? payload.temporary_password,
        },
      });
      const branchList = await fetchBranches();
      fetchUsers(branchList);
    } catch (err: any) {
      console.error('❌ Error creating user:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Full error details:', JSON.stringify(err.response?.data, null, 2));
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create user';
      setShowCreateModal(false);
      setErrorModal({ show: true, message: errorMsg });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Staff Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Assign system roles and global permissions.
            {selectedBranch && currentUserRole === 'super-admin' ? ` Viewing ${selectedBranch.name}.` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold"
          >
            <UserPlus size={18} />
            Create User
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("staff.colEmployee","Employee")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("staff.colRole","Current Role")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("staff.colBranch", "Branch")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("staff.colFlags","Special Flags")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t("staff.colActions", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{staff.name}</p>
                          <p className="text-xs text-slate-500">{staff.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-mono text-slate-400">{staff.digitalId || '—'}</p>
                            {staff.zkDeviceId && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-[10px] font-bold tracking-wider">
                                ZK: {staff.zkDeviceId}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                        {staff.branchName || (staff.branchId ? staff.branchId : 'All Branches')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${staff.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          staff.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(staff.status === 'Pending' || staff.status === 'Revoked') && (
                            <button
                              onClick={() => handleUpdateStatus(staff.id, 'Approved')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700"
                            >
                              Approve
                            </button>
                          )}
                          {staff.status === 'Approved' && (
                            <button
                              onClick={() => handleUpdateStatus(staff.id, 'Revoked')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(staff)}
                            className="p-1.5 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-950/30 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ show: true, userId: staff.id, userName: staff.name })}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("staff.createUser","Create New User")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close create user modal"
              >
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleCreateUser}>
              <div>
                <label htmlFor="role-select" className="text-xs font-bold text-slate-500 uppercase">Role</label>
                <select
                  id="role-select"
                  value={createForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setCreateForm({
                      ...createForm,
                      role: newRole,
                      branchId: createForm.branchId
                    });
                  }}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="school-admin">School Admin</option>
                  <option value="academic-manager">Academic Manager</option>
                  <option value="vice-principal">Vice Principal</option>
                </select>
              </div>

              <div>
                <label htmlFor="name-input" className="text-xs font-bold text-slate-500 uppercase">Name</label>
                <input
                  id="name-input"
                  type="text"
                  value={createForm.name}
                  onChange={(e) => {
                    // Reject numbers, symbols, and other special characters. Allow unicode letters & spaces.
                    const cleaned = e.target.value.replace(/[^\p{L}\s]/gu, '');
                    setCreateForm({ ...createForm, name: cleaned });
                  }}
                  onBlur={(e) => {
                    // Capitalize first letter of each word, rest lowercase
                    const formatted = e.target.value
                      .trim()
                      .split(/\s+/)
                      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(' ');
                    setCreateForm({ ...createForm, name: formatted });
                  }}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="email-input" className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <input
                  id="email-input"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                  <label htmlFor="branch-select" className="text-xs font-bold text-slate-500 uppercase">Branch</label>
                  {currentUserRole === 'super-admin' && selectedBranchId ? (
                    <div className="w-full mt-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200">
                      {selectedBranch?.name || branches.find((branch) => branch.id === selectedBranchId)?.name || 'Selected Branch'}
                      <input type="hidden" value={selectedBranchId} />
                    </div>
                  ) : (
                    <select
                      id="branch-select"
                      value={createForm.branchId}
                      onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                      className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <UserCheck size={18} />}
                  <span>{creating ? 'Creating...' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">User Created Successfully!</h3>
                  <p className="text-sm text-slate-500">Save the temporary password below</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-mono font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    {successModal.data?.temporaryPassword || 'N/A'}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successModal.data?.temporaryPassword || '');
                      setToast({ show: true, message: 'Password copied to clipboard!', type: 'success' });
                      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
                    }}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>⚠️ Important:</strong> This password will only be shown once. Make sure to save it securely.
                </p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>📧 Email sent:</strong> A welcome email with the Digital ID, login email, and temporary password has been automatically sent to <strong>{successModal.data?.user?.email}</strong>.
                </p>
              </div>

              {successModal.data?.user && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{successModal.data.user.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{successModal.data.user.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Digital ID:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{successModal.data.user.digital_id || successModal.data.user.digitalId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status:</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold uppercase">
                      {successModal.data.user.status || 'Pending'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSuccessModal({ show: false, data: null })}
                className="w-full bg-slate-900 dark:bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{t("staff.deleteUserTitle","Delete User")}</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete <strong>{deleteModal.userName}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ show: false, userId: '', userName: '' })}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                  <AlertCircle size={24} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Error</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{errorModal.message}</p>
              <button
                onClick={() => setErrorModal({ show: false, message: '' })}
                className="w-full bg-slate-900 dark:bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={`px-6 py-4 rounded-xl shadow-lg border flex items-center gap-3 ${toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
            <UserCheck size={20} />
            <p className="font-bold text-sm">{toast.message}</p>
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
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Edit User Details</h3>
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
                    <p className="text-xs text-slate-500">Generate a new 4-digit PIN for this user.</p>
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
