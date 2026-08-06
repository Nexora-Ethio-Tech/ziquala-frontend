import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.jpg";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../../config/api";
import { gregorianToEthiopian, ethiopianToGregorianIso } from "../../utils/ethiopianCalendar";

// ─── Ethiopian calendar helpers ───────────────────────────────────────────────
const ETH_MONTHS = [
  "Meskerem","Tikimt","Hidar","Tahsas","Tir","Yekatit",
  "Megabit","Miazia","Ginbot","Sene","Hamle","Nehase","Pagume",
];

const EVENT_PILL: Record<string, { dot: string; badge: string }> = {
  Academic:         { dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300" },
  Meeting:          { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 dark:bg-purple-800/40 dark:text-purple-300" },
  Event:            { dot: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300" },
  Holiday:          { dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300" },
  "Summer Break":   { dot: "bg-rose-500",   badge: "bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-300" },
  "Semester Break": { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300" },
  "Exam Day":       { dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-800/40 dark:text-indigo-300" },
  "Half Day":       { dot: "bg-teal-500",   badge: "bg-teal-100 text-teal-700 dark:bg-teal-800/40 dark:text-teal-300" },
  Other:            { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
};

const CELL_BG: Record<string, string> = {
  Academic:         "bg-blue-50 dark:bg-blue-900/20",
  Meeting:          "bg-purple-50 dark:bg-purple-900/20",
  Event:            "bg-emerald-50 dark:bg-emerald-900/20",
  Holiday:          "bg-amber-50 dark:bg-amber-900/20",
  "Summer Break":   "bg-rose-50 dark:bg-rose-900/20",
  "Semester Break": "bg-orange-50 dark:bg-orange-900/20",
  "Exam Day":       "bg-indigo-50 dark:bg-indigo-900/20",
  "Half Day":       "bg-teal-50 dark:bg-teal-900/20",
};

function daysInEthMonth(year: number, month: number) {
  return month === 13 ? (((year + 1) % 4 === 0) ? 6 : 5) : 30;
}
function gregIsoFn(ecY: number, ecM: number, day: number): string | null {
  try { return ethiopianToGregorianIso(`${ecY}-${String(ecM).padStart(2,"0")}-${String(day).padStart(2,"0")}`); }
  catch { return null; }
}
function firstDowFn(ecY: number, ecM: number): number {
  const iso = gregIsoFn(ecY, ecM, 1);
  if (!iso) return 0;
  return new Date(iso + "T00:00:00").getDay();
}
function stylePill(type: string) {
  return EVENT_PILL[type] ?? EVENT_PILL["Other"];
}

// ─── Compact Calendar Dropdown ────────────────────────────────────────────────
function CalendarDropdown({ onClose }: { onClose: () => void }) {
  const todayEth = gregorianToEthiopian(new Date());
  const [ecYear, setEcYear]       = useState(todayEth.year);
  const [ecMonth, setEcMonth]     = useState(todayEth.month);
  const [events, setEvents]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState<{ day: number; evts: any[] } | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/public/events`)
      .then(r => setEvents(r.data.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const totalDays = daysInEthMonth(ecYear, ecMonth);
  const leading   = firstDowFn(ecYear, ecMonth);

  const getEventsForDay = useCallback((d: number) => {
    const iso = gregIsoFn(ecYear, ecMonth, d);
    if (!iso) return [];
    return events.filter(e => {
      const start = e.date?.slice(0, 10);
      const end   = (e.end_date || e.date)?.slice(0, 10);
      return iso >= start && iso <= end;
    });
  }, [ecYear, ecMonth, events]);

  const isToday = (d: number) =>
    ecYear === todayEth.year && ecMonth === todayEth.month && d === todayEth.day;

  const firstDay = gregIsoFn(ecYear, ecMonth, 1);
  const lastDay  = gregIsoFn(ecYear, ecMonth, totalDays);
  const monthEvents = events.filter(e => {
    if (!e.date || !firstDay || !lastDay) return false;
    const s  = e.date.slice(0, 10);
    const en = (e.end_date || e.date).slice(0, 10);
    return s <= lastDay && en >= firstDay;
  });

  const prevMonth = () => {
    if (ecMonth === 1) { setEcMonth(13); setEcYear(y => y - 1); }
    else setEcMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (ecMonth === 13) { setEcMonth(1); setEcYear(y => y + 1); }
    else setEcMonth(m => m + 1);
    setSelectedDay(null);
  };
  const goToday = () => { setEcYear(todayEth.year); setEcMonth(todayEth.month); setSelectedDay(null); };

  return (
    <div className="w-full min-w-[300px] max-w-[360px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
          <ChevronLeft size={16} />
        </button>
        <p className="text-white font-black text-sm">{ETH_MONTHS[ecMonth - 1]} {ecYear} E.C.</p>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="text-[10px] font-black text-white/80 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-all">Today</button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
            <ChevronRight size={16} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all ml-1">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {Array.from({ length: leading }).map((_, i) => (
            <div key={`e${i}`} className="h-10 border-b border-r border-slate-50 dark:border-slate-800/30 bg-slate-50/30 dark:bg-slate-800/10" />
          ))}
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const dayEvts  = getEventsForDay(day);
            const today    = isToday(day);
            const cellBg   = dayEvts[0] ? (CELL_BG[dayEvts[0].type] || "") : "";
            const isSel    = selectedDay?.day === day;
            return (
              <div
                key={day}
                onClick={() => dayEvts.length > 0 ? setSelectedDay(isSel ? null : { day, evts: dayEvts }) : undefined}
                className={`h-10 border-b border-r border-slate-100 dark:border-slate-800/30 flex flex-col items-center justify-start pt-0.5 transition-all ${cellBg} ${dayEvts.length > 0 ? "cursor-pointer hover:ring-1 hover:ring-inset hover:ring-blue-400/40" : ""} ${isSel ? "ring-1 ring-inset ring-blue-500" : ""}`}
              >
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold ${today ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 dark:text-slate-300"}`}>
                  {day}
                </span>
                {dayEvts.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvts.slice(0, 3).map((ev, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${stylePill(ev.type).dot}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected day detail */}
      {selectedDay && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-2 max-h-36 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {ETH_MONTHS[ecMonth - 1]} {selectedDay.day}, {ecYear} E.C.
          </p>
          {selectedDay.evts.map((ev, i) => {
            const s = stylePill(ev.type);
            return (
              <div key={i} className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{ev.title}</p>
                  {ev.description && <p className="text-[10px] text-slate-400 truncate">{ev.description}</p>}
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.badge}`}>{ev.type}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Month events list */}
      {monthEvents.length > 0 && !selectedDay && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-3 max-h-44 overflow-y-auto space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {ETH_MONTHS[ecMonth - 1]} Events
          </p>
          {monthEvents.map((ev, i) => {
            const s     = stylePill(ev.type);
            const ethD  = gregorianToEthiopian(new Date(ev.date));
            const hasRange = ev.end_date && ev.end_date.slice(0, 10) !== ev.date.slice(0, 10);
            const ethEnd   = hasRange ? gregorianToEthiopian(new Date(ev.end_date)) : null;
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{ev.title}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {ETH_MONTHS[ethD.month - 1].slice(0, 3)} {ethD.day}{ethEnd ? `–${ethEnd.day}` : ""}, {ethD.year} E.C.
                  </p>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.badge}`}>{ev.type}</span>
              </div>
            );
          })}
        </div>
      )}

      {monthEvents.length === 0 && !loading && !selectedDay && (
        <p className="text-center text-[11px] text-slate-400 italic py-3 border-t border-slate-100 dark:border-slate-800">
          No events this month.
        </p>
      )}
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
export default function NavBar({ scrolled }: { scrolled: boolean }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [calOpen, setCalOpen]         = useState(false);
  const desktopCalRef = useRef<HTMLDivElement>(null);
  const mobileCalRef  = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside BOTH desktop and mobile containers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = desktopCalRef.current?.contains(target);
      const insideMobile  = mobileCalRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) setCalOpen(false);
    };
    if (calOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calOpen]);

  const navItems = [
    { key: "",            label: t("nav.home") },
    { key: "about",       label: t("nav.about") },
    { key: "programs",    label: t("nav.programs") },
    { key: "school-life", label: t("nav.schoolLife") },
    { key: "branches",    label: t("nav.branches") },
  ];

  const LangSelect = ({ className }: { className?: string }) => (
    <select
      aria-label="Select language"
      value={i18n.language}
      onChange={e => { i18n.changeLanguage(e.target.value); localStorage.setItem("ziquala_language", e.target.value); }}
      className={`bg-transparent text-xs font-bold text-slate-500 dark:text-slate-400 outline-none cursor-pointer hover:text-school-primary ${className ?? ""}`}
    >
      <option value="en">EN</option>
      <option value="am">AM</option>
      <option value="om">OM</option>
    </select>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src={logo} alt="Logo" className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg transition-transform group-hover:scale-110" />
            <div>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tighter block leading-none">ABDI ADAMA</span>
              <span className="text-[10px] sm:text-xs font-black text-school-primary uppercase tracking-widest">School</span>
            </div>
          </div>

          {/* ── Desktop right side ── */}
          <div className="hidden lg:flex items-center gap-5">
            {/* Nav links */}
            <div className="flex items-center gap-7">
              {navItems.map(item => (
                <Link key={item.key} to={`/${item.key}`} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-school-primary transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>

            <LangSelect />

            {/* Calendar icon → dropdown */}
            <div ref={desktopCalRef} className="relative">
              <button
                onClick={() => setCalOpen(o => !o)}
                title="School Calendar"
                className={`p-2.5 rounded-xl border transition-all ${calOpen ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none" : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"}`}
              >
                <CalendarDays size={18} />
              </button>
              {calOpen && (
                <div className="absolute right-0 top-full mt-3 z-50">
                  <CalendarDropdown onClose={() => setCalOpen(false)} />
                </div>
              )}
            </div>

            {/* Sign In */}
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              {t("nav.signIn")}
            </button>
          </div>

          {/* ── Mobile right side ── */}
          <div className="flex lg:hidden items-center gap-2">
            <LangSelect />

            {/* Mobile calendar button */}
            <div ref={mobileCalRef} className="relative">
              <button
                onClick={() => setCalOpen(o => !o)}
                title="School Calendar"
                className={`p-2 rounded-xl border transition-all ${calOpen ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"}`}
              >
                <CalendarDays size={17} />
              </button>
            </div>
            {/* Mobile dropdown — rendered outside the button wrapper so fixed positioning is correct */}
            {calOpen && (
              <div
                ref={mobileCalRef}
                className="fixed left-3 right-3 top-20 z-50 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl"
                onMouseDown={e => e.stopPropagation()}
              >
                <CalendarDropdown onClose={() => setCalOpen(false)} />
              </div>
            )}

            {/* Hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="Toggle menu">
              <div className="w-6 flex flex-col gap-1.5">
                <span className={`h-0.5 bg-slate-900 dark:bg-white transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`h-0.5 bg-slate-900 dark:bg-white transition-all ${mobileOpen ? "opacity-0" : ""}`} />
                <span className={`h-0.5 bg-slate-900 dark:bg-white transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl p-4">
            <div className="flex flex-col">
              {navItems.map(item => (
                <Link
                  key={item.key}
                  to={`/${item.key}`}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-school-primary border-b border-slate-200 dark:border-slate-800 last:border-0"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => { setMobileOpen(false); navigate("/login"); }}
              className="w-full mt-4 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg"
            >
              {t("nav.signIn")}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
