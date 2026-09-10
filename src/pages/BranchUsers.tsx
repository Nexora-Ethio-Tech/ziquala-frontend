import { uiError, uiText } from "../localization";
import { Users, Search, Filter, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { useUser } from '../context/UserContext';

export const BranchUsers = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const isSchoolAdmin = role === 'school-admin';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (isSchoolAdmin) {
      fetchBranchUsers();
    }
  }, [roleFilter, statusFilter, isSchoolAdmin]);

  const fetchBranchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (roleFilter) filters.role = roleFilter;
      if (statusFilter) filters.status = statusFilter;

      const response = await userService.getBranchUsers(filters);
      console.log('✅ Branch users fetched:', response);
      setUsers(response.data || []);
    } catch (err: any) {
      console.error('❌ Error fetching branch users:', err);
      setError(uiError(err.response?.data?.error?.message || 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  if (!isSchoolAdmin) {
    return (
      <div className="p-8 text-center text-rose-500">
        <AlertCircle className="mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold">{uiText("Access Denied")}</h2>
        <p>{uiText("Only School Admin can view branch users.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />{uiText("Back")}</button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{uiText("Branch Users")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{uiText("View all users in your branch")}</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">{uiText("All Roles")}</option>
            <option value="teacher">{uiText("Teacher")}</option>
            <option value="student">{uiText("Student")}</option>
            <option value="parent">{uiText("Parent")}</option>
            <option value="librarian">{uiText("Librarian")}</option>
            <option value="storekeeper">{uiText("Storekeeper")}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">{uiText("All Status")}</option>
            <option value="Pending">{uiText("Pending")}</option>
            <option value="Approved">{uiText("Approved")}</option>
            <option value="Revoked">{uiText("Revoked")}</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      )}

      {uiText(error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800 dark:text-red-200 text-sm">{uiError(error)}</p>
        </div>
      ))}

      {!loading && !error && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("User")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Digital ID")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Role")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Status")}</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Grade")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">{uiText("No users found")}</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{uiText(user.digitalId || user.digital_id)}</span>
                          {uiText((user.zkDeviceId || user.zk_device_id) && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded text-[10px] font-bold tracking-wider">{uiText("ZK: ")}{uiText(user.zkDeviceId || user.zk_device_id)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {uiText(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          user.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          user.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {uiText(user.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {uiText(user.grade || '-')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
