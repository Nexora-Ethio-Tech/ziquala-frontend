import { useState, useEffect } from 'react';
import {
  Package, BarChart3, Plus, Search, Pencil, Trash2, X, CheckCircle,
  AlertCircle, Box, TrendingUp, ClipboardList, Archive, RefreshCw,
  Building2, UserCheck, RotateCcw, ArrowRightLeft, Layers, MapPin, Tag, ShieldAlert
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Asset {
  id: string;
  name: string;
  description?: string;
  amount: number;
  value: number;
  category?: string;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
  location?: string;
  serial_number?: string;
  acquisition_date?: string;
  branch_id?: string;
  created_at: string;
  updated_at?: string;
}

interface AssetIssue {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_category?: string;
  issued_to_name: string;
  issued_to_role?: string;
  purpose?: string;
  quantity: number;
  issued_at: string;
  expected_return?: string;
  returned_at?: string;
  status: 'Issued' | 'Returned' | 'Overdue' | 'Lost';
  notes?: string;
}

interface Stats {
  assets: {
    asset_types: string;
    total_items: string;
    total_value: string;
    low_stock_count: string;
  };
  issues: {
    total_issues: string;
    active_issues: string;
    returned_issues: string;
    overdue_issues: string;
  };
  categories: { category: string; count: string; total_qty: string }[];
}

type Tab = 'overview' | 'inventory' | 'issues' | 'add';

const CONDITION_COLORS = {
  Excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400',
  Good: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400',
  Fair: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400',
  Poor: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400',
  Damaged: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const StorekeeperPortal = () => {
  const { user } = useUser();
  const branchId = (user as any)?.branch_id || (user as any)?.branchId;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [issues, setIssues] = useState<AssetIssue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Add / Edit Asset form
  const emptyForm = {
    name: '',
    description: '',
    amount: 1,
    value: 0,
    category: 'General',
    condition: 'Good' as 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged',
    location: '',
    serial_number: '',
    acquisition_date: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Issue Item Modal State
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    asset_id: '',
    issued_to_name: '',
    issued_to_role: 'Teacher',
    purpose: '',
    quantity: 1,
    expected_return: '',
    notes: ''
  });
  const [issuing, setIssuing] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const bParam = branchId ? `?branchId=${branchId}` : '';

      const [assetsRes, issuesRes, statsRes] = await Promise.all([
        api.get(`/storekeeper/assets${bParam}`),
        api.get(`/storekeeper/issues${bParam}`),
        api.get(`/storekeeper/stats${bParam}`)
      ]);

      setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : []);
      setIssues(Array.isArray(issuesRes.data) ? issuesRes.data : []);
      setStats(statsRes.data || null);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load storekeeper data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, [branchId]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  // ─── Category List ────────────────────────────────────────────────────────
  const categoriesList = ['All', ...Array.from(new Set(assets.map(a => a.category || 'General')))];

  const filteredAssets = assets.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || (a.category || 'General') === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // ─── Asset Submit ──────────────────────────────────────────────────────────
  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, branch_id: branchId };
      if (editingId) {
        await api.patch(`/storekeeper/assets/${editingId}`, payload);
        showToast('Asset updated successfully');
      } else {
        await api.post('/storekeeper/assets', payload);
        showToast('Asset registered successfully');
      }
      setForm(emptyForm);
      setEditingId(null);
      setActiveTab('inventory');
      fetchAllData();
    } catch (e: any) {
      showToast(e?.response?.data?.error?.message || 'Failed to save asset', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setForm({
      name: asset.name,
      description: asset.description || '',
      amount: asset.amount,
      value: asset.value,
      category: asset.category || 'General',
      condition: asset.condition || 'Good',
      location: asset.location || '',
      serial_number: asset.serial_number || '',
      acquisition_date: asset.acquisition_date ? asset.acquisition_date.split('T')[0] : ''
    });
    setEditingId(asset.id);
    setActiveTab('add');
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/storekeeper/assets/${id}`);
      showToast('Asset removed');
      fetchAllData();
    } catch {
      showToast('Failed to delete asset', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ─── Issue Submit ──────────────────────────────────────────────────────────
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuing(true);
    try {
      await api.post('/storekeeper/issues', { ...issueForm, branch_id: branchId });
      showToast('Asset issued successfully');
      setIssueModalOpen(false);
      setIssueForm({ asset_id: '', issued_to_name: '', issued_to_role: 'Teacher', purpose: '', quantity: 1, expected_return: '', notes: '' });
      fetchAllData();
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to issue asset', 'error');
    } finally {
      setIssuing(false);
    }
  };

  const handleReturnIssue = async (issueId: string) => {
    try {
      await api.post(`/storekeeper/issues/${issueId}/return`, {});
      showToast('Asset returned to stock');
      fetchAllData();
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to mark asset returned', 'error');
    }
  };

  // ─── Tab Config ────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'overview', label: 'Dashboard', icon: BarChart3 },
    { key: 'inventory', label: 'Property Register', icon: Package },
    { key: 'issues', label: 'Issue & Checkout Log', icon: ArrowRightLeft },
    { key: 'add', label: editingId ? 'Edit Asset' : 'Register New Asset', icon: Plus },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white font-bold text-sm transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-xl"><Trash2 size={20} className="text-rose-600" /></div>
              <h3 className="font-black text-slate-800 dark:text-white">Remove Asset?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to remove <strong>"{deleteConfirm.name}"</strong> from the property register?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-500">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Asset Modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setIssueModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl">
                  <ArrowRightLeft size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">Checkout / Issue Asset</h3>
                  <p className="text-xs text-slate-500">Assign school property to a staff member or department</p>
                </div>
              </div>
              <button onClick={() => setIssueModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Select Asset *</label>
                <select
                  value={issueForm.asset_id}
                  onChange={e => setIssueForm({ ...issueForm, asset_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose Item from Register --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id} disabled={a.amount <= 0}>
                      {a.name} (Stock: {a.amount}) {a.amount <= 0 ? '— Out of Stock' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Issued To (Person/Dept) *</label>
                  <input
                    type="text"
                    value={issueForm.issued_to_name}
                    onChange={e => setIssueForm({ ...issueForm, issued_to_name: e.target.value })}
                    placeholder="e.g. Teacher Abebe, Main Office..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Role / Department</label>
                  <select
                    value={issueForm.issued_to_role}
                    onChange={e => setIssueForm({ ...issueForm, issued_to_role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Administrative Staff">Administrative Staff</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Lab Tech">Lab Tech</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={issueForm.quantity}
                    onChange={e => setIssueForm({ ...issueForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Expected Return Date</label>
                  <input
                    type="date"
                    value={issueForm.expected_return}
                    onChange={e => setIssueForm({ ...issueForm, expected_return: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Purpose / Notes</label>
                <textarea
                  rows={2}
                  value={issueForm.purpose}
                  onChange={e => setIssueForm({ ...issueForm, purpose: e.target.value })}
                  placeholder="e.g. For Grade 10 Science Lab exam, Event setup..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {issuing ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20">
              <Archive size={34} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-100">
                <Building2 size={12} />
                Property & Facilities Management
              </div>
              <h1 className="text-3xl font-black tracking-tight">Storekeeper Portal</h1>
              <p className="text-indigo-100 text-sm mt-1">Full lifecycle management of school assets, inventory stock, and staff checkout issuance</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIssueModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-900 rounded-2xl font-black text-sm hover:bg-indigo-50 shadow-lg transition-all"
            >
              <ArrowRightLeft size={18} />
              Issue Asset
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-1.5 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); if (tab.key !== 'add') { setEditingId(null); setForm(emptyForm); } }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Item Stock', value: Number(stats?.assets?.total_items || 0).toLocaleString(), sub: `${stats?.assets?.asset_types || 0} unique asset types`, icon: Package, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-500/20' },
              { label: 'Total Inventory Value', value: `ETB ${Number(stats?.assets?.total_value || 0).toLocaleString('en-ET', { maximumFractionDigits: 0 })}`, sub: 'Estimated total value', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
              { label: 'Active Checkout Issues', value: Number(stats?.issues?.active_issues || 0).toLocaleString(), sub: 'Items currently with staff', icon: ArrowRightLeft, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' },
              { label: 'Low Stock Alerts', value: Number(stats?.assets?.low_stock_count || 0).toLocaleString(), sub: 'Items with quantity ≤ 2', icon: ShieldAlert, color: Number(stats?.assets?.low_stock_count || 0) > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500', border: Number(stats?.assets?.low_stock_count || 0) > 0 ? 'border-rose-100 dark:border-rose-500/20' : 'border-slate-100 dark:border-slate-800' },
            ].map((stat, i) => (
              <div key={i} className={`bg-white dark:bg-slate-900 rounded-2xl border ${stat.border} p-5 flex items-center gap-4`}>
                <div className={`p-3 rounded-2xl ${stat.color}`}><stat.icon size={24} /></div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Property Entries */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Recent Inventory Items</h2>
                  <p className="text-xs text-slate-400">Latest assets added to the school register</p>
                </div>
                <button onClick={() => setActiveTab('inventory')} className="text-sm font-bold text-indigo-600 hover:underline">View Full Register</button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading inventory...</div>
              ) : assets.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Package size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No property registered yet</p>
                  <button onClick={() => setActiveTab('add')} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">+ Add school property</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {assets.slice(0, 5).map(asset => (
                    <div key={asset.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl"><Box size={18} className="text-indigo-600 dark:text-indigo-400" /></div>
                        <div>
                          <div className="font-bold text-sm text-slate-800 dark:text-white">{asset.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{asset.category || 'General'}</span>
                            {asset.location && <span>• {asset.location}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-800 dark:text-white text-sm">Qty: {asset.amount}</div>
                        <div className="text-xs text-slate-400">ETB {(asset.value * asset.amount).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
              <h2 className="text-base font-black text-slate-900 dark:text-white mb-1">Asset Categories</h2>
              <p className="text-xs text-slate-400 mb-4">Stock distribution by type</p>

              {stats?.categories && stats.categories.length > 0 ? (
                <div className="space-y-3">
                  {stats.categories.map((cat, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{cat.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{cat.total_qty} items</span>
                        <span className="block text-[11px] text-slate-400">{cat.count} types</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">No category data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets by name, category, serial number, location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categoriesList.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
            <button
              onClick={fetchAllData}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={() => { setEditingId(null); setForm(emptyForm); setActiveTab('add'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
            >
              <Plus size={15} /> Register Property
            </button>
          </div>

          {/* Asset Register Table */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-bold">Loading property register...</div>
          ) : error ? (
            <div className="text-center py-10 text-rose-500 font-bold">{error}</div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="font-bold text-slate-400">{searchQuery ? 'No matching assets found' : 'No assets in register'}</p>
              {!searchQuery && <button onClick={() => setActiveTab('add')} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">+ Add first asset</button>}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">Asset / Property</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">Category</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">Condition</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">Location</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase tracking-wider">Quantity</th>
                      <th className="text-right px-5 py-3.5 text-xs font-black uppercase tracking-wider">Unit (ETB)</th>
                      <th className="text-right px-5 py-3.5 text-xs font-black uppercase tracking-wider">Total (ETB)</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredAssets.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg"><Box size={16} className="text-indigo-600 dark:text-indigo-400" /></div>
                            <div>
                              <div className="font-bold text-sm text-slate-800 dark:text-white">{asset.name}</div>
                              {asset.serial_number && <div className="text-[11px] text-slate-400 font-mono">S/N: {asset.serial_number}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                            {asset.category || 'General'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${CONDITION_COLORS[asset.condition || 'Good']}`}>
                            {asset.condition || 'Good'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {asset.location ? <span className="flex items-center gap-1"><MapPin size={13} /> {asset.location}</span> : <span className="text-slate-300 italic">—</span>}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${asset.amount <= 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                            {asset.amount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-300 font-bold">{asset.value.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-sm font-black text-slate-800 dark:text-white">{(asset.value * asset.amount).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setIssueForm(f => ({ ...f, asset_id: asset.id }));
                                setIssueModalOpen(true);
                              }}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                              title="Issue to Staff"
                            >
                              <ArrowRightLeft size={15} />
                            </button>
                            <button
                              onClick={() => handleEdit(asset)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ id: asset.id, name: asset.name })}
                              className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ISSUES LOG TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Checkout & Issuance Log</h2>
              <p className="text-xs text-slate-500">Track property assigned to teachers, staff, and departments</p>
            </div>
            <button
              onClick={() => setIssueModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
            >
              <ArrowRightLeft size={16} /> New Checkout
            </button>
          </div>

          {issues.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ArrowRightLeft size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-400">No active or past property issues recorded</p>
              <button onClick={() => setIssueModalOpen(true)} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">+ Issue property to staff</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">Item Name</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">Issued To</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase">Qty</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">Issued Date</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">Expected Return</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase">Status</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {issues.map(iss => (
                      <tr key={iss.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-5 py-4 font-bold text-sm text-slate-800 dark:text-white">{iss.asset_name}</td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-sm text-slate-800 dark:text-white">{iss.issued_to_name}</div>
                          <div className="text-xs text-slate-400">{iss.issued_to_role || 'Staff'}</div>
                        </td>
                        <td className="px-5 py-4 text-center font-black text-sm text-indigo-600 dark:text-indigo-400">{iss.quantity}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{new Date(iss.issued_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{iss.expected_return ? new Date(iss.expected_return).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${iss.status === 'Issued' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                            {iss.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {iss.status === 'Issued' && (
                            <button
                              onClick={() => handleReturnIssue(iss.id)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 mx-auto"
                            >
                              <RotateCcw size={13} /> Mark Returned
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'add' && (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl">
                  {editingId ? <Pencil size={20} className="text-indigo-600 dark:text-indigo-400" /> : <Plus size={20} className="text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div>
                  <h2 className="font-black text-lg text-slate-900 dark:text-white">{editingId ? 'Edit Property Entry' : 'Register New School Property'}</h2>
                  <p className="text-xs text-slate-400">Add detailed equipment, building assets, or stationery to inventory</p>
                </div>
              </div>
              {editingId && (
                <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              )}
            </div>

            <form onSubmit={handleSubmitAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Property Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Science Lab Projector, Desk, Marker Box..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Furniture & Fixtures">Furniture & Fixtures</option>
                    <option value="Electronics & IT">Electronics & IT</option>
                    <option value="Stationery & Supplies">Stationery & Supplies</option>
                    <option value="Laboratory Equipment">Laboratory Equipment</option>
                    <option value="Sports & PE">Sports & PE</option>
                    <option value="Building & Infrastructure">Building & Infrastructure</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Description / Notes</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed specifications or model info..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Unit Value (ETB)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.value}
                    onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Condition</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Location / Room</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Main Store, Room 102, Block B..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Serial Number / Asset Tag</label>
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={e => setForm({ ...form, serial_number: e.target.value })}
                    placeholder="e.g. SN-998234-X..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {form.amount > 0 && form.value > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Estimated Total Value:</span>
                  <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">ETB {(form.amount * form.value).toLocaleString()}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('inventory'); setEditingId(null); setForm(emptyForm); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw size={15} className="animate-spin" /> : (editingId ? <Pencil size={15} /> : <Plus size={15} />)}
                  {editingId ? 'Save Changes' : 'Register Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorekeeperPortal;
