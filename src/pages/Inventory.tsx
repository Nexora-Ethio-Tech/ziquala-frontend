import { useTranslation } from 'react-i18next';

import { Package, Search, Filter, AlertCircle, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getAssets, type Asset } from '../services/asset.service';
import { branchService, type Branch } from '../services/branchService';

export const Inventory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role, selectedBranch } = useUser();
  const { selectedBranchId } = useStore();
  // Finance Clerk, Super Admin, and School Admin can view inventory data
  const allowedRoles = ['school-admin', 'super-admin', 'academic-manager', 'storekeeper'];
  const [items, setItems] = useState<Asset[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!role || !allowedRoles.includes(role)) {
        setError('You do not have permission to view the inventory.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const [assetsData, branchResponse] = await Promise.all([
          getAssets(selectedBranchId ?? undefined),
          branchService.getAllBranches().catch(() => ({ data: [] }))
        ]);

        setItems(Array.isArray(assetsData) ? assetsData : []);
        setBranches(Array.isArray(branchResponse?.data) ? branchResponse.data : Array.isArray(branchResponse) ? branchResponse : []);
      } catch (e: any) {
        // If the API returns 403 because of insufficient role, show friendly message
        if (e.response?.status === 403) {
          setError('Access denied: insufficient permissions for inventory data.');
        } else {
          setError(e?.message || 'Failed to load inventory');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [role, selectedBranchId]);

  const branchNameById = useMemo(() => {
    return new Map(branches.map((branch) => [branch.id, branch.name]));
  }, [branches]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const branchName = branchNameById.get(item.branch_id)?.toLowerCase() || '';
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        branchName.includes(query)
      );
    });
  }, [items, searchQuery, branchNameById]);

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);
  const lowStockCount = useMemo(() => items.filter((item) => Number(item.amount || 0) < 10).length, [items]);
  const activeBranches = useMemo(() => new Set(items.map((item) => item.branch_id)).size, [items]);
  const maintenanceDueCount = useMemo(() => {
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const createdAtMs = new Date(item.created_at).getTime();
      return Number.isFinite(createdAtMs) && now - createdAtMs > oneYearMs;
    }).length;
  }, [items]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("inventory.title", "Inventory & Assets")}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Live inventory data {selectedBranch ? `for ${selectedBranch.name}` : 'across all branches'}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("inventory.totalAmount", "Total Amount")}</p>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">{totalAmount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("inventory.lowStockAlert", "Low Stock Alert")}</p>
          <p className="text-3xl font-black text-rose-600 mt-2">{lowStockCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("inventory.branches", "Branches")}</p>
          <p className="text-3xl font-black text-blue-600 mt-2">{activeBranches}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("inventory.maintenanceDue", "Maintenance Due")}</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{maintenanceDueCount} Items</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-500">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder={t("inventory.searchPlaceholder", "Search assets by name, branch or description...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <Filter size={16} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("inventory.colDetails", "Asset Details")}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("inventory.colBranch", "Branch")}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("inventory.colAmount", "Amount")}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t("inventory.colUnitValue", "Unit Value (ETB)")}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t("inventory.colTotalValue", "Total Value (ETB)")}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("inventory.colAdded", "Added")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading inventory...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">{t("inventory.noInventoryFound", "No inventory records found.")}</td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-300">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.description || 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {branchNameById.get(item.branch_id) || item.branch_id}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${Number(item.amount || 0) < 10 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.amount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {Number(item.value).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {(Number(item.value) * Number(item.amount || 0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatEthiopianLabel(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
