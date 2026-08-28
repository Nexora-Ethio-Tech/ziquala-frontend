import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Clock, BookOpen, Users, Search, Save, X, Settings2, LayoutGrid, ArrowLeft, ChevronDown, Zap, CheckCircle2, Loader2, AlertTriangle, Eye } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  getBranchTeachers,
  getBranchClasses,
  saveScheduleConfig,
  getScheduleConfig,
  saveTeacherConstraints as saveTeacherConstraintsApi,
  getTeacherConstraintsApi,
  saveCourseFrequencies as saveCourseFrequenciesApi,
  getCourseFrequencies as getCourseFrequenciesApi,
  saveScheduleStructure,
  getScheduleStructure,
  generateTimetable,
  approveScheduleCandidate,
  type ScheduleCandidate,
  type GenerateTimetableResult,
  type ClassRecord,
  type StructureRowInput
} from '../services/schoolAdminService';
import { TimetableStructureEditor } from '../components/TimetableStructureEditor';

interface CourseFrequency {
  id: string;
  subject: string;
  sessions: string;
}

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  subjects: string[];
}

interface StructureRow {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
  sessionsPerWeek: number;
}

export const ScheduleBuilder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [numClasses, setNumClasses] = useState(12);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [frequencies, setFrequencies] = useState<CourseFrequency[]>([
    { id: '1', subject: 'Mathematics', sessions: '5 sessions/week' }
  ]);

  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('15:30');
  const [maxConsecutive, setMaxConsecutive] = useState(3);
  const [distributeSubjects, setDistributeSubjects] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherConstraints, setTeacherConstraints] = useState<Record<string, number[]>>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [structureRows, setStructureRows] = useState<StructureRow[]>([]);
  const [savingStructure, setSavingStructure] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Collapsible section states
  const [isParamsExpanded, setIsParamsExpanded] = useState(true);
  const [isTeachersExpanded, setIsTeachersExpanded] = useState(false);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  const [isStructureExpanded, setIsStructureExpanded] = useState(false);
  const [isResultsExpanded, setIsResultsExpanded] = useState(false);

  // Helper to toggle one section and collapse others. Clicking the same section toggles it.
  const toggleSection = (section: 'params' | 'teachers' | 'rules' | 'structure' | 'results') => {
    setIsParamsExpanded(prev => (section === 'params' ? !prev : false));
    setIsTeachersExpanded(prev => (section === 'teachers' ? !prev : false));
    setIsRulesExpanded(prev => (section === 'rules' ? !prev : false));
    setIsStructureExpanded(prev => (section === 'structure' ? !prev : false));
    setIsResultsExpanded(prev => (section === 'results' ? !prev : false));
  };

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateTimetableResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  // Saving states
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingConstraints, setSavingConstraints] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1);

  const refreshClassesFromDb = useCallback(async () => {
    const cls = await getBranchClasses();
    const classesData = cls || [];
    setClasses(classesData as ClassRecord[]);
  }, []);

  const refreshStructureFromDb = useCallback(async () => {
    const struct = await getScheduleStructure();
    const structData = struct?.data || struct || [];
    if (Array.isArray(structData)) {
      setStructureRows(structData.map((s: any) => ({
        id: s.id || Date.now().toString(),
        classId: s.classId || s.class_id || s.class || '',
        teacherId: s.teacherId || s.teacher_id || s.teacher || '',
        subject: s.subject || s.course || '',
        sessionsPerWeek: s.sessionsPerWeek || s.sessions_per_week || s.sessions || 3
      })));
    }
  }, []);

  // Load teachers from API
  useEffect(() => {
    const loadClassesAndStructure = async () => {
      try {
        setLoadingClasses(true);
        await refreshClassesFromDb();
      } catch (err) {
        console.error('Failed to load classes:', err);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }

      try {
        await refreshStructureFromDb();
      } catch (err) {
        // no saved structure yet
      }
    };

    loadClassesAndStructure();
  }, [refreshClassesFromDb, refreshStructureFromDb]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingTeachers(true);
        const response = await getBranchTeachers();
        console.log('getBranchTeachers response:', response);
        const teachersData = response?.data || response || [];
        console.log('teachersData before mapping:', teachersData);

        // Map to expected format
        const mapped = teachersData.map((t: any) => ({
          id: t.teacher_id || t.id,
          teacher_id: t.teacher_id || t.id,
          name: t.name || t.full_name || 'Unknown',
          subjects: t.subjects || []
        }));

        console.log('mapped teachers:', mapped);
        setTeachers(mapped);
      } catch (err) {
        console.error('Failed to load teachers:', err);
        setTeachers([]);
      } finally {
        setLoadingTeachers(false);
      }
    };

    loadData();
  }, []);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getScheduleConfig();
        if (config) {
          setPeriodsPerDay(config.periodsPerDay || (config as any).periods_per_day || 8);
          setStartTime(config.startTime || (config as any).start_time || '08:00');
          setEndTime(config.endTime || (config as any).end_time || '15:30');
          setMaxConsecutive(config.maxConsecutivePeriods || (config as any).max_consecutive_periods || 3);
          setDistributeSubjects(config.distributeSubjects ?? (config as any).distribute_subjects ?? true);
        }
      } catch (err) {
        // No config yet, keep defaults
      }
    };
    loadConfig();
  }, []);

  // Load teacher constraints on mount
  useEffect(() => {
    const loadConstraints = async () => {
      try {
        const constraints = await getTeacherConstraintsApi();
        if (Array.isArray(constraints)) {
          const mapped: Record<string, number[]> = {};
          for (const c of constraints) {
            const key = `${c.teacher_id}-${c.day_of_week}`;
            if (!mapped[key]) mapped[key] = [];
            mapped[key].push(c.period_number);
          }
          setTeacherConstraints(mapped);
        }
      } catch (err) {
        // No constraints yet
      }
    };
    loadConstraints();
  }, []);

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUnavailability = (day: string, period: number) => {
    if (!selectedTeacher) return;
    const key = `${selectedTeacher.id}-${day}`;
    const current = teacherConstraints[key] || [];
    const updated = current.includes(period)
      ? current.filter(p => p !== period)
      : [...current, period];
    setTeacherConstraints({ ...teacherConstraints, [key]: updated });
  };

  const addFrequency = () => {
    setFrequencies([...frequencies, { id: Date.now().toString(), subject: '', sessions: '5 sessions/week' }]);
  };

  const removeFrequency = (id: string) => {
    setFrequencies(frequencies.filter(f => f.id !== id));
  };

  const addStructureRow = () => {
    setStructureRows(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        classId: classes[0]?.id || '',
        teacherId: teachers[0]?.id || '',
        subject: '',
        sessionsPerWeek: 3
      }
    ]);
  };

  const removeStructureRow = (id: string) => {
    setStructureRows(prev => prev.filter(row => row.id !== id));
  };

  const updateStructureRow = (id: string, changes: Partial<StructureRow>) => {
    setStructureRows(prev => prev.map(row => row.id === id ? { ...row, ...changes } : row));
  };

  const handleSaveStructure = useCallback(async () => {
    if (structureRows.length === 0) {
      alert('Add at least one timetable structure row before saving.');
      return;
    }

    for (const row of structureRows) {
      if (!row.classId || !row.teacherId || !row.subject || row.sessionsPerWeek < 1) {
        alert('Please complete all timetable structure rows before saving.');
        return;
      }
    }

    try {
      setSavingStructure(true);
      await saveScheduleStructure(
        structureRows.map(row => ({
          classId: row.classId,
          teacherId: row.teacherId,
          subject: row.subject,
          sessionsPerWeek: row.sessionsPerWeek
        }))
      );
      alert('Timetable structure saved successfully.');
    } catch (err: any) {
      console.error('Failed to save schedule structure:', err);
      alert('Unable to save timetable structure. Please try again.');
    } finally {
      setSavingStructure(false);
    }
  }, [structureRows]);

  // Save config to API
  const handleSaveConfig = useCallback(async () => {
    try {
      setSavingConfig(true);
      await saveScheduleConfig({
        periodsPerDay,
        startTime,
        endTime,
        maxConsecutivePeriods: maxConsecutive,
        distributeSubjects
      });
    } catch (err: any) {
      console.error('Failed to save config:', err);
      const errorObj = err.response?.data?.error;
      if (errorObj?.code === 'VALIDATION_ERROR' && Array.isArray(errorObj?.details)) {
        alert(`Failed to save config: ${errorObj.details.join(', ')}`);
      }
    } finally {
      setSavingConfig(false);
    }
  }, [periodsPerDay, startTime, endTime, maxConsecutive, distributeSubjects]);

  // Save teacher constraints to API
  const handleSaveConstraints = useCallback(async () => {
    if (!selectedTeacher) return;
    try {
      setSavingConstraints(true);
      // Extract constraints for this teacher
      const constraints: Array<{ dayOfWeek: string; periodNumber: number }> = [];
      for (const day of days) {
        const key = `${selectedTeacher.id}-${day}`;
        const blockedPeriods = teacherConstraints[key] || [];
        for (const period of blockedPeriods) {
          constraints.push({ dayOfWeek: day, periodNumber: period });
        }
      }
      await saveTeacherConstraintsApi(selectedTeacher.id, constraints);
    } catch (err: any) {
      console.error('Failed to save constraints:', err);
      const errorObj = err.response?.data?.error;
      if (errorObj?.code === 'VALIDATION_ERROR' && Array.isArray(errorObj?.details)) {
        alert(`Failed to save constraints: ${errorObj.details.join(', ')}`);
      }
    } finally {
      setSavingConstraints(false);
    }
  }, [selectedTeacher, teacherConstraints, days]);

  // Generate timetable
  const handleGenerate = useCallback(async () => {
    try {
      if (structureRows.length === 0 && classes.length === 0) {
        const warning = 'No timetable structure or class information is available. Please define timetable structure and add classes before generating.';
        setGenerationError(warning);
        setIsResultsExpanded(true);
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);
      setGenerationResult(null);
      setApprovalSuccess(null);

      // Save config first
      await saveScheduleConfig({
        periodsPerDay,
        startTime,
        endTime,
        maxConsecutivePeriods: maxConsecutive,
        distributeSubjects
      });

      if (structureRows.length > 0) {
        await saveScheduleStructure(
          structureRows.map(row => ({
            classId: row.classId,
            teacherId: row.teacherId,
            subject: row.subject,
            sessionsPerWeek: row.sessionsPerWeek
          }))
        );
      }

      const result = await generateTimetable();
      setGenerationResult(result);
      setIsResultsExpanded(true);
      setExpandedCandidate(0); // Expand the first candidate
      // Collapse other sections
      setIsParamsExpanded(false);
      setIsTeachersExpanded(false);
      setIsRulesExpanded(false);
      setIsStructureExpanded(false);
    } catch (err: any) {
      const errorObj = err.response?.data?.error;
      let msg = errorObj?.message || err.message || 'Generation failed';

      if (msg.includes('No timetable structure or courses found')) {
        msg = 'No timetable structure or course assignments were found. Please define the timetable structure and save it before generating the timetable.';
      }

      // Handle validation errors specifically (Joi details array)
      if (errorObj?.code === 'VALIDATION_ERROR' && Array.isArray(errorObj?.details)) {
        msg = `Validation failed: ${errorObj.details.join(', ')}`;
      }

      setGenerationError(msg);
      setIsResultsExpanded(true);
    } finally {
      setIsGenerating(false);
    }
  }, [periodsPerDay, startTime, endTime, maxConsecutive, distributeSubjects, structureRows, classes]);

  // Approve a candidate
  const handleApprove = useCallback(async (candidateIndex: number) => {
    if (!generationResult) return;
    try {
      setIsApproving(true);
      const result = await approveScheduleCandidate(generationResult.runId, candidateIndex);
      setApprovalSuccess(result.message || 'Schedule approved and published!');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Approval failed';
      setGenerationError(msg);
    } finally {
      setIsApproving(false);
    }
  }, [generationResult]);

  // Render a candidate timetable preview
  const renderCandidatePreview = (candidate: ScheduleCandidate) => {
    // Group entries by class for a compact grid view
    const classDayPeriods = new Map<string, Map<string, Map<number, { subject: string; teacher: string }>>>();

    for (const entry of candidate.entries) {
      if (!classDayPeriods.has(entry.className)) {
        classDayPeriods.set(entry.className, new Map());
      }
      const classDays = classDayPeriods.get(entry.className)!;
      if (!classDays.has(entry.day)) {
        classDays.set(entry.day, new Map());
      }
      classDays.get(entry.day)!.set(entry.period, {
        subject: entry.subject,
        teacher: entry.teacherName
      });
    }

    const classNames = Array.from(classDayPeriods.keys()).sort();

    return (
      <div className="space-y-4">
        {classNames.map(className => (
          <div key={className}>
            <h5 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2">{className}</h5>
            <div className="overflow-x-auto">
              <div
                className="min-w-[700px] grid gap-1"
                style={{ gridTemplateColumns: `90px repeat(${periodsPerDay}, minmax(0, 1fr))` }}
              >
                <div />
                {periods.map(p => (
                  <div key={p} className="text-center text-[9px] font-black text-slate-400 uppercase pb-1">
                    P{p}
                  </div>
                ))}

                {days.map(day => (
                  <div key={day} className="contents">
                    <div className="flex items-center text-[10px] font-black text-slate-500 uppercase">
                      {day.substring(0, 3)}
                    </div>
                    {periods.map(period => {
                      const entry = classDayPeriods.get(className)?.get(day)?.get(period);
                      return (
                        <div
                          key={`${day}-${period}`}
                          className={`h-10 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${entry
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
                            }`}
                        >
                          {entry ? (
                            <>
                              <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 truncate max-w-full px-1">
                                {entry.subject.length > 8 ? entry.subject.substring(0, 8) + '…' : entry.subject}
                              </span>
                              <span className="text-[7px] text-slate-400 dark:text-slate-500 truncate max-w-full px-1">
                                {entry.teacher.split(' ').pop()}
                              </span>
                            </>
                          ) : (
                            <span className="text-[8px] text-slate-300">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation & Breadcrumbs */}
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold uppercase tracking-widest outline-none self-start"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* Main Architect Container */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 transition-colors duration-300">

        {/* Main Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b dark:border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t("schedule.architectTitle", "Schedule Architect")}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 uppercase font-bold tracking-widest">{t("schedule.standards", "Ethiopian High School Standards")}</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:scale-100 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t("schedule.generating", "Generating...")}
              </>
            ) : (
              <>
                <Zap size={18} />
                {t("schedule.generateTimetable", "Generate Timetable")}
              </>
            )}
          </button>
        </div>

        {/* Approval success banner */}
        {approvalSuccess && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl animate-in fade-in zoom-in-95">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={22} />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{approvalSuccess}</p>
          </div>
        )}

        {/* SECTION 4: Generated Results (Collapsible) — shown at top when available */}
        {(generationResult || generationError) && (
          <div className="bg-slate-50/30 dark:bg-slate-900/10 rounded-3xl border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
            <button
              onClick={() => toggleSection('results')}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-left transition-colors outline-none"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${generationError ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                  {generationError ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    {generationError ? 'Generation Failed' : `${generationResult!.candidateCount} Candidate${generationResult!.candidateCount !== 1 ? 's' : ''} Generated`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {generationError ? 'Review constraints and try again' : 'Select a timetable to approve and publish'}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={20}
                className={`text-slate-400 transform transition-transform duration-300 ${isResultsExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${isResultsExpanded ? 'max-h-[3000px] opacity-100 border-t border-slate-100 dark:border-slate-800 p-6 md:p-8' : 'max-h-0 opacity-0'
                }`}
            >
              {generationError ? (
                <div className="flex items-center gap-3 p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-2xl">
                  <AlertTriangle className="text-rose-500 flex-shrink-0" size={24} />
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{generationError}</p>
                </div>
              ) : generationResult && (
                <div className="space-y-4">
                  {generationResult.candidates.map((candidate, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                      {/* Candidate header */}
                      <div
                        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        onClick={() => setExpandedCandidate(expandedCandidate === idx ? null : idx)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black flex items-center justify-center text-lg">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 dark:text-white">
                              Option {idx + 1}
                            </h4>
                            <p className="text-xs text-slate-400 font-bold">
                              {candidate.slotsFilled}/{candidate.totalSlots} slots filled • {candidate.fillRate} coverage
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!approvalSuccess && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(idx); }}
                              disabled={isApproving}
                              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all hover:scale-105 active:scale-95"
                            >
                              {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Approve & Publish
                            </button>
                          )}
                          <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                            <Eye size={18} />
                          </button>
                          <ChevronDown
                            size={18}
                            className={`text-slate-400 transform transition-transform ${expandedCandidate === idx ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Expanded candidate view */}
                      {expandedCandidate === idx && (
                        <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/30 dark:bg-slate-800/10">
                          {renderCandidatePreview(candidate)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 1: Core Parameters (Collapsible) */}
        <div className="bg-slate-50/30 dark:bg-slate-900/10 rounded-3xl border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
          <button
            onClick={() => toggleSection('params')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-left transition-colors outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Settings2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">{t("schedule.coreParameters", "1. Core Parameters")}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t("schedule.coreParametersDesc", "School capacity, teaching hours, and period definitions")}</p>
              </div>
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-400 transform transition-transform duration-300 ${isParamsExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${isParamsExpanded ? 'max-h-[800px] opacity-100 border-t border-slate-100 dark:border-slate-800 p-6 md:p-8' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* School Capacity */}
              <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 space-y-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest">
                  <LayoutGrid size={16} />
                  <span>{t("schedule.schoolCapacity", "School Capacity")}</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{t("schedule.totalClasses", "Total Classes / Sections")}</label>
                  <input
                    type="number"
                    className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-950 rounded-2xl text-xl font-black outline-none focus:ring-4 focus:ring-blue-500/20 dark:text-white"
                    value={numClasses}
                    onChange={(e) => setNumClasses(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* School Day Parameters */}
              <div className="p-6 bg-slate-100/40 dark:bg-slate-800/20 rounded-2xl border border-slate-200/50 dark:border-slate-850 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest">
                    <Clock size={16} />
                    <span>{t("schedule.schoolDayParameters", "School Day Parameters")}</span>
                  </div>
                  <button
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all"
                  >
                    {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {t("schedule.saveConfig", "Save Config")}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{t("schedule.startTime", "Start Time")}</label>
                    <input
                      type="time"
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{t("schedule.endTime", "End Time")}</label>
                    <input
                      type="time"
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white focus:ring-2 focus:ring-blue-500"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  {/* Periods selector dropdown (single input control) */}
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{t("schedule.periodsPerDay", "Periods per Day")}</label>
                    <select
                      value={periodsPerDay}
                      onChange={(e) => setPeriodsPerDay(parseInt(e.target.value))}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {[5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{n} Periods per Day</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Teacher Constraints (Collapsible) */}
        <div className="bg-slate-50/30 dark:bg-slate-900/10 rounded-3xl border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
          <button
            onClick={() => toggleSection('teachers')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-left transition-colors outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Users size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">{t("schedule.teacherConstraints", "2. Teacher Constraints")}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t("schedule.teacherConstraintsDesc", "Individual weekly unavailability and session blocking")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {loadingTeachers ? '...' : t('schedule.teachersCount', { count: teachers.length, defaultValue: `${teachers.length} teachers` })}
              </span>
              <ChevronDown
                size={20}
                className={`text-slate-400 transform transition-transform duration-300 ${isTeachersExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${isTeachersExpanded ? 'max-h-[1200px] opacity-100 border-t border-slate-100 dark:border-slate-800 p-6 md:p-8 bg-rose-50/10 dark:bg-rose-950/5' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b dark:border-slate-800 mb-6">
              <h4 className="text-xl font-bold text-slate-850 dark:text-white">{t("schedule.selectTeacherBlockSlots", "Select Teacher & Block Slots")}</h4>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={t("schedule.searchTeacher", "Search teacher...")}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Teacher List */}
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700 p-2 max-h-[400px] overflow-y-auto">
                {loadingTeachers ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                  </div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm font-bold">No teachers found</div>
                ) : (
                  filteredTeachers.map(teacher => (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${selectedTeacher?.id === teacher.id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                          : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedTeacher?.id === teacher.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-900'
                          }`}
                      >
                        {teacher.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">{teacher.name}</p>
                        <p
                          className={`text-[10px] uppercase tracking-tighter font-black ${selectedTeacher?.id === teacher.id ? 'text-blue-100' : 'text-slate-400'
                            }`}
                        >
                          {(teacher.subjects || []).join(' • ') || 'No subjects'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Unavailability Grid */}
              <div className="xl:col-span-3">
                {selectedTeacher ? (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                          <LayoutGrid size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-lg text-slate-800 dark:text-white">{selectedTeacher.name}</h4>
                          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">{t("schedule.weeklySessionBlocking", "Weekly Session Blocking")}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleSaveConstraints}
                        disabled={savingConstraints}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase hover:bg-emerald-700 transition-all disabled:bg-emerald-400"
                      >
                        {savingConstraints ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {t("schedule.saveConstraints", "Save Constraints")}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <div
                        className="min-w-[600px] grid gap-2"
                        style={{ gridTemplateColumns: `100px repeat(${periodsPerDay}, minmax(0, 1fr))` }}
                      >
                        <div />
                        {periods.map(p => (
                          <div key={p} className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase pb-2">
                            Period {p}
                          </div>
                        ))}

                        {days.map(day => (
                          <div key={day} className="contents">
                            <div className="flex items-center text-xs font-black text-slate-600 dark:text-slate-400 uppercase">
                              {day}
                            </div>
                            {periods.map(period => {
                              const isBlocked = teacherConstraints[`${selectedTeacher.id}-${day}`]?.includes(period);
                              return (
                                <button
                                  key={`${day}-${period}`}
                                  onClick={() => toggleUnavailability(day, period)}
                                  className={`h-11 rounded-xl border transition-all flex items-center justify-center font-bold text-sm ${isBlocked
                                      ? 'bg-rose-500 border-rose-650 text-white shadow-md shadow-rose-550/20'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-400'
                                    }`}
                                >
                                  {isBlocked ? <X size={14} /> : period}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-rose-200/50 dark:border-rose-900/20 rounded-2xl p-12 text-center bg-white/30 dark:bg-slate-900/30">
                    <Users className="text-rose-200 dark:text-rose-900/20 mb-4" size={54} />
                    <h4 className="text-lg font-black text-slate-400">{t("schedule.noTeacherSelected", "No Teacher Selected")}</h4>
                    <p className="text-sm text-slate-400 max-w-xs mt-2 font-medium">{t("schedule.noTeacherSelectedDesc", "Choose a teacher from the list to configure their weekly unavailability sessions.")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Pedagogical Rules (Collapsible) */}
        <div className="bg-slate-50/30 dark:bg-slate-900/10 rounded-3xl border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
          <button
            onClick={() => toggleSection('rules')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-left transition-colors outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                <BookOpen size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">{t("schedule.pedagogicalRules", "3. Pedagogical Rules")}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t("schedule.pedagogicalRulesDesc", "Consecutive period limits and subject distribution")}</p>
              </div>
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-400 transform transition-transform duration-300 ${isRulesExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${isRulesExpanded ? 'max-h-[420px] opacity-100 border-t border-slate-100 dark:border-slate-800 p-6 md:p-8 bg-amber-50/5 dark:bg-amber-955/5' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="grid grid-cols-1 gap-8">
              {/* Pedagogical Logic */}
              <div className="p-6 bg-amber-50/20 dark:bg-amber-900/5 rounded-2xl border border-amber-100/50 dark:border-amber-900/20 space-y-6">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest">
                  <Settings2 size={16} />
                  <span>{t("schedule.pedagogicalLogic", "Pedagogical Logic")}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-amber-100/40 dark:border-amber-900/10 shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{t("schedule.maxConsecutivePeriods", "Max Consecutive Periods")}</p>
                      <p className="text-[9px] text-slate-450 font-bold uppercase">{t("schedule.preventsTeacherFatigue", "Prevents teacher fatigue")}</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={maxConsecutive}
                      onChange={(e) => setMaxConsecutive(Number(e.target.value))}
                      className="w-24 bg-slate-100 dark:bg-slate-700 p-2 rounded-xl font-bold text-sm border-none dark:text-white outline-none text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-amber-100/40 dark:border-amber-900/10 shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{t("schedule.subjectDistribution", "Subject Distribution")}</p>
                      <p className="text-[9px] text-slate-450 font-bold uppercase">{t("schedule.evenSpreadAcrossWeek", "Even spread across week")}</p>
                    </div>
                    <button
                      onClick={() => setDistributeSubjects(!distributeSubjects)}
                      className="flex h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded-full p-1 relative cursor-pointer transition-colors"
                    >
                      <div className={`absolute w-6 h-6 rounded-full shadow-sm transition-all ${distributeSubjects
                          ? 'right-1 bg-amber-500'
                          : 'left-1 bg-slate-400'
                        }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Timetable Structure & Frequencies (Collapsible, independent) */}
        <div className="bg-purple-50/20 dark:bg-purple-900/5 rounded-3xl border border-purple-100/50 dark:border-purple-900/20 overflow-hidden transition-all duration-300">
          <button
            onClick={() => toggleSection('structure')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-left transition-colors outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
                <BookOpen size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">{t("schedule.timetableStructure", "4. Timetable Structure")}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t("schedule.timetableStructureDesc", "Define class & teacher assignments and session frequencies")}</p>
              </div>
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-400 transform transition-transform duration-300 ${isStructureExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${isStructureExpanded ? 'max-h-[800px] opacity-100 border-t border-purple-100 dark:border-purple-900 p-6 md:p-8 bg-purple-50/20' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="p-6 rounded-2xl space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest">
                  <BookOpen size={16} />
                  <span>Timetable Structure</span>
                </div>
              </div>
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                {loadingClasses || loadingTeachers ? (
                  <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                    Loading class and teacher lists...
                  </div>
                ) : (
                  <TimetableStructureEditor
                    classes={classes}
                    teachers={teachers}
                    initialRows={structureRows}
                    onClassCreated={(newClass) => {
                      // Immediately add new class to local state so the editor's
                      // class list updates without waiting for a full DB refresh
                      setClasses(prev => {
                        if (prev.some(c => c.id === newClass.id)) return prev;
                        return [...prev, newClass];
                      });
                    }}
                    onSave={async (rows) => {
                      // update state, persist, and refresh from the latest DB state
                      try {
                        setSavingStructure(true);
                        await saveScheduleStructure(rows.map(r => ({ classId: r.classId, teacherId: r.teacherId, subject: r.subject, sessionsPerWeek: r.sessionsPerWeek })));
                        setStructureRows(rows);
                        await refreshClassesFromDb();
                        await refreshStructureFromDb();
                        alert('Timetable structure saved successfully.');
                      } catch (err) {
                        console.error('Failed to save structure from editor:', err);
                        alert('Unable to save timetable structure. Please try again.');
                      } finally {
                        setSavingStructure(false);
                      }
                    }}
                  />
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {/* Save is handled inside editor; keep a sync button if needed */}
                <button
                  onClick={() => { setIsStructureExpanded(false); }}
                  className="w-full sm:w-auto px-5 py-3 bg-white text-purple-600 border border-purple-300 rounded-2xl font-bold hover:bg-purple-100 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
