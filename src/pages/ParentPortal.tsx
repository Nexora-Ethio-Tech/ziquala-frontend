import {
  BookOpen,
  User,
  Award,
  Megaphone,
  Star,
  ChevronRight,
  Search,
  GraduationCap,
  Users,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { commFields, ratingLabels } from '../data/mockData';
import {
  getParentDashboard,
  getChildCommunicationLogs,
  getParentChildGrades,
  getParentChildHistory,
  getChildTeachers,
  getDriverUpdates,
  getSchoolAnnouncements,
  getFinancialSummary,
  ParentChild,
  ParentAnnouncement,
  CommunicationLog,
  Teacher,
  DriverUpdate,
  FinancialSummary
} from '../services/parentService';
import {
  getCurrentECYear,
  ecYearToGregorian,
  getCurrentSemester,
  formatSemester,
  getAvailableGregorianYears,
  gregorianToECYear,
  isSemesterAccessible,
  formatEthiopianLabel,
} from '../utils/ethiopianCalendar';

export const ParentPortal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activePortalTab = searchParams.get('tab') || 'dashboard';

  // Core State
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<ParentChild | null>(null);
  const [loading, setLoading] = useState(true);

  // Grades (Current Term) State
  const [selectedSemester, setSelectedSemester] = useState(() => formatSemester(getCurrentSemester()));
  const [selectedYear, setSelectedYear] = useState(() => ecYearToGregorian(getCurrentECYear()));
  const [courses, setCourses] = useState<any[]>([]);
  const [gradingMethods, setGradingMethods] = useState<Array<{ id: string; label: string; maxWeight: number }>>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState('');
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');

  // History State
  const [historyYear, setHistoryYear] = useState<string | null>(null);
  const [historySemester, setHistorySemester] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Communication Book State
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [commLoading, setCommLoading] = useState(false);

  // Teachers State
  const [childTeachers, setChildTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  // Driver Updates State
  const [driverUpdates, setDriverUpdates] = useState<DriverUpdate[]>([]);
  const [driverUpdatesLoading, setDriverUpdatesLoading] = useState(false);

  // School Announcements State
  const [schoolAnnouncementsData, setSchoolAnnouncementsData] = useState<ParentAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [noticeFilter, setNoticeFilter] = useState<'all' | 'school' | 'driver'>('all');

  // Financial Summary State
  const [financialData, setFinancialData] = useState<FinancialSummary[]>([]);
  const [financialLoading, setFinancialLoading] = useState(false);

  const academicYears = getAvailableGregorianYears();

  const parentName = useMemo(() => {
    try {
      const u = localStorage.getItem('ziquala_user');
      return u ? JSON.parse(u).name : 'Parent';
    } catch {
      return 'Parent';
    }
  }, []);

  const resetChildScopedState = () => {
    setCourses([]);
    setSelectedCourse(null);
    setHistoryData(null);
    setCommLogs([]);
    setChildTeachers([]);
    setGradesError('');
  };

  const buildSearchParams = (tab: string, childId?: string | null) => {
    const params: Record<string, string> = { tab };
    if (childId && childId !== 'undefined') params.childId = childId;
    return params;
  };

  const selectChild = (child: ParentChild, tabOverride?: string) => {
    resetChildScopedState();
    setSelectedChild(child);
    setSearchParams(buildSearchParams(tabOverride ?? activePortalTab, child.id));
  };

  const getStatus = (course: any) => {
    if (!course || course.total === null || course.total === undefined) return 'PENDING';
    const totalScore = Number(course.total);
    if (!Number.isFinite(totalScore)) return 'PENDING';
    return totalScore >= 50 ? 'PASSED' : 'FAILED';
  };

  const getSubmittedTotal = (course: any) => {
    if (course?.total === null || course?.total === undefined) return null;
    const totalScore = Number(course.total);
    return Number.isFinite(totalScore) ? totalScore : null;
  };

  const getClampedPercentage = (value: string | number | null | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
  };

  const getFieldRating = (log: any, fieldId: string) => {
    if (fieldId === 'noteTaking') return log.rating_note_taking ?? 0;
    return log[`rating_${fieldId}`] ?? 0;
  };

  const getRatingColor = (r: number) => {
    switch (r) {
      case 5: return 'bg-emerald-500';
      case 4: return 'bg-teal-500';
      case 3: return 'bg-blue-500';
      case 2: return 'bg-amber-500';
      case 1: return 'bg-orange-500';
      case 0: return 'bg-slate-400';
      default: return 'bg-slate-300';
    }
  };

  // Sync activePortalTab with viewMode
  useEffect(() => {
    if (activePortalTab === 'grades') {
      setViewMode('current');
    } else if (activePortalTab === 'history') {
      setViewMode('history');
    }
  }, [activePortalTab]);

  // Load Main Dashboard data
  useEffect(() => {
    getParentDashboard()
      .then(d => {
        const kids = d.children || [];
        setChildren(kids);

        if (kids.length > 0) {
          const urlChildId = searchParams.get('childId');
          const fromUrl = (urlChildId && urlChildId !== 'undefined') ? kids.find(k => k.id === urlChildId) : undefined;
          const initialChild = fromUrl ?? kids[0];
          setSelectedChild(initialChild);
          if (!urlChildId || urlChildId === 'undefined' || !fromUrl) {
            setSearchParams(buildSearchParams(activePortalTab, initialChild.id), { replace: true });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Keep selected child in sync when childId URL param changes
  useEffect(() => {
    const urlChildId = searchParams.get('childId');
    if (!urlChildId || urlChildId === 'undefined' || children.length === 0) return;
    const match = children.find(c => c.id === urlChildId);
    if (match && match.id !== selectedChild?.id) {
      resetChildScopedState();
      setSelectedChild(match);
    }
  }, [searchParams, children, selectedChild?.id]);

  // Fetch specific child grades
  useEffect(() => {
    if (!selectedChild || activePortalTab !== 'grades') return;
    if (viewMode !== 'current') return;

    const semNumCheck = selectedSemester === 'First Semester' ? 1 : 2;
    if (!isSemesterAccessible(selectedYear, semNumCheck as 1 | 2)) {
      setGradesError('Grades for this academic period are not yet accessible. Please select a current or past year and semester.');
      setCourses([]);
      setGradingMethods([]);
      setSelectedCourse(null);
      return;
    }

    let cancelled = false;
    const loadGrades = (preserveSelection = false) => {
      setGradesLoading(true);
      setGradesError('');
      const semNum = selectedSemester === 'First Semester' ? 1 : 2;
      getParentChildGrades(selectedChild.id, semNum, selectedYear)
        .then(d => {
          if (cancelled) return;
          const c = d?.courses || [];
          setCourses(c);
          const methods = d?.gradingMethods || [];
          setGradingMethods(methods);
          if (c.length > 0) {
            setSelectedCourse((prev: any) => {
              if (preserveSelection && prev) {
                return c.find((course: any) => course.id === prev.id) || c[0];
              }
              return c[0];
            });
          } else {
            setSelectedCourse(null);
          }
        })
        .catch(e => {
          if (cancelled) return;
          setGradesError(e.message || 'Failed to fetch child courses.');
          setCourses([]);
          setGradingMethods([]);
          setSelectedCourse(null);
        })
        .finally(() => {
          if (!cancelled) setGradesLoading(false);
        });
    };

    loadGrades(true);
    const interval = setInterval(() => loadGrades(true), 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedChild, selectedSemester, selectedYear, activePortalTab, viewMode]);

  useEffect(() => {
    setCourseSearchQuery(selectedCourse?.name || '');
    setDropdownOpen(false);
  }, [selectedCourse]);

  const filteredCourses = useMemo(() => {
    const q = courseSearchQuery.trim().toLowerCase();
    if (!q || (selectedCourse && q === selectedCourse.name.toLowerCase())) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [courses, courseSearchQuery, selectedCourse]);

  // Fetch child academic history
  useEffect(() => {
    if (!selectedChild || activePortalTab !== 'history' || !historyYear || !historySemester) return;
    setHistoryLoading(true);
    setHistoryData(null);
    const semNum = historySemester === 'First Semester' ? 1 : 2;
    getParentChildHistory(selectedChild.id, historyYear, semNum)
      .then(d => {
        setHistoryData(d && d.length > 0 ? d[0] : null);
      })
      .catch(() => setHistoryData(null))
      .finally(() => setHistoryLoading(false));
  }, [selectedChild, historyYear, historySemester, activePortalTab]);

  const semesterAverage = useMemo(() => {
    if (!historyData?.courses) return 'N/A';
    const scored = historyData.courses.filter((c: any) => c.score !== null && c.score !== undefined);
    if (scored.length === 0) return 'N/A';
    const scores = scored.map((c: any) => parseFloat(String(c.score)) || 0);
    return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  }, [historyData]);

  // Fetch communication book logs
  useEffect(() => {
    if (!selectedChild || activePortalTab !== 'communication-book') return;
    setCommLoading(true);
    getChildCommunicationLogs(selectedChild.id)
      .then(logs => {
        setCommLogs(logs || []);
      })
      .catch(() => setCommLogs([]))
      .finally(() => setCommLoading(false));
  }, [selectedChild, activePortalTab]);

  // Fetch teachers
  useEffect(() => {
    if (!selectedChild || activePortalTab !== 'teachers') return;
    setTeachersLoading(true);
    setChildTeachers([]);
    getChildTeachers(selectedChild.id)
      .then(teachers => setChildTeachers(teachers || []))
      .catch(err => {
        console.error('Failed to fetch teachers:', err);
        setChildTeachers([]);
      })
      .finally(() => setTeachersLoading(false));
  }, [selectedChild, activePortalTab]);

  // Driver updates for dashboard
  useEffect(() => {
    if (activePortalTab !== 'dashboard') return;
    setDriverUpdatesLoading(true);
    getDriverUpdates()
      .then(updates => setDriverUpdates(updates || []))
      .catch(err => {
        console.error('Failed to fetch driver updates:', err);
        setDriverUpdates([]);
      })
      .finally(() => setDriverUpdatesLoading(false));
  }, [activePortalTab]);

  // School announcements for dashboard
  useEffect(() => {
    if (activePortalTab !== 'dashboard') return;
    setAnnouncementsLoading(true);
    getSchoolAnnouncements()
      .then(announcements => setSchoolAnnouncementsData(announcements || []))
      .catch(err => {
        console.error('Failed to fetch announcements:', err);
        setSchoolAnnouncementsData([]);
      })
      .finally(() => setAnnouncementsLoading(false));
  }, [activePortalTab]);

  // Financial summary for finance tab
  useEffect(() => {
    if (activePortalTab !== 'finance') return;
    setFinancialLoading(true);
    getFinancialSummary()
      .then(data => setFinancialData(data || []))
      .catch(err => {
        console.error('Failed to fetch financial data:', err);
        setFinancialData([]);
      })
      .finally(() => setFinancialLoading(false));
  }, [activePortalTab]);

  const selectedChildFinancial = useMemo(() => {
    if (!selectedChild) return [];
    return financialData.filter(f => f.student_id === selectedChild.id);
  }, [financialData, selectedChild]);

  const renderChildPicker = () => {
    if (children.length <= 1) return null;
    return (
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Student:</span>
        {children.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectChild(c)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedChild?.id === c.id
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-blue-500'
              }`}
          >
            {c.fullName}
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-16rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-16">
      {/* Premium Family Dashboard Header Banner */}
      <div className={`${
        activePortalTab === 'dashboard' ? 'block' : 'hidden md:block'
      } bg-gradient-to-br from-[#0c1424] via-[#0f1b30] to-[#12233f] rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden border border-white/10`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13233f] text-blue-400 border border-blue-800/50 text-[9px] font-black uppercase tracking-widest">
              FAMILY DASHBOARD
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
              Hello, {parentName}
            </h2>
            <p className="text-xs md:text-sm max-w-lg leading-relaxed font-medium text-slate-300">
              Central hub for tracking educational milestones and school announcements.
            </p>
          </div>

          {/* Student Selector Pills directly on Header Banner */}
          {children.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-[#090f1a]/80 p-2 rounded-2xl border border-blue-900/40">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Student:</span>
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectChild(c)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedChild?.id === c.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#101c33] text-slate-300 hover:bg-[#162747] border border-blue-900/30'
                    }`}
                >
                  {c.fullName}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] -mr-48 -mt-48" />
      </div>

      {/* ==================== 1. DASHBOARD TAB ==================== */}
      {activePortalTab === 'dashboard' && (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">

          {/* Children Grid */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Award className="text-blue-400" size={20} />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">My Children</h3>
              </div>
              <span className="bg-slate-800 px-3 py-1 rounded-lg text-xs font-black text-slate-400 uppercase tracking-widest">
                {children.length} Enrolled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {children.map((child) => {
                const isSelected = selectedChild?.id === child.id;
                return (
                  <div
                    key={child.id}
                    onClick={() => selectChild(child)}
                    className="group relative cursor-pointer"
                  >
                    <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur-lg transition duration-500 ${isSelected ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}`} />
                    <div className={`relative bg-slate-900 p-4 sm:p-6 rounded-2xl border shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-500 ${(
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                        : 'border-slate-800'
                    )}
                  `}>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner transition-all duration-500 ${isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                            }`}>
                            {child.fullName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-white mb-1">{child.fullName}</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grade {child.grade}</p>
                            {isSelected && (
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Currently Selected</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectChild(child, 'grades');
                          }}
                          className="p-2.5 bg-blue-900/30 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                          title={`View ${child.fullName}'s grades`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-5">
                        <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance Rank</p>
                          <p className="text-lg font-black text-blue-400 truncate">{child.performance || 'Pending Results'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notice Board & Announcements Section */}
          <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Megaphone className="text-blue-400" size={22} />
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Notice Board & Announcements</h3>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Official updates from School Administration and transport team</p>
              </div>

              {/* Tab Filters */}
              <div className="flex items-center gap-2 bg-slate-800/60 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setNoticeFilter('all')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${noticeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  All ({schoolAnnouncementsData.length + driverUpdates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNoticeFilter('school')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${noticeFilter === 'school'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  School Admin ({schoolAnnouncementsData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNoticeFilter('driver')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${noticeFilter === 'driver'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Driver Logs ({driverUpdates.length})
                </button>
              </div>
            </div>

            {/* Content Feed */}
            {announcementsLoading || driverUpdatesLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* School Announcements List */}
                {noticeFilter !== 'driver' && schoolAnnouncementsData.length > 0 && (
                  <div className="space-y-4">
                    {noticeFilter === 'all' && (
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">School Board Announcements</h4>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                      {schoolAnnouncementsData.map((notice) => (
                        <div
                          key={notice.id}
                          className="group relative bg-slate-800/40 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-blue-900/40 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                                School Admin
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${notice.priority === 'High'
                                ? 'bg-rose-900/40 text-rose-400'
                                : 'bg-slate-800 text-slate-400'
                                }`}>
                                {notice.priority} Priority
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 font-bold">
                              📅 {formatEthiopianLabel(notice.timestamp)} at {new Date(notice.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white mb-2 group-hover:text-blue-400 transition-colors">
                            {notice.title}
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            {notice.content}
                          </p>
                          {notice.created_by_name && (
                            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                              <span>Posted by: {notice.created_by_name}</span>
                              <span className="text-[10px] bg-blue-950/40 text-blue-400 px-2 py-0.5 rounded-md">Verified Admin</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {((noticeFilter === 'all' && schoolAnnouncementsData.length === 0 && driverUpdates.length === 0) ||
                  (noticeFilter === 'school' && schoolAnnouncementsData.length === 0) ||
                  (noticeFilter === 'driver' && driverUpdates.length === 0)) && (
                    <div className="text-center py-16 bg-slate-800/20 rounded-2xl border border-dashed border-slate-800 p-8 space-y-3">
                      <Megaphone className="mx-auto text-slate-700 animate-pulse" size={36} />
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">No active notices found</p>
                      <p className="text-xs text-slate-500 italic">There are no updates posted at this time.</p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. GRADES & COURSES TAB ==================== */}
      {activePortalTab === 'grades' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {selectedChild ? (
            <div className="space-y-8">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-lg">
                {renderChildPicker()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Academic Year</label>
                    <select
                      title="Academic Year"
                      value={selectedYear}
                      onChange={(e) => { setSelectedYear(e.target.value); setSelectedCourse(null); }}
                      className="w-full px-4 py-2 bg-slate-800 border-2 border-slate-700 rounded-lg text-sm font-bold text-white outline-none"
                    >
                      {academicYears.map((year) => (
                        <option key={year} value={year}>{gregorianToECYear(year)} E.C. ({year})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Semester</label>
                    <select
                      title="Semester"
                      value={selectedSemester}
                      onChange={(e) => { setSelectedSemester(e.target.value); setSelectedCourse(null); }}
                      className="w-full px-4 py-2 bg-slate-800 border-2 border-slate-700 rounded-lg text-sm font-bold text-white outline-none"
                    >
                      <option>First Semester</option>
                      <option>Second Semester</option>
                    </select>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2">Course</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Select Course"
                        value={courseSearchQuery}
                        onChange={(e) => { setCourseSearchQuery(e.target.value); setDropdownOpen(true); }}
                        onFocus={() => setDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border-2 border-slate-700 rounded-lg text-sm font-bold text-white outline-none"
                      />
                    </div>

                    {dropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-[220px] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-1.5">
                        {filteredCourses.length > 0 ? (
                          filteredCourses.map((c) => (
                            <button
                              key={c.id || c.name}
                              type="button"
                              onMouseDown={() => { setSelectedCourse(c); setCourseSearchQuery(c.name); setDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-3 rounded-xl ${selectedCourse?.name === c.name ? 'bg-blue-600 text-white' : 'text-slate-200'}`}
                            >
                              <div className="text-sm font-bold">{c.name}</div>
                              <div className="text-xs opacity-75">{c.code}</div>
                            </button>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 text-center py-4">No courses found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Grading area */}
              {selectedCourse ? (
                <div className="bg-slate-950 rounded-[2rem] overflow-hidden shadow-lg border border-slate-800">
                  {gradingMethods.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm text-slate-200" style={{ minWidth: `${200 + gradingMethods.length * 140}px` }}>
                        <tbody>
                          <tr className="border-b border-slate-800">
                            <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-400">Assessment Component</th>
                            {gradingMethods.map((method) => (
                              <th key={method.id} className="min-w-[140px] px-6 py-4 text-left font-black uppercase tracking-widest text-slate-300">
                                {method.label}
                                <span className="block text-[10px] text-slate-500 font-bold mt-0.5">({method.maxWeight}%)</span>
                              </th>
                            ))}
                            <th className="min-w-[140px] px-6 py-4 text-right font-black uppercase tracking-widest text-slate-300">
                              Total
                              <span className="block text-[10px] text-slate-500 font-bold mt-0.5">(100%)</span>
                            </th>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-left font-black uppercase tracking-widest text-slate-400">Student Score</td>
                            {gradingMethods.map((method) => {
                              const gradeVal = selectedCourse.grades?.[method.id];
                              return (
                                <td key={method.id} className="px-6 py-4 text-left font-bold text-slate-100 text-lg">
                                  {gradeVal !== null && gradeVal !== undefined ? Number(gradeVal).toFixed(1) : '--'}
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 text-right font-black text-emerald-400 text-xl">
                              {selectedCourse.total !== null && selectedCourse.total !== undefined ? Number(selectedCourse.total).toFixed(1) : '--'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-slate-800">
                        <div className="p-4 border-r border-slate-800"><div className="text-xs font-bold uppercase text-slate-400">TEST 1</div><div className="text-lg font-black text-slate-300 mt-1">10%</div></div>
                        <div className="p-4 border-r border-slate-800"><div className="text-xs font-bold uppercase text-slate-400">HOME WORK AND CLASS WORK</div><div className="text-lg font-black text-slate-300 mt-1">10%</div></div>
                        <div className="p-4 border-r border-slate-800"><div className="text-xs font-bold uppercase text-slate-400">MID EXAM</div><div className="text-lg font-black text-slate-300 mt-1">30%</div></div>
                        <div className="p-4"><div className="text-xs font-bold uppercase text-slate-400">FINAL EXAM</div><div className="text-lg font-black text-slate-300 mt-1">50%</div></div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-slate-800">
                        <div className="p-4 border-r border-slate-800"><div className="text-3xl font-black text-slate-100">{selectedCourse.quiz_10 ?? '--'}</div></div>
                        <div className="p-4 border-r border-slate-800"><div className="text-3xl font-black text-slate-100">{selectedCourse.assignment_10 ?? '--'}</div></div>
                        <div className="p-4 border-r border-slate-800"><div className="text-3xl font-black text-slate-100">{selectedCourse.mid_30 ?? '--'}</div></div>
                        <div className="p-4"><div className="text-3xl font-black text-slate-100">{selectedCourse.final_50 ?? '--'}</div></div>
                      </div>
                    </>
                  )}

                  <div className="bg-slate-900/50 p-6 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Standing</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-200">Course Status:</span>
                          {(() => {
                            const status = getStatus(selectedCourse);
                            if (status === 'PASSED') return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-black">PASSED</span>;
                            if (status === 'FAILED') return <span className="px-3 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full text-xs font-black">FAILED</span>;
                            return <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-xs font-black">PENDING</span>;
                          })()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl md:text-4xl font-black text-white">{selectedCourse.total ?? '--'}</div>
                        <div className="text-sm text-slate-400">/ 100</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-black uppercase text-slate-400"><span>Total Score Progress</span><span>{getSubmittedTotal(selectedCourse) !== null ? Math.round(Number(getSubmittedTotal(selectedCourse))) + '%' : 'Pending'}</span></div>
                      <div className="w-full mt-2">
                        <progress
                          className="w-full h-3 rounded-full appearance-none bg-slate-800 accent-emerald-400"
                          value={Math.round(getClampedPercentage(selectedCourse.total))}
                          max={100}
                          title="Total score progress"
                          aria-label="Total score progress"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-2xl p-6 text-center text-slate-400">Select Course to view grading components.</div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 p-8 rounded-2xl text-center text-slate-400 text-sm border border-slate-800 animate-pulse">Please select a child student account to view academic courses.</div>
          )}
        </div>
      )}

      {/* ==================== 3. ACADEMIC HISTORY TAB ==================== */}
      {activePortalTab === 'history' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-3xl font-black text-white">Academic History</h1>
            <p className="text-slate-400 mt-2 font-medium italic">
              Historical summary of completed courses and final results by year and semester.
            </p>
          </div>

          {renderChildPicker()}

          {selectedChild ? (
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Historical Records</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Final course results archive</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-3">Academic Year</label>
                  <select
                    title="Select Academic Year"
                    value={historyYear || ''}
                    onChange={(e) => {
                      setHistoryYear(e.target.value || null);
                      setHistoryData(null);
                    }}
                    className="w-full appearance-none px-6 py-3 bg-slate-800 border-2 border-slate-700 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">-- Select Year --</option>
                    {academicYears.map((year) => (
                      <option key={year} value={year}>
                        {gregorianToECYear(year)} E.C. ({year})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-3">Semester</label>
                  <select
                    title="Select Semester"
                    value={historySemester || ''}
                    onChange={(e) => {
                      setHistorySemester(e.target.value || null);
                      setHistoryData(null);
                    }}
                    disabled={!historyYear}
                    className="w-full appearance-none px-6 py-3 bg-slate-800 border-2 border-slate-700 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Semester --</option>
                    <option>First Semester</option>
                    <option>Second Semester</option>
                  </select>
                </div>
              </div>

              {historyYear && historySemester && historyData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-5 rounded-3xl bg-slate-800/50 border border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Academic Year</p>
                    <p className="text-xl font-black text-white">{historyYear}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-slate-800/50 border border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Semester</p>
                    <p className="text-xl font-black text-white">{historySemester}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-slate-800/50 border border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Semester Average</p>
                    <p className="text-xl font-black text-white">
                      {typeof semesterAverage === 'number' ? `${semesterAverage}%` : semesterAverage}
                    </p>
                  </div>
                </div>
              )}

              {historyLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : historyData && historyData.courses && historyData.courses.length > 0 ? (
                <div className="overflow-hidden rounded-3xl border border-slate-800">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Course</th>
                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Code</th>
                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Final Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {historyData.courses.map((course: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-5 font-bold text-white">{course.name}</td>
                          <td className="px-8 py-5 text-slate-400 text-sm">{course.code || '—'}</td>
                          <td className="px-8 py-5 text-right">
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-black ${course.score_display === 'Pending' || course.score === null
                              ? 'bg-amber-900/20 text-amber-400'
                              : 'bg-blue-900/20 text-blue-400'
                              }`}>
                              {course.score_display || (course.score !== null ? `${course.score}%` : 'Pending')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : historyYear && historySemester ? (
                <div className="text-center py-12 text-slate-400 bg-slate-900/10 rounded-2xl border border-dashed border-slate-800">
                  <p className="font-medium">No courses found for the selected academic year and semester.</p>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 bg-slate-900/10 rounded-2xl border border-dashed border-slate-800">
                  <p className="font-medium">Select an academic year and semester to view historical results.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 p-8 rounded-2xl text-center text-slate-400 text-sm border border-slate-800">
              Select a child to view academic history.
            </div>
          )}
        </div>
      )}

      {/* ==================== 4. TEACHERS TAB ==================== */}
      {activePortalTab === 'teachers' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl font-black text-white">Your Child's Teachers</h1>
            <p className="text-slate-400 mt-2 font-medium italic">Teaching staff assigned to your child's courses.</p>
          </div>

          {renderChildPicker()}

          {teachersLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : childTeachers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {childTeachers.map((teacher) => (
                <div key={teacher.id} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-white mb-1">{teacher.name}</h3>
                      <p className="text-xs font-bold text-blue-400">{teacher.email}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {teacher.subjects && teacher.subjects.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subjects</p>
                        <div className="flex flex-wrap gap-2">
                          {teacher.subjects.map((subject, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-900/20 text-blue-400 rounded-full text-xs font-bold">
                              {subject}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 p-12 rounded-[2rem] border border-slate-800 text-center">
              <Users className="text-slate-700 mx-auto mb-4" size={40} />
              <p className="text-slate-400 font-bold text-lg">No teachers assigned yet.</p>
              <p className="text-slate-500 text-sm mt-2">Teachers will appear once courses are assigned.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== 5. FINANCE TAB ==================== */}
      {activePortalTab === 'finance' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl font-black text-white">Fees & Financial Summary</h1>
            <p className="text-slate-400 mt-2 font-medium italic">
              Track fees, payments, and financial status for {selectedChild?.fullName || 'your selected child'}.
            </p>
          </div>

          {renderChildPicker()}

          {financialLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : selectedChildFinancial.length > 0 ? (
            <div className="space-y-6">
              {selectedChildFinancial.map((financial) => (
                <div key={financial.student_id} className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-lg">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-white mb-2">{financial.student_name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student ID: {financial.student_id}</p>
                    </div>
                    <span className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap bg-emerald-900/20 text-emerald-400 border border-emerald-500/20">
                      {financial.fee_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-800">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Monthly Fee</p>
                      <p className="text-2xl font-black text-white">ETB {financial.monthly_fee}</p>
                    </div>
                    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-800">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bus Fee</p>
                      <p className="text-2xl font-black text-white">ETB {financial.bus_fee}</p>
                    </div>
                    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-800">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Penalty</p>
                      <p className="text-2xl font-black text-white">ETB {financial.penalty_fee}</p>
                    </div>
                    <div className="p-6 bg-blue-900/10 rounded-2xl border border-blue-800">
                      <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Total Fees</p>
                      <p className="text-2xl font-black text-blue-400">ETB {financial.total_fees}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 p-12 rounded-[2rem] border border-slate-800 text-center">
              <DollarSign className="text-slate-700 mx-auto mb-4" size={40} />
              <p className="text-slate-400 font-bold text-lg">
                {selectedChild ? 'No financial data available for this child.' : 'Select a child to view financial information.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================== 6. COMMUNICATION BOOK TAB ==================== */}
      {activePortalTab === 'communication-book' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl font-black text-white">Weekly Communication Book</h1>
            <p className="text-slate-400 mt-2 font-medium italic">Weekly evaluations and behavior metrics logged by your child's homeroom teacher.</p>
          </div>

          {renderChildPicker()}

          {commLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : commLogs.length > 0 ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              {commLogs.map((log) => (
                <div key={log.id} className="space-y-6 bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
                  <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl p-6 border border-blue-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <Star size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Evaluation Record</p>
                        <h3 className="text-lg font-black text-white mt-0.5">
                          Week ending: {log.week_ending_formatted || log.week_ending}
                        </h3>
                      </div>
                    </div>
                    {log.teacher_name && (
                      <span className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider">
                        👤 Teacher: {log.teacher_name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {commFields.map((field) => {
                      const rating = getFieldRating(log, field.id);
                      return (
                        <div key={field.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 text-center">
                          <div className={`w-12 h-12 rounded-xl ${getRatingColor(rating)} flex items-center justify-center text-white font-black text-xl mb-3 mx-auto`}>
                            {rating}
                          </div>
                          <h4 className="font-black text-white text-xs mb-1">{field.label}</h4>
                          <span className={`w-full py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getRatingColor(rating)} text-white block`}>
                            {ratingLabels[rating] || 'Unrated'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {log.teacher_note && (
                    <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Teacher's Observations</h4>
                      <p className="text-slate-200 leading-relaxed italic">"{log.teacher_note}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 p-12 rounded-[2rem] border border-slate-800 text-center">
              <ClipboardList className="text-slate-700 mx-auto mb-4" size={48} />
              <p className="text-slate-400 font-bold text-lg uppercase tracking-tight">No evaluation records available</p>
              <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                No weekly evaluation logs have been posted by the homeroom teacher yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
