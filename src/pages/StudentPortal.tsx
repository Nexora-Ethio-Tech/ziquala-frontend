import { uiError, uiText } from "../localization";

import { BookOpen, Award, Clock, Star, Trophy, Loader2, Megaphone, Bell, User, MapPin, CheckCircle2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import {
  getStudentDashboard,
  getTeacherOfWeek,
  submitTeacherOfWeekVote,
  StudentDashboard,
  TeacherOfWeekPayload,
  WeeklyScheduleEntry,
} from '../services/studentPortalService';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const StudentPortal = () => {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [teacherOfWeek, setTeacherOfWeek] = useState<TeacherOfWeekPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(uiText(""));
      const [data, tow] = await Promise.all([
        getStudentDashboard(),
        getTeacherOfWeek().catch(() => null),
      ]);
      setDashboard(data);
      setTeacherOfWeek(tow);
    } catch (err: any) {
      setError(uiError(err.message));
    } finally {
      setLoading(false);
    }
  };

  /** True when voting is open and the student hasn't voted yet and there are candidates. */
  const showVotingCard =
    teacherOfWeek?.isOpen &&
    !teacherOfWeek.hasVoted &&
    (teacherOfWeek.teachers?.length ?? 0) > 0;

  /** True after the student has just voted (or already voted in this cycle). */
  const showVotedCard =
    teacherOfWeek !== null &&
    teacherOfWeek.hasVoted;

  /** True when voting window is closed (Thu / Fri) — show the best teacher winner card. */
  const showWinnerCard =
    teacherOfWeek !== null &&
    !teacherOfWeek.isOpen &&
    !teacherOfWeek.hasVoted &&
    teacherOfWeek.bestTeacher != null;

  const handleVote = async (teacherId: string) => {
    setVoting(true);
    setVoteError(null);
    try {
      await submitTeacherOfWeekVote(teacherId);
      setTeacherOfWeek((prev) =>
        prev
          ? { ...prev, hasVoted: true, votedTeacherId: teacherId }
          : prev
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to submit vote';
      setVoteError(msg);
    } finally {
      setVoting(false);
    }
  };

  const weeklySchedule = dashboard?.weeklySchedule ?? [];
  const schoolAnnouncements = dashboard?.schoolAnnouncements ?? [];
  const logisticsAnnouncements = dashboard?.logisticsAnnouncements ?? [];

  const getScheduleForDay = (day: string, schedule: WeeklyScheduleEntry[]) =>
    schedule.filter((s) => s.day === day).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  const timeSlots = Array.from(new Set(weeklySchedule.map((s) => s.timeSlot))).sort();

  const attendanceDisplay =
    dashboard?.stats.attendanceRate != null
      ? `${dashboard.stats.attendanceRate}%`
      : 'N/A';

  const averageGradeDisplay = dashboard?.stats.averageGradeDisplay ?? 'Pending';

  // Find the voted teacher name from candidates list
  const votedTeacher = teacherOfWeek?.teachers?.find(
    (t) => t.id === teacherOfWeek?.votedTeacherId
  ) ?? (teacherOfWeek?.bestTeacher?.id === teacherOfWeek?.votedTeacherId
    ? teacherOfWeek?.bestTeacher
    : null);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">

      {/* ── State 1: Voting Open ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showVotingCard && (
          <motion.div
            key="voting-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-amber-500/10 relative overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 rotate-12 pointer-events-none">
              <Trophy className="w-20 h-20 md:w-32 md:h-32 lg:w-[140px] lg:h-[140px]" />
            </div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-3 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    <Star size={12} fill="currentColor" />{uiText(" Weekend Special")}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">{uiText("Teacher of the Week")}</h2>
                  <p className="text-sm md:text-base font-medium opacity-80">{uiText("Vote for your best teacher this week. Voting is open from Saturday through Wednesday (Ethiopian calendar week).")}</p>
                </div>

                <div className="flex-1 w-full max-w-xl">
                  {voteError && (
                    <p className="text-sm font-bold text-rose-200 mb-3">{uiError(voteError)}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {teacherOfWeek!.teachers.map((teacher) => (
                      <motion.button
                        key={teacher.id}
                        type="button"
                        disabled={voting}
                        whileHover={{ scale: voting ? 1 : 1.02 }}
                        whileTap={{ scale: voting ? 1 : 0.98 }}
                        onClick={() => handleVote(teacher.id)}
                        className="p-4 rounded-3xl backdrop-blur-xl transition-all text-left relative group border-2 bg-white/10 border-white/20 hover:bg-white/20 disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm bg-white/20 flex-shrink-0">
                            {uiText(teacher.name[0])}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black truncate">{teacher.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-white truncate">
                              {uiText(teacher.subjects[0] || teacher.department || 'Teacher')}
                            </p>
                          </div>
                          {voting && (
                            <Loader2 size={16} className="ml-auto animate-spin opacity-80" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── State 2: Already Voted ───────────────────────────────────────────── */}
        {showVotedCard && (
          <motion.div
            key="voted-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 rotate-12 pointer-events-none">
              <CheckCircle2 className="w-20 h-20 md:w-32 md:h-32 lg:w-[140px] lg:h-[140px]" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="space-y-2 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                  <CheckCircle2 size={12} />{uiText(" Vote Recorded")}
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter">
                  {uiText("Teacher of the Week")}
                </h2>
                {votedTeacher ? (
                  <p className="text-sm md:text-base font-medium opacity-90">
                    {uiText("You voted for")} <span className="font-black">{votedTeacher.name}</span>
                    {votedTeacher.subjects?.[0] ? ` · ${votedTeacher.subjects[0]}` : ''}
                  </p>
                ) : (
                  <p className="text-sm md:text-base font-medium opacity-80">
                    {uiText("Your vote has been recorded for this week.")}
                  </p>
                )}
                <p className="text-xs opacity-60">{uiText("Results will be announced on Thursday.")}</p>
              </div>
              {/* Show bestTeacher if available */}
              {teacherOfWeek?.bestTeacher && (
                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md min-w-[180px]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">{uiText("Currently Leading")}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-sm flex-shrink-0">
                      {teacherOfWeek.bestTeacher.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{teacherOfWeek.bestTeacher.name}</p>
                      <p className="text-[10px] font-bold opacity-70 truncate">
                        {teacherOfWeek.bestTeacher.votes ?? 0} {uiText("votes")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── State 3: Voting Closed — Best Teacher Winner ─────────────────────── */}
        {showWinnerCard && (
          <motion.div
            key="winner-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 rotate-12 pointer-events-none">
              <Trophy className="w-20 h-20 md:w-32 md:h-32 lg:w-[140px] lg:h-[140px]" />
            </div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                <div className="space-y-3 flex-1 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    <Lock size={12} />{uiText(" Voting Closed")}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">
                    {uiText("Teacher of the Week")}
                  </h2>
                  <p className="text-sm opacity-80">{uiText("Voting is closed until Saturday. Here is this week's recognised teacher!")}</p>
                </div>

                <div className="flex items-center gap-5 p-5 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center font-black text-xl text-white shadow-lg flex-shrink-0">
                    {teacherOfWeek!.bestTeacher!.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star size={12} fill="currentColor" className="text-yellow-300" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{uiText("Best Teacher")}</p>
                    </div>
                    <p className="text-xl font-black">{teacherOfWeek!.bestTeacher!.name}</p>
                    {teacherOfWeek!.bestTeacher!.subjects?.[0] && (
                      <p className="text-sm opacity-70 font-medium">
                        {teacherOfWeek!.bestTeacher!.subjects[0]}
                      </p>
                    )}
                    {teacherOfWeek!.bestTeacher!.votes != null && (
                      <p className="text-xs opacity-60 mt-1">
                        {teacherOfWeek!.bestTeacher!.votes} {uiText("votes this week")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {uiError(error)}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black">{uiText("Welcome back, ")}{(dashboard?.student?.name || uiText('Student'))}{uiText("!")}</h2>
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
              <Award size={160} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950/95 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-900/20 text-white">
              <div className="bg-blue-600 p-3 rounded-2xl text-white w-fit mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-slate-300 text-sm font-medium">{uiText("Active Courses")}</h3>
              <p className="text-3xl font-black text-white mt-2">{dashboard?.stats.totalCourses ?? 0}</p>
            </div>
            <div className="bg-slate-950/95 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-900/20 text-white">
              <div className="bg-emerald-500 p-3 rounded-2xl text-white w-fit mb-4">
                <Clock size={24} />
              </div>
              <h3 className="text-slate-300 text-sm font-medium">{uiText("Attendance Rate")}</h3>
              <p className="text-3xl font-black text-white mt-2">{uiText(attendanceDisplay)}</p>
            </div>
            <div className="bg-slate-950/95 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-900/20 text-white">
              <div className="bg-blue-500 p-3 rounded-2xl text-white w-fit mb-4">
                <Award size={24} />
              </div>
              <h3 className="text-slate-300 text-sm font-medium">{uiText("Average Grade")}</h3>
              <p className="text-3xl font-black text-white mt-2">{uiText(averageGradeDisplay)}</p>
              {dashboard?.stats.currentSemester === 2 && (
                <p className="text-xs text-slate-400 mt-2">{uiText("First semester average")}</p>
              )}
            </div>
          </div>

          {(schoolAnnouncements.length > 0 || logisticsAnnouncements.length > 0) && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/95 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-900/20 text-white">
                <div>
                  <h3 className="text-lg font-bold">{uiText("Announcements and Notices")}</h3>
                  <p className="text-sm text-slate-300 mt-1">{uiText("Latest updates from your assigned driver and the School Admin.")}</p>
                </div>
                <div className="text-sm text-slate-400">{schoolAnnouncements.length + logisticsAnnouncements.length}{uiText(" notices")}</div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {[...schoolAnnouncements.map((notice) => ({ ...notice, source: 'School Admin' })),
                ...logisticsAnnouncements.map((notice) => ({ ...notice, source: 'Driver' }))].map((notice) => (
                  <div key={notice.id} className="bg-slate-950/95 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-900/30 text-white">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-800/80 text-slate-200">
                            {uiText(notice.source)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-slate-900/80">
                            {uiText(notice.category || 'Notice')}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white">{notice.title}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{uiText(formatEthiopianLabel(notice.timestamp))}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300 mb-4">{notice.content}</p>
                    {notice.source === 'Driver' && (notice as any).driverName ? (
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-800 pt-3">{uiText("Driver: ")}{uiText((notice as any).driverName)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
