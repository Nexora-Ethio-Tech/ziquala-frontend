import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Check, X, Users, ChevronRight, Save, Loader2, ArrowLeft, Calendar, Search, Clock, ShieldAlert } from 'lucide-react';
import teacherService, { markAttendance, getMyClasses, getClassAttendance } from '../services/teacherService';
import { getTodayEthiopianDate } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';

export const TeacherAttendance = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayEthiopianDate());
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch classes assigned to teacher
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const data = await getMyClasses('attendance');
        const list = Array.isArray(data) ? data : [];
        const transformed = list.map((cls: any) => ({
          id: cls.id,
          name: cls.name || cls.class_name,
          section: cls.section,
          enrolledStudents: cls.enrolledStudents || cls.student_count || cls.actual_student_count || 0,
        }));
        setClasses(transformed);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch students & attendance records for selected class and date
  const loadRosterAndAttendance = async (classId: string, dateStr: string) => {
    setLoadingStudents(true);
    try {
      const data = await getClassAttendance(classId, dateStr);
      const list = Array.isArray(data) ? data : [];
      const transformed = list.map((s: any) => ({
        id: s.studentId || s.student_id,
        name: s.studentName || s.student_name,
        digitalId: s.digitalId || s.digital_id,
        status: s.status,
      }));
      setStudents(transformed);

      // Default empty/null status to 'absent', else load from DB. Filter/fallback 'late' to 'present'.
      const loadedAttendance: Record<string, 'present' | 'absent' | 'excused'> = {};
      transformed.forEach((s: any) => {
        const rawStatus = s.status;
        if (rawStatus === 'present' || rawStatus === 'absent' || rawStatus === 'excused') {
          loadedAttendance[s.id] = rawStatus;
        } else if (rawStatus === 'late') {
          loadedAttendance[s.id] = 'present';
        } else {
          loadedAttendance[s.id] = 'present';
        }
      });
      setAttendance(loadedAttendance);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSelectClass = (cls: any) => {
    setSelectedClass(cls);
    loadRosterAndAttendance(cls.id, selectedDate);
  };

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (selectedClass) {
      loadRosterAndAttendance(selectedClass.id, dateStr);
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setAttendance(prev => {
      const current = prev[studentId] || 'absent';
      if (status === 'absent' && current === 'absent') {
        return { ...prev, [studentId]: 'present' };
      }
      if (status === 'present' && current === 'present') {
        return { ...prev, [studentId]: 'absent' };
      }
      return {
        ...prev,
        [studentId]: status
      };
    });
  };

  const markAllStatus = (status: 'present' | 'absent' | 'excused') => {
    const updated: Record<string, 'present' | 'absent' | 'excused'> = {};
    students.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: attendance[s.id] || 'present'
      }));
      await markAttendance({
        date: selectedDate,
        attendanceRecords: records
      });
      
      const counts = records.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const summary = `Present: ${counts.present || 0}, Absent: ${counts.absent || 0}, Excused: ${counts.excused || 0}`;
      setSubmitMessage(`Attendance for ${selectedDate} submitted! (${summary})`);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: any) {
      setSubmitMessage(err.response?.data?.error?.message || 'Failed to submit attendance');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.digitalId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = Object.values(attendance).reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, { present: 0, absent: 0, excused: 0 });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">Loading assigned classes...</p>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 rounded-3xl shadow-xl shadow-emerald-500/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
          <h2 className="text-3xl font-extrabold mb-2 tracking-tight">{t('teacherAttendance.attendanceRoster', 'Attendance Roster')}</h2>
          <p className="text-indigo-100/90 font-medium max-w-xl">
            {t('teacherAttendance.attendanceRosterSub', 'Select one of your assigned classes below to register and update student attendance records.')}
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
            <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
            <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('teacherAttendance.noClassesAssigned', 'No Homeroom Section Assigned')}</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">{t('teacherAttendance.noClassesAssignedSub', 'You are not currently designated as a Home Teacher for any section. Daily section attendance is recorded by assigned Home Teachers.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => handleSelectClass(cls)}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:-translate-y-1 transition-all duration-300 text-left group flex flex-col justify-between h-48"
              >
                <div className="flex justify-between items-start w-full">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <Users size={22} />
                  </div>
                  <div className="flex items-center gap-1 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors">
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">Open</span>
                    <ChevronRight size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {cls.name} {cls.section ? `• Section ${cls.section}` : ''}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{cls.enrolledStudents} Enrolled Students</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Panel */}
      <div className="relative z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          <button
            onClick={() => { setSelectedClass(null); setStudents([]); }}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-semibold transition-colors uppercase tracking-wider self-start"
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-between lg:justify-start">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white leading-tight">
              {selectedClass.name} {selectedClass.section ? `- Section ${selectedClass.section}` : ''}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium w-full sm:w-auto">
              <Calendar size={15} className="shrink-0" />
              <span className="whitespace-nowrap">Date:</span>
              <div className="w-full sm:w-48 min-w-[12rem]">
                <EthiopianDatePicker
                  id="attendanceDate"
                  value={selectedDate}
                  onChange={handleDateChange}
                  placeholder="YYYY-MM-DD"
                  title="Select attendance date (Ethiopian calendar)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global actions and submit */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between sm:justify-start">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => markAllStatus('present')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 transition-all"
            >
              All Present
            </button>
            <button
              onClick={() => markAllStatus('absent')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-900 transition-all"
            >
              All Absent
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || loadingStudents}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{submitting ? 'Submitting...' : 'Submit Attendance'}</span>
          </button>
        </div>
      </div>

      {submitted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <div className="bg-emerald-500 text-white p-1 rounded-full"><Check size={16} /></div>
          <span className="font-semibold text-sm">{submitMessage}</span>
        </div>
      )}

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 p-4 rounded-2xl text-center">
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.present}</div>
          <div className="text-xs font-bold text-emerald-800/60 dark:text-emerald-400/60 mt-0.5 uppercase tracking-wider">Present</div>
        </div>
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 p-4 rounded-2xl text-center">
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{stats.absent}</div>
          <div className="text-xs font-bold text-rose-800/60 dark:text-rose-400/60 mt-0.5 uppercase tracking-wider">Absent</div>
        </div>
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 p-4 rounded-2xl text-center">
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{stats.excused}</div>
          <div className="text-xs font-bold text-blue-800/60 dark:text-blue-400/60 mt-0.5 uppercase tracking-wider">Excused</div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Search student by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 pl-12 pr-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        />
      </div>

      {loadingStudents ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400 mb-2" size={32} />
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Fetching students list...</p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Digital ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const currentStatus = attendance[student.id] || 'present';
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors duration-200">
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-xs">
                              {student.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'}
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 font-semibold">{student.digitalId}</span>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex justify-center gap-1.5">
                            {(['present', 'absent', 'excused'] as const).map((statusOption) => {
                              const isSelected = currentStatus === statusOption;
                              let themeClass = '';
                              let icon = null;

                              if (statusOption === 'present') {
                                themeClass = isSelected 
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100';
                                icon = <Check size={14} />;
                              } else if (statusOption === 'absent') {
                                themeClass = isSelected 
                                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                                  : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100';
                                icon = <X size={14} />;
                              } else if (statusOption === 'excused') {
                                themeClass = isSelected 
                                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                  : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100';
                                icon = <ShieldAlert size={14} />;
                              }

                              return (
                                <button
                                  key={statusOption}
                                  onClick={() => handleStatusChange(student.id, statusOption)}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase transition-all duration-200 ${themeClass}`}
                                >
                                  {icon}
                                  <span>{statusOption}</span>
                                </button>
                              );
                            })}
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
      )}
    </div>
  );
};
