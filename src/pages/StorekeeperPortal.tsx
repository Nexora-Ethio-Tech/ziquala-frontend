import { uiError, uiText, localeTag } from "../localization";
import { useState, useEffect } from 'react';
import {
  Package, BarChart3, Plus, Search, Pencil, Trash2, X, CheckCircle,
  AlertCircle, Box, TrendingUp, ClipboardList, Archive, RefreshCw,
  Building2, UserCheck, RotateCcw, ArrowRightLeft, Layers, MapPin, Tag, ShieldAlert, User
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
  item_type?: 'Returnable' | 'Consumable';
  is_consumable?: boolean;
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
  item_type?: 'Returnable' | 'Consumable';
  is_consumable?: boolean;
  issued_to_name: string;
  issued_to_role?: string;
  purpose?: string;
  quantity: number;
  issued_at: string;
  expected_return?: string;
  returned_at?: string;
  status: 'Issued' | 'Returned' | 'Overdue' | 'Lost' | 'Consumed';
  notes?: string;
}

export interface IssueItemRow {
  id: string;
  asset_id: string;
  quantity: number;
  expected_return: string;
  notes: string;
  categoryFilter?: string;
  searchQuery?: string;
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

const STORE_ASSET_CATEGORIES = [
  'General',
  'Furniture & Fixtures',
  'Electronics & IT',
  'Stationery & Supplies',
  'Laboratory Equipment',
  'Sports & PE',
  'Building & Infrastructure',
  'Books',
  'Detergents',
  'Kitchen Utensils',
  'Plumbing Fixtures & Parts',
];


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
  const [itemTypeFilter, setItemTypeFilter] = useState<'All' | 'Returnable' | 'Consumable'>('All');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Add / Edit Asset form
  const emptyForm = {
    name: '',
    description: '',
    amount: 1,
    value: 0,
    category: 'General',
    item_type: 'Returnable' as 'Returnable' | 'Consumable',
    is_consumable: false,
    condition: 'Good' as 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged',
    location: '',
    serial_number: '',
    acquisition_date: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [issueDeleteConfirm, setIssueDeleteConfirm] = useState<AssetIssue | null>(null);

  // Issue Item Modal State (Multi-Item Transaction)

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueRecipient, setIssueRecipient] = useState({
    issued_to_name: '',
    issued_to_role: 'Teacher',
    purpose: ''
  });

  const createNewIssueItemRow = (asset_id = '', categoryFilter = ''): IssueItemRow => ({
    id: 'item-' + Math.random().toString(36).substring(2, 9),
    asset_id,
    quantity: 1,
    expected_return: '',
    notes: '',
    categoryFilter,
    searchQuery: ''
  });

  const [issueItems, setIssueItems] = useState<IssueItemRow[]>([createNewIssueItemRow()]);
  const [issueLogCategoryFilter, setIssueLogCategoryFilter] = useState('All');
  const [issueLogSearchQuery, setIssueLogSearchQuery] = useState('');
  const [issueLogStatusFilter, setIssueLogStatusFilter] = useState('All');
  const [issuing, setIssuing] = useState(false);

  const handleOpenIssueModal = (preselectedAssetId?: string) => {
    const selectedObj = preselectedAssetId ? assets.find(a => a.id === preselectedAssetId) : null;
    setIssueRecipient({
      issued_to_name: '',
      issued_to_role: 'Teacher',
      purpose: ''
    });
    setIssueItems([
      createNewIssueItemRow(
        preselectedAssetId || '',
        selectedObj?.category || ''
      )
    ]);
    setIssueModalOpen(true);
  };

  const addIssueItemRow = () => {
    setIssueItems(prev => [...prev, createNewIssueItemRow()]);
  };

  const removeIssueItemRow = (id: string) => {
    if (issueItems.length > 1) {
      setIssueItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateIssueItemRow = (id: string, updates: Partial<IssueItemRow>) => {
    setIssueItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };
  const [editingIssue, setEditingIssue] = useState<AssetIssue | null>(null);
  const [issueEditForm, setIssueEditForm] = useState({
    asset_id: '',
    issued_to_name: '',
    issued_to_role: 'Teacher',
    purpose: '',
    quantity: 1,
    status: 'Issued' as 'Issued' | 'Returned' | 'Overdue' | 'Lost' | 'Consumed',
    expected_return: '',
    notes: ''
  });
  const [updatingIssue, setUpdatingIssue] = useState(false);

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
      setError(uiError(e?.response?.data?.error?.message || e?.message || 'Failed to load storekeeper data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, [branchId]);

  const showToast = (message: any, type: 'success' | 'error' = 'success') => {
    let strMsg = 'Notification';
    if (typeof message === 'string') {
      strMsg = message;
    } else if (message && typeof message === 'object') {
      strMsg = message.message || message.error || JSON.stringify(message);
    } else if (message) {
      strMsg = String(message);
    }
    setToast({ show: true, message: strMsg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  // ─── Category List ────────────────────────────────────────────────────────
  const categoriesList = ['All', ...Array.from(new Set([...STORE_ASSET_CATEGORIES, ...(assets || []).filter(Boolean).map(a => a.category || 'General')]))];

  const filteredIssues = issues.filter(issue => {
    const matchesCat = issueLogCategoryFilter === 'All' || (issue.asset_category || 'General') === issueLogCategoryFilter;
    const matchesStatus = issueLogStatusFilter === 'All' || issue.status === issueLogStatusFilter;
    const q = issueLogSearchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (issue.issued_to_name || '').toLowerCase().includes(q) ||
      (issue.issued_to_role || '').toLowerCase().includes(q) ||
      (issue.asset_name || '').toLowerCase().includes(q) ||
      (issue.purpose || '').toLowerCase().includes(q) ||
      (issue.status || '').toLowerCase().includes(q) ||
      (issue.notes || '').toLowerCase().includes(q);
    return matchesCat && matchesStatus && matchesSearch;
  });

  const filteredAssets = assets.filter(a => {
    const isConsumable = a.is_consumable || a.item_type === 'Consumable' || a.category === 'Stationery & Supplies';
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || (a.category || 'General') === categoryFilter;
    const matchesType = itemTypeFilter === 'All' || (itemTypeFilter === 'Consumable' ? isConsumable : !isConsumable);
    return matchesSearch && matchesCat && matchesType;
  });
  const groupedAssets = filteredAssets.reduce<Record<string, Asset[]>>((groups, asset) => {
    const category = asset.category || 'General';
    (groups[category] ??= []).push(asset);
    return groups;
  }, {});
  const groupedIssues = filteredIssues.reduce<Record<string, AssetIssue[]>>((groups, issue) => {
    const category = issue.asset_category || 'General';
    (groups[category] ??= []).push(issue);
    return groups;
  }, {});

  // ─── Asset Submit ──────────────────────────────────────────────────────────
  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        acquisition_date: form.acquisition_date || null,
        is_consumable: form.item_type === 'Consumable',
        branch_id: branchId
      };
      if (editingId) {
        await api.patch(`/storekeeper/assets/${editingId}`, payload);
        showToast(uiText("Asset updated successfully"));
      } else {
        await api.post('/storekeeper/assets', payload);
        showToast(uiText("Asset registered successfully"));
      }
      setForm(emptyForm);
      setEditingId(null);
      setActiveTab('inventory');
      fetchAllData();
    } catch (e: any) {
      showToast(uiText(e?.response?.data?.error?.message || 'Failed to save asset'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    const isConsumable = asset.is_consumable || asset.item_type === 'Consumable' || asset.category === 'Stationery & Supplies';
    setForm({
      name: asset.name,
      description: asset.description || '',
      amount: asset.amount,
      value: asset.value,
      category: asset.category || (isConsumable ? 'Stationery & Supplies' : 'General'),
      item_type: isConsumable ? 'Consumable' : 'Returnable',
      is_consumable: isConsumable,
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
      showToast(uiText("Asset removed"));
      fetchAllData();
    } catch {
      showToast(uiText("Failed to delete asset"), 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ─── Issue Submit (Multi-Item Transaction) ─────────────────────────────────
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueRecipient.issued_to_name || !issueRecipient.issued_to_name.trim()) {
      showToast(uiText("Please enter recipient name (Issued To)"), 'error');
      return;
    }

    if (!issueItems || issueItems.length === 0) {
      showToast(uiText("Please add at least one item to issue"), 'error');
      return;
    }

    // Validate item rows
    for (let idx = 0; idx < issueItems.length; idx++) {
      const item = issueItems[idx];
      if (!item.asset_id) {
        showToast(uiText(`Please select an asset for Item #${idx + 1}`), 'error');
        return;
      }
      const assetObj = assets.find(a => a.id === item.asset_id);
      if (!assetObj) {
        showToast(uiText(`Selected asset for Item #${idx + 1} not found`), 'error');
        return;
      }
      if (item.quantity <= 0) {
        showToast(uiText(`Quantity for "${assetObj.name}" must be at least 1`), 'error');
        return;
      }
      if (item.quantity > assetObj.amount) {
        showToast(uiText(`Requested quantity for "${assetObj.name}" (${item.quantity}) exceeds stock (${assetObj.amount})`), 'error');
        return;
      }
    }

    // Check duplicate assets in same transaction
    const seenAssetIds = new Set<string>();
    for (let idx = 0; idx < issueItems.length; idx++) {
      const id = issueItems[idx].asset_id;
      if (seenAssetIds.has(id)) {
        const dupAsset = assets.find(a => a.id === id);
        showToast(uiText(`Asset "${dupAsset?.name || 'Item'}" is selected multiple times. Please combine quantity into a single row.`), 'error');
        return;
      }
      seenAssetIds.add(id);
    }

    setIssuing(true);
    try {
      const payload = {
        issued_to_name: issueRecipient.issued_to_name.trim(),
        issued_to_role: issueRecipient.issued_to_role,
        purpose: issueRecipient.purpose,
        branch_id: branchId,
        items: issueItems.map(item => {
          const selectedAsset = assets.find(a => a.id === item.asset_id);
          const isConsumable = selectedAsset?.is_consumable || selectedAsset?.item_type === 'Consumable' || selectedAsset?.category === 'Stationery & Supplies';
          return {
            asset_id: item.asset_id,
            quantity: item.quantity,
            expected_return: isConsumable ? null : item.expected_return || null,
            notes: item.notes || null,
            status: isConsumable ? 'Consumed' : 'Issued'
          };
        })
      };

      const response = await api.post('/storekeeper/issues', payload);
      const count = issueItems.length;
      showToast(uiText(response.data?.message || `Successfully issued ${count} item(s) in a single transaction`));
      setIssueModalOpen(false);
      fetchAllData();
    } catch (e: any) {
      showToast(uiText(e?.response?.data?.error || 'Failed to issue property'), 'error');
    } finally {
      setIssuing(false);
    }
  };

  const handleReturnIssue = async (issueId: string) => {
    try {
      await api.post(`/storekeeper/issues/${issueId}/return`, {});
      showToast(uiText("Asset returned to stock"));
      fetchAllData();
    } catch (e: any) {
      showToast(uiText(e?.response?.data?.error || 'Failed to mark asset returned'), 'error');
    }
  };

  const handleDeleteIssue = async () => {
    if (!issueDeleteConfirm) return;
    try {
      const response = await api.delete(`/storekeeper/issues/${issueDeleteConfirm.id}`);
      showToast(uiText(response.data?.message || 'Issue record removed'));
      fetchAllData();
    } catch (e: any) {
      showToast(uiText(e?.response?.data?.error || 'Failed to remove issue record'), 'error');
    } finally {
      setIssueDeleteConfirm(null);
    }
  };

  const handleEditIssue = (issue: AssetIssue) => {
    setEditingIssue(issue);
    setIssueEditForm({
      asset_id: issue.asset_id,
      issued_to_name: issue.issued_to_name,
      issued_to_role: issue.issued_to_role || 'Teacher',
      purpose: issue.purpose || '',
      quantity: issue.quantity || 1,
      status: issue.status || 'Issued',
      expected_return: issue.expected_return ? issue.expected_return.split('T')[0] : '',
      notes: issue.notes || ''
    });
  };

  const handleUpdateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIssue) return;

    if (!issueEditForm.issued_to_name || !issueEditForm.issued_to_name.trim()) {
      showToast(uiText('Borrower name (Issued To) is required'), 'error');
      return;
    }

    setUpdatingIssue(true);
    try {
      await api.patch(`/storekeeper/issues/${editingIssue.id}`, {
        ...issueEditForm,
        issued_to_name: issueEditForm.issued_to_name.trim(),
        expected_return: issueEditForm.expected_return || null
      });
      showToast(uiText('Issue record updated successfully'));
      setEditingIssue(null);
      fetchAllData();
    } catch (e: any) {
      showToast(uiText(e?.response?.data?.error || 'Failed to update issue record'), 'error');
    } finally {
      setUpdatingIssue(false);
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
          {uiText(toast.message)}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-xl"><Trash2 size={20} className="text-rose-600" /></div>
              <h3 className="font-black text-slate-800 dark:text-white">{uiText("Remove Asset?")}</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">{uiText("Are you sure you want to remove ")}<strong>{uiText("\"")}{deleteConfirm.name}{uiText("\"")}</strong>{uiText(" from the property register?")}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-500">{uiText("Cancel")}</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700">{uiText("Remove")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Delete Confirmation Modal */}
      {issueDeleteConfirm && (() => {
        const returnsStock = ['Issued', 'Consumed', 'Overdue'].includes(issueDeleteConfirm.status);
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4" onClick={() => setIssueDeleteConfirm(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-100 rounded-xl"><Trash2 size={20} className="text-rose-600" /></div>
                <h3 className="font-black text-slate-800 dark:text-white">{uiText('Remove Issue Record?')}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-3">{uiText('Are you sure you want to remove the issue for ')}<strong>{uiText(issueDeleteConfirm.asset_name)}</strong>{uiText('?')}</p>
              <p className={`text-xs font-bold rounded-lg p-3 mb-6 ${returnsStock ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {uiText(returnsStock ? 'This issue is still active. Its quantity will be restored to stock before the record is removed.' : 'This issue is already closed, so stock will not be changed.')}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setIssueDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-500">{uiText('Cancel')}</button>
                <button onClick={handleDeleteIssue} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700">{uiText('Remove')}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Issue Modal */}
      {editingIssue && (() => {
        const isConsumable = editingIssue.status === 'Consumed' || editingIssue.is_consumable || editingIssue.item_type === 'Consumable' || editingIssue.asset_category === 'Stationery & Supplies';

        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setEditingIssue(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto my-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-500/10 rounded-2xl"><Pencil size={20} className="text-blue-600 dark:text-blue-400" /></div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">{uiText('Edit Issue Record')}</h3>
                    <p className="text-xs text-slate-500">{uiText(editingIssue.asset_name)} · {uiText('Update borrower details, quantity, status, or dates.')}</p>
                  </div>
                </div>
                <button onClick={() => setEditingIssue(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
              </div>

              <form onSubmit={handleUpdateIssue} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Registered Item (Asset) *')}</label>
                  <select
                    value={issueEditForm.asset_id}
                    onChange={e => setIssueEditForm({ ...issueEditForm, asset_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    required
                  >
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        {uiText(a.name)} ({uiText(a.category || 'General')}) — Stock: {a.amount}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Issued To (Person/Dept) *')}</label>
                    <input type="text" required value={issueEditForm.issued_to_name} onChange={e => setIssueEditForm({ ...issueEditForm, issued_to_name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Role / Department')}</label>
                    <select value={issueEditForm.issued_to_role} onChange={e => setIssueEditForm({ ...issueEditForm, issued_to_role: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="Teacher">{uiText('Teacher')}</option>
                      <option value="Department Head">{uiText('Department Head')}</option>
                      <option value="Administrative Staff">{uiText('Administrative Staff')}</option>
                      <option value="Maintenance">{uiText('Maintenance')}</option>
                      <option value="Lab Tech">{uiText('Lab Tech')}</option>
                      <option value="Other">{uiText('Other')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Quantity *')}</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={issueEditForm.quantity}
                      onChange={e => setIssueEditForm({ ...issueEditForm, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Status *')}</label>
                    <select
                      value={issueEditForm.status}
                      onChange={e => setIssueEditForm({ ...issueEditForm, status: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    >
                      <option value="Issued">{uiText('Issued (On Loan)')}</option>
                      <option value="Returned">{uiText('Returned to Stock')}</option>
                      <option value="Consumed">{uiText('Consumed Item')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Purpose')}</label>
                  <textarea rows={2} value={issueEditForm.purpose} onChange={e => setIssueEditForm({ ...issueEditForm, purpose: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Expected Return Date')}</label>
                  {isConsumable ? (
                    <input type="text" disabled value={uiText('N/A — Consumed upon issue')} className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed" />
                  ) : (
                    <input type="date" value={issueEditForm.expected_return} onChange={e => setIssueEditForm({ ...issueEditForm, expected_return: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText('Notes')}</label>
                  <textarea rows={2} value={issueEditForm.notes} onChange={e => setIssueEditForm({ ...issueEditForm, notes: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingIssue(null)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">{uiText('Cancel')}</button>
                  <button type="submit" disabled={updatingIssue} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {updatingIssue ? <RefreshCw size={15} className="animate-spin" /> : <Pencil size={15} />}{uiText('Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Issue Asset Modal (Multi-Item Transaction) */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setIssueModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto my-auto space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl">
                  <ArrowRightLeft size={22} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">{uiText("Checkout / Issue Items")}</h3>
                  <p className="text-xs text-slate-500">{uiText("Select and issue multiple items to staff or department in a single transaction")}</p>
                </div>
              </div>
              <button onClick={() => setIssueModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-6">
              {/* Recipient & Transaction Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} />
                  {uiText("1. Recipient & Transaction Details")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Issued To (Person/Dept) *")}</label>
                    <input
                      type="text"
                      value={issueRecipient.issued_to_name}
                      onChange={e => setIssueRecipient({ ...issueRecipient, issued_to_name: e.target.value })}
                      placeholder={uiText("e.g. Teacher Abebe, Main Office...")}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Role / Department")}</label>
                    <select
                      value={issueRecipient.issued_to_role}
                      onChange={e => setIssueRecipient({ ...issueRecipient, issued_to_role: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    >
                      <option value="Teacher">{uiText("Teacher")}</option>
                      <option value="Department Head">{uiText("Department Head")}</option>
                      <option value="Administrative Staff">{uiText("Administrative Staff")}</option>
                      <option value="Maintenance">{uiText("Maintenance")}</option>
                      <option value="Lab Tech">{uiText("Lab Tech")}</option>
                      <option value="Other">{uiText("Other")}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Purpose / Transaction Notes")}</label>
                  <textarea
                    rows={2}
                    value={issueRecipient.purpose}
                    onChange={e => setIssueRecipient({ ...issueRecipient, purpose: e.target.value })}
                    placeholder={uiText("e.g. Science lab tools, chalk & paper for 2nd Term...")}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Items Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <Package size={14} />
                    {uiText(`2. Select Items to Issue (${issueItems.length} Item${issueItems.length > 1 ? 's' : ''})`)}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    {uiText("Add all requested items to issue together")}
                  </span>
                </div>

                <div className="space-y-4">
                  {(issueItems || []).map((itemRow, index) => {
                    const selectedAsset = (assets || []).find(a => a && a.id === itemRow.asset_id);
                    const isConsumable = Boolean(selectedAsset?.is_consumable || selectedAsset?.item_type === 'Consumable' || selectedAsset?.category === 'Stationery & Supplies');
                    const rowCategory = itemRow.categoryFilter || '';

                    const availableAssetsForSelect = (assets || []).filter(a => {
                      return a && (!rowCategory || (a.category || 'General') === rowCategory);
                    });

                    return (
                      <div
                        key={itemRow.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 relative transition-all"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-xs font-black">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {selectedAsset ? (typeof selectedAsset.name === 'string' ? selectedAsset.name : String(selectedAsset.name || 'Selected Item')) : uiText("Select Item")}
                            </span>
                          </div>

                          {issueItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeIssueItemRow(itemRow.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors"
                              title={uiText("Remove this item")}
                            >
                              <Trash2 size={14} />
                              <span>{uiText("Remove")}</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">{uiText("Category Filter")}</label>
                            <select
                              value={itemRow.categoryFilter || ''}
                              onChange={e => updateIssueItemRow(itemRow.id, { categoryFilter: e.target.value, asset_id: '' })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">{uiText("All Categories")}</option>
                              {categoriesList.filter(c => c !== 'All').map(cat => (
                                <option key={cat} value={cat}>{uiText(cat)}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">{uiText("Select Asset from Stock *")}</label>
                            <select
                              value={itemRow.asset_id}
                              onChange={e => {
                                const newAssetId = e.target.value;
                                const chosenObj = (assets || []).find(a => a && a.id === newAssetId);
                                updateIssueItemRow(itemRow.id, {
                                  asset_id: newAssetId,
                                  categoryFilter: chosenObj?.category || itemRow.categoryFilter || ''
                                });
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            >
                              <option value="">{uiText('-- Choose Asset --')}</option>
                              {availableAssetsForSelect.map(a => {
                                if (!a || !a.id) return null;
                                const isCons = Boolean(a.is_consumable || a.item_type === 'Consumable' || a.category === 'Stationery & Supplies');
                                const isSelectedInOtherRow = (issueItems || []).some(r => r && r.id !== itemRow.id && r.asset_id === a.id);
                                const assetStock = Number(a.amount) || 0;
                                const displayName = typeof a.name === 'string' ? a.name : String(a.name || 'Item');
                                return (
                                  <option key={a.id} value={a.id} disabled={assetStock <= 0 || isSelectedInOtherRow}>
                                    {displayName} [{isCons ? 'Consumable' : 'Returnable'}] (Stock: {assetStock}) {assetStock <= 0 ? '— Out of Stock' : ''} {isSelectedInOtherRow ? '— (Already added)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {selectedAsset && (
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                            isConsumable
                              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
                              : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            <div className="flex items-center gap-2">
                              {isConsumable ? <Package size={15} className="text-amber-600 shrink-0" /> : <RotateCcw size={15} className="text-indigo-600 shrink-0" />}
                              <span>
                                {uiText(isConsumable ? "Consumable (Non-Returnable) — will be consumed from stock" : "Returnable Property — return date required")}
                              </span>
                            </div>
                            <span className="font-black px-2 py-0.5 bg-white/70 dark:bg-black/30 rounded-md">
                              {uiText("Available: ")}{selectedAsset.amount}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">{uiText("Quantity *")}</label>
                            <input
                              type="number"
                              min={1}
                              max={selectedAsset ? selectedAsset.amount : undefined}
                              value={itemRow.quantity}
                              onChange={e => updateIssueItemRow(itemRow.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                            {selectedAsset && itemRow.quantity > selectedAsset.amount && (
                              <p className="text-[11px] font-bold text-rose-500 mt-1">{uiText("Exceeds available stock level!")}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">{uiText("Expected Return Date")}</label>
                            {isConsumable ? (
                              <input
                                type="text"
                                disabled
                                value={uiText("N/A — Consumed upon issue")}
                                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                              />
                            ) : (
                              <input
                                type="date"
                                value={itemRow.expected_return}
                                onChange={e => updateIssueItemRow(itemRow.id, { expected_return: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addIssueItemRow}
                  className="w-full py-2.5 px-4 border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  <Plus size={16} />
                  {uiText("+ Add Another Item to Transaction")}
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-500">
                  {uiText("Transaction Total: ")}
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {issueItems.length} {uiText(issueItems.length === 1 ? 'Item' : 'Items')}
                  </span>
                  {" ("}
                  {issueItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} {uiText("units total)")}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIssueModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {uiText("Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={issuing}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {issuing ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
                    {uiText(`Issue Transaction (${issueItems.length} ${issueItems.length === 1 ? 'Item' : 'Items'})`)}
                  </button>
                </div>
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
                <Building2 size={12} />{uiText("Property & Facilities Management")}</div>
              <h1 className="text-3xl font-black tracking-tight">{uiText("Storekeeper Portal")}</h1>
              <p className="text-indigo-100 text-sm mt-1">{uiText("Full lifecycle management of school assets, inventory stock, and staff checkout issuance")}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleOpenIssueModal()}
              className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-900 rounded-2xl font-black text-sm hover:bg-indigo-50 shadow-lg transition-all"
            >
              <ArrowRightLeft size={18} />{uiText("Issue Asset")}</button>
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
            {uiText(tab.label)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Item Stock', value: Number(stats?.assets?.total_items || 0).toLocaleString(localeTag()), sub: `${stats?.assets?.asset_types || 0} unique asset types`, icon: Package, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-500/20' },
              { label: 'Total Inventory Value', value: `ETB ${Number(stats?.assets?.total_value || 0).toLocaleString(localeTag(), { maximumFractionDigits: 0 })}`, sub: 'Estimated total value', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
              { label: 'Active Checkout Issues', value: Number(stats?.issues?.active_issues || 0).toLocaleString(localeTag()), sub: 'Items currently with staff', icon: ArrowRightLeft, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' },
              { label: 'Low Stock Alerts', value: Number(stats?.assets?.low_stock_count || 0).toLocaleString(localeTag()), sub: 'Items with quantity ≤ 2', icon: ShieldAlert, color: Number(stats?.assets?.low_stock_count || 0) > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500', border: Number(stats?.assets?.low_stock_count || 0) > 0 ? 'border-rose-100 dark:border-rose-500/20' : 'border-slate-100 dark:border-slate-800' },
            ].map((stat, i) => (
              <div key={i} className={`bg-white dark:bg-slate-900 rounded-2xl border ${stat.border} p-5 flex items-center gap-4`}>
                <div className={`p-3 rounded-2xl ${stat.color}`}><stat.icon size={24} /></div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{uiText(stat.value)}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{uiText(stat.label)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{uiText(stat.sub)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Property Entries */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">{uiText("Recent Inventory Items")}</h2>
                  <p className="text-xs text-slate-400">{uiText("Latest assets added to the school register")}</p>
                </div>
                <button onClick={() => setActiveTab('inventory')} className="text-sm font-bold text-indigo-600 hover:underline">{uiText("View Full Register")}</button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">{uiText("Loading inventory...")}</div>
              ) : assets.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Package size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">{uiText("No property registered yet")}</p>
                  <button onClick={() => setActiveTab('add')} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">{uiText("+ Add school property")}</button>
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
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{uiText(asset.category || 'General')}</span>
                            {uiText(asset.location && <span>{uiText("• ")}{uiText(asset.location)}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-800 dark:text-white text-sm">{uiText("Qty: ")}{asset.amount}</div>
                        <div className="text-xs text-slate-400">{uiText("ETB ")}{uiText((asset.value * asset.amount).toLocaleString(localeTag()))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
              <h2 className="text-base font-black text-slate-900 dark:text-white mb-1">{uiText("Asset Categories")}</h2>
              <p className="text-xs text-slate-400 mb-4">{uiText("Stock distribution by type")}</p>

              {stats?.categories && stats.categories.length > 0 ? (
                <div className="space-y-3">
                  {stats.categories.map((cat, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{uiText(cat.category)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{uiText(cat.total_qty)}{uiText(" items")}</span>
                        <span className="block text-[11px] text-slate-400">{uiText(cat.count)}{uiText(" types")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">{uiText("No category data")}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={uiText("Search assets by name, category, serial number, location...")}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {categoriesList.map(c => (
                  <option key={c} value={c}>{uiText(c === 'All' ? 'All Categories' : c)}</option>
                ))}
              </select>
              <select
                value={itemTypeFilter}
                onChange={e => setItemTypeFilter(e.target.value as 'All' | 'Returnable' | 'Consumable')}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="All">{uiText("All Item Types")}</option>
                <option value="Returnable">{uiText("Returnable Assets")}</option>
                <option value="Consumable">{uiText("Non-Returnable Consumables")}</option>
              </select>
              <button
                onClick={fetchAllData}
                className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-sm"
                title={uiText("Refresh")}
              >
                <RefreshCw size={15} />
                <span className="hidden sm:inline">{uiText("Refresh")}</span>
              </button>
              <button
                onClick={() => { setEditingId(null); setForm(emptyForm); setActiveTab('add'); }}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm whitespace-nowrap"
              >
                <Plus size={15} />
                <span>{uiText("Register Property")}</span>
              </button>
            </div>
          </div>

          {/* Asset Register Table */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-bold">{uiText("Loading property register...")}</div>
          ) : error ? (
            <div className="text-center py-10 text-rose-500 font-bold">{uiError(error)}</div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="font-bold text-slate-400">{uiText(searchQuery ? 'No matching assets found' : 'No assets in register')}</p>
              {!searchQuery && <button onClick={() => setActiveTab('add')} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">{uiText("+ Add first asset")}</button>}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Asset / Property")}</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Category")}</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Condition")}</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Location")}</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Quantity")}</th>
                      <th className="text-right px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Unit (ETB)")}</th>
                      <th className="text-right px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Total (ETB)")}</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase tracking-wider">{uiText("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {Object.entries(groupedAssets).sort(([a], [b]) => a.localeCompare(b)).flatMap(([category, categoryAssets]) => [
                      <tr key={`asset-category-${category}`} className="bg-indigo-50/80 dark:bg-indigo-500/10 border-y border-indigo-100 dark:border-indigo-500/20">
                        <td colSpan={8} className="px-5 py-3">
                          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                            <Tag size={15} />
                            <span className="text-xs font-black uppercase tracking-wider">{uiText(category)}</span>
                            <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">({categoryAssets.length})</span>
                          </div>
                        </td>
                      </tr>,
                      ...categoryAssets.map(asset => {
                      const isCons = asset.is_consumable || asset.item_type === 'Consumable' || asset.category === 'Stationery & Supplies';

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isCons ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
                                {isCons ? <Package size={16} className="text-amber-600 dark:text-amber-400" /> : <Box size={16} className="text-indigo-600 dark:text-indigo-400" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-800 dark:text-white">{asset.name}</span>
                                  {isCons ? (
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      {uiText("Consumable")}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                      {uiText("Returnable")}
                                    </span>
                                  )}
                                </div>
                                {uiText(asset.serial_number && <div className="text-[11px] text-slate-400 font-mono">{uiText("S/N: ")}{uiText(asset.serial_number)}</div>)}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                              {uiText(asset.category || 'General')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${CONDITION_COLORS[asset.condition || 'Good']}`}>
                              {uiText(asset.condition || 'Good')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {asset.location ? <span className="flex items-center gap-1"><MapPin size={13} /> {uiText(asset.location)}</span> : <span className="text-slate-300 italic">{uiText("—")}</span>}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${asset.amount <= 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                              {asset.amount}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-300 font-bold">{uiText(asset.value.toLocaleString(localeTag()))}</td>
                          <td className="px-5 py-4 text-right text-sm font-black text-slate-800 dark:text-white">{uiText((asset.value * asset.amount).toLocaleString(localeTag()))}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenIssueModal(asset.id)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                                title={uiText("Issue to Staff")}
                              >
                                <ArrowRightLeft size={15} />
                              </button>
                              <button
                                onClick={() => handleEdit(asset)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
                                title={uiText("Edit")}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ id: asset.id, name: asset.name })}
                                className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                                title={uiText("Delete")}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                      })
                    ])}
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
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{uiText("Checkout & Issuance Log")}</h2>
              <p className="text-xs text-slate-500">{uiText("Track property assigned to teachers, staff, and departments")}</p>
            </div>
            <button
              onClick={() => handleOpenIssueModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
            >
              <ArrowRightLeft size={16} />{uiText(" New Checkout")}</button>
          </div>

          {issues.length > 0 && (
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={uiText("Search borrowed items by person, item name, role, status...")}
                  value={issueLogSearchQuery}
                  onChange={e => setIssueLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {issueLogSearchQuery && (
                  <button
                    onClick={() => setIssueLogSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={issueLogStatusFilter}
                  onChange={e => setIssueLogStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">{uiText("All Statuses")}</option>
                  <option value="Issued">{uiText("On Loan (Issued)")}</option>
                  <option value="Returned">{uiText("Returned")}</option>
                  <option value="Consumed">{uiText("Consumed")}</option>
                </select>

                <select
                  value={issueLogCategoryFilter}
                  onChange={e => setIssueLogCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categoriesList.map(category => (
                    <option key={category} value={category}>{uiText(category === 'All' ? 'All Categories' : category)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {issues.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ArrowRightLeft size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-400">{uiText("No active or past property issues recorded")}</p>
              <button onClick={() => handleOpenIssueModal()} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">{uiText("+ Issue property to staff")}</button>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Search size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-400">{uiText("No matching issue records found")}</p>
              {(issueLogSearchQuery || issueLogCategoryFilter !== 'All' || issueLogStatusFilter !== 'All') && (
                <button
                  onClick={() => { setIssueLogSearchQuery(''); setIssueLogCategoryFilter('All'); setIssueLogStatusFilter('All'); }}
                  className="mt-3 text-sm text-indigo-600 font-bold hover:underline"
                >
                  {uiText("Clear search & filters")}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">{uiText("Item Name")}</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">{uiText("Category")}</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">{uiText("Issued To")}</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase">{uiText("Qty")}</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">{uiText("Issued Date")}</th>
                      <th className="text-left px-5 py-3.5 text-xs font-black uppercase">{uiText("Expected Return")}</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase">{uiText("Status")}</th>
                      <th className="text-center px-5 py-3.5 text-xs font-black uppercase">{uiText("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {Object.entries(groupedIssues).sort(([a], [b]) => a.localeCompare(b)).flatMap(([category, categoryIssues]) => [
                      <tr key={`issue-category-${category}`} className="bg-indigo-50/80 dark:bg-indigo-500/10 border-y border-indigo-100 dark:border-indigo-500/20">
                        <td colSpan={8} className="px-5 py-3">
                          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                            <Tag size={15} />
                            <span className="text-xs font-black uppercase tracking-wider">{uiText(category)}</span>
                            <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">({categoryIssues.length})</span>
                          </div>
                        </td>
                      </tr>,
                      ...categoryIssues.map(iss => {
                      const isCons = iss.status === 'Consumed' || iss.is_consumable || iss.item_type === 'Consumable' || iss.asset_category === 'Stationery & Supplies';

                      return (
                        <tr key={iss.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-5 py-4 font-bold text-sm text-slate-800 dark:text-white">
                            <div>{uiText(iss.asset_name)}</div>
                            {isCons ? (
                              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-black rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                                {uiText("Consumable Item")}
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-black rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                                {uiText("Returnable Asset")}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                              {uiText(iss.asset_category || 'General')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-sm text-slate-800 dark:text-white">{uiText(iss.issued_to_name)}</div>
                            <div className="text-xs text-slate-400">{uiText(iss.issued_to_role || 'Staff')}</div>
                          </td>
                          <td className="px-5 py-4 text-center font-black text-sm text-indigo-600 dark:text-indigo-400">{iss.quantity}</td>
                          <td className="px-5 py-4 text-sm text-slate-500">{uiText(new Date(iss.issued_at).toLocaleDateString(localeTag()))}</td>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {isCons ? (
                              <span className="text-amber-700 dark:text-amber-400 font-bold text-xs bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">
                                {uiText("N/A (Consumable)")}
                              </span>
                            ) : (
                              uiText(iss.expected_return ? new Date(iss.expected_return).toLocaleDateString(localeTag()) : '—')
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                              iss.status === 'Consumed'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : iss.status === 'Issued'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            }`}>
                              {uiText(iss.status === 'Consumed' ? 'Consumed / Issued' : iss.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <button
                                onClick={() => handleEditIssue(iss)}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <Pencil size={13} />{uiText(' Edit')}</button>
                              <button
                                onClick={() => setIssueDeleteConfirm(iss)}
                                className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={13} />{uiText(' Remove')}</button>
                              {iss.status === 'Issued' && (
                                <button
                                  onClick={() => handleReturnIssue(iss.id)}
                                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                  <RotateCcw size={13} />{uiText(" Mark Returned")}</button>
                              )}
                              {iss.status === 'Consumed' && (
                                <span className="text-xs font-bold text-slate-400 italic">
                                  {uiText("No return required")}
                                </span>
                              )}
                              {iss.status === 'Returned' && (
                                <span className="text-xs font-bold text-emerald-600">
                                  {uiText("Returned")}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                      })
                    ])}
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
                  <h2 className="font-black text-lg text-slate-900 dark:text-white">{uiText(editingId ? 'Edit Property Entry' : 'Register New School Property')}</h2>
                  <p className="text-xs text-slate-400">{uiText("Add detailed equipment, building assets, or stationery to inventory")}</p>
                </div>
              </div>
              {uiText(editingId && (
                <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              ))}
            </div>

            <form onSubmit={handleSubmitAsset} className="space-y-4">
              {/* Item Type Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Item Classification *")}</label>
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, item_type: 'Returnable', is_consumable: false })}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                      form.item_type === 'Returnable'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200 dark:border-indigo-500/30'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <RotateCcw size={16} />
                    <div className="text-left">
                      <div className="leading-none">{uiText("Returnable Asset")}</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-1">{uiText("Laptops, Projectors, Furniture")}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      item_type: 'Consumable',
                      is_consumable: true,
                      category: form.category === 'General' ? 'Stationery & Supplies' : form.category
                    })}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                      form.item_type === 'Consumable'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shadow-sm border border-amber-300 dark:border-amber-700'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Package size={16} />
                    <div className="text-left">
                      <div className="leading-none">{uiText("Non-Returnable Consumable")}</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-1">{uiText("Chalk, Pens, Paper, Markers")}</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Property Name *")}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder={uiText("e.g. Science Lab Projector, Chalk Box, Pens...")}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Category")}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STORE_ASSET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{uiText(cat)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Description / Notes")}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder={uiText("Detailed specifications or model info...")}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Quantity *")}</label>
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
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Unit Value (ETB)")}</label>
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
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Condition")}</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Excellent">{uiText("Excellent")}</option>
                    <option value="Good">{uiText("Good")}</option>
                    <option value="Fair">{uiText("Fair")}</option>
                    <option value="Poor">{uiText("Poor")}</option>
                    <option value="Damaged">{uiText("Damaged")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Location / Room")}</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder={uiText("e.g. Main Store, Room 102, Block B...")}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wide">{uiText("Serial Number / Asset Tag")}</label>
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={e => setForm({ ...form, serial_number: e.target.value })}
                    placeholder={uiText("e.g. SN-998234-X...")}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {form.amount > 0 && form.value > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{uiText("Estimated Total Value:")}</span>
                  <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{uiText("ETB ")}{uiText((form.amount * form.value).toLocaleString(localeTag()))}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('inventory'); setEditingId(null); setForm(emptyForm); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                >{uiText("Cancel")}</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw size={15} className="animate-spin" /> : (editingId ? <Pencil size={15} /> : <Plus size={15} />)}
                  {uiText(editingId ? 'Save Changes' : 'Register Property')}
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
