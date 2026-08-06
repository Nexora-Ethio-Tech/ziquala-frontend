import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  User,
} from 'lucide-react';
import {
  getChildAcademicHistory,
  getChildCommunicationLogs,
  getParentChildGrades,
  getParentDashboard,
  type AcademicHistoryEntry,
  type CommunicationLog,
  type ParentAnnouncement,
  type ParentChild,
} from '../services/parentService';
import { getCurrentECYear, getCurrentSemester, ecYearToGregorian } from '../utils/ethiopianCalendar';

type ParentTab = 'dashboard' | 'grades' | 'history' | 'communication-book';

const allowedTabs: ParentTab[] = ['dashboard', 'grades', 'history', 'communication-book'];

const ratingFields: Array<{ key: keyof CommunicationLog; label: string }> = [
  { key: 'rating_uniform', label: 'Uniform' },
  { key: 'rating_materials', label: 'Materials' },
  { key: 'rating_homework', label: 'Homework' },
  { key: 'rating_participation', label: 'Participation' },
  { key: 'rating_conduct', label: 'Conduct' },
  { key: 'rating_punctuality', label: 'Punctuality' },
];

const tabs = [
  { id: 'dashboard' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'grades' as const, label: 'Grades & Courses', icon: BookOpen },
  { id: 'history' as const, label: 'Academic History', icon: GraduationCap },
  { id: 'communication-book' as const, label: 'Communication Book', icon: ClipboardList },
];

export const ParentPortal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as ParentTab | null;
  const activeTab = requestedTab && allowedTabs.includes(requestedTab) ? requestedTab : 'dashboard';
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<ParentChild | null>(null);
  const [announcements, setAnnouncements] = useState<ParentAnnouncement[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [history, setHistory] = useState<AcademicHistoryEntry[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (requestedTab && !allowedTabs.includes(requestedTab)) {
      setSearchParams({ tab: 'dashboard' }, { replace: true });
    }
  }, [requestedTab, setSearchParams]);

  useEffect(() => {
    let active = true;
    getParentDashboard()
      .then((data) => {
        if (!active) return;
        const childList = data.children || [];
        setChildren(childList);
        setAnnouncements(data.announcements || []);
        const requestedChild = searchParams.get('childId');
        setSelectedChild(childList.find((child) => child.id === requestedChild) || childList[0] || null);
      })
      .catch(() => {
        if (active) setError('Family information will appear when the Ziquala backend is connected.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedChild || activeTab === 'dashboard') return;
    let active = true;
    setSectionLoading(true);
    setError('');

    const request = activeTab === 'grades'
      ? getParentChildGrades(selectedChild.id, getCurrentSemester(), ecYearToGregorian(getCurrentECYear())).then((data) => {
          if (active) setCourses(data?.courses || []);
        })
      : activeTab === 'history'
        ? getChildAcademicHistory(selectedChild.id).then((data) => {
            if (active) setHistory(data || []);
          })
        : getChildCommunicationLogs(selectedChild.id).then((data) => {
            if (active) setCommunicationLogs(data || []);
          });

    request
      .catch(() => {
        if (active) setError('This academic information is not available yet.');
      })
      .finally(() => {
        if (active) setSectionLoading(false);
      });

    return () => { active = false; };
  }, [activeTab, selectedChild]);

  const parentName = useMemo(() => {
    try {
      const value = localStorage.getItem('ziquala_user');
      return value ? JSON.parse(value).name || 'Parent' : 'Parent';
    } catch {
      return 'Parent';
    }
  }, []);

  const changeTab = (tab: ParentTab) => {
    const params: Record<string, string> = { tab };
    if (selectedChild) params.childId = selectedChild.id;
    setSearchParams(params);
  };

  const chooseChild = (child: ParentChild) => {
    setSelectedChild(child);
    setSearchParams({ tab: activeTab, childId: child.id });
  };

  const childPicker = children.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {children.map((child) => (
        <button
          key={child.id}
          type="button"
          onClick={() => chooseChild(child)}
          className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${selectedChild?.id === child.id
            ? 'border-school-primary bg-school-primary text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:border-school-primary/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}
        >
          {child.fullName}
        </button>
      ))}
    </div>
  );

  const emptyState = (message: string) => (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 p-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
      {message}
    </div>
  );

  if (loading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-school-primary" size={34} /></div>;
  }

  return (
    <div className="space-y-7 pb-12">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-950 to-school-primary p-7 text-white shadow-xl md:p-9">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Parent portal</p>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">Welcome, {parentName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/70">Follow your child’s learning, academic history, and school communication in one focused workspace.</p>
          </div>
          {childPicker}
        </div>
      </section>

      <nav className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Parent portal sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => changeTab(tab.id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${activeTab === tab.id
              ? 'bg-school-primary text-white'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            <tab.icon size={17} /> {tab.label}
          </button>
        ))}
      </nav>

      {error && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">{error}</p>}
      {sectionLoading && <div className="grid min-h-56 place-items-center"><Loader2 className="animate-spin text-school-primary" size={30} /></div>}

      {!sectionLoading && activeTab === 'dashboard' && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <User className="text-school-primary" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Your students</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {children.map((child) => (
                <article key={child.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-school-primary/10 text-school-primary"><GraduationCap size={23} /></div>
                  <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">{child.fullName}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{child.grade || 'Grade not assigned'}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-black uppercase text-slate-400">Attendance</p><p className="mt-1 font-black">{child.attendance || '—'}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-black uppercase text-slate-400">Courses</p><p className="mt-1 font-black">{child.course_count ?? child.courses?.length ?? '—'}</p></div>
                  </div>
                </article>
              ))}
              {children.length === 0 && emptyState('Linked student accounts will appear here.')}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <Bell className="text-school-secondary" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">School announcements</h2>
            </div>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <article key={announcement.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[10px] font-black uppercase tracking-wider text-school-primary">{announcement.category || 'School update'}</p>
                  <h3 className="mt-2 font-black text-slate-900 dark:text-white">{announcement.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{announcement.content}</p>
                </article>
              ))}
              {announcements.length === 0 && emptyState('No school announcements have been posted yet.')}
            </div>
          </section>
        </div>
      )}

      {!sectionLoading && activeTab === 'grades' && (
        <section className="space-y-5">
          <div className="flex items-center gap-3"><BookOpen className="text-school-primary" /><h2 className="text-2xl font-black">Grades & Courses</h2></div>
          {!selectedChild ? emptyState('Select a child to view courses.') : courses.length === 0 ? emptyState('No grades have been published for the current semester.') : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course: any) => (
                <article key={course.id || course.code || course.name} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-black uppercase tracking-wider text-school-primary">{course.code || 'Course'}</p>
                  <h3 className="mt-3 text-lg font-black">{course.name}</h3>
                  <div className="mt-6 flex items-end justify-between"><span className="text-sm font-semibold text-slate-500">Current total</span><span className="text-3xl font-black">{course.total ?? '—'}{course.total != null ? '%' : ''}</span></div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!sectionLoading && activeTab === 'history' && (
        <section className="space-y-5">
          <div className="flex items-center gap-3"><CalendarCheck className="text-school-primary" /><h2 className="text-2xl font-black">Academic History</h2></div>
          {!selectedChild ? emptyState('Select a child to view academic history.') : history.length === 0 ? emptyState('No completed academic periods are available yet.') : (
            <div className="space-y-4">
              {history.map((entry) => (
                <article key={entry.id} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div><p className="text-xs font-black uppercase tracking-wider text-school-primary">{entry.year} · {entry.semester}</p><h3 className="mt-2 text-xl font-black">{entry.grade_level}</h3></div>
                    <div className="text-right"><p className="text-xs font-black uppercase text-slate-400">Average</p><p className="mt-1 text-2xl font-black">{entry.average || '—'}</p></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!sectionLoading && activeTab === 'communication-book' && (
        <section className="space-y-5">
          <div className="flex items-center gap-3"><MessageSquare className="text-school-primary" /><h2 className="text-2xl font-black">Communication Book</h2></div>
          {!selectedChild ? emptyState('Select a child to read communication notes.') : communicationLogs.length === 0 ? emptyState('No communication-book entries have been published yet.') : (
            <div className="space-y-4">
              {communicationLogs.map((log) => (
                <article key={log.id} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-school-primary">Week ending {log.week_ending_formatted || log.week_ending}</p><h3 className="mt-2 font-black">{log.teacher_name || 'Class teacher'}</h3></div></div>
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {ratingFields.map((field) => <div key={field.key} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800"><p className="text-[10px] font-black uppercase text-slate-400">{field.label}</p><p className="mt-1 text-lg font-black">{String(log[field.key] ?? '—')}/5</p></div>)}
                  </div>
                  {log.teacher_note && <p className="mt-5 rounded-2xl bg-school-primary/5 p-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{log.teacher_note}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
