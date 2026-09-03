import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Calendar, BookOpen, Loader2, Info, Layers, GraduationCap } from 'lucide-react';
import { getTeacherSchedule } from '../services/teacherService';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

// Subject-based color themes for instant visual recognition
const SUBJECT_THEMES: Record<string, { bg: string; border: string; text: string; subText: string }> = {
  chem: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/60', text: 'text-emerald-800 dark:text-emerald-300', subText: 'text-emerald-600 dark:text-emerald-400' },
  chemistry: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/60', text: 'text-emerald-800 dark:text-emerald-300', subText: 'text-emerald-600 dark:text-emerald-400' },
  phys: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800/60', text: 'text-indigo-800 dark:text-indigo-300', subText: 'text-indigo-600 dark:text-indigo-400' },
  physics: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800/60', text: 'text-indigo-800 dark:text-indigo-300', subText: 'text-indigo-600 dark:text-indigo-400' },
  bio: { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800/60', text: 'text-rose-800 dark:text-rose-300', subText: 'text-rose-600 dark:text-rose-400' },
  biology: { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800/60', text: 'text-rose-800 dark:text-rose-300', subText: 'text-rose-600 dark:text-rose-400' },
  maths: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800/60', text: 'text-blue-800 dark:text-blue-300', subText: 'text-blue-600 dark:text-blue-400' },
  math: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800/60', text: 'text-blue-800 dark:text-blue-300', subText: 'text-blue-600 dark:text-blue-400' },
  mathematics: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800/60', text: 'text-blue-800 dark:text-blue-300', subText: 'text-blue-600 dark:text-blue-400' },
  english: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800/60', text: 'text-amber-800 dark:text-amber-300', subText: 'text-amber-600 dark:text-amber-400' },
  amharic: { bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800/60', text: 'text-violet-800 dark:text-violet-300', subText: 'text-violet-600 dark:text-violet-400' },
};

const DEFAULT_THEME = {
  bg: 'bg-cyan-50 dark:bg-cyan-950/40',
  border: 'border-cyan-200 dark:border-cyan-800/60',
  text: 'text-cyan-800 dark:text-cyan-300',
  subText: 'text-cyan-600 dark:text-cyan-400'
};

const getSubjectTheme = (subjectName: string) => {
  const key = (subjectName || '').toLowerCase().trim();
  return SUBJECT_THEMES[key] || DEFAULT_THEME;
};

// Helper to normalize period name safely
const getSlotName = (slot: any) => {
  if (slot?.time_slot) return slot.time_slot;
  if (slot?.period) return slot.period;
  if (slot?.period_number) return `Period ${slot.period_number}`;
  return 'Period';
};

// Parse numerical index for period sorting (e.g. "Period 1" -> 1)
const getPeriodSortKey = (slotStr: string) => {
  const match = slotStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 99;
};

export const TeacherSchedule = () => {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTeacherSchedule();
        const filtered = (Array.isArray(data) ? data : []).filter((s: any) =>
          WEEKDAYS.includes(s.day as any)
        );
        setSchedule(filtered);
      } catch (err: any) {
        console.error('Failed to fetch schedule:', err);
        setError('Could not load schedule. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">Loading your weekly timetable...</p>
      </div>
    );
  }

  // Determine periods dynamically from data or fallback to standard Periods 1–6
  const rawPeriods = Array.from(new Set(schedule.map(s => getSlotName(s))));
  const sortedPeriods = rawPeriods.length > 0
    ? rawPeriods.sort((a, b) => getPeriodSortKey(a) - getPeriodSortKey(b))
    : ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'];

  const uniqueClassesCount = new Set(schedule.map(s => s.class_name)).size;
  const uniqueSubjectsCount = new Set(schedule.map(s => s.subject)).size;
  const totalSlots = schedule.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner & Quick Stats */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl flex items-center justify-center shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{t('teacherSchedule.mySchedule', 'My Teaching Schedule')}</h2>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">
                {t('teacherSchedule.myScheduleSub', 'Weekly class timetable matrix — Monday to Friday')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-xl flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-400" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Classes</p>
                <p className="text-sm font-black text-white">{totalSlots} Periods</p>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-xl flex items-center gap-2">
              <GraduationCap size={16} className="text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Grades</p>
                <p className="text-sm font-black text-white">{uniqueClassesCount} Assigned</p>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-xl flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subjects</p>
                <p className="text-sm font-black text-white">{uniqueSubjectsCount} Taught</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {totalSlots === 0 && !error ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Info className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={36} />
          <p className="text-slate-600 dark:text-slate-300 font-bold mb-1">{t('teacherSchedule.noScheduleAssignedYet', 'No timetable assigned yet')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('teacherSchedule.noScheduleAssignedYetSub', 'Your timetable will appear here once configured by the administration.')}
          </p>
        </div>
      ) : (
        /* Compact Timetable Grid */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider">
                  <th className="px-4 py-3.5 w-32 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-200/50 dark:bg-slate-800">
                    Time / Period
                  </th>
                  {WEEKDAYS.map(day => (
                    <th key={day} className="px-4 py-3.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0 text-center">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedPeriods.map((periodName, pIdx) => (
                  <tr key={periodName} className={pIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}>
                    {/* Period Label Column */}
                    <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-center align-middle font-extrabold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 whitespace-nowrap">
                      <span className="block text-xs uppercase tracking-tight text-indigo-600 dark:text-indigo-400">{periodName}</span>
                    </td>

                    {/* Day Columns */}
                    {WEEKDAYS.map(day => {
                      const matchedSlots = schedule.filter(
                        s => s.day === day && getSlotName(s) === periodName
                      );

                      return (
                        <td key={day} className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 last:border-r-0 align-top">
                          {matchedSlots.length === 0 ? (
                            <div className="h-12 flex items-center justify-center text-slate-300 dark:text-slate-700 font-mono text-[11px]">
                              —
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {matchedSlots.map((slot, sIdx) => {
                                const theme = getSubjectTheme(slot.subject);
                                return (
                                  <div
                                    key={slot.id || sIdx}
                                    className={`p-2 rounded-lg border ${theme.bg} ${theme.border} transition-all hover:scale-[1.02] shadow-sm`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`font-black uppercase text-[11px] tracking-wide ${theme.text}`}>
                                        {slot.subject}
                                      </span>
                                    </div>
                                    <div className={`text-[10px] font-bold mt-0.5 ${theme.subText}`}>
                                      {slot.class_name || 'Assigned Class'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Footnote */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl flex items-center gap-3 text-slate-600 dark:text-slate-400 text-xs">
        <Info size={18} className="text-indigo-500 shrink-0" />
        <p>
          <strong className="text-slate-800 dark:text-slate-200">Note:</strong> Timetable changes are configured by administrators in the Schedule Builder. If you observe any period conflicts, please inform your department head.
        </p>
      </div>
    </div>
  );
};
