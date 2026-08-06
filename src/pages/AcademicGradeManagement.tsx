import { useMemo, useState } from 'react';
import { Award, CheckCircle2, GraduationCap, Save, Search, SlidersHorizontal, Users } from 'lucide-react';

interface DemoStudentGrade {
  id: string;
  studentId: string;
  name: string;
  grade: string;
  section: string;
  mathematics: number;
  english: number;
  environmentalScience: number;
  civics: number;
  participationPoints: number;
}

const STORAGE_KEY = 'ziquala_academic_manager_demo_grades';

const defaultGrades: DemoStudentGrade[] = [
  { id: 's1', studentId: 'ZA-ST-001', name: 'Mikael Tesfaye', grade: 'Grade 5', section: 'A', mathematics: 84, english: 78, environmentalScience: 88, civics: 91, participationPoints: 17 },
  { id: 's2', studentId: 'ZA-ST-002', name: 'Kidist Alemu', grade: 'Grade 5', section: 'A', mathematics: 92, english: 89, environmentalScience: 85, civics: 94, participationPoints: 19 },
  { id: 's3', studentId: 'ZA-ST-003', name: 'Nahom Bekele', grade: 'Grade 5', section: 'A', mathematics: 71, english: 76, environmentalScience: 80, civics: 75, participationPoints: 15 },
  { id: 's4', studentId: 'ZA-ST-004', name: 'Selamawit Girma', grade: 'Grade 5', section: 'B', mathematics: 87, english: 93, environmentalScience: 90, civics: 88, participationPoints: 18 },
  { id: 's5', studentId: 'ZA-ST-005', name: 'Biruk Solomon', grade: 'Grade 6', section: 'A', mathematics: 79, english: 82, environmentalScience: 77, civics: 86, participationPoints: 16 },
  { id: 's6', studentId: 'ZA-ST-006', name: 'Betelhem Getachew', grade: 'Grade 6', section: 'A', mathematics: 95, english: 91, environmentalScience: 94, civics: 92, participationPoints: 20 },
  { id: 's7', studentId: 'ZA-ST-007', name: 'Yonas Kebede', grade: 'Grade 6', section: 'B', mathematics: 68, english: 74, environmentalScience: 72, civics: 78, participationPoints: 14 },
  { id: 's8', studentId: 'ZA-ST-008', name: 'Mahilet Daniel', grade: 'Grade 6', section: 'B', mathematics: 88, english: 86, environmentalScience: 91, civics: 89, participationPoints: 18 },
];

const loadGrades = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as DemoStudentGrade[] : defaultGrades;
  } catch {
    return defaultGrades;
  }
};

const academicFields = [
  { key: 'mathematics', label: 'Mathematics' },
  { key: 'english', label: 'English' },
  { key: 'environmentalScience', label: 'Environmental Science' },
  { key: 'civics', label: 'Civics' },
] as const;

export const AcademicGradeManagement = () => {
  const [students, setStudents] = useState<DemoStudentGrade[]>(loadGrades);
  const [grade, setGrade] = useState('All Grades');
  const [section, setSection] = useState('All Sections');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);

  const grades = Array.from(new Set(students.map((student) => student.grade))).sort();
  const sections = Array.from(new Set(students.filter((student) => grade === 'All Grades' || student.grade === grade).map((student) => student.section))).sort();

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return students.filter((student) => (
      (grade === 'All Grades' || student.grade === grade)
      && (section === 'All Sections' || student.section === section)
      && (!search || `${student.name} ${student.studentId}`.toLowerCase().includes(search))
    ));
  }, [students, grade, section, query]);

  const updateScore = (id: string, key: keyof DemoStudentGrade, rawValue: string, max: number) => {
    const value = Math.max(0, Math.min(max, Number(rawValue) || 0));
    setStudents((current) => current.map((student) => student.id === id ? { ...student, [key]: value } : student));
    setSaved(false);
  };

  const average = (student: DemoStudentGrade) => {
    const total = academicFields.reduce((sum, field) => sum + student[field.key], 0);
    return total / academicFields.length;
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const classAverage = filtered.length ? filtered.reduce((sum, student) => sum + average(student), 0) / filtered.length : 0;
  const topAverage = filtered.length ? Math.max(...filtered.map(average)) : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-blue-900 to-emerald-800 p-8 text-white shadow-2xl md:p-10">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[52px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]"><GraduationCap size={14} /> Academic authority</div>
            <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">Grade & Point Editing</h1>
            <p className="mt-4 max-w-2xl leading-7 text-blue-50/80">The Academic Manager can correct subject grades and participation points, then save an updated academic record. This demo is ready to connect to an audited backend workflow later.</p>
          </div>
          <button onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-black text-slate-950 shadow-lg"><Save size={18} /> Save all changes</button>
        </div>
      </section>

      {saved && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"><CheckCircle2 size={18} /> Demo grade changes saved in this browser.</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between text-slate-500"><p className="text-xs font-black uppercase tracking-wider">Visible students</p><Users size={19} /></div><p className="mt-4 text-3xl font-black">{filtered.length}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between text-slate-500"><p className="text-xs font-black uppercase tracking-wider">Class average</p><SlidersHorizontal size={19} /></div><p className="mt-4 text-3xl font-black">{classAverage.toFixed(1)}%</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between text-slate-500"><p className="text-xs font-black uppercase tracking-wider">Highest average</p><Award size={19} /></div><p className="mt-4 text-3xl font-black">{topAverage.toFixed(1)}%</p></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student name or ID…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950" /></div>
          <select value={grade} onChange={(event) => { setGrade(event.target.value); setSection('All Sections'); }} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"><option>All Grades</option>{grades.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={section} onChange={(event) => setSection(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"><option>All Sections</option>{sections.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px]">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
              <tr>
                <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Student</th>
                {academicFields.map((field) => <th key={field.key} className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">{field.label}<span className="block font-semibold normal-case">out of 100</span></th>)}
                <th className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Participation<span className="block font-semibold normal-case">out of 20</span></th>
                <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-4"><p className="font-black text-slate-900 dark:text-white">{student.name}</p><p className="mt-1 text-xs font-bold text-slate-500">{student.studentId} · {student.grade} {student.section}</p></td>
                  {academicFields.map((field) => <td key={field.key} className="px-3 py-4"><input type="number" min={0} max={100} value={student[field.key]} onChange={(event) => updateScore(student.id, field.key, event.target.value, 100)} aria-label={`${student.name} ${field.label}`} className="mx-auto block w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center font-black outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950" /></td>)}
                  <td className="px-3 py-4"><input type="number" min={0} max={20} value={student.participationPoints} onChange={(event) => updateScore(student.id, 'participationPoints', event.target.value, 20)} aria-label={`${student.name} participation points`} className="mx-auto block w-20 rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-center font-black text-amber-900 outline-none focus:border-amber-600 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300" /></td>
                  <td className="px-5 py-4 text-center"><span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-black ${average(student) >= 85 ? 'bg-emerald-100 text-emerald-800' : average(student) >= 70 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{average(student).toFixed(1)}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">When the backend is implemented, every change should record the old value, new value, reason, Academic Manager identity, and timestamp. The current version demonstrates editing and local persistence only.</p>
    </div>
  );
};
