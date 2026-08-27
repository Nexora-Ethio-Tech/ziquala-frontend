import { useState, useEffect } from 'react';
import {
  Package, BarChart3, Plus, Search, Pencil, Trash2, X, CheckCircle,
  AlertCircle, Box, TrendingUp, ClipboardList, Archive, RefreshCw,
  Building2
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
  branch_id?: string;
  created_at: string;
  updated_at?: string;
}

type Tab = 'overview' | 'inventory' | 'add';

// ─── Component ────────────────────────────────────────────────────────────────
export const StorekeeperPortal = () => {
  const { user } = useUser();
  const branchId = (user as any)?.branch_id || (user as any)?.branchId;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Add / Edit form
  const emptyForm = { name: '', description: '', amount: 1, value: 0 };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = branchId ? `?branchId=${branchId}` : '';
      const res = await api.get(`/storekeeper/assets${params}`);
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, [branchId]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalItems = assets.reduce((s, a) => s + a.amount, 0);
  const totalValue = assets.reduce((s, a) => s + (a.value * a.amount), 0);
  const categories = new Set(assets.map(a => a.description || 'General')).size;
  const lowStock = assets.filter(a => a.amount <= 2).length;

  const filtered = assets.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, branch_id: branchId };
      if (editingId) {
        await api.patch(`/storekeeper/assets/${editingId}`, payload);
        showToast('Asset updated successfully');
      } else {
        await api.post('/storekeeper/assets', payload);
        showToast('Asset added successfully');
      }
      setForm(emptyForm);
      setEditingId(null);
      setActiveTab('inventory');
      fetchAssets();
    } catch (e: any) {
      showToast(e?.response?.data?.error?.message || 'Failed to save asset', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setForm({ name: asset.name, description: asset.description || '', amount: asset.amount, value: asset.value });
    setEditingId(asset.id);
    setActiveTab('add');
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/storekeeper/assets/${id}`);
      showToast('Asset removed');
      fetchAssets();
    } catch {
      showToast('Failed to delete asset', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ─── Tab Config ────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'inventory', label: 'Property Register', icon: Package },
    { key: 'add', label: editingId ? 'Edit Item' : 'Add Item', icon: Plus },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white font-bold text-sm transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-xl"><Trash2 size={20} className="text-rose-600" /></div>
              <h3 className="font-black text-slate-800 dark:text-white">Remove Asset?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to remove <strong>"{deleteConfirm.name}"</strong> from the register? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-500">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Archive size={32} />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-2">
              <Building2 size={12} />
              School Property Management
            </div>
            <h1 className="text-3xl font-black tracking-tight">Storekeeper Portal</h1>
            <p className="text-indigo-100 text-sm mt-1">Manage all school assets — from buildings to markers</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-1.5 w-fit">
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
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Items', value: totalItems.toLocaleString(), icon: Package, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-500/20' },
              { label: 'Total Value (ETB)', value: totalValue.toLocaleString('en-ET', { maximumFractionDigits: 0 }), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
              { label: 'Asset Types', value: assets.length, icon: ClipboardList, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' },
              { label: 'Low Stock Items', value: lowStock, icon: AlertCircle, color: `${lowStock > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`, border: `${lowStock > 0 ? 'border-rose-100 dark:border-rose-500/20' : 'border-slate-100 dark:border-slate-800'}` },
            ].map((stat, i) => (
              <div key={i} className={`bg-white dark:bg-slate-900 rounded-2xl border ${stat.border} p-5 flex items-center gap-4`}>
                <div className={`p-3 rounded-xl ${stat.color}`}><stat.icon size={22} /></div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Assets */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Recent Asset Entries</h2>
              <button onClick={() => setActiveTab('inventory')} className="text-sm font-bold text-indigo-600 hover:underline">View All</button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-24 text-slate-400 text-sm">Loading...</div>
            ) : assets.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Package size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">No assets registered yet</p>
                <button onClick={() => setActiveTab('add')} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">+ Add your first asset</button>
              </div>
            ) : (
              <div className="space-y-3">
                {assets.slice(0, 6).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg"><Box size={16} className="text-indigo-600 dark:text-indigo-400" /></div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 dark:text-white">{asset.name}</div>
                        <div className="text-xs text-slate-400">{asset.description || '—'}</div>
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
        </div>
      )}

      {/* ── INVENTORY TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets by name or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={fetchAssets}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              onClick={() => { setEditingId(null); setForm(emptyForm); setActiveTab('add'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
            >
              <Plus size={15} /> Add Asset
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-bold">Loading assets...</div>
          ) : error ? (
            <div className="text-center py-10 text-rose-500 font-bold">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="font-bold text-slate-400">{searchQuery ? 'No matching assets found' : 'No assets in the register yet'}</p>
              {!searchQuery && <button onClick={() => setActiveTab('add')} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">+ Register first asset</button>}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Asset Name</th>
                      <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="text-center px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="text-right px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Unit Value (ETB)</th>
                      <th className="text-right px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Total (ETB)</th>
                      <th className="text-center px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filtered.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg"><Box size={15} className="text-indigo-600 dark:text-indigo-400" /></div>
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{asset.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{asset.description || <span className="italic text-slate-300">—</span>}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${asset.amount <= 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                            {asset.amount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-300 font-bold">{asset.value.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-sm font-black text-slate-800 dark:text-white">{(asset.value * asset.amount).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(asset)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Edit asset"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ id: asset.id, name: asset.name })}
                              className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Remove asset"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={4} className="px-5 py-3 text-sm font-black text-slate-700 dark:text-slate-300 text-right">Grand Total:</td>
                      <td className="px-5 py-3 text-right font-black text-indigo-700 dark:text-indigo-400">ETB {totalValue.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'add' && (
        <div className="max-w-xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl">
                  {editingId ? <Pencil size={18} className="text-indigo-600 dark:text-indigo-400" /> : <Plus size={18} className="text-indigo-600 dark:text-indigo-400" />}
                </div>
                <h2 className="font-black text-slate-900 dark:text-white">{editingId ? 'Edit Asset' : 'Register New Asset'}</h2>
              </div>
              {editingId && (
                <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Asset / Item Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Classroom Chair, Whiteboard, Projector..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Category / Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Furniture, Electronics, Stationery, Building..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              {form.amount > 0 && form.value > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Total Value:</span>
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
                  {editingId ? 'Save Changes' : 'Add to Register'}
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
