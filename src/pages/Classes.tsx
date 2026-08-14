import { Users, Plus, Edit2, Trash2, UserPlus, X, Check, Loader2, AlertCircle, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classService, type Class, type CreateClassData, type UpdateClassData } from '../services/classService';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';

export const Classes = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const { t } = useTranslation();
  const isSchoolAdmin = role === 'school-admin';

  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [createForm, setCreateForm] = useState({ grade: '', section: '', capacity: 40 });
  const [editForm, setEditForm] = useState<{ grade?: string; section?: string; capacity?: number }>({});
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; classId: string | null }>({ show: false, classId: null });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    if (isSchoolAdmin) {
      fetchClasses();
      fetchTeachers();
    }
  }, [isSchoolAdmin]);

  // Stay in sync with class changes made in other tabs (e.g. Timetable Structure)
  useEffect(() => {
    if (!isSchoolAdmin) return;

    const handleClassesUpdated = () => {
      fetchClasses();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchClasses();
      }
    };

    window.addEventListener('classes-updated', handleClassesUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('classes-updated', handleClassesUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSchoolAdmin]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await classService.getAllClasses();
      console.log('✅ Classes fetched:', response);
      const classRows = Array.isArray(response) ? response : response?.data || [];
      const transformedClasses = classRows.map((cls: any) => {
        // Handle teachers data - it might be a JSON string or already parsed
        let teachers = cls.teachers || [];
        if (typeof teachers === 'string') {
          try {
            teachers = JSON.parse(teachers);
          } catch (e) {
            teachers = [];
          }
        }

        return {
          id: cls.id,
          name: cls.name,
          capacity: cls.capacity,
          section: cls.section,
          teachers: teachers || [],
          teacherName: teachers?.length ? teachers[0]?.teacher_name : undefined,
          branchId: cls.branch_id,
          studentCount: cls.student_count || cls.actual_student_count || 0
        };
      });
      setClasses(transformedClasses);
    } catch (err: any) {
      console.error('❌ Error fetching classes:', err);
      setError(err.response?.data?.error?.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { getBranchTeachers } = await import('../services/schoolAdminService');
      const response = await getBranchTeachers();
      // Transform snake_case to camelCase and filter approved only
      const transformedTeachers = (response.data || [])
        .filter((t: any) => t.status === 'Approved')
        .map((t: any) => ({
          id: t.user_id,
          name: t.name,
          digitalId: t.digital_id,
          status: t.status
        }));
      setTeachers(transformedTeachers);
    } catch (err) {
      console.error('❌ Error fetching teachers:', err);
    }
  };

  const extractDigits = (value?: string | null) => {
    const match = String(value || '').match(/(\d{1,2})/);
    return match ? match[1] : '';
  };

  const extractGradeName = (value?: string | null) => {
    const val = String(value || '').trim();
    if (val.startsWith('Grade ')) {
      return val.replace(/^Grade\s+/i, '');
    }
    return val;
  };

  const formatClassSectionDisplay = (section?: string | null) => {
    if (!section) return 'Section -';
    const trimmed = section.trim();
    const digits = trimmed.match(/(\d+)/);
    if (digits) return `Section ${digits[1]}`;
    const letter = trimmed.toUpperCase().charAt(0);
    if (letter >= 'A' && letter <= 'Z') return `Section ${letter.charCodeAt(0) - 64}`;
    return `Section ${trimmed}`;
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await classService.createClass({
        name: createForm.grade.startsWith('KG') ? createForm.grade : `Grade ${createForm.grade}`,
        section: `Section ${createForm.section}`,
        capacity: createForm.capacity
      });
      console.log('✅ Class created:', response);
      showToast('Class created successfully!', 'success');
      setShowCreateModal(false);
      setCreateForm({ grade: '', section: '', capacity: 40 });
      fetchClasses();
    } catch (err: any) {
      console.error('❌ Error creating class:', err);
      showToast(err.response?.data?.error?.message || 'Failed to create class', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setUpdating(true);
    try {
      const updatePayload: UpdateClassData = {};
      if (editForm.grade) updatePayload.name = editForm.grade.startsWith('KG') ? editForm.grade : `Grade ${editForm.grade}`;
      if (editForm.section) updatePayload.section = `Section ${editForm.section}`;
      if (editForm.capacity !== undefined) updatePayload.capacity = editForm.capacity;

      const response = await classService.updateClass(selectedClass.id, updatePayload);
      console.log('✅ Class updated:', response);
      showToast('Class updated successfully!', 'success');
      setShowEditModal(false);
      setSelectedClass(null);
      setEditForm({});
      fetchClasses();
    } catch (err: any) {
      console.error('❌ Error updating class:', err);
      showToast(err.response?.data?.error?.message || 'Failed to update class', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!confirmDelete.classId) return;
    try {
      await classService.deleteClass(confirmDelete.classId);
      console.log('✅ Class deleted');
      showToast('Class deleted successfully!', 'success');
      setConfirmDelete({ show: false, classId: null });
      fetchClasses();
    } catch (err: any) {
      console.error('❌ Error deleting class:', err);
      showToast(err.response?.data?.error?.message || 'Failed to delete class', 'error');
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedTeacherId) return;
    try {
      if (selectedTeacherId === 'unassign') {
        // Unassign the current homeroom teacher
        const currentTeacher = selectedClass.teachers?.[0];
        if (!currentTeacher?.teacher_id) {
          showToast('No teacher is currently assigned to this class.', 'error');
          return;
        }
        console.log('🔄 Unassigning teacher:', { classId: selectedClass.id, teacherId: currentTeacher.teacher_id });
        await classService.unassignTeacher(selectedClass.id, currentTeacher.teacher_id);
        showToast('Teacher unassigned successfully!', 'success');
      } else {
        console.log('🔄 Assigning teacher:', { classId: selectedClass.id, teacherId: selectedTeacherId });
        await classService.assignTeacher(selectedClass.id, selectedTeacherId);
        showToast('Teacher assigned successfully!', 'success');
      }
      setShowAssignModal(false);
      setSelectedClass(null);
      setSelectedTeacherId('');
      fetchClasses();
    } catch (err: any) {
      console.error('❌ Error managing teacher assignment:', err);
      const errorMsg = err.response?.status === 500
        ? 'Backend error: Teacher assignment endpoint not implemented or has a bug.'
        : err.response?.data?.error?.message || 'Failed to update teacher assignment';
      showToast(errorMsg, 'error');
    }
  };

  const openEditModal = (classItem: Class) => {
    setSelectedClass(classItem);
    setEditForm({
      grade: extractGradeName(classItem.name),
      section: extractDigits(classItem.section),
      capacity: classItem.capacity
    });
    setShowEditModal(true);
  };

  const openAssignModal = (classItem: Class) => {
    setSelectedClass(classItem);
    setSelectedTeacherId('');
    setShowAssignModal(true);
  };

  if (!isSchoolAdmin) {
    return (
      <div className="p-8 text-center text-rose-500">
        <AlertCircle className="mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p>Only School Admin can manage classes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        {t('classes.back')}
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('classes.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t('classes.subtitle')}</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold"
        >
          <Plus size={18} />
          {t('classes.createClass')}
        </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              {t("classes.noClasses","No classes found.")} Create your first class!
            </div>
          ) : (
            classes.map((classItem) => (
              <div
                key={classItem.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">{classItem.name}</h3>
                      <p className="text-xs text-slate-500">{formatClassSectionDisplay(classItem.section)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Capacity:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{classItem.capacity} students</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Teacher:</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {classItem.teacherName || 'Not assigned'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAssignModal(classItem)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center justify-center gap-1"
                  >
                    <UserPlus size={14} />
                    Assign
                  </button>
                  <button
                    type="button"
                    title="Edit class"
                    onClick={() => openEditModal(classItem)}
                    className="px-3 py-2 bg-slate-600 text-white rounded-lg text-xs font-bold hover:bg-slate-700"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete class"
                    onClick={() => setConfirmDelete({ show: true, classId: classItem.id })}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Plus size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("classes.createClassTitle", "Create New Class")}</h3>
              </div>
              <button type="button" title="Close create class modal" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleCreateClass}>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">{t("classes.grade","Grade")}</label>
                <select
                  value={createForm.grade}
                  onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Grade</option>
                  {['KG 1', 'KG 2', 'KG 3', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                    <option key={g} value={g}>{g.startsWith('KG') ? g : `Grade ${g}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">{t("classes.section","Section")}</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.section}
                  onChange={(e) => setCreateForm({ ...createForm, section: e.target.value.replace(/\D/g, '') })}
                  placeholder="1"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">{t("classes.capacity","Capacity")}</label>
                <input
                  type="number"
                  value={createForm.capacity}
                  onChange={(e) => setCreateForm({ ...createForm, capacity: parseInt(e.target.value) })}
                  placeholder="40"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
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
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  <span>{creating ? t('classes.creating','Creating...') : t('classes.createClass','Create Class')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedClass && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Edit2 size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("classes.editClassTitle", "Edit Class")}</h3>
              </div>
              <button type="button" title="Close edit class modal" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleUpdateClass}>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Grade</label>
                <select
                  value={editForm.grade || ''}
                  onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Grade</option>
                  {['KG 1', 'KG 2', 'KG 3', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                    <option key={g} value={g}>{g.startsWith('KG') ? g : `Grade ${g}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                <input
                  type="number"
                  min="1"
                  title="Class section"
                  value={editForm.section || ''}
                  onChange={(e) => setEditForm({ ...editForm, section: e.target.value.replace(/\D/g, '') })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Capacity</label>
                <input
                  type="number"
                  title="Class capacity"
                  value={editForm.capacity || ''}
                  onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) })}
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
                  <span>{updating ? t('classes.updating','Updating...') : t('classes.updateClass','Update Class')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignModal && selectedClass && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Assign Homeroom Teacher</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedClass.name} · {selectedClass.section}</p>
                </div>
              </div>
              <button type="button" title="Close assign teacher modal" onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAssignTeacher}>
              {/* Current assignment banner */}
              {selectedClass.teachers && selectedClass.teachers.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs">
                  <span className="text-blue-600 font-bold">Current:</span>
                  <span className="text-blue-800 dark:text-blue-200 font-semibold">{selectedClass.teachers[0]?.teacher_name || selectedClass.teacherName}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">{t("classes.selectTeacher","Select Teacher")}</label>
                <select
                  title="Select a teacher to assign"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select a teacher —</option>
                  {selectedClass.teachers && selectedClass.teachers.length > 0 && (
                    <option value="unassign">🚫 Remove / Unassign current teacher</option>
                  )}
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.digitalId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedTeacherId}
                  className={`flex-1 font-bold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedTeacherId === 'unassign'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Check size={18} />
                  <span>{selectedTeacherId === 'unassign' ? 'Unassign Teacher' : 'Assign Teacher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-green-600" size={20} />
            ) : (
              <XCircle className="text-red-600" size={20} />
            )}
            <p className={`text-sm font-bold ${toast.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Confirm Deletion</h3>
            </div>

            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400">
                Are you sure you want to delete this class? This action cannot be undone.
              </p>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setConfirmDelete({ show: false, classId: null })}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClass}
                className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700"
              >
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
