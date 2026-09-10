import { uiError, uiText } from "../localization";
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, User, Calendar, GraduationCap, Search, Award, AlertCircle } from 'lucide-react';
import { StudentCourse, getMyGradesForSemester, getMyHistory } from '../services/studentPortalService';
import {
  getCurrentECYear,
  ecYearToGregorian,
  getCurrentSemester,
  formatSemester,
  getAvailableGregorianYears,
  gregorianToECYear,
  isSemesterAccessible
} from '../utils/ethiopianCalendar';

export const StudentCourses = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const viewMode = location.pathname === '/attendance' ? 'history' : 'current';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Current Term state
  const [selectedSemester, setSelectedSemester] = useState(() => formatSemester(getCurrentSemester()));
  const [selectedYear, setSelectedYear] = useState(() => ecYearToGregorian(getCurrentECYear()));
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<StudentCourse | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [gradingMethods, setGradingMethods] = useState<Array<{ id: string; label: string; maxWeight: number }>>([]);
  const gradingWeightSum = useMemo(() => gradingMethods.reduce((sum, m) => sum + (m.maxWeight || 0), 0), [gradingMethods]);
  const weightSumError = gradingWeightSum !== 100;
  const [dropdownOpen, setDropdownOpen] = useState(false);



  // Academic History state
  const [historyYear, setHistoryYear] = useState<string | null>(null);
  const [historySemester, setHistorySemester] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Available academic years
  const academicYears = getAvailableGregorianYears();

  const getStatus = (course: any) => {
    if (!course || course.total === null || course.total === undefined) {
      return 'PENDING';
    }
    const totalScore = Number(course.total);
    if (!Number.isFinite(totalScore)) return 'PENDING';
    return totalScore >= 50 ? 'PASSED' : 'FAILED';
  };

  const getSubmittedTotal = (course: any) => {
    if (course?.total === null || course?.total === undefined) return null;
    const totalScore = Number(course.total);
    return Number.isFinite(totalScore) ? totalScore : null;
  };

  // Fetch course list for the selected term (dropdown)
  const fetchCourses = async (preserveSelection = false) => {
    try {
      setLoading(true);
      setError(uiText(""));
      const semNum = selectedSemester === 'First Semester' ? 1 : 2;

      // Block access to future academic periods
      if (!isSemesterAccessible(selectedYear, semNum as 1 | 2)) {
        setError(uiText("Grades for this academic period are not yet accessible. Please select a current or past year and semester."));
        setCourses([]);
        setSelectedCourse(null);
        setLoading(false);
        return;
      }

      const data = await getMyGradesForSemester(semNum, selectedYear);
      const coursesData = data.courses || [];
      const methods = data.gradingMethods || [];
      setCourses(coursesData);
      setGradingMethods(methods);
      if (coursesData.length > 0) {
        if (preserveSelection && selectedCourse) {
          const stillThere = coursesData.find((c: StudentCourse) => c.id === selectedCourse.id);
          // keep selection (or fall back to first course so grades remain visible)
          setSelectedCourse(stillThere || coursesData[0]);
        } else {
          // Auto-select the first course so grades are immediately visible
          setSelectedCourse(coursesData[0]);
        }
      } else {
        setSelectedCourse(null);
      }
    } catch (err: any) {
      setError(uiError(err.message || 'Failed to fetch courses.'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch submitted grades for the selected course from its assigned teacher
  const fetchSelectedCourseGrades = async (courseId: string) => {
    try {
      const semNum = selectedSemester === 'First Semester' ? 1 : 2;
      const data = await getMyGradesForSemester(semNum, selectedYear, courseId);
      const detail = data.selected || data.courses?.[0];
      if (detail) {
        setSelectedCourse((prev) => (prev?.id === courseId ? { ...prev, ...detail } : prev));
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, ...detail } : c))
        );
      }
      if (data.gradingMethods?.length) {
        setGradingMethods(data.gradingMethods);
      }
    } catch (err: any) {
      console.error('Failed to refresh course grades:', err);
    }
  };

  useEffect(() => {
    if (viewMode === 'current') {
      fetchCourses(true);
    }
  }, [viewMode, selectedSemester, selectedYear]);

  useEffect(() => {
    if (viewMode !== 'current') return;
    const interval = setInterval(() => {
      fetchCourses(true);
      if (selectedCourse?.id) {
        fetchSelectedCourseGrades(selectedCourse.id);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [viewMode, selectedSemester, selectedYear, selectedCourse?.id]);

  useEffect(() => {
    if (viewMode !== 'current' || !selectedCourse?.id) return;
    fetchSelectedCourseGrades(selectedCourse.id);
  }, [selectedCourse?.id, selectedSemester, selectedYear, viewMode]);

  // Sync search input query when selected course changes
  useEffect(() => {
    if (selectedCourse) {
      setCourseSearchQuery(selectedCourse.name);
    } else {
      setCourseSearchQuery('');
    }
  }, [selectedCourse]);

  // Filter courses for searchable combobox
  const filteredCourses = useMemo(() => {
    const query = courseSearchQuery.trim().toLowerCase();
    if (!query || (selectedCourse && query === selectedCourse.name.toLowerCase())) {
      return courses;
    }
    return courses.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
    );
  }, [courses, courseSearchQuery, selectedCourse]);

  // Fetch history data when both selections are made
  const loadHistoryData = async () => {
    if (!historyYear || !historySemester) return;

    try {
      setHistoryLoading(true);
      const semNum = historySemester === 'First Semester' ? 1 : 2;
      const data = await getMyHistory(historyYear, semNum);
      setHistoryData(data && data.length > 0 ? data[0] : null);
    } catch (err: any) {
      console.error(err);
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'history') {
      loadHistoryData();
    }
  }, [viewMode, historyYear, historySemester]);

  // Calculate semester average for history metrics
  const semesterAverage = useMemo(() => {
    if (!historyData || !historyData.courses) return 'N/A';
    const scored = historyData.courses.filter((c: any) => c.score !== null && c.score !== undefined);
    if (scored.length === 0) return 'N/A';
    const scores = scored.map((c: any) => {
      const numScore = typeof c.score === 'string' ? parseFloat(c.score) : c.score;
      return isNaN(numScore) ? 0 : numScore;
    });
    return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  }, [historyData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            {uiText(viewMode === 'current' ? 'Grades & Courses' : 'Academic History')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium italic">
            {uiText(viewMode === 'current'
              ? 'Track live grades and course details for the current term.'
              : 'Historical summary of completed courses and final results by year and semester.')}
          </p>
        </div>
      </div>

      {uiText(error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {uiError(error)}
        </div>
      ))}

      {/* CURRENT TERM VIEW */}
      {viewMode === 'current' ? (
        loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* First Div: Controls Row */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Year Selector */}
                <div>
                  <label htmlFor="course-year" className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">{uiText("Academic Year")}</label>
                  <select
                    id="course-year"
                    title={uiText("Academic Year")}
                    aria-label={uiText("Academic Year")}
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedCourse(null);
                    }}
                    className="w-full appearance-none px-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-slate-900 dark:text-white"
                  >
                    {academicYears.map((year) => (
                      <option key={year} value={year}>
                        {gregorianToECYear(year)}{uiText(" E.C. (")}{uiText(year)}{uiText(")")}</option>
                    ))}
                  </select>
                </div>

                {/* Semester Selector */}
                <div>
                  <label htmlFor="course-semester" className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">{uiText("Semester")}</label>
                  <select
                    id="course-semester"
                    title={uiText("Semester")}
                    aria-label={uiText("Semester")}
                    value={selectedSemester}
                    onChange={(e) => {
                      setSelectedSemester(e.target.value);
                      setSelectedCourse(null);
                    }}
                    className="w-full appearance-none px-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-slate-900 dark:text-white"
                  >
                    <option value="First Semester">{uiText("First Semester")}</option>
                    <option value="Second Semester">{uiText("Second Semester")}</option>
                  </select>
                </div>

                {/* Searchable Course Dropdown (Combobox) */}
                <div className="relative">
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">{uiText("Search & Select Course")}</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder={uiText("Select Course")}
                      value={courseSearchQuery}
                      onChange={(e) => {
                        setCourseSearchQuery(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setDropdownOpen(true);
                        if (selectedCourse && courseSearchQuery === selectedCourse.name) {
                          setCourseSearchQuery('');
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setDropdownOpen(false);
                          if (selectedCourse) {
                            setCourseSearchQuery(selectedCourse.name);
                          }
                        }, 250);
                      }}
                      className="w-full pl-12 pr-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>

                  {dropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-2 max-h-[250px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 space-y-1">
                      {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => (
                          <button
                            key={course.id}
                            type="button"
                            onMouseDown={() => {
                              setSelectedCourse(course);
                              setCourseSearchQuery(course.name);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedCourse?.id === course.id
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                          >
                            <p className="text-sm font-bold">{course.name}</p>
                            <p className="text-xs opacity-75">{uiText(course.code)}</p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-4">{uiText("No courses found")}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Second Div: Selected Course Metadata & Grades */}
            {selectedCourse ? (
              <div className="space-y-6">
                {/* Course Metadata Card with Course Progress on Right */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-lg">
                  <div className="flex items-start gap-8 justify-between">
                    <div className="flex items-center gap-5 flex-1">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                        <BookOpen size={32} />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCourse.name}</h2>
                        <div className="flex flex-col gap-3 mt-4">
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-bold">{uiText("Course Code: ")}<span className="text-slate-900 dark:text-white">{uiText(selectedCourse.code)}</span></div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-bold">{uiText("Instructor: ")}<span className="text-slate-900 dark:text-white">{uiText(typeof selectedCourse.teacher === 'string' ? selectedCourse.teacher : (selectedCourse.teacher as any)?.name || 'N/A')}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/95 border border-slate-800 rounded-[2rem] shadow-xl overflow-hidden">
                  <div className="p-6">
                    {weightSumError && (
                      <div className="flex items-center gap-2 bg-amber-50/10 border border-amber-200/20 text-amber-200 px-4 py-3 rounded-xl mb-4">
                        <AlertCircle size={18} />
                        <span>{uiText("Grading weights total ")}{gradingWeightSum}{uiText("%, which does not equal 100%.")}</span>
                      </div>
                    )}
                    {gradingMethods.length > 0 ? (
                      <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm text-slate-200" style={{ minWidth: `${200 + gradingMethods.length * 140}px` }}>
                        <tbody>
                          <tr className="border-b border-slate-800">
                            <th className="px-5 py-4 text-left font-black uppercase tracking-widest text-slate-400">{uiText("Assessment Component")}</th>
                            {gradingMethods.map((method) => (
                              <th key={method.id} className="min-w-[140px] px-5 py-4 text-left font-black uppercase tracking-widest text-slate-300">
                                {uiText(method.label)}
                                <span className="block text-[10px] text-slate-500 font-bold mt-0.5">{uiText("(")}{method.maxWeight}{uiText("%)")}</span>
                              </th>
                            ))}
                            <th className="min-w-[140px] px-5 py-4 text-right font-black uppercase tracking-widest text-slate-300">{uiText("Total")}<span className="block text-[10px] text-slate-500 font-bold mt-0.5">{uiText("(100%)")}</span>
                            </th>
                          </tr>
                          <tr>
                            <td className="px-5 py-4 text-left font-black uppercase tracking-widest text-slate-400">{uiText("Student Score")}</td>
                            {gradingMethods.map((method) => {
                              const gradeVal = selectedCourse.grades?.[method.id];
                              return (
                                <td key={method.id} className="px-5 py-4 text-left font-bold text-slate-100 text-lg">
                                  {uiText(gradeVal !== null && gradeVal !== undefined ? Number(gradeVal).toFixed(1) : '--')}
                                </td>
                              );
                            })}
                            <td className="px-5 py-4 text-right font-black text-emerald-400 text-xl">
                              {uiText(getSubmittedTotal(selectedCourse) !== null ? Number(getSubmittedTotal(selectedCourse)).toFixed(1) : '--')}
                            </td>
                          </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 text-center text-slate-400">{uiText("Select a course to load grading components from the system.")}</div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-800 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Academic Standing")}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-200">{uiText("Course Status:")}</span>
                            {(() => {
                              const status = getStatus(selectedCourse);
                              if (status === 'PASSED') {
                                return (
                                  <span className="px-3.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-black tracking-widest uppercase">{uiText("PASSED")}</span>
                                );
                              } else if (status === 'FAILED') {
                                return (
                                  <span className="px-3.5 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full text-xs font-black tracking-widest uppercase">{uiText("FAILED")}</span>
                                );
                              } else {
                                return (
                                  <span className="px-3.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-xs font-black tracking-widest uppercase">{uiText("PENDING")}</span>
                                );
                              }
                            })()}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-3xl font-black text-white">
                            {uiText(getSubmittedTotal(selectedCourse) !== null ? Number(getSubmittedTotal(selectedCourse)).toFixed(1) : '--')}
                          </span>
                          <span className="text-sm text-slate-400 font-bold">{uiText(" / 100")}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>{uiText("Total Score Progress")}</span>
                          <span>{uiText(getSubmittedTotal(selectedCourse) !== null ? Math.round(getSubmittedTotal(selectedCourse)!) + '%' : 'Pending')}</span>
                        </div>
                        <div className="w-full">
                          <progress
                            className={`w-full h-3 rounded-full appearance-none bg-slate-800 ${getStatus(selectedCourse) === 'PASSED'
                              ? 'accent-emerald-400'
                              : getStatus(selectedCourse) === 'FAILED'
                                ? 'accent-rose-400'
                                : 'accent-amber-400'
                              }`}
                            value={selectedCourse.total !== null && selectedCourse.total !== undefined ? Math.min(100, Math.max(0, Number(selectedCourse.total))) : 0}
                            max={100}
                            title={uiText("Total score progress")}
                            aria-label={uiText("Total score progress")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
                <p className="font-bold text-lg">
                  {uiText(courses.length > 0
                    ? 'Please select a course to view the grade details.'
                    : 'No courses found for the selected Academic Year and Semester.')}
                </p>
              </div>
            )}
          </div>
        )
      ) : (
        // ACADEMIC HISTORY VIEW
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                <GraduationCap size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{uiText("Academic History")}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{uiText("Archive of verified results")}</p>
              </div>
            </div>

            {/* First Div: Year and Semester selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="history-year" className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">{uiText("Select Academic Year")}</label>
                <select
                  id="history-year"
                  title={uiText("Select Academic Year")}
                  aria-label={uiText("Select Academic Year")}
                  value={historyYear || ''}
                  onChange={(e) => {
                    setHistoryYear(e.target.value || null);
                    setHistoryData(null);
                  }}
                  className="w-full appearance-none px-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-slate-900 dark:text-white"
                >
                  <option value="">{uiText("-- Select Year --")}</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {gregorianToECYear(year)}{uiText(" E.C. (")}{uiText(year)}{uiText(")")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="history-semester" className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">{uiText("Select Semester")}</label>
                <select
                  id="history-semester"
                  title={uiText("Select Semester")}
                  aria-label={uiText("Select Semester")}
                  value={historySemester || ''}
                  onChange={(e) => {
                    setHistorySemester(e.target.value || null);
                    setHistoryData(null);
                  }}
                  disabled={!historyYear}
                  className="w-full appearance-none px-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                >
                  <option value="">{uiText("-- Select Semester --")}</option>
                  <option value="First Semester">{uiText("First Semester")}</option>
                  <option value="Second Semester">{uiText("Second Semester")}</option>
                </select>
              </div>
            </div>

            {/* Metrics Header */}
            {uiText(historyYear && historySemester && historyData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar size={16} className="text-blue-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Academic Year")}</span>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{uiText(historyYear)}</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <BookOpen size={16} className="text-purple-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Semester")}</span>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{uiText(historySemester)}</p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <GraduationCap size={16} className="text-emerald-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{uiText("Semester Average")}</span>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-white">
                    {uiText(typeof semesterAverage === 'number' ? `${semesterAverage}%` : semesterAverage)}
                  </p>
                </div>
              </div>
            ))}

            {/* Second Div: History Data Table with Subject and Total columns */}
            {historyLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : historyData && historyData.courses ? (
              <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{uiText("Course")}</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{uiText("Code")}</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">{uiText("Final Score")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {historyData.courses.map((course: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-800 dark:text-white">{course.name}</td>
                        <td className="px-8 py-5 text-slate-500 dark:text-slate-400 text-sm">{uiText(course.code || '—')}</td>
                        <td className="px-8 py-5 text-right">
                          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-black ${course.score_display === 'Pending' || course.score === null
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            }`}>
                            {uiText(course.score_display || (course.score !== null ? `${course.score}%` : 'Pending'))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : historyYear && historySemester ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <p className="font-medium">{uiText("No results found for the selected period.")}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <p className="font-medium">{uiText("Select both Academic Year and Semester to load results.")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
