
import { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  User,
  History,
  HeartPulse,
  MessageSquare,
  Send,
  Bell,
  Check,
  CheckCheck
} from 'lucide-react';
import { API_HOST_URL } from '../config/api';

interface Medicine {
  id: string;
  name: string;
  stock: number;
  unit: string;
}

interface VisitLog {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  time: string;
  reason: string;
  treatment: string;
  status: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  blood_group: string;
  allergies: string;
  digital_id?: string;
}

export const Clinic = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'visits' | 'chat'>('directory');
  const [students, setStudents] = useState<Student[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [conversations, setConversations] = useState<any[]>([]); // inbox rows
  const [messages, setMessages] = useState<any[]>([]); // active conversation
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newVisit, setNewVisit] = useState({ reason: '', treatment: '', selectedMeds: [] as { id: string, quantity: number }[] });
  const [studentSearchTimeout, setStudentSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [studentPageInfo, setStudentPageInfo] = useState({ total: 0, page: 1, limit: 20 });
  const [branchId, setBranchId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const API_URL = API_HOST_URL || '';

  // Fetch students with search and pagination support
  const fetchStudents = async (searchTerm: string = '', page: number = 1) => {
    const token = localStorage.getItem('ziquala_token');
    try {
      const limit = 20;
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', limit.toString());
      params.append('page', page.toString());

      const queryString = params.toString();
      const fetchUrl = `${API_URL}/api/clinic/students${queryString ? '?' + queryString : ''}`;

      const res = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const resJson = await res.json();
        const data = resJson.data;
        setStudents(data?.students || []);
        setStudentPageInfo({
          total: data?.total || 0,
          page: data?.page || 1,
          limit: data?.limit || 20
        });
        if (data?.branch_id) setBranchId(data.branch_id);
      } else {
        setErrorMessage('Failed to fetch students');
      }
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
      setErrorMessage(err.message || 'Failed to fetch students');
    }
  };

  // Fetch visit history with branch filtering
  const fetchVisitHistory = async () => {
    const token = localStorage.getItem('ziquala_token');
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      const queryString = params.toString();
      const fetchUrl = `${API_URL}/api/clinic/visits/history${queryString ? '?' + queryString : ''}`;

      const res = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const resJson = await res.json();
        const data = resJson.data;
        // Handle both old format (array) and new format (object with visits array)
        setVisitLogs(Array.isArray(data) ? data : (data?.visits || []));
      } else {
        setErrorMessage('Failed to fetch visit history');
      }
    } catch (err: any) {
      console.error('Failed to fetch visit history:', err);
      setErrorMessage(err.message || 'Failed to fetch visit history');
    }
  };

  // Fetch medicines inventory (non-critical - don't show error)
  const fetchMedicines = async () => {
    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/clinic/medicine`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const resJson = await res.json();
        setMedicines(resJson.data || []);
      } else {
        // Non-critical: just log, don't show error
        console.warn('Failed to fetch medicines:', res.status);
      }
    } catch (err: any) {
      // Non-critical: just log, don't show error
      console.warn('Failed to fetch medicines:', err);
    }
  };

  // Fetch all data on mount
  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await Promise.all([
        fetchStudents('', 1),
        fetchVisitHistory(),
        fetchMedicines(),
        fetchInbox()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInbox = async () => {
    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/clinic/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const resJson = await res.json();
        setConversations(resJson.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch chat inbox', err);
    }
  };

  const fetchConversation = async (childId: string) => {
    setChatLoading(true);
    setMessages([]);
    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/clinic/chat?childId=${encodeURIComponent(childId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const resJson = await res.json();
        setMessages(resJson.data || []);
        // Mark unread messages as read for this conversation (WhatsApp-like behavior)
        await fetch(`${API_URL}/api/clinic/chat/read`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: childId })
        });
        // Refresh inbox to remove unread badge
        fetchInbox();
      }
    } catch (err) {
      console.warn('Failed to fetch conversation', err);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedStudent || !messageText.trim()) return;
    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/clinic/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim(), childId: selectedStudent.id })
      });
      if (res.ok) {
        setMessageText('');
        // Refresh conversation and inbox
        fetchConversation(selectedStudent.id);
        fetchInbox();
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Handle search with debouncing to avoid excessive API calls
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (studentSearchTimeout) {
      clearTimeout(studentSearchTimeout);
    }

    // Set new timeout for debounced search
    const trimmedQuery = query.trim();
    const timeout = setTimeout(() => {
      fetchStudents(trimmedQuery, 1);
    }, 300); // Wait 300ms after user stops typing

    setStudentSearchTimeout(timeout);
  };

  useEffect(() => {
    fetchAllData();
    return () => {
      if (studentSearchTimeout) clearTimeout(studentSearchTimeout);
    };
  }, []);

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/clinic/visits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          reason: newVisit.reason,
          treatment: newVisit.treatment,
          medicines: newVisit.selectedMeds
        })
      });
      if (res.ok) {
        setShowLogModal(false);
        setNewVisit({ reason: '', treatment: '', selectedMeds: [] });
        setSuccessMessage(`Treatment logged for ${selectedStudent.name}`);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Refresh the visit history
        fetchVisitHistory();
      } else {
        const data = await res.json();
        setErrorMessage(data.error?.message || data.message || 'Failed to log visit');
      }
    } catch (err: any) {
      console.error('Error logging visit:', err);
      setErrorMessage(err.message || 'Failed to log visit');
    }
  };

  // Filter students client-side (from the already-fetched results)
  const searchQueryLower = searchQuery.trim().toLowerCase();
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQueryLower) ||
    (s.digital_id || '').toLowerCase().includes(searchQueryLower) ||
    (s.id || '').toLowerCase().includes(searchQueryLower)
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Error Messages */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100">✕</button>
        </div>
      )}

      {/* Success Messages */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-green-700 dark:text-green-200 hover:text-green-900 dark:hover:text-green-100">✕</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <HeartPulse className="text-rose-500" size={32} />
            School Clinic Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Monitor student health and manage clinical visits</p>
          {branchId && <p className="text-xs text-slate-400 mt-2">Branch ID: {branchId.substring(0, 8)}...</p>}
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button onClick={() => setActiveTab('directory')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'directory' ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}>Directory</button>
          <button onClick={() => setActiveTab('visits')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'visits' ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}>Visits</button>
          <button onClick={() => setActiveTab('chat')} className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'chat' ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}><MessageSquare className="inline-block mr-1" size={14} />Chat</button>
        </div>
      </div>

      {(activeTab === 'directory' || activeTab === 'chat') ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, student ID, or digital ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Showing {filteredStudents.length} of {studentPageInfo.total} students
              </div>
              <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {loading && <div className="text-center text-slate-400 py-8">Loading students...</div>}
                {!loading && filteredStudents.length === 0 && (
                  <div className="text-center text-slate-400 py-8">No students found in your branch</div>
                )}
                {filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => { setSelectedStudent(student); setActiveTab('chat'); fetchConversation(student.id); }}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${selectedStudent?.id === student.id ? 'bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold">
                      {student.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold dark:text-slate-100">{student.name}</p>
                      <p className="text-[10px] text-slate-500">Grade: {student.grade} {student.digital_id ? `• ID: ${student.digital_id}` : ''}</p>
                    </div>
                    <div className="ml-auto">
                      {(() => {
                        const conv = conversations.find(c => c.student_id === student.id);
                        if (conv && conv.unread_count > 0) {
                          return (
                            <div className="bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <Bell size={12} />
                              <span>{conv.unread_count}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedStudent ? (
              activeTab === 'chat' ? (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-[60vh] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600">
                          <User size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                          <p className="text-xs text-slate-500">Student chat (private with parent)</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-4">
                      {chatLoading && <div className="text-center text-slate-400">Loading messages...</div>}
                      {!chatLoading && messages.length === 0 && (
                        <div className="text-center text-slate-400 py-8">No messages for this student yet</div>
                      )}
                      {messages.map((m: any) => (
                        <div key={m.id} className={`max-w-[70%] p-3 rounded-2xl ${m.role === 'clinic' ? 'ml-auto bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                          <div className="text-sm">{m.text || m.message || m.text}</div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 justify-end">
                            <span>{m.timestamp || m.created_at || ''}</span>
                            {m.role === 'clinic' && (
                              m.is_read ? (
                                <CheckCheck size={14} className="text-emerald-200" />
                              ) : (
                                <Check size={14} className="text-slate-200" />
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <div className="flex gap-2">
                        <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type a message to the parent..." className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none" />
                        <button onClick={sendMessage} className="px-4 py-2 bg-rose-600 text-white rounded-xl flex items-center gap-2"><Send size={14} />Send</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between mb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
                          <User size={40} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black dark:text-white">{selectedStudent.name}</h2>
                          <p className="text-slate-500 font-bold">Grade {selectedStudent.grade}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-md">Allergy: {selectedStudent.allergies || 'None'}</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-md">Blood: {selectedStudent.blood_group || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLogModal(true)}
                        className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-rose-200"
                      >
                        Log New Visit
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <History size={20} className="text-rose-500" />
                      Visit History
                    </h3>
                    <div className="space-y-4">
                      {visitLogs.filter(v => v.student_id === selectedStudent.id).map(v => (
                        <div key={v.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between">
                          <div>
                            <p className="text-sm font-bold dark:text-slate-100">{v.reason}</p>
                            <p className="text-xs text-slate-500">{v.date}</p>
                            <p className="text-xs mt-2 text-slate-600 dark:text-slate-400"><strong>Treatment:</strong> {v.treatment}</p>
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 uppercase">Logged</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl">
                <HeartPulse size={48} className="text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">Select a Student</h3>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Student</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Reason</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Treatment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visitLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 text-sm font-bold dark:text-slate-200">{log.student_name}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{log.date}</td>
                  <td className="px-6 py-4 text-sm font-bold">{log.reason}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.treatment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-black text-rose-600 flex items-center gap-2 mb-4">
              <Stethoscope size={24} />
              Log Clinical Visit
            </h3>
            <form onSubmit={handleLogVisit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Reason</label>
                <textarea
                  required
                  placeholder="Enter the reason for clinic visit"
                  value={newVisit.reason}
                  onChange={(e) => setNewVisit({ ...newVisit, reason: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Treatment</label>
                <textarea
                  required
                  placeholder="Describe the treatment provided"
                  value={newVisit.treatment}
                  onChange={(e) => setNewVisit({ ...newVisit, treatment: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Medicines Administered</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {medicines.map(med => (
                    <div key={med.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                      <span className="text-xs font-bold">{med.name} (Stock: {med.stock})</span>
                      <input
                        type="number"
                        min="0"
                        max={med.stock}
                        placeholder="Qty"
                        className="w-16 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900"
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 0;
                          const existing = newVisit.selectedMeds.find(m => m.id === med.id);
                          if (existing) {
                            setNewVisit({
                              ...newVisit,
                              selectedMeds: newVisit.selectedMeds.map(m => m.id === med.id ? { ...m, quantity: qty } : m)
                            });
                          } else if (qty > 0) {
                            setNewVisit({
                              ...newVisit,
                              selectedMeds: [...newVisit.selectedMeds, { id: med.id, quantity: qty }]
                            });
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-200">Log & Deduct Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
