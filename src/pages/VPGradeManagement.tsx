import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Download, BarChart3, Users, BookOpen, CheckCircle2 } from 'lucide-react';
import * as vicePrincipalService from '../services/vicePrincipalService';
import {
  getCurrentECYear,
  ecYearToGregorian,
  getCurrentSemester,
  formatSemester,
  getAvailableGregorianYears,
  gregorianToECYear,
} from '../utils/ethiopianCalendar';

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

interface Student {
  id: string;
  user_id: string;
  name: string;
  grade: string;
  section: string;
  enrollment_date: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  teacher_id?: string;
  teacher_name?: string;
}

interface StudentGrade {
  id: string;
  name: string;
  total?: number;
  average?: number;
  rank?: number;
  grades: Record<string, any>;
}

export const VPGradeManagement = () => {
  const { t } = useTranslation();
  const [grades, setGrades] = useState<VpGradeGroup[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<VpGradeGroup | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(() => ecYearToGregorian(getCurrentECYear()));
  const [selectedSemester, setSelectedSemester] = useState<string>(() => formatSemester(getCurrentSemester()));
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSectionData, setLoadingSectionData] = useState(false);
  const [generatingResults, setGeneratingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchGradesAndSections();
  }, []);

  const fetchGradesAndSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vicePrincipalService.getGradesAndSections();
      setGrades(
        (Array.isArray(data) ? data : []).map((grade: any) => ({
          id: grade.id,
          name: grade.name ?? grade.grade_name ?? 'Unnamed Grade',
          grade_name: grade.grade_name ?? grade.name,
          sections: Array.isArray(grade.sections) ? grade.sections : [],
        }))
      );
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch grades and sections';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSelect = useCallback(async (grade: VpGradeGroup, section: Section, yearOverride?: string, semOverride?: string) => {
    setSelectedGrade(grade.grade_name ?? grade.name);
    setSelectedGradeGroup(grade);
    setSelectedSection(section);
    setLoadingSectionData(true);

    const yearToUse = yearOverride ?? selectedYear;
    const semToUse = semOverride ?? selectedSemester;
    const semNum = semToUse === 'First Semester' ? 1 : 2;

    try {
      console.log(`[VPGradeManagement] Fetching data for section: ${section.id}, Year: ${yearToUse}, Semester: ${semNum} (${semToUse})`);

      const [studentsData, coursesData, gradesData] = await Promise.all([
        vicePrincipalService.getStudentsBySection(section.id, yearToUse),
        vicePrincipalService.getCoursesBySection(section.id),
        vicePrincipalService.getSectionGrades(section.id, yearToUse, semNum)
      ]);

      console.log(`[VPGradeManagement] Data fetched successfully - Students: ${studentsData.length}, Courses: ${coursesData.length}, Grades: ${gradesData.grades?.length || 0}`);

      setStudents(studentsData);
      setCourses(coursesData);
      setStudentGrades(gradesData.grades);

      // Check if data was fetched from a different semester
      if (gradesData.queriedSemester !== gradesData.availableDataSemester && gradesData.availableDataSemester) {
        const semesterName = gradesData.availableDataSemester === 1 ? 'First Semester' : 'Second Semester';
        showToast(`Note: Showing grades from ${semesterName} (no data for ${semToUse})`, 'success');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch section data';
      console.error(`[VPGradeManagement] Error fetching section data:`, err);
      showToast(message, 'error');
    } finally {
      setLoadingSectionData(false);
    }
  }, [selectedYear, selectedSemester]);

  const handleGradeSelect = useCallback((gradeName: string) => {
    const grade = grades.find((g) => g.grade_name === gradeName);
    if (!grade) {
      setSelectedGrade(null);
      setSelectedGradeGroup(null);
      setSelectedSection(null);
      setStudents([]);
      setCourses([]);
      setStudentGrades([]);
      return;
    }

    setSelectedGrade(grade.grade_name ?? grade.name);
    setSelectedGradeGroup(grade);
    setSelectedSection(null);
    setStudents([]);
    setCourses([]);
    setStudentGrades([]);

    if (grade.sections.length === 1) {
      handleSectionSelect(grade, grade.sections[0]);
    }
  }, [grades, handleSectionSelect]);

  const getExportPayload = () => {
    const headers = ['Student Name', ...courses.map(c => `${c.name}${c.teacher_name ? ` (${c.teacher_name})` : ''}`), 'Total', 'Average', 'Rank'];
    const rows = studentGrades.map((student) => [
      student.name,
      ...courses.map((course) => student.grades[course.id]?.score ?? ''),
      student.total !== undefined && student.total !== null ? student.total.toFixed(2) : '',
      student.average !== undefined && student.average !== null ? `${student.average.toFixed(2)}%` : '',
      student.rank ?? ''
    ]);

    return { headers, rows };
  };



  const exportToExcel = () => {
    if (!selectedSection || studentGrades.length === 0) return;

    const { headers, rows } = getExportPayload();
    const tableRows = [
      `<tr>${headers.map((header) => `<th style="border:1px solid #d1d5db;padding:8px;text-align:left;">${header}</th>`).join('')}</tr>`,
      ...rows.map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #d1d5db;padding:8px;">${String(cell)}</td>`).join('')}</tr>`)
    ].join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);

    const element = document.createElement('a');
    element.href = url;
    element.download = `${selectedGrade}-${selectedSection.section_name}-grades.xls`;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);

    showToast('Grades exported to Excel', 'success');
  };

  // Reload section grades whenever the year or semester filter changes
  useEffect(() => {
    if (selectedSection && selectedGradeGroup) {
      handleSectionSelect(selectedGradeGroup, selectedSection, selectedYear, selectedSemester);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedSemester]);

  const handleGenerateResults = async () => {
    if (!selectedSection) return;

    const semNum = selectedSemester === 'First Semester' ? 1 : 2;
    setGeneratingResults(true);
    try {
      const results = await vicePrincipalService.generateSectionResults(selectedSection.id, selectedYear, semNum);

      // Update the studentGrades with the calculated values
      const updatedGrades = studentGrades.map(sg => {
        const result = results.find((r: any) => r.student_id === sg.id);
        if (result) {
          return {
            ...sg,
            total: result.total,
            average: result.average,
            rank: result.rank
          };
        }
        return sg;
      });

      setStudentGrades(updatedGrades);
      showToast('Results generated successfully', 'success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to generate results';
      showToast(message, 'error');
    } finally {
      setGeneratingResults(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">Loading grade management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 px-4 sm:px-6 lg:px-8 max-w-[95vw] xl:max-w-[1400px] mx-auto">
      {/* Header */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.2),_transparent_50%)]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-2">{t("vp.gradeManagement", "Grade Management")}</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">{t("vp.studentGradeProcessing", "Student Grade Processing")}</h1>
          <p className="text-slate-400 text-sm max-w-2xl font-medium leading-relaxed">
            {t("vp.studentGradeProcessingDesc", "View student grades by class section, submit grades, and generate comprehensive result reports with totals, averages, and rankings.")}
          </p>
        </div>
      </section>

      {/* Academic Period Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-end">
          <div className="flex-1">
            <label htmlFor="vp-academic-year" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Academic Year
            </label>
            <div className="relative">
              <select
                id="vp-academic-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
              >
                {getAvailableGregorianYears().map((year) => {
                  const ecYear = gregorianToECYear(year);
                  return (
                    <option key={year} value={year}>
                      {ecYear} E.C. ({year})
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <label htmlFor="vp-semester" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Semester
            </label>
            <div className="relative">
              <select
                id="vp-semester"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
              >
                <option>First Semester</option>
                <option>Second Semester</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 flex items-end">
            <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-sm">
              <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">{t("vp.viewing", "Viewing")}</span>
              <p className="font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                {gregorianToECYear(selectedYear)} E.C. &bull; {selectedSemester}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Grade and Section Selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grade Dropdown */}
          <div>
            <label htmlFor="vp-grade" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Grade
            </label>
            <div className="relative">
              <select
                id="vp-grade"
                value={selectedGrade ?? ''}
                onChange={(e) => {
                  const gradeName = e.target.value;
                  if (gradeName) {
                    handleGradeSelect(gradeName);
                  } else {
                    setSelectedGrade(null);
                    setSelectedGradeGroup(null);
                    setSelectedSection(null);
                    setStudents([]);
                    setCourses([]);
                    setStudentGrades([]);
                  }
                }}
                className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10"
                title="Select a grade"
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
            <label htmlFor="vp-section" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Section
            </label>
            <div className="relative">
              <select
                id="vp-section"
                value={selectedSection?.id ?? ''}
                onChange={(e) => {
                  const sectionId = e.target.value;
                  if (sectionId && selectedGradeGroup) {
                    const section = selectedGradeGroup.sections.find((s) => s.id === sectionId);
                    if (section) {
                      handleSectionSelect(selectedGradeGroup, section);
                    }
                  } else {
                    setSelectedSection(null);
                    setStudents([]);
                    setCourses([]);
                    setStudentGrades([]);
                  }
                }}
                disabled={!selectedGradeGroup}
                className="w-full appearance-none px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Select a section (choose a grade first)"
              >
                <option value="">
                  {selectedGradeGroup ? t('vp.selectSection', 'Select Section') : t('vp.chooseGradeFirst', 'Choose Grade First')}
                </option>
                {selectedGradeGroup?.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.section_name} ({section.student_count}/{section.capacity})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {selectedSection && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Users className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{t("vp.totalStudents", "Total Students")}</p>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{students.length}</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                  <BookOpen className="text-emerald-600 dark:text-emerald-400" size={18} />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{t("vp.totalCourses", "Total Courses")}</p>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{courses.length}</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="text-purple-600 dark:text-purple-400" size={18} />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{t("vp.gradesSubmitted", "Grades Submitted")}</p>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {studentGrades.filter(sg => Object.keys(sg.grades).length > 0).length}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{t("vp.gradeActions", "Grade Actions")}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("vp.processCalculateGrades", "Process and calculate grades for this section")}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateResults}
                  disabled={generatingResults || students.length === 0}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/10"
                >
                  {generatingResults ? t('schedule.generating', 'Generating...') : t('vp.generateResults', 'Generate Results')}
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={studentGrades.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/10"
                >
                  <Download size={16} />
                  {t("vp.exportExcel", "Export Excel")}
                </button>
              </div>
            </div>
          </div>

          {/* Grades Table */}
          {loadingSectionData ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">Loading grades...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{t("vp.studentName", "Student Name")}</th>
                    {courses.map((course) => (
                      <th key={course.id} className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap">
                        <div>{course.name}</div>
                        {course.teacher_name && (
                          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {course.teacher_name}
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{t("vp.total", "Total")}</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{t("vp.average", "Average")}</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{t("vp.rank", "Rank")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {studentGrades.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-white">{student.name}</div>
                      </td>
                      {courses.map((course) => (
                        <td key={course.id} className="px-4 py-4 text-center">
                          {student.grades[course.id] ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-semibold text-slate-800 dark:text-white">
                                {student.grades[course.id].score}
                              </span>
                              {student.grades[course.id].score && (
                                <CheckCircle2 className="text-emerald-500" size={14} />
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-center font-semibold text-slate-800 dark:text-white">
                        {student.total ? student.total.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-800 dark:text-white">
                        {student.average ? `${student.average.toFixed(2)}%` : '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {student.rank ? (
                          <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-bold">
                            {student.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {studentGrades.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400">{t("vp.noGradesSection", "No grades found for this section")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${toast.type === 'success'
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
