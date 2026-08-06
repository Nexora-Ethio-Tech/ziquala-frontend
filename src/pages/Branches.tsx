import { Building2, MapPin, Users, GraduationCap, ChevronRight, Plus, ArrowLeft, X, Check, Loader2, AlertCircle, Edit, Trash2, Upload } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useStore } from '../context/useStore';
import { useState, useEffect } from 'react';
import { branchService, type Branch } from '../services/branchService';

export const Branches = () => {
  const { branches: mockBranches, setSelectedBranch } = useUser();
  const { selectedBranchId, setSelectedBranchId } = useStore();
  const navigate = useNavigate();

  // API Integration: Fetch real branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    logoUrl: ''
  });

  // Edit branch state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: ''
  });

  // Delete branch state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [deletingBranchName, setDeletingBranchName] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await branchService.getAllBranches();
        if (response.success) {
          setBranches(response.data);
          console.log('✅ Branches API Success:', response.data);
        }
      } catch (err: any) {
        console.error('❌ Branches API Error:', err);
        setError(err.message || 'Failed to fetch branches');
        // Fallback to mock data
        setBranches(mockBranches as any);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [mockBranches]);

  const handleEnterBranch = (branch: Branch) => {
    setSelectedBranch(branch as any);
    setSelectedBranchId(branch.id);
    navigate('/');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the file is larger than 5 MB
    const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
    if (file.size > maxSize) {
      alert('The image size exceeds the 5 MB limit. Please select a smaller image.');
      e.target.value = ''; // Reset the input
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setBranchForm((prev) => ({ ...prev, logoUrl: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await branchService.createBranch(branchForm);
      console.log('✅ Branch created:', response);
      alert('Branch created successfully!');
      setShowAddModal(false);
      setBranchForm({ name: '', code: '', phone: '', email: '', address: '', logoUrl: '' });
      // Refresh branches
      const refreshResponse = await branchService.getAllBranches();
      if (refreshResponse.success) {
        setBranches(refreshResponse.data);
      }
    } catch (err: any) {
      console.error('❌ Error creating branch:', err);
      alert(err.response?.data?.error?.message || 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setEditForm({
      name: branch.name,
      code: branch.code || '',
      phone: branch.phone || '',
      email: branch.email || '',
      address: branch.address || ''
    });
    setShowEditModal(true);
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranchId) return;
    setUpdating(true);
    try {
      const response = await branchService.updateBranch(editingBranchId, editForm);
      console.log('✅ Branch updated:', response);
      alert('Branch updated successfully!');
      setShowEditModal(false);
      setEditingBranchId(null);
      setEditForm({ name: '', code: '', phone: '', email: '', address: '' });
      // Refresh branches
      const refreshResponse = await branchService.getAllBranches();
      if (refreshResponse.success) {
        setBranches(refreshResponse.data);
      }
    } catch (err: any) {
      console.error('❌ Error updating branch:', err);
      alert(err.response?.data?.error?.message || 'Failed to update branch');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenDeleteConfirm = (branch: Branch) => {
    setDeletingBranchId(branch.id);
    setDeletingBranchName(branch.name);
    setShowDeleteConfirm(true);
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranchId) return;
    setDeleting(true);
    try {
      const response = await branchService.deleteBranch(deletingBranchId);
      console.log('✅ Branch deleted:', response);
      alert('Branch deleted successfully!');
      setShowDeleteConfirm(false);
      if (deletingBranchId === selectedBranchId) {
        setSelectedBranchId(null);
        setSelectedBranch(null);
      }
      setDeletingBranchId(null);
      setDeletingBranchName('');
      // Refresh branches
      const refreshResponse = await branchService.getAllBranches();
      if (refreshResponse.success) {
        setBranches(refreshResponse.data);
      }
    } catch (err: any) {
      console.error('❌ Error deleting branch:', err);
      alert(err.response?.data?.error?.message || 'Failed to delete branch');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-4">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">School Branches</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage and monitor all school locations from one place.
            {error && <span className="text-amber-600 ml-2">⚠️ Using cached data</span>}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
        >
          <Plus size={20} />
          <span>Add New Branch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-xl dark:hover:shadow-none transition-all overflow-hidden group hover:-translate-y-1"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                  <Building2 size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(branch)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-blue-600"
                      title="Edit branch"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteConfirm(branch)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-rose-600"
                      title="Delete branch"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${selectedBranchId === branch.id ? 'bg-blue-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    {selectedBranchId === branch.id ? 'Selected' : 'Active'}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{branch.name}</h3>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-6">
                <MapPin size={14} />
                <span>{branch.address || 'No location'}</span>
              </div>

              <button
                onClick={() => handleEnterBranch(branch)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-blue-600 text-white py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-slate-200/50 dark:shadow-none"
              >
                Enter Branch View
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Building2 size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Add New Branch</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} title="Close add branch modal" aria-label="Close add branch modal" className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleCreateBranch}>
              {/* Added Image Upload Field */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Branch Image (Max 5MB)</label>
                <div className="mt-1 flex items-center gap-4">
                  {branchForm.logoUrl && (
                    <img
                      src={branchForm.logoUrl}
                      alt="Branch preview"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-sm"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    title="Upload branch image"
                    aria-label="Upload branch image"
                    className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Branch Name</label>
                <input
                  type="text"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g. Main Branch"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Branch Code</label>
                <input
                  type="text"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  placeholder="e.g. MB"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                <input
                  type="tel"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="+251911000000"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <input
                  type="email"
                  value={branchForm.email}
                  onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                  placeholder="branch@ziqualaabo.edu.et"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="Addis Ababa, Ethiopia"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0">
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
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  <span>{creating ? 'Creating...' : 'Create Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (Omitted changes to focus on create requirement) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Edit size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Edit Branch</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} title="Close edit branch modal" aria-label="Close edit branch modal" className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleEditBranch}>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Branch Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Main Branch"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Branch Code</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  placeholder="e.g. MB"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+251911000000"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="branch@ziqualaabo.edu.et"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Addis Ababa, Ethiopia"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={updating}
                >
                  {updating ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  <span>{updating ? 'Updating...' : 'Update Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Branch</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{deletingBranchName}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <Trash2 size={20} className="text-rose-600" />
                <span className="text-sm">Deleting a branch will remove it from the branch list and clear the active branch selection if necessary.</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBranch}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-2xl hover:bg-rose-700 transition disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Branch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
