import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Calendar, BookOpen, Loader2, Info } from 'lucide-react';
import { getTeacherSchedule } from '../services/teacherService';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

const getPeriodLabel = (periodNum: any) => {
  const num = Number(periodNum);
  switch (num) {
    case 1: return 'First Period';
    case 2: return 'Second Period';
    case 3: return 'Third Period';
    case 4: return 'Fourth Period';
    case 5: return 'Fifth Period';
    case 6: return 'Sixth Period';
    case 7: return 'Seventh Period';
    case 8: return 'Eighth Period';
    default: return `${periodNum} Period`;
  }
};

const DAY_BADGE_THEMES: Record<string, string> = {
  Monday: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
  Tuesday: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-100 dark:border-violet-900/50',
  Wednesday: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
  Thursday: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
  Friday: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/50',
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
        // Filter only Mon–Fri entries
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

  const totalSlots = schedule.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-4" size={40} />
        <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">Loading your schedule...</p>
      </div>
    );
  }

  // Get all unique subjects
  const uniqueSubjects = Array.from(new Set(schedule.map(s => s.subject || 'General'))).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white p-8 rounded-3xl shadow-xl shadow-indigo-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Calendar size={30} />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">{t('teacherSchedule.mySchedule', 'My Schedule')}</h2>
              <p className="text-indigo-100/90 font-medium mt-1">
                {t('teacherSchedule.myScheduleSub', 'Your weekly teaching timetable — Monday to Friday')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl text-center">
              <p className="text-2xl font-black">{totalSlots}</p>
              <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">{t('teacherSchedule.totalSlots', 'Total Slots')}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {totalSlots === 0 && !error ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Info className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={40} />
          <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('teacherSchedule.noScheduleAssignedYet', 'No schedule assigned yet')}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t('teacherSchedule.noScheduleAssignedYetSub', 'Your schedule will appear here once the school admin sets it up in the Schedule Builder.')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-5">Subject</th>
                  <th className="px-6 py-5">Monday</th>
                  <th className="px-6 py-5">Tuesday</th>
                  <th className="px-6 py-5">Wednesday</th>
                  <th className="px-6 py-5">Thursday</th>
                  <th className="px-6 py-5">Friday</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                {uniqueSubjects.map(subject => (
                  <tr key={subject} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                          <BookOpen size={16} />
                        </div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{subject}</span>
                      </div>
                    </td>
                    {WEEKDAYS.map(day => {
                      // Filter periods for this subject and day
                      const daySlots = schedule.filter(s => s.subject === subject && s.day === day)
                        .slice()
                        .sort((a, b) => Number(a.period_number || 0) - Number(b.period_number || 0));

                      return (
                        <td key={day} className="px-6 py-5">
                          {daySlots.length === 0 ? (
                            <span className="text-slate-300 dark:text-slate-700">—</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {daySlots.map((slot, index) => (
                                <div
                                  key={slot.id || index}
                                  className={`p-2.5 rounded-xl border text-[11px] font-bold ${DAY_BADGE_THEMES[day]} flex flex-col gap-1 shadow-sm`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{getPeriodLabel(slot.period_number)}</span>
                                  </div>
                                  <div className="text-[10px] opacity-75 font-semibold">
                                    {slot.class_name}
                                  </div>
                                </div>
                              ))}
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

      {/* Info notice */}
      <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 p-6 rounded-3xl flex items-start gap-4 shadow-sm">
        <div className="bg-amber-500 text-white p-2.5 rounded-2xl shrink-0">
          <Info size={18} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 dark:text-amber-400">{t('teacherSchedule.scheduleSetByAdmin', 'Schedule is set by Administration')}</h4>
          <p className="text-sm text-amber-800/80 dark:text-amber-500/80 mt-1 font-medium leading-relaxed">
            This timetable is managed by the school admin via the Schedule Builder and applies for the entire week.
            If you notice any conflicts, please contact your Department Head or Principal.
          </p>
        </div>
      </div>
    </div>
  );
};
