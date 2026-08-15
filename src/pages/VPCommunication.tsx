import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ChevronDown, Users, BookOpen, CheckCircle2, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { useUser } from '../context/UserContext';
import * as vicePrincipalService from '../services/vicePrincipalService';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';

interface VpGradeGroup {
  id: string;
  name: string;
  grade_name?: string;
  sections: Section[];
}

interface Section {
  id: string;
  section_name: string;
  student_count: number;
  capacity: number;
}

interface CommSummary {
  homeroomTeacher: string;
  totalStudents: number;
  sentCount: number;
  students: Array<{
    id: string;
    name: string;
    parentName: string;
    sent: boolean;
    sentAt?: string | null;
  }>;
}

export const VPCommunication = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [grades, setGrades] = useState<VpGradeGroup[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<VpGradeGroup | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [recentWeeks, setRecentWeeks] = useState<string[]>([]);
  const [summaryData, setSummaryData] = useState<CommSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Generate last 6 Thursdays for the week selector
  const getRecentThursdays = () => {
    const list: string[] = [];
    const today = new Date();
    const day = today.getDay();
    let diff = 4 - day; // 4 is Thursday
    if (diff < 0) {
      diff += 7;
    }
    const currentThursday = new Date(today);
    currentThursday.setDate(today.getDate() + diff);

    for (let i = 0; i < 6; i++) {
      const d = new Date(currentThursday);
      d.setDate(currentThursday.getDate() - i * 7);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      list.push(`${yyyy}-${mm}-${dd}`);
    }
    return list;
  };

  const formatEthiopianTimestamp = (sentAtStr: string) => {
    const date = new Date(sentAtStr);
    if (isNaN(date.getTime())) return '';
    const datePart = formatEthiopianLabel(date);
    const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  };

  useEffect(() => {
    const weeks = getRecentThursdays();
    setRecentWeeks(weeks);
    if (weeks.length > 0) {
      setSelectedWeek(weeks[0]);
    }
    fetchGradesAndSections();
  }, []);

  const fetchGradesAndSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vicePrincipalService.getGradesAndSections();
      const formattedGrades = (Array.isArray(data) ? data : []).map((grade: any) => ({
        id: grade.id,
        name: grade.name ?? grade.grade_name ?? 'Unnamed Grade',
        grade_name: grade.grade_name ?? grade.name,
        sections: Array.isArray(grade.sections) ? grade.sections : [],
      }));
      setGrades(formattedGrades);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch grades and sections';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (gradeName: string) => {
    setSelectedGrade(gradeName);
    const gradeGroup = grades.find((g) => (g.grade_name ?? g.name) === gradeName) || null;
    setSelectedGradeGroup(gradeGroup);
    setSelectedSection(null);
    setSummaryData(null);
  };

  const handleSectionChange = (sectionId: string) => {
    if (!selectedGradeGroup) return;
    const sec = selectedGradeGroup.sections.find((s) => s.id === sectionId) || null;
    setSelectedSection(sec);
    setSummaryData(null);
  };

  const fetchCommunicationSummary = async () => {
    if (!selectedSection || !selectedWeek) return;

    setLoadingData(true);
    setError(null);
    try {
      const data = await vicePrincipalService.getCommunicationSummary(
        selectedSection.id,
        selectedWeek
      );
      setSummaryData(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch communication book summary.';
      setError(msg);
      showToast('Error loading communication book summary.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedSection && selectedWeek) {
      fetchCommunicationSummary();
    }
  }, [selectedSection, selectedWeek]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">Loading Communication Book Oversight...</p>
      </div>
    );
  }

  const completionRate = summaryData && summaryData.totalStudents > 0
    ? Math.round((summaryData.sentCount / summaryData.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 px-4 sm:px-6 lg:px-8 max-w-[95vw] xl:max-w-[1400px] mx-auto">
      {/* Header */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.2),_transparent_50%)]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-2">{t("vp.academicOversightHeader", "Academic Oversight")}</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">{t("vp.commBookTracker", "Communication Book Tracker")}</h1>
          <p className="text-slate-400 text-sm max-w-2xl font-medium leading-relaxed">
            {t("vp.commBookTrackerDesc", "Monitor and audit weekly communication books sent by Home Room Teachers to parents. Keep track of completion rates per grade and section.")}
          </p>
        </div>
      </section>

      {/* Selectors and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Grade Dropdown */}
          <div>
            <label htmlFor="vp-grade-select" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              {t("vp.grade", "Grade")}
            </label>
            <div className="relative">
              <select
                id="vp-grade-select"
                value={selectedGrade}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
              >
                <option value="">{t("vp.selectGrade", "Select Grade")}</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.grade_name ?? grade.name}>
                    {grade.grade_name ?? grade.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Section Dropdown */}
          <div>
            <label htmlFor="vp-section-select" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              {t("vp.section", "Section")}
            </label>
            <div className="relative">
              <select
                id="vp-section-select"
                value={selectedSection?.id ?? ''}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!selectedGrade}
                className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedGrade ? t("vp.selectSection", "Select Section") : t("vp.chooseGradeFirst", "Choose Grade First")}
                </option>
                {selectedGradeGroup?.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.section_name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Week Selector */}
          <div>
            <label htmlFor="vp-week-select" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              {t("vp.weeklyReport", "Weekly Report (Week Ending)")}
            </label>
            <div className="relative">
              <select
                id="vp-week-select"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
              >
                {recentWeeks.map((week) => (
                  <option key={week} value={week}>
                    {formatEthiopianLabel(week)} ({week})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* Select parameters prompt */}
      {!selectedSection && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[2rem] border border-slate-100 dark:border-slate-800 p-12 text-center">
          <BookOpen className="mx-auto text-slate-400 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t("vp.selectSectionWeek", "Select Section & Week")}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
            {t("vp.selectSectionWeekPrompt", "Please select a grade, section, and a week-ending report date above to inspect the weekly communication book completion statistics.")}
          </p>
        </div>
      )}

      {/* Stats and Grid */}
      {selectedSection && summaryData && (
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Homeroom Teacher */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t("vp.homeroomTeacher", "Homeroom Teacher")}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{summaryData.homeroomTeacher || 'Not Assigned'}</p>
            </div>

            {/* Total Students */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t("vp.totalStudents", "Total Students")}</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{summaryData.totalStudents}</p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl">
                  <Users className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
              </div>
            </div>

            {/* Sent count */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{t("vp.receivedLogs", "Received Logs")}</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{summaryData.sentCount}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
              </div>
            </div>

            {/* Completion rate percentage */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">{t("vp.completionRate", "Completion Rate")}</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        completionRate === 100
                          ? 'bg-emerald-500'
                          : completionRate >= 75
                          ? 'bg-indigo-500'
                          : completionRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{completionRate}%</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">{t("vp.completionAuditRoster", "Completion Audit Roster")}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verification roster of parents who received communication books for this week</p>
            </div>
            <button
              onClick={fetchCommunicationSummary}
              disabled={loadingData}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Student Roster Table */}
          {loadingData ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Retrieving student communication log statuses...</p>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="px-8 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("vp.studentName", "Student Name")}</th>
                      <th className="px-8 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("vp.parentName", "Parent Name")}</th>
                      <th className="px-8 py-4 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("vp.status", "Status")}</th>
                      <th className="px-8 py-4 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("vp.timestamp", "Timestamp")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {summaryData.students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                        {/* Student Name */}
                        <td className="px-8 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
                        </td>
                        {/* Parent Name */}
                        <td className="px-8 py-4 whitespace-nowrap">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{student.parentName}</span>
                        </td>
                        {/* Status Badge */}
                        <td className="px-8 py-4 whitespace-nowrap text-center">
                          {student.sent ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black">
                              <CheckCircle2 size={12} />
                              {t("vp.sentToParent", "Sent to Parent")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black">
                              <AlertCircle size={12} />
                              {t("vp.pendingSubmission", "Pending Submission")}
                            </span>
                          )}
                        </td>
                        {/* Sent Timestamp */}
                        <td className="px-8 py-4 whitespace-nowrap text-right text-slate-500 dark:text-slate-400 text-xs font-medium">
                          {student.sent && student.sentAt ? (
                            formatEthiopianTimestamp(student.sentAt)
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {summaryData.students.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="mx-auto text-slate-400 mb-3" size={32} />
                  <p className="text-slate-500 dark:text-slate-400 font-bold">No students found in this section.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast notifications */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
          }`}>
            <CheckCircle2 className="text-emerald-500" size={20} />
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
