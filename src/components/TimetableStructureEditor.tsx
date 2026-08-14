import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { createBranchClass } from '../services/schoolAdminService';

interface ClassRecord {
  id: string;
  name: string;
  section?: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface StructureRow {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
  sessionsPerWeek: number;
}

export interface Props {
  initialRows?: StructureRow[];
  onSave: (rows: StructureRow[]) => Promise<void> | void;
  classes: ClassRecord[];
  teachers: Teacher[];
  /** Called after a new class is created so parent can refresh its class list */
  onClassCreated?: (newClass: ClassRecord) => void;
}

interface GradeState {
  displayName?: string;
  sections: { name: string; classId?: string }[];
  courses: Array<{ id: string; name: string; sessionsPerWeek: number }>;
  assignments?: Record<string, Record<string, string>>;
  collapsed?: boolean;
}

// Helper to extract grade key and section from class name
const parseClassName = (name: string) => {
  const match = name.match(/^(Grade\s+\d+)([A-Z])?$/i);
  if (match) return { grade: match[1], section: (match[2] || '').toUpperCase() };
  const m2 = name.match(/^(.*?\d+)([A-Z])$/i);
  if (m2) return { grade: m2[1], section: (m2[2] || '').toUpperCase() };
  return { grade: name, section: '' };
};

const buildGradeMap = (classes: ClassRecord[], rows: StructureRow[]): Record<string, GradeState> => {
  const classLookup = new Map(classes.map(clazz => [clazz.id, clazz]));
  const map: Record<string, GradeState> = {};

  // First, populate map with all existing classes from the DB
  for (const clazz of classes) {
    const parsed = parseClassName(clazz.name || '');
    const gradeKey = parsed.grade || clazz.name || 'Untitled Grade';
    const sectionName = parsed.section || clazz.section || 'A';

    if (!map[gradeKey]) {
      map[gradeKey] = { displayName: gradeKey, sections: [], courses: [], assignments: {}, collapsed: false };
    }

    const grade = map[gradeKey];
    if (!grade.sections.some(section => section.name === sectionName)) {
      grade.sections.push({ name: sectionName, classId: clazz.id });
    }
  }

  // Then process structure rows to add courses and assignments
  if (rows.length > 0) {
    for (const row of rows) {
      const clazz = classLookup.get(row.classId);
      if (!clazz) continue;

      const parsed = parseClassName(clazz.name || '');
      const gradeKey = parsed.grade || clazz.name || 'Untitled Grade';
      const sectionName = parsed.section || clazz.section || 'A';

      // (The grade and section should already exist from the loop above, but we ensure it just in case)
      if (!map[gradeKey]) {
        map[gradeKey] = { displayName: gradeKey, sections: [], courses: [], assignments: {}, collapsed: false };
      }
      const grade = map[gradeKey];
      if (!grade.sections.some(section => section.name === sectionName)) {
        grade.sections.push({ name: sectionName, classId: clazz.id });
      }

      if (!grade.assignments) grade.assignments = {};
      if (!grade.assignments[sectionName]) grade.assignments[sectionName] = {};

      let course = grade.courses.find(existing => existing.name === row.subject);
      if (!course) {
        course = {
          id: `course_${gradeKey}_${row.subject}_${grade.courses.length + 1}`,
          name: row.subject,
          sessionsPerWeek: row.sessionsPerWeek || 3,
        };
        grade.courses.push(course);
      }

      grade.assignments[sectionName][course.id] = row.teacherId;
    }
  }

  return map;
};

export const TimetableStructureEditor: React.FC<Props> = ({ classes, teachers, initialRows = [], onSave, onClassCreated }) => {
  const { t } = useTranslation();
  const [gradeMap, setGradeMap] = useState<Record<string, GradeState>>({});
  const [saving, setSaving] = useState(false);
  const [newGradeInput, setNewGradeInput] = useState('');
  const [teacherSearch, setTeacherSearch] = useState<Record<string, string>>({});
  const [activeTeacherSearchKey, setActiveTeacherSearchKey] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const getTeacherSearchKey = (gradeKey: string, sectionName: string, courseId: string) =>
    `${gradeKey}::${sectionName}::${courseId}`;

  const pickTeacher = (gk: string, sectionName: string, courseId: string, teacherId: string) => {
    assignTeacherForSectionCourse(gk, sectionName, courseId, teacherId);
    const key = getTeacherSearchKey(gk, sectionName, courseId);
    setTeacherSearch(prev => ({ ...(prev || {}), [key]: '' }));
    setActiveTeacherSearchKey(null);
  };

  useEffect(() => {
    const nextMap = buildGradeMap(classes, initialRows);
    setGradeMap(nextMap);
  }, [classes, initialRows]);


  const addGrade = (gradeName?: string) => {
    let input = (gradeName || '').trim();
    if (!input) return;
    const key = `grade_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    setGradeMap(prev => ({ ...prev, [key]: { displayName: input, sections: [], courses: [] } }));
    setNewGradeInput('');
    // scroll to bottom so newly added grade is visible
    setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }, 80);
  };

  const updateGradeDisplayName = (gradeKey: string, name: string) => {
    setGradeMap(prev => {
      const entry = prev[gradeKey];
      if (!entry) return prev;
      return { ...prev, [gradeKey]: { ...entry, displayName: name } };
    });
  };

  const expandGradeOnly = (gradeKey: string) => {
    setGradeMap(prev => {
      const next: typeof prev = {} as typeof prev;
      Object.keys(prev).forEach(key => {
        next[key] = { ...prev[key], collapsed: key === gradeKey ? false : true };
      });
      return next;
    });
  };

  const addCourse = (gradeKey: string) => {
    expandGradeOnly(gradeKey);
    setGradeMap(prev => {
      const g = prev[gradeKey];
      const id = Date.now().toString();
        const course = { id, name: '', sessionsPerWeek: 3 };
        const updated = { ...prev, [gradeKey]: { ...g, courses: [...g.courses, course] } };
      return updated;
    });
    // ensure scroll to bottom so new course is visible
    setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }, 80);
  };

  const addSection = (gradeKey: string) => {
    expandGradeOnly(gradeKey);
    const existing = gradeMap[gradeKey]?.sections || [];
    const defaultName = `New Section ${existing.length + 1}`;
    const trimmed = defaultName;

    setGradeMap(prev => {
      const g = prev[gradeKey];
      if (!g) return prev;

      if (g.sections.some(section => section.name.toUpperCase() === trimmed)) {
        return prev;
      }

      return {
        ...prev,
        [gradeKey]: {
          ...g,
          sections: [...g.sections, { name: trimmed }],
          assignments: {
            ...(g.assignments || {}),
            [trimmed]: { ...(g.assignments?.[trimmed] || {}) },
          },
        },
      };
    });

    setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }, 80);
  };

  const removeSection = (gradeKey: string, sectionName: string) => {
    setGradeMap(prev => {
      const g = prev[gradeKey];
      if (!g) return prev;

      const sections = g.sections.filter(section => section.name !== sectionName);
      const assignments = { ...(g.assignments || {}) } as Record<string, Record<string, string>>;
      delete assignments[sectionName];

      return {
        ...prev,
        [gradeKey]: {
          ...g,
          sections,
          assignments,
        },
      };
    });
  };

  const updateSectionName = (gradeKey: string, oldName: string, nextName: string) => {
    const normalized = nextName.trim().toUpperCase();
    if (!normalized) return;

    setGradeMap(prev => {
      const g = prev[gradeKey];
      if (!g) return prev;

      if (oldName === normalized) return prev;

      const duplicate = g.sections.some(section => section.name.toUpperCase() === normalized && section.name !== oldName);
      if (duplicate) return prev;

      const sections = g.sections.map(section => (section.name === oldName ? { ...section, name: normalized } : section));
      const assignments = { ...(g.assignments || {}) } as Record<string, Record<string, string>>;
      if (assignments[oldName]) {
        assignments[normalized] = { ...(assignments[normalized] || {}), ...assignments[oldName] };
        delete assignments[oldName];
      } else if (!assignments[normalized]) {
        assignments[normalized] = {};
      }

      return { ...prev, [gradeKey]: { ...g, sections, assignments } };
    });
  };

  const updateCourse = (gradeKey: string, courseId: string, changes: Partial<any>) => {
    setGradeMap(prev => {
      const g = prev[gradeKey];
      const courses = g.courses.map((c: any) => c.id === courseId ? { ...c, ...changes } : c);
      return { ...prev, [gradeKey]: { ...g, courses } };
    });
  };

  const removeCourse = (gradeKey: string, courseId: string) => {
    setGradeMap(prev => {
      const g = prev[gradeKey];
      const courses = g.courses.filter((c: any) => c.id !== courseId);
      // also remove any assignment entries
      const assignments = { ...(g.assignments || {}) } as Record<string, Record<string,string>>;
      Object.keys(assignments).forEach(sec => { if (assignments[sec] && assignments[sec][courseId]) delete assignments[sec][courseId]; });
      return { ...prev, [gradeKey]: { ...g, courses, assignments } };
    });
  };

  const toggleCourseForSection = (gradeKey: string, sectionName: string, courseId: string) => {
    setGradeMap(prev => {
      const g = prev[gradeKey];
      // Deep-copy all inner assignment records so React sees new references and re-renders
      const assignments: Record<string, Record<string, string>> = {};
      Object.keys(g.assignments || {}).forEach(sec => {
        assignments[sec] = { ...((g.assignments || {})[sec] || {}) };
      });
      if (!assignments[sectionName]) assignments[sectionName] = {};
      if (assignments[sectionName][courseId] !== undefined) {
        // toggle off
        const updated = { ...assignments[sectionName] };
        delete updated[courseId];
        assignments[sectionName] = updated;
      } else {
        // toggle on with empty teacher slot
        assignments[sectionName] = { ...assignments[sectionName], [courseId]: '' };
      }
      const next = { ...prev, [gradeKey]: { ...g, assignments } };
      console.debug('[TimetableEditor] toggleCourseForSection', { gradeKey, sectionName, courseId, assignments: next[gradeKey].assignments });
      return next;
    });
  };

  const assignTeacherForSectionCourse = (gradeKey: string, sectionName: string, courseId: string, teacherId: string) => {
    setGradeMap(prev => {
      const g = prev[gradeKey];
      const assignments = { ...(g.assignments || {}) } as Record<string, Record<string,string>>;
      if (!assignments[sectionName]) assignments[sectionName] = {};
      assignments[sectionName][courseId] = teacherId;
      return { ...prev, [gradeKey]: { ...g, assignments } };
    });
  };

  const toggleGradeCollapsed = (gradeKey: string) => {
    setGradeMap(prev => {
      const g = prev[gradeKey];
      if (!g) return prev;
      const nextCollapsed = !g.collapsed;
      if (!nextCollapsed) {
        const next: typeof prev = {} as typeof prev;
        Object.keys(prev).forEach(key => {
          next[key] = { ...prev[key], collapsed: key === gradeKey ? false : true };
        });
        return next;
      }
      return { ...prev, [gradeKey]: { ...g, collapsed: true } };
    });
  };

  const removeGrade = (gradeKey: string) => {
    const shouldRemove = window.confirm('Delete this grade and all its courses/sections?');
    if (!shouldRemove) return;

    setGradeMap(prev => {
      const next = { ...prev };
      delete next[gradeKey];
      return next;
    });
  };

  const handleSave = async () => {
    // Flatten to structure rows
    const rows: StructureRow[] = [];
    const resolvedClasses = new Map<string, string>();

    const normalizeGradeLabel = (gradeLabel: string) => {
      const trimmed = gradeLabel.trim();
      if (/^grade\s+/i.test(trimmed)) return trimmed.replace(/\s+/g, ' ').replace(/^grade/i, 'Grade');
      if (/^\d+$/.test(trimmed)) return `Grade ${trimmed}`;
      return trimmed;
    };

    const resolveClassId = async (gradeLabel: string, sectionName: string, existingClassId?: string) => {
      if (existingClassId) return existingClassId;

      const cacheKey = `${gradeLabel}::${sectionName}`;
      const cached = resolvedClasses.get(cacheKey);
      if (cached) return cached;

      const match = classes.find(c => {
        const { grade, section: clsSection } = parseClassName(c.name || '');
        return grade === gradeLabel && (clsSection === sectionName || (c.section || '').toUpperCase() === sectionName);
      });

      if (match?.id) {
        resolvedClasses.set(cacheKey, match.id);
        return match.id;
      }

      const created = await createBranchClass({
        name: gradeLabel,
        section: sectionName,
        capacity: 0,
      });

      resolvedClasses.set(cacheKey, created.id);

      // Notify the parent (ScheduleBuilder) so it can refresh its class list
      if (onClassCreated) onClassCreated(created);

      // Broadcast a global event so the Classes tab also re-fetches
      window.dispatchEvent(new CustomEvent('classes-updated', { detail: created }));

      return created.id;
    };

    for (const gradeKey of Object.keys(gradeMap)) {
      const g = gradeMap[gradeKey];
      const matchGradeLabel = normalizeGradeLabel((g.displayName || gradeKey).toString());
      const assignments = g.assignments || {};
      for (const sectionName of Object.keys(assignments)) {
        const courseMap = assignments[sectionName] || {};
        for (const courseId of Object.keys(courseMap)) {
          const teacherId = courseMap[courseId] || '';
          if (!teacherId) {
            alert(`Please assign a teacher for ${g.displayName || gradeKey} / ${sectionName} before saving.`);
            return;
          }
          const course = (g.courses || []).find((c: any) => c.id === courseId);
          if (!course) continue;
          const sectionInfo = g.sections.find(s => s.name === sectionName);
          const classId = await resolveClassId(matchGradeLabel, sectionName, sectionInfo?.classId);
          const rowKey = `${classId}::${teacherId}::${course.name || ''}`;
          if (rows.some(row => `${row.classId}::${row.teacherId}::${row.subject}` === rowKey)) {
            continue;
          }
          rows.push({ id: Date.now().toString() + Math.random().toString(36).slice(2,6), classId, teacherId, subject: course.name || '', sessionsPerWeek: course.sessionsPerWeek || 3 });
        }
      }
    }

    if (rows.length === 0) {
      alert('No timetable structure rows were generated. Please add a course, select at least one section, and assign a teacher before saving.');
      return;
    }

    try {
      setSaving(true);
      await onSave(rows);
    } catch (err) {
      console.error('Failed to save structure rows:', err);
      alert('Failed to save timetable structure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black">{t("schedule.structureEditorTitle", "Timetable Structure Editor")}</h4>
          <p className="text-xs text-slate-500">{t("schedule.structureEditorDesc", "Create grades, add courses, select sections and assign teachers.")}</p>
          <p className="text-xs text-slate-400 mt-1">{t("schedule.teachersAvailable", "Teachers available:")} <span className="font-bold text-slate-700">{teachers.length}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={newGradeInput}
            onChange={(e) => setNewGradeInput(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm w-40"
          >
            <option value="">{t("schedule.selectGrade", "Select Grade")}</option>
            {['KG 1', 'KG 2', 'KG 3', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
              <option key={g} value={g.startsWith('KG') ? g : `Grade ${g}`}>{g.startsWith('KG') ? g : `Grade ${g}`}</option>
            ))}
          </select>
          <button onClick={() => addGrade(newGradeInput)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-bold">{t("schedule.addGrade", "Add Grade")}</button>
        </div>
      </div>

      <div ref={containerRef} className="space-y-4 max-h-[520px] overflow-y-auto pr-2 pb-4">
        {Object.keys(gradeMap).length === 0 && (
          <div className="p-6 border border-dashed rounded-lg text-center">{t("schedule.noGradesDetected", "No grades detected. Add a grade to begin.")}</div>
        )}

        {Object.entries(gradeMap).map(([gradeKey, g]) => (
          <div key={gradeKey} className="p-4 bg-white dark:bg-slate-800 border rounded-xl">
            <div className="flex items-center justify-between mb-3 gap-4">
              <div className="flex-1">
                <input
                  value={g.displayName || ''}
                  onChange={(e) => updateGradeDisplayName(gradeKey, e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (/^\d+$/.test(v)) updateGradeDisplayName(gradeKey, `Grade ${v}`);
                  }}
                  className="font-bold text-lg w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
                <p className="text-xs text-slate-500">Sections: {g.sections.map(s=>s.name).join(', ') || 'none'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => addSection(gradeKey)} className="px-3 py-1 bg-slate-700 text-white rounded-md text-sm">Add Section</button>
                <button onClick={() => addCourse(gradeKey)} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">Add Course</button>
                <button onClick={() => toggleGradeCollapsed(gradeKey)} className="px-3 py-1 border rounded-md text-sm">{g.collapsed ? 'Expand' : 'Collapse'}</button>
                <button onClick={() => removeGrade(gradeKey)} className="px-3 py-1 bg-red-500 text-white rounded-md text-sm">Delete</button>
              </div>
            </div>

            {!g.collapsed && (
              <div className="space-y-3">
              {g.courses.length === 0 && (
                <div className="text-sm text-slate-500">No courses yet for this grade.</div>
              )}

              <div className="space-y-2">
                {g.courses.map((course: any) => (
                    <div key={course.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border flex items-center gap-3">
                      <div className="flex-1">
                      <label className="text-xs font-black">Course Name</label>
                      <input value={course.name} onChange={(e) => updateCourse(gradeKey, course.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none" />
                      <div className="text-xs text-slate-400 mt-1">Debug: assigned = {String(Object.keys(g.assignments || {}).some(sec => g.assignments?.[sec]?.[course.id] !== undefined))}</div>
                    </div>
                    <div className="w-40">
                      <label className="text-xs font-black">Sessions / Week</label>
                      <input type="number" min={1} max={10} value={course.sessionsPerWeek} onChange={(e) => updateCourse(gradeKey, course.id, { sessionsPerWeek: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none" />
                    </div>
                    <div>
                      <button onClick={() => removeCourse(gradeKey, course.id)} className="px-3 py-1 bg-red-500 text-white rounded-md text-sm">Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-xs font-black">Section Assignments</label>
                <div className="space-y-3 mt-2">
                  {(g.sections && g.sections.length>0) ? g.sections.map((s:any) => (
                    <div key={s.name} className="p-3 bg-white dark:bg-slate-800 rounded-md border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold whitespace-nowrap">Section</span>
                        <input
                          type="number"
                          min="1"
                          value={s.name.replace(/\D/g, '')}
                          onChange={(e) => updateSectionName(gradeKey, s.name, `Section ${e.target.value.replace(/\D/g, '')}`)}
                          className="flex-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none"
                        />
                        <button
                          onClick={() => removeSection(gradeKey, s.name)}
                          className="px-3 py-1 bg-red-500 text-white rounded-md text-sm"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {g.courses.map((course:any) => {
                          const assigned = !!(g.assignments && g.assignments[s.name] && g.assignments[s.name][course.id] !== undefined);
                          return (
                            <div key={course.id} className="w-full sm:w-1/2 lg:w-1/3">
                              <button type="button"
                                className={`w-full inline-flex items-center gap-3 px-3 py-2 rounded-md border ${assigned ? 'bg-green-600 text-white border-green-600' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'} text-left`}
                                onClick={() => toggleCourseForSection(gradeKey, s.name, course.id)}
                                aria-pressed={assigned}
                                aria-label={`${assigned ? 'Disable' : 'Enable'} ${course.name || 'course'} for section ${s.name}`}
                              >
                                {assigned ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                                    <path d="M16 9l-4.5 6L8 12.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="transparent" />
                                  </svg>
                                )}
                                <span className="flex-1 text-sm">{course.name || 'Untitled Course'}</span>
                              </button>
                              {assigned && (
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    <span>Assigned Teacher</span>
                                    {g.assignments?.[s.name]?.[course.id] && (
                                      <button
                                        type="button"
                                        onClick={() => assignTeacherForSectionCourse(gradeKey, s.name, course.id, '')}
                                        className="text-rose-500 hover:text-rose-600"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                  <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                                    {g.assignments?.[s.name]?.[course.id] ? (
                                        <div className="flex items-center justify-between gap-3 text-sm text-slate-900 dark:text-slate-100">
                                        <span>{teachers.find(t => t.id === g.assignments?.[s.name]?.[course.id])?.name || 'Unknown teacher'}</span>
                                        <span className="text-xs text-slate-400">Assigned</span>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-slate-500">No teacher assigned yet.</div>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">Search teacher</label>
                                    <input
                                      value={teacherSearch[getTeacherSearchKey(gradeKey, s.name, course.id)] ?? ''}
                                      onFocus={() => {
                                        const key = getTeacherSearchKey(gradeKey, s.name, course.id);
                                        setActiveTeacherSearchKey(key);
                                        setTeacherSearch(prev => ({ ...prev, [key]: prev?.[key] ?? '' }));
                                      }}
                                      onBlur={() => {
                                        const key = getTeacherSearchKey(gradeKey, s.name, course.id);
                                        if (activeTeacherSearchKey === key) {
                                          setActiveTeacherSearchKey(null);
                                        }
                                      }}
                                      onChange={(e) => setTeacherSearch(prev => ({ ...prev, [getTeacherSearchKey(gradeKey, s.name, course.id)]: e.target.value }))}
                                      placeholder="Type teacher name..."
                                      className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none"
                                    />

                                    {(() => {
                                      const key = getTeacherSearchKey(gradeKey, s.name, course.id);
                                      const q = (teacherSearch[key] || '').trim().toLowerCase();
                                      const filteredTeachers = q.length > 0 ? teachers.filter(t => t.name.toLowerCase().includes(q)) : teachers;
                                      return (
                                        activeTeacherSearchKey === key && (
                                          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                            {filteredTeachers.slice(0, 12).map(t => (
                                              <button
                                                key={t.id}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => pickTeacher(gradeKey, s.name, course.id, t.id)}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                                              >
                                                {t.name}
                                              </button>
                                            ))}
                                            {filteredTeachers.length === 0 && (
                                              <div className="px-3 py-2 text-sm text-slate-500">No teachers found.</div>
                                            )}
                                          </div>
                                        )
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-500">No sections available for this grade</div>}
                </div>
              </div>
            </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl">{saving ? 'Saving...' : 'Save Structure'}</button>
      </div>
    </div>
  );
};

export default TimetableStructureEditor;
