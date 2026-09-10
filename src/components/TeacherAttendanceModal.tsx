import { uiError, uiText } from "../localization";
import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { ethiopianToGregorianIso, gregorianToEthiopian } from '../utils/ethiopianCalendar';
import { getTeacherAttendanceDetail } from '../services/vicePrincipalService';

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

const isEthiopianLeapYear = (year: number) => year % 4 === 3;

const getDaysInEthiopianMonth = (year: number, month: number) => {
  if (month === 13) {
    return isEthiopianLeapYear(year) ? 6 : 5;
  }
  return 30;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ethiopianPartsToGregorianDate = (year: number, month: number, day: number) => {
  const iso = ethiopianToGregorianIso(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  return iso ? new Date(`${iso}T00:00:00`) : new Date();
};

interface TeacherAttendanceModalProps {
  open: boolean;
  teacher: {
    userId: string;
    name: string;
    digitalId?: string;
    email?: string;
  } | null;
  onClose: () => void;
}

interface TeacherAttendanceDetail {
  teacher: {
    user_id: string;
    teacher_id: string;
    name: string;
    email: string;
    digital_id: string;
  };
  attendance: Array<{
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
  }>;
  branchDailyCounts: Array<{
    date: string;
    record_count: number;
  }>;
}

export const TeacherAttendanceModal = ({ open, teacher, onClose }: TeacherAttendanceModalProps) => {
  const currentEthiopianDate = gregorianToEthiopian(new Date());
  const [selectedYear, setSelectedYear] = useState(currentEthiopianDate.year);
  const [selectedMonth, setSelectedMonth] = useState(currentEthiopianDate.month);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceDetail, setAttendanceDetail] = useState<TeacherAttendanceDetail | null>(null);

  useEffect(() => {
    if (!open || !teacher) {
      return;
    }

    const loadAttendance = async () => {
      try {
        setLoading(true);
        setError(null);

        const daysInMonth = getDaysInEthiopianMonth(selectedYear, selectedMonth);
        const startGregorian = ethiopianPartsToGregorianDate(selectedYear, selectedMonth, 1);
        const endGregorian = ethiopianPartsToGregorianDate(selectedYear, selectedMonth, daysInMonth);

        const data = await getTeacherAttendanceDetail(
          teacher.userId,
          toIsoDate(startGregorian),
          toIsoDate(endGregorian)
        );
        setAttendanceDetail(data);
      } catch (err: any) {
        console.error('Failed to load teacher attendance detail:', err);
        setError(uiError(err.response?.data?.error?.message || err.message || 'Failed to load attendance detail'));
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [open, teacher, selectedMonth, selectedYear]);

  if (!open || !teacher) {
    return null;
  }

  const daysInMonth = getDaysInEthiopianMonth(selectedYear, selectedMonth);
  const monthName = ETHIOPIAN_MONTHS[selectedMonth - 1];
  const recordsByDate = new Map((attendanceDetail?.attendance || []).map((record) => [record.date, record.status]));
  const branchCountsByDate = new Map(
    (attendanceDetail?.branchDailyCounts || []).map((record) => [record.date, Number(record.record_count) || 0])
  );

  const dayRows = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const gregorianDate = ethiopianPartsToGregorianDate(selectedYear, selectedMonth, day);
    const isoDate = toIsoDate(gregorianDate);
    const branchCount = branchCountsByDate.get(isoDate) || 0;
    const teacherStatus = recordsByDate.get(isoDate);
    const dayOfWeek = gregorianDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let mark = '';
    if (!isWeekend && branchCount > 0) {
      mark = teacherStatus && teacherStatus !== 'absent' ? '✓' : '✗';
    }

    return {
      day,
      isoDate,
      label: `${day} ${monthName} ${selectedYear}`,
      isWeekend,
      branchCount,
      mark
    };
  });

  const presentCount = dayRows.filter((row) => row.mark === '✓').length;
  const absentCount = dayRows.filter((row) => row.mark === '✗').length;
  const blankCount = dayRows.filter((row) => !row.mark).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_45%)]" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-300 mb-2">{uiText("Teacher Attendance")}</p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">{teacher.name}</h2>
              <p className="text-sm text-slate-300 mt-2">
                {uiText(teacher.digitalId ? `${teacher.digitalId} · ` : '')}
                {uiText(teacher.email || 'No email available')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={uiText("Close attendance modal")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">{uiText("Signed In")}</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{presentCount}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">{uiText("Absent")}</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{absentCount}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">{uiText("Blank")}</p>
                <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{blankCount}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-2">{uiText("Ethiopian Month")}</label>
                <select
                  title={uiText("Select Ethiopian month for attendance")}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full min-w-[180px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ETHIOPIAN_MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>{uiText(month)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-2">{uiText("Ethiopian Year")}</label>
                <select
                  title={uiText("Select Ethiopian year for attendance")}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full min-w-[140px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 6 }, (_, index) => currentEthiopianDate.year - index).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <CalendarDays size={14} />{uiText("Weekends and days with no staff sign-ins remain blank.")}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={20} />{uiText("Loading attendance...")}</div>
          ) : error ? (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5" />
              <p className="text-sm">{uiError(error)}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1.9fr_1fr] gap-6">
              <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="grid grid-cols-7 gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-3">
                  <div className="py-2 text-center">{uiText("Sun")}</div>
                  <div className="py-2 text-center">{uiText("Mon")}</div>
                  <div className="py-2 text-center">{uiText("Tue")}</div>
                  <div className="py-2 text-center">{uiText("Wed")}</div>
                  <div className="py-2 text-center">{uiText("Thu")}</div>
                  <div className="py-2 text-center">{uiText("Fri")}</div>
                  <div className="py-2 text-center">{uiText("Sat")}</div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: new Date(ethiopianPartsToGregorianDate(selectedYear, selectedMonth, 1)).getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="h-20 rounded-3xl bg-slate-50 dark:bg-slate-800" />
                  ))}
                  {dayRows.map((row) => (
                    <div
                      key={row.isoDate}
                      className={`min-h-[88px] rounded-3xl border p-3 text-sm font-semibold flex flex-col justify-between ${row.mark === '✓'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                          : row.mark === '✗'
                            ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20'
                            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/20'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{row.day}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{uiText(row.isWeekend ? 'WE' : '')}</span>
                      </div>
                      <div className="pt-1">
                        {row.mark ? (
                          <span className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-black">
                            {uiText(row.mark)} {uiText(row.mark === '✓' ? 'Present' : 'Absent')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-black text-slate-400">{uiText("No data")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">{uiText("Month overview")}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">{uiText("Signed In")}</p>
                      <p className="mt-3 text-3xl font-black text-emerald-700">{presentCount}</p>
                    </div>
                    <div className="rounded-3xl bg-rose-50 dark:bg-rose-950/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-rose-600">{uiText("Absent")}</p>
                      <p className="mt-3 text-3xl font-black text-rose-700">{absentCount}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 dark:bg-slate-950/20 p-4 col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{uiText("No data / weekends")}</p>
                      <p className="mt-3 text-3xl font-black text-slate-700 dark:text-slate-200">{blankCount}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">{uiText("Legend")}</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-black">{uiText("✓")}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{uiText("Present")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 font-black">{uiText("✗")}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{uiText("Absent")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 font-black">{uiText("—")}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{uiText("No sign-in / weekend")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
