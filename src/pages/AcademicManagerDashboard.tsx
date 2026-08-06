import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  UserSquare2,
  Users,
  LibraryBig,
} from 'lucide-react';

const workspaces = [
  { title: 'Students', description: 'Review enrolment, profiles, and academic records.', path: '/students', icon: Users },
  { title: 'Teachers & Staff', description: 'Supervise the academic team across the school.', path: '/staff', icon: UserSquare2 },
  { title: 'Attendance', description: 'Monitor attendance patterns and follow-up needs.', path: '/vp-attendance', icon: CalendarCheck },
  { title: 'Grades & Points', description: 'Edit student grades, assessment scores, and participation points.', path: '/academic-grades', icon: ClipboardCheck },
  { title: 'eLearning Management', description: 'Publish Drive books by grade, subject, and shared collection.', path: '/elearning-management', icon: LibraryBig },
  { title: 'Transcripts', description: 'Review student transcripts and academic progression.', path: '/vp-transcripts', icon: FileText },
  { title: 'Classes & Subjects', description: 'Coordinate the school academic structure.', path: '/classes', icon: BookOpen },
];

export const AcademicManagerDashboard = () => (
  <div className="space-y-8 pb-12">
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-school-primary to-emerald-700 p-8 text-white shadow-2xl md:p-10">
      <div className="max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]">
          <BarChart3 size={14} /> Academic leadership
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Academic Manager</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50 md:text-base">
          One academic oversight space for supervising staff, school administration, the vice principal, and student learning progress.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/analytics" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-school-primary transition hover:bg-emerald-50">
            View academic analytics <ArrowRight size={17} />
          </Link>
          <Link to="/branches" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20">
            <Building2 size={17} /> School branches
          </Link>
        </div>
      </div>
    </section>

    <section>
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-school-primary">Academic operations</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Your oversight workspaces</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((workspace) => (
          <Link key={workspace.title} to={workspace.path} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-school-primary/30 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-school-primary/10 text-school-primary">
              <workspace.icon size={23} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{workspace.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{workspace.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-school-primary">
              Open workspace <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>

    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
      Live totals and alerts will appear here when the Ziquala backend endpoints are connected. The current frontend establishes the approved role scope and navigation.
    </p>
  </div>
);
