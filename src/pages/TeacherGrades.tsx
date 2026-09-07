import { useState, useEffect } from 'react';
import { Award, Edit2, X, Plus, TrendingUp, Trash2, Users, Save, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import * as teacherService from '../services/teacherService';
import { ecYearToGregorian, getCurrentECYear, getCurrentSemester } from '../utils/ethiopianCalendar';

interface Course {
  id: string;
  name: string;
  code: string;
  gradeLevel: string;
}

interface Student {
  id: string;
  name: string;
  digitalId: string;
  grade: string;
}

interface Grade {
  id: string;
  student_id: string;
  course_id: string;
  type: string;
  score: number;
  total: number;
  weight: string;
  created_at: string;
  student_name: string;
  digital_id: string;
  grade: string;
}

interface GradingConfig {
  id: string;
  label: string;
  maxWeight: number;
}

export const TeacherGrades = () => {
  const academicYear = ecYearToGregorian(getCurrentECYear());
  const semester = getCurrentSemester();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradingConfigs, setGradingConfigs] = useState<GradingConfig[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [bulkGrades, setBulkGrades] = useState<Record<string, { score: number; total: number }>>({});
  const [submittingLock, setSubmittingLock] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    type: '',
    score: 0,
    total: 100,
    weight: '10',
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchGrades();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const classes = await teacherService.getMyClasses();
      const coursesData = classes.map((cls: any) => ({
        id: cls.id,
        name: cls.subject || cls.name,
        code: cls.section || 'N/A',
        gradeLevel: cls.gradeLevel || cls.name,
      }));
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
        setFormData((prev) => ({ ...prev, courseId: coursesData[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const courseObj = courses.find(c => c.id === selectedCourse);
      if (!courseObj) return;

      const [gradesData, rosterData, subsData] = await Promise.all([
        teacherService.getCourseGrades(selectedCourse, academicYear, semester),
        teacherService.getClassStudents(selectedCourse),
        teacherService.getGradeSubmissions()
      ]);

      setGrades(gradesData || []);
      setSubmissions(subsData || []);

      // Load configs
      const gradeLvl = courseObj.gradeLevel ? courseObj.gradeLevel.replace(/\D/g, '') : 'default';
      const configs = await teacherService.getGradingConfigsForGrade(gradeLvl || 'default');
      setGradingConfigs(configs || []);
      
      if (configs.length > 0 && !formData.type) {
        setFormData(prev => ({ 
          ...prev, 
          type: configs[0].id, 
          weight: String(configs[0].maxWeight) 
        }));
      }

      const list = Array.isArray(rosterData) ? rosterData : [];
      const transformedStudents = list.map((s: any) => ({
        id: s.id,
        name: s.name || `${s.first_name || s.firstName} ${s.last_name || s.lastName}`,
        digitalId: s.digital_id || s.digitalId,
        grade: s.grade || courseObj.gradeLevel,
      }));
      setStudents(transformedStudents);
    } catch (err: any) {
      console.error('Failed to fetch grades:', err);
      setError(err.response?.data?.error?.message || 'Failed to load grades');
      setGrades([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const isComponentLocked = (typeId: string) => {
    return submissions.some(s =>
      s.course_id === selectedCourse
      && s.submission_type === typeId
      && (!s.academic_year || s.academic_year === academicYear)
      && (s.semester === undefined || s.semester === null || Number(s.semester) === semester)
      && s.is_locked !== false
    );
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isComponentLocked(formData.type)) {
      alert('This assessment type has been submitted and locked.');
      return;
    }
    try {
      await teacherService.enterGrade({ ...formData, academicYear, semester });
      setShowAddModal(false);
      resetForm();
      fetchGrades();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to submit grade';
      alert(errorMsg);
    }
  };

  const handleBulkSubmit = async () => {
    if (isComponentLocked(formData.type)) {
      alert('This assessment type has been submitted and locked.');
      return;
    }
    try {
      const gradesArray = Object.entries(bulkGrades)
        .filter(([_, data]) => data.score !== undefined)
        .map(([studentId, data]) => ({
          studentId,
          type: formData.type,
          score: data.score,
          total: data.total,
          weight: formData.weight,
        }));

      if (gradesArray.length === 0) {
        alert('Please enter at least one grade');
        return;
      }

      await teacherService.bulkEnterGrades({
        courseId: selectedCourse,
        academicYear,
        semester,
        grades: gradesArray,
      });
      
      setShowBulkModal(false);
      setBulkGrades({});
      fetchGrades();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to submit grades';
      alert(errorMsg);
    }
  };

  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrade) return;
    if (isComponentLocked(formData.type)) {
      alert('This assessment type has been submitted and locked.');
      return;
    }
    try {
      await teacherService.updateGrade(selectedGrade.id, {
        score: formData.score,
        total: formData.total,
        type: formData.type,
        weight: formData.weight,
      });
      setShowEditModal(false);
      setSelectedGrade(null);
      fetchGrades();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to update grade';
      alert(errorMsg);
    }
  };

  const handleDeleteGrade = async (gradeId: string) => {
    const grade = grades.find(g => g.id === gradeId);
    if (grade && isComponentLocked(grade.type)) {
      alert('This grade is submitted and locked, and cannot be deleted.');
      return;
    }
    if (!confirm('Are you sure you want to delete this grade?')) return;
    try {
      await teacherService.deleteGrade(gradeId);
      fetchGrades();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to delete grade';
      alert(errorMsg);
    }
  };

  const handleSubmitComponentGrades = async (typeId: string) => {
    const config = gradingConfigs.find(c => c.id === typeId);
    const label = config ? config.label : typeId;
    if (!confirm(`Are you sure you want to submit and lock all grades for "${label}"? This action cannot be undone.`)) {
      return;
    }

    setSubmittingLock(prev => ({ ...prev, [typeId]: true }));
    try {
      await teacherService.submitCourseGrades(selectedCourse, typeId, { academicYear, semester });
      alert('Grades locked and submitted successfully!');
      fetchGrades();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to submit grades');
    } finally {
      setSubmittingLock(prev => ({ ...prev, [typeId]: false }));
    }
  };

  const openEditModal = (grade: Grade) => {
    setSelectedGrade(grade);
    setFormData({
      studentId: grade.student_id,
      courseId: grade.course_id,
      type: grade.type,
      score: grade.score,
      total: grade.total,
      weight: grade.weight,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    const defaultType = gradingConfigs.length > 0 ? gradingConfigs[0].id : 'Mid-Exam';
    const defaultWeight = gradingConfigs.length > 0 ? String(gradingConfigs[0].maxWeight) : '30';
    setFormData({
      studentId: '',
      courseId: selectedCourse,
      type: defaultType,
      score: 0,
      total: 100,
      weight: defaultWeight,
    });
  };

  const getStudentGrades = (studentId: string) => {
    return grades.filter((g) => g.student_id === studentId);
  };

  if (loading && !courses.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Grade Management</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Enter, review, and lock student scores</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowBulkModal(true);
            }}
            disabled={students.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
          >
            <Users className="w-4 h-4" />
            Bulk Entry
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-xs uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Add Grade
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 font-medium">
          {error}
        </div>
      )}

      {/* Select Course */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl p-6">
        <label htmlFor="courseSelect" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Course</label>
        <select
          id="courseSelect"
          value={selectedCourse}
          onChange={(e) => {
            setSelectedCourse(e.target.value);
            setFormData((prev) => ({ ...prev, courseId: e.target.value, type: '' }));
          }}
          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name} ({course.code}) - {course.gradeLevel}
            </option>
          ))}
        </select>
      </div>

      {/* Grading Components & Lock Status */}
      {gradingConfigs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl p-6">
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Assessment Components & Locking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {gradingConfigs.map((config) => {
              const locked = isComponentLocked(config.id);
              return (
                <div key={config.id} className="flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="mb-3">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{config.label}</p>
                    <p className="text-xs text-slate-500">Max Weight: {config.maxWeight}%</p>
                  </div>
                  {locked ? (
                    <span className="w-full py-2 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border border-emerald-200/50">
                      <Lock size={12} /> Locked
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={submittingLock[config.id]}
                      onClick={() => handleSubmitComponentGrades(config.id)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {submittingLock[config.id] ? 'Submitting...' : 'Submit & Lock'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grade Book Spreadsheet */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID</th>
                {gradingConfigs.map(config => (
                  <th key={config.id} className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{config.label}</th>
                ))}
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Weighted Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3 + gradingConfigs.length} className="px-6 py-12 text-center text-slate-500">No students in this class.</td>
                </tr>
              ) : (
                students.map((student) => {
                  const studentGrades = getStudentGrades(student.id);
                  let totalWeighted = 0;
                  let totalWeightPossible = 0;

                  const columns = gradingConfigs.map(config => {
                    const grade = studentGrades.find(g => g.type === config.id || g.type.toLowerCase() === config.id.toLowerCase());
                    const locked = isComponentLocked(config.id);

                    if (grade) {
                      const percentage = grade.total > 0 ? (grade.score / grade.total) * 100 : 0;
                      totalWeighted += percentage * (config.maxWeight / 100);
                      totalWeightPossible += config.maxWeight;
                    }

                    return (
                      <td key={config.id} className="px-6 py-4 text-center">
                        {grade ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {grade.score} / {grade.total}
                            </span>
                            {!locked ? (
                              <div className="flex gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditModal(grade)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGrade(grade.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-emerald-600 text-xs font-bold" title="Locked">🔒</span>
                            )}
                          </div>
                        ) : (
                          !locked ? (
                            <button
                              onClick={() => {
                                setFormData({
                                  studentId: student.id,
                                  courseId: selectedCourse,
                                  type: config.id,
                                  score: 0,
                                  total: 100,
                                  weight: String(config.maxWeight),
                                });
                                setShowAddModal(true);
                              }}
                              className="text-blue-600 hover:underline text-xs font-bold"
                            >
                              + Add
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )
                        )}
                      </td>
                    );
                  });

                  const weightedAverage = totalWeightPossible > 0 
                    ? ((totalWeighted / (totalWeightPossible / 100))).toFixed(1) + '%'
                    : '—';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-350 font-bold text-sm">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{student.digitalId}</td>
                      {columns}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">{weightedAverage}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Grade Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">Enter Score</h2>
              <button type="button" aria-label="Close" onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmitGrade} className="space-y-4">
              <div>
                <label htmlFor="modalStudent" className="text-xs font-bold text-slate-500 uppercase">Student *</label>
                <select
                  id="modalStudent"
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.digitalId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="modalType" className="text-xs font-bold text-slate-500 uppercase">Assessment Type *</label>
                <select
                  id="modalType"
                  required
                  value={formData.type}
                  onChange={(e) => {
                    const matched = gradingConfigs.find(c => c.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      type: e.target.value,
                      weight: matched ? String(matched.maxWeight) : formData.weight
                    });
                  }}
                  className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                >
                  {gradingConfigs.map(config => (
                    <option key={config.id} value={config.id}>{config.label} ({config.maxWeight}%)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="modalScore" className="text-xs font-bold text-slate-500 uppercase">Score *</label>
                  <input
                    id="modalScore"
                    type="number"
                    required
                    min="0"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: Number(e.target.value) })}
                    className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-center"
                  />
                </div>
                <div>
                  <label htmlFor="modalTotal" className="text-xs font-bold text-slate-500 uppercase">Out Of *</label>
                  <input
                    id="modalTotal"
                    type="number"
                    required
                    min="1"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
                    className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-center"
                  />
                </div>
                <div>
                  <label htmlFor="modalWeight" className="text-xs font-bold text-slate-500 uppercase">Weight % *</label>
                  <input
                    id="modalWeight"
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-center"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold"
                >
                  Save Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Grade Modal */}
      {showEditModal && selectedGrade && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">Edit Score</h2>
              <button type="button" aria-label="Close edit" onClick={() => setShowEditModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <p className="text-slate-500 uppercase font-bold tracking-wider">Student: <span className="text-slate-900 dark:text-slate-200 font-black">{selectedGrade.student_name}</span></p>
                <p className="text-slate-500 uppercase font-bold tracking-wider">Assessment: <span className="text-slate-900 dark:text-slate-200 font-black">{selectedGrade.type}</span></p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="editScore" className="text-xs font-bold text-slate-500 uppercase">Score *</label>
                  <input
                    id="editScore"
                    type="number"
                    required
                    min="0"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: Number(e.target.value) })}
                    className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-center"
                  />
                </div>
                <div>
                  <label htmlFor="editTotal" className="text-xs font-bold text-slate-500 uppercase">Out Of *</label>
                  <input
                    id="editTotal"
                    type="number"
                    required
                    min="1"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
                    className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-center"
                  />
                </div>
                <div>
                  <label htmlFor="editWeight" className="text-xs font-bold text-slate-500 uppercase">Weight % *</label>
                  <input
                    id="editWeight"
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-center"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold"
                >
                  Update Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Entry Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-3xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">Bulk Grade Entry</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Enter grades for the whole class roster at once</p>
              </div>
              <button type="button" aria-label="Close bulk" onClick={() => { setShowBulkModal(false); setBulkGrades({}); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl mb-4 text-sm">
              <div>
                <label htmlFor="bulkType" className="text-xs font-bold text-purple-750 dark:text-purple-300 uppercase">Assessment Type *</label>
                <select
                  id="bulkType"
                  value={formData.type}
                  onChange={(e) => {
                    const matched = gradingConfigs.find(c => c.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      type: e.target.value,
                      weight: matched ? String(matched.maxWeight) : formData.weight
                    });
                  }}
                  className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-lg text-sm"
                >
                  {gradingConfigs.map(config => (
                    <option key={config.id} value={config.id}>{config.label} ({config.maxWeight}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bulkTotal" className="text-xs font-bold text-purple-750 dark:text-purple-300 uppercase">Total Marks *</label>
                <input
                  id="bulkTotal"
                  type="number"
                  min="1"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
                  className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-lg text-sm text-center"
                />
              </div>
              <div>
                <label htmlFor="bulkWeight" className="text-xs font-bold text-purple-750 dark:text-purple-300 uppercase">Weight % *</label>
                <input
                  id="bulkWeight"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full mt-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-lg text-sm text-center"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{student.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{student.digitalId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={formData.total}
                      placeholder="Score"
                      value={bulkGrades[student.id]?.score !== undefined ? bulkGrades[student.id].score : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                        setBulkGrades({
                          ...bulkGrades,
                          [student.id]: { score: val!, total: formData.total }
                        });
                      }}
                      className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-center font-bold text-sm"
                    />
                    <span className="text-xs text-slate-400 font-bold">/ {formData.total}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => { setShowBulkModal(false); setBulkGrades({}); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-750 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Save size={16} />
                Save All Grades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
