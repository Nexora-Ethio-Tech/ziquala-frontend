import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronRight, ChevronDown, Download, FileText, Loader2, Printer, Search, Users, X } from 'lucide-react';
import * as vicePrincipalService from '../services/vicePrincipalService';
import { TranscriptTemplate, TranscriptTemplateData } from '../components/TranscriptTemplate';
import {
  getCurrentECYear,
  getCurrentSemester,
  formatSemester,
  getAvailableGregorianYears,
  gregorianToECYear,
  ecYearToGregorian
} from '../utils/ethiopianCalendar';

type GradeSection = {
  grade_name: string;
  sections: Array<{
    id: string;
    section_name: string;
    student_count: number;
    capacity: number;
  }>;
};

type StudentSearchResult = {
  id: string;
  name: string;
  digitalId?: string;
  username?: string;
  grade: string;
  section: string;
};

type TranscriptCourse = {
  courseId: string;
  courseName: string;
  grades: Array<{ percentage?: number }>;
};

type StudentTranscript = {
  studentId: string;
  studentName: string;
  className?: string;
  section?: string;
  overallAverage?: number;
  academicYear?: string;
  semester?: string;
  overallRank?: string | number;
  courses: TranscriptCourse[];
};

const buildFallbackTemplate = (label: string): TranscriptTemplateData => ({
  name: label || 'Unknown Student',
  id: label || 'N/A',
  academicYear: 'N/A',
  semester: 'N/A',
  subjects: [{ name: 'No grades found', mark: 0, grade: '0' }],
  average: 0,
  rank: 0
});

export const VPTranscripts = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupLabel, setLookupLabel] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [gradeGroups, setGradeGroups] = useState<GradeSection[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [sectionStudents, setSectionStudents] = useState<StudentSearchResult[]>([]);
  const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [loadingSectionStudents, setLoadingSectionStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(() => ecYearToGregorian(getCurrentECYear()));
  const [selectedSemester, setSelectedSemester] = useState<string>(() => formatSemester(getCurrentSemester()));
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        setLoadingHierarchy(true);
        const groups = await vicePrincipalService.getGradesAndSections();
        setGradeGroups(groups || []);
      } catch (err: any) {
        console.error('Failed to load grade hierarchy:', err);
        setError(err.response?.data?.error?.message || 'Failed to load grades and sections');
      } finally {
        setLoadingHierarchy(false);
      }
    };

    loadHierarchy();
  }, []);

  useEffect(() => {
    if (!selectedGrade && gradeGroups.length > 0) {
      setSelectedGrade(gradeGroups[0].grade_name);
    }
  }, [gradeGroups, selectedGrade]);

  useEffect(() => {
    const selectedGradeGroup = gradeGroups.find((group) => group.grade_name === selectedGrade);
    if (!selectedGradeGroup) {
      setSelectedSection('');
      setSectionStudents([]);
      return;
    }

    const firstSection = selectedGradeGroup.sections[0];
    if (firstSection && !selectedSection) {
      setSelectedSection(firstSection.id);
    }
  }, [gradeGroups, selectedGrade, selectedSection]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedSection) {
        setSectionStudents([]);
        return;
      }

      try {
        setLoadingSectionStudents(true);
        const students = await vicePrincipalService.getStudentsBySection(selectedSection, selectedYear);
        setSectionStudents(students || []);
      } catch (err: any) {
        console.error('Failed to load section students:', err);
        setError(err.response?.data?.error?.message || 'Failed to load section students');
        setSectionStudents([]);
      } finally {
        setLoadingSectionStudents(false);
      }
    };

    loadStudents();
  }, [selectedSection, selectedYear]);

  const openTranscript = async (lookupValue: string, displayLabel?: string) => {
    const trimmedLookup = lookupValue.trim();
    if (!trimmedLookup) return;

    try {
      setLoading(true);
      setError(null);
      setLookupLabel(displayLabel || trimmedLookup);
      setActiveStudentId(trimmedLookup);
      const semNum = selectedSemester === 'First Semester' ? 1 : 2;
      const data = await vicePrincipalService.getStudentTranscript(trimmedLookup, selectedYear, semNum);
      setTranscript(data as StudentTranscript);
    } catch (err: any) {
      console.error('Transcript fetch failed:', err);
      setTranscript(null);
      setLookupLabel(displayLabel || trimmedLookup);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    try {
      setSearching(true);
      setError(null);
      setLookupLabel(query);
      const results = await vicePrincipalService.searchStudents(query);
      setSearchResults(results || []);

      if (results.length === 1) {
        const single = results[0];
        await openTranscript(single.digitalId || single.id, single.name);
      } else {
        setTranscript(null);
        setActiveStudentId(null);
      }
    } catch (err: any) {
      console.error('Student search failed:', err);
      setSearchResults([]);
      setTranscript(null);
      setActiveStudentId(null);
      setLookupLabel(query);
      setError(null);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (activeStudentId) {
      const activeName = transcript?.studentName || lookupLabel;
      openTranscript(activeStudentId, activeName);
    }
  }, [selectedYear, selectedSemester]);

  const templateData = useMemo<TranscriptTemplateData | null>(() => {
    if (transcript) {
      const subjects = transcript.courses.map((course) => {
        const grades = course.grades || [];
        const courseAverage = grades.length
          ? Math.round(grades.reduce((sum, grade) => sum + Number(grade.percentage || 0), 0) / grades.length)
          : 0;

        return {
          name: course.courseName,
          mark: courseAverage,
          grade: courseAverage >= 90 ? 'A+' : courseAverage >= 80 ? 'A' : courseAverage >= 70 ? 'B' : courseAverage >= 60 ? 'C' : 'D'
        };
      });

      return {
        name: transcript.studentName || lookupLabel || 'Unknown Student',
        id: transcript.studentId || lookupLabel || 'N/A',
        academicYear: transcript.academicYear || 'N/A',
        semester: transcript.semester || 'N/A',
        subjects: subjects.length > 0 ? subjects : [{ name: 'No grades found', mark: 0, grade: '0' }],
        average: transcript.overallAverage != null ? Math.round(transcript.overallAverage) : 0,
        rank: transcript.overallRank ?? 0
      };
    }

    if (lookupLabel) {
      return buildFallbackTemplate(lookupLabel);
    }

    return null;
  }, [lookupLabel, transcript]);

  const printTranscript = () => {
    // `transcript-print` class and print CSS ensure only the transcript is visible when printing
    window.print();
  };

  const currentGradeGroup = gradeGroups.find((group) => group.grade_name === selectedGrade);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const styleId = 'transcript-print-style';
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `@page { size: A4; margin: 8mm; }
        @media print {
          body, html { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .transcript-print, .transcript-print * { visibility: visible !important; }
          .transcript-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          .transcript-print img { max-width: 100% !important; height: auto !important; }
          .transcript-print table, .transcript-page { page-break-inside: avoid !important; }
          .transcript-print table th, .transcript-print table td { padding: 0.35rem !important; font-size: 9px !important; }
          .transcript-print h1 { font-size: 20px !important; }
          .transcript-print h2 { font-size: 14px !important; }
          .transcript-print p, .transcript-print span, .transcript-print td, .transcript-print th { font-size: 10px !important; line-height: 1.2 !important; }
          .transcript-print .grid { gap: 0.5rem !important; }
          .transcript-print .border-2 { border-width: 1px !important; }
          .transcript-print .p-6 { padding: 0.75rem !important; }
          .transcript-print .p-4 { padding: 0.5rem !important; }
          .transcript-print .p-3 { padding: 0.35rem !important; }
          .transcript-print .p-2 { padding: 0.25rem !important; }
        }`;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t("vp.studentTranscripts", "Student Transcripts")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search by name, digital ID, username, or browse grade, section, and student lists.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={printTranscript}
            disabled={!templateData}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={() => {
              setTranscript(null);
              setSearchResults([]);
              setLookupLabel('Blank Template');
              setSearchQuery('');
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download size={16} />
            Blank Template
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t("vp.searchStudentPlaceholder", "Search student by name or ID")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={searching}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {searching ? 'Searching...' : 'Search'}
            </button>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Search Results</p>
                {searchResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => openTranscript(student.digitalId || student.id, student.name)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {student.digitalId || student.id} · {student.grade} · {student.section}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">Grade & Section</h2>
            </div>

            {loadingHierarchy ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading grades...
              </div>
            ) : gradeGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No grades available for this branch.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Academic Year Dropdown */}
                <div>
                  <label htmlFor="vp-transcript-year" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Academic Year
                  </label>
                  <div className="relative">
                    <select
                      id="vp-transcript-year"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer pr-10"
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

                {/* Semester Dropdown */}
                <div>
                  <label htmlFor="vp-transcript-semester" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Semester
                  </label>
                  <div className="relative">
                    <select
                      id="vp-transcript-semester"
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer pr-10"
                    >
                      <option>First Semester</option>
                      <option>Second Semester</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Grade Dropdown */}
                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Grade
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGrade}
                      onChange={(e) => {
                        const gradeName = e.target.value;
                        if (gradeName) {
                          setSelectedGrade(gradeName);
                          const gradeGroup = gradeGroups.find((g) => g.grade_name === gradeName);
                          if (gradeGroup && gradeGroup.sections.length > 0) {
                            setSelectedSection(gradeGroup.sections[0].id);
                          }
                        }
                      }}
                      title="Select a grade level"
                      className="w-full appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer pr-10"
                    >
                      <option value="">Select Grade</option>
                      {gradeGroups.map((group) => (
                        <option key={group.grade_name} value={group.grade_name}>
                          {group.grade_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Section Dropdown */}
                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Section
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      disabled={!selectedGrade}
                      title="Select a section (choose a grade first)"
                      className="w-full appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {selectedGrade ? 'Select Section' : 'Choose Grade First'}
                      </option>
                      {selectedGrade &&
                        gradeGroups
                          .find((g) => g.grade_name === selectedGrade)
                          ?.sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.section_name} ({section.student_count}/{section.capacity})
                            </option>
                          ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">Students</h2>
              </div>
              {selectedSection && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{selectedSection}</span>
              )}
            </div>

            {loadingSectionStudents ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading students...
              </div>
            ) : sectionStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No students found for this section.
              </div>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {sectionStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => openTranscript(student.digitalId || student.id, student.name)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{student.digitalId || student.id}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {!templateData ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <FileText className="mx-auto mb-4 h-16 w-16 text-slate-400" />
              Search for a student or select one from the grade hierarchy to load a transcript.
            </div>
          ) : (
            <div ref={transcriptRef} className="transcript-print overflow-x-auto rounded-[2rem] border border-slate-200 bg-slate-100 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950 print:border-0 print:bg-white print:p-0 print:shadow-none">
              <TranscriptTemplate studentData={templateData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
