import { useTranslation } from 'react-i18next';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  ClipboardList, Clock, ChevronRight, Plus, BookOpen, User, Filter,
  Trash2, Save, X, FileText, Upload, AlignLeft, CheckSquare, Layers,
  Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import {
  getAvailableExams, createExam, getTeacherExams, saveTeacherExam, publishTeacherExam,
  deleteTeacherExam, updateTeacherExam, getGradesForExams, getCoursesByGradeForExams, getTeacherCoursesForExams, getTeacherExamById
} from '../services/examService';
import type { PublishedExam } from '../services/examService';
import type { Exam, ExamCategory } from '../data/examData';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

// ─── Student Exam Card (defined before Exams to avoid forward-reference error) ─
const StudentExamCard = ({ exam, onStart }: { exam: PublishedExam; onStart: () => void }) => {
  const statusConfig = {
    available: { label: 'Available', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', dot: 'bg-emerald-500' },
    active: { label: 'In Progress', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800', dot: 'bg-blue-500' },
    submitted: { label: 'Completed', color: 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700', dot: 'bg-slate-400' },
    terminated: { label: 'Terminated', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', dot: 'bg-red-500' },
  };
  const status = exam.sessionStatus || 'available';
  const cfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  const isTerminated = status === 'terminated';
  const isSubmitted = status === 'submitted';
  const isActive = status === 'active';
  return (
    <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border transition-all duration-300 group hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden ${isTerminated ? 'border-red-200 dark:border-red-900' : 'border-slate-100 dark:border-slate-800'}`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-bl-[4rem] -mr-6 -mt-6 group-hover:scale-110 transition-transform duration-700" />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl ${isTerminated ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
          <ClipboardList size={20} />
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
        </span>
      </div>
      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight line-clamp-2">{exam.title}</h3>
      <p className="text-xs font-bold text-slate-400 mb-4">{exam.examType}</p>
      <div className="space-y-2 mb-5">
        {exam.teacherName && <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium"><User size={12} className="text-emerald-500" /> {exam.teacherName}</div>}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium"><Clock size={12} className="text-amber-500" /> {exam.durationMinutes} min • {exam.questionCount} questions</div>
        {exam.passwordRequired && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold">
            <Lock size={12} className="text-blue-500" /> Password Required
          </div>
        )}
        {isSubmitted && exam.finalScore !== null && (
          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Score</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${Number(exam.finalScore) >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>{exam.finalScore}%</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
          </div>
        )}
      </div>
      <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
        {isSubmitted ? (
          <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider"><CheckCircle2 size={14} className="text-emerald-500" /> Exam Submitted</span>
        ) : isTerminated ? (
          <button onClick={onStart} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors"><AlertTriangle size={12} /> Terminated – Enter PIN</button>
        ) : isActive ? (
          <button onClick={onStart} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-500/20"><ChevronRight size={14} /> Resume Exam</button>
        ) : (
          <button onClick={onStart} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50 transition-all">Start Exam <ChevronRight size={14} /></button>
        )}
      </div>
    </div>
  );
};

const Exams = () => {
  const { t } = useTranslation();

  const { role, user } = useUser();
  const navigate = useNavigate();
  const { examControls, ensureExamControl, examinerTeacherIds } = useStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentExams, setStudentExams] = useState<PublishedExam[]>([]);
  const [draftExams, setDraftExams] = useState<any[]>([]);
  const [publishedExams, setPublishedExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [examError, setExamError] = useState('');
  const [adminAuthModal, setAdminAuthModal] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creationType, setCreationType] = useState<'Exam' | 'Assignment'>('Exam');
  const [filterCategory, setFilterCategory] = useState<ExamCategory | 'All'>('All');
  const [editingExam, setEditingExam] = useState<any>(null);

  // School Admin and Teacher views
  const isSchoolAdmin = role === 'school-admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const activeTeacherId = 'T1';

  const canCreateOfficialExam = isTeacher && examinerTeacherIds.includes(activeTeacherId);

  const fetchExams = async () => {
    setLoadingExams(true);
    setExamError('');
    try {
      if (isStudent) {
        const data = await getAvailableExams();
        setStudentExams(Array.isArray(data) ? data : []);
      } else {
        const examsData = await getAvailableExams() as any;
        setExams(Array.isArray(examsData) ? examsData : []);
        if (isTeacher) {
          const teacherData = await getTeacherExams();
          setDraftExams(Array.isArray(teacherData.draftExams) ? teacherData.draftExams : []);
          setPublishedExams(Array.isArray(teacherData.publishedExams) ? teacherData.publishedExams : []);
        }
      }
    } catch (error: any) {
      console.error('Failed to load exams:', error);
      setExamError(error?.message || 'Unable to load exams.');
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    exams.forEach((exam) => ensureExamControl(exam.id));
  }, [exams, ensureExamControl]);

  const categories: ExamCategory[] = ['Mid-term', 'Final'];

  const filteredExams = exams.filter(exam => {
    const isOfficial = exam.category === 'Mid-term' || exam.category === 'Final';
    if (!isOfficial) return false;

    const categoryMatch = filterCategory === 'All' || exam.category === filterCategory;
    const control = examControls[exam.id];
    const hidden = control ? control.isHidden : true;

    if ((isStudent || role === 'parent' || role === 'vice-principal') && hidden) {
      return false;
    }

    if (isTeacher) return categoryMatch && exam.teacherId === 't1';
    return categoryMatch;
  });

  if (showCreateForm && isTeacher) {
    return <ExamCreator
      type={creationType}
      editingExam={editingExam}
      onCancel={() => { setShowCreateForm(false); setEditingExam(null); }}
      onSave={async () => {
        // refresh teacher lists
        const teacherData = await getTeacherExams();
        setDraftExams(Array.isArray(teacherData.draftExams) ? teacherData.draftExams : []);
        setPublishedExams(Array.isArray(teacherData.publishedExams) ? teacherData.publishedExams : []);
        setShowCreateForm(false);
        setEditingExam(null);
      }}
    />;
  }

  const handleAdminStart = (examId: string) => {
    const control = examControls[examId];
    const requiredPassword = control?.principalPassword || 'principal123';

    if (adminPassword === requiredPassword) {
      navigate(`/exam/${examId}`);
      setAdminAuthModal(null);
      setAdminPassword('');
    } else {
      alert('Invalid Principal Password');
    }
  };

  // ── Student view: rendered separately ─────────────────────────────────────
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <Breadcrumbs />
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('examsPage.officialExaminations', 'Official Examinations')}</h1>
            <p className="text-slate-500 dark:text-slate-400">Access and attempt your scheduled examinations.</p>
          </div>
          <button onClick={fetchExams} disabled={loadingExams} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw size={14} className={loadingExams ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {examError && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">{examError}</div>}
        {loadingExams ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : studentExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <ClipboardList size={48} className="mb-4 opacity-40" />
            <p className="font-bold text-lg">No exams published yet</p>
            <p className="text-sm">Check back when your teacher publishes an examination.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentExams.map(exam => (
              <StudentExamCard key={exam.id} exam={exam} onStart={() => navigate(`/exam/${exam.id}`)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Official Examinations</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isTeacher && t('examsPage.manageExamsSub', 'Manage official mid-term and final examinations for your courses.')}
          </p>
        </div>
        {isTeacher && (
          <div className="flex gap-2">
            <button
              onClick={() => { if (canCreateOfficialExam) { setCreationType('Exam'); setShowCreateForm(true); } }}
              disabled={!canCreateOfficialExam}
              className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${canCreateOfficialExam ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
            >
              <Plus size={20} />
              New Examination
            </button>
          </div>
        )}
      </div>
      {isTeacher && !canCreateOfficialExam && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
          You are currently not assigned as an official examiner. Ask School Admin to promote you as examiner for Mid/Final exams.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilterCategory('All')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterCategory === 'All'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
        >
          All Items
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterCategory === cat
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
          >
            {cat === 'Mid-term' ? t('examsPage.midTerms', 'Mid-terms') : t('examsPage.finals', 'Finals')}
          </button>
        ))}
      </div>

      {/* Exam Categories for School Admin */}
      {isSchoolAdmin && filterCategory === 'All' ? (
        <div className="space-y-8">
          {categories.map(cat => (
            <div key={cat} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Filter size={20} className="text-blue-600" />
                {cat}s
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.filter(e => e.category === cat).map(exam => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    role={role}
                    actorId={user?.id || 'unknown-user'}
                    onStart={() => {
                      if (isSchoolAdmin) {
                        setAdminAuthModal(exam.id);
                      } else {
                        navigate(`/exam/${exam.id}`);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              role={role}
              actorId={user?.id || 'unknown-user'}
              onStart={() => {
                if (isSchoolAdmin) {
                  setAdminAuthModal(exam.id);
                } else {
                  navigate(`/exam/${exam.id}`);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Teacher: My Exams — Drafts + Published */}
      {isTeacher && (
        <div className="space-y-8">
          {/* Drafts */}
          <div>
            <h2 className="text-base font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Save size={16} className="text-amber-500" /> {t('examsPage.draftExams', 'Draft Exams')}
              <span className="ml-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 px-2 py-0.5 rounded-full">{draftExams.length}</span>
            </h2>
            {draftExams.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm font-medium">{t('examsPage.noDraftsYet', 'No drafts yet — create a new examination above.')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftExams.map((exam: any) => (
                  <div key={exam.id} className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 space-y-3 hover:shadow-lg hover:shadow-amber-500/5 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{exam.title}</h3>
                      <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700">{t('examsPage.draft', 'Draft')}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      {exam.subject_name && <p><BookOpen size={10} className="inline mr-1" />{exam.subject_name}</p>}
                      {(exam.class_name || exam.section_name) && <p><User size={10} className="inline mr-1" />{exam.class_name}{exam.section_name ? ` · ${exam.section_name}` : ''}</p>}
                      <p><Clock size={10} className="inline mr-1" />{exam.duration_minutes} min · {exam.question_count} Qs · {exam.total_points} pts</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={async () => { 
                          try {
                            const fullExam = await getTeacherExamById(exam.id);
                            setEditingExam(fullExam); 
                            setCreationType('Exam'); 
                            setShowCreateForm(true); 
                          } catch (err: any) {
                            alert(err?.message || 'Failed to load full exam details');
                          }
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <FileText size={12} /> {t('examsPage.edit', 'Edit')}
                      </button>
                      <button
                        onClick={async () => { try { await publishTeacherExam(exam.id); const td = await getTeacherExams(); setDraftExams(Array.isArray(td.draftExams) ? td.draftExams : []); setPublishedExams(Array.isArray(td.publishedExams) ? td.publishedExams : []); } catch(e: any) { alert(e?.message || 'Failed to publish'); } }}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye size={12} /> {t('examsPage.publish', 'Publish')}
                      </button>
                      <button
                        onClick={async () => { if (!confirm('Delete this draft?')) return; try { await deleteTeacherExam(exam.id); const td = await getTeacherExams(); setDraftExams(Array.isArray(td.draftExams) ? td.draftExams : []); } catch(e: any) { alert(e?.message || 'Failed to delete'); } }}
                        className="py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Published */}
          <div>
            <h2 className="text-base font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" /> {t('examsPage.publishedExams', 'Published Exams')}
              <span className="ml-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 px-2 py-0.5 rounded-full">{publishedExams.length}</span>
            </h2>
            {publishedExams.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm font-medium">{t('examsPage.noPublishedExamsYet', 'No published exams yet.')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishedExams.map((exam: any) => (
                  <div key={exam.id} className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-5 space-y-3 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{exam.title}</h3>
                      <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700">{t('examsPage.live', 'Live')}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      {exam.subject_name && <p><BookOpen size={10} className="inline mr-1" />{exam.subject_name}</p>}
                      {(exam.class_name || exam.section_name) && <p><User size={10} className="inline mr-1" />{exam.class_name}{exam.section_name ? ` · ${exam.section_name}` : ''}</p>}
                      <p><Clock size={10} className="inline mr-1" />{exam.duration_minutes} min · {exam.question_count} Qs · {exam.total_points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {adminAuthModal && (

        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 border-4 border-blue-500 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tighter">Principal Authorization</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
              You are accessing an official examination as a School Admin. Please enter the Principal-set password to proceed.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter Principal Password"
                autoFocus
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 transition-all text-center font-bold tracking-widest dark:text-white"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminStart(adminAuthModal)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setAdminAuthModal(null); setAdminPassword(''); }}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black transition-all hover:bg-slate-200"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleAdminStart(adminAuthModal)}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none transition-all"
                >
                  AUTHORIZE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Teacher/Admin ExamCard ───────────────────────────────────────────────────
const ExamCard = ({ exam, role, actorId, onStart }: { exam: Exam, role: string | null, actorId: string, onStart: () => void }) => {

  const { lockExam, unlockExam, setExamHidden, setPrincipalPassword, examControls, ensureExamControl } = useStore();
  const [lockPassword, setLockPassword] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showPrincipalModal, setShowPrincipalModal] = useState(false);
  const [principalPasswordInput, setPrincipalPasswordInput] = useState('');

  useEffect(() => {
    ensureExamControl(exam.id);
  }, [exam.id, ensureExamControl]);

  const control = useMemo(() => examControls[exam.id], [examControls, exam.id]);

  const isLocked = control ? control.isLocked : false;
  const isHidden = control ? control.isHidden : true;
  const isLockOwner = control?.lockOwnerId === actorId;

  const handleLockClick = () => {
    if (isLocked) {
      setShowUnlockModal(true);
    } else {
      setShowLockModal(true);
    }
  };

  const handleLockSave = () => {
    if (lockPassword.trim()) {
      lockExam(exam.id, actorId, lockPassword);
      setLockPassword('');
      setShowLockModal(false);
    } else {
      alert('Please enter a password to lock the exam');
    }
  };

  const handleUnlock = () => {
    const unlocked = unlockExam(exam.id, actorId, unlockPassword);
    if (unlocked) {
      setUnlockPassword('');
      setShowUnlockModal(false);
    } else {
      alert('Unlock denied. Only the user who locked this exam can unlock it with the same password.');
    }
  };

  const handleHideToggle = () => {
    setExamHidden(exam.id, !isHidden);
  };

  const handlePrincipalPasswordSave = () => {
    if (!principalPasswordInput.trim()) {
      alert('Enter a principal password.');
      return;
    }
    setPrincipalPassword(exam.id, principalPasswordInput.trim());
    setPrincipalPasswordInput('');
    setShowPrincipalModal(false);
  };

  if (isHidden && role !== 'teacher' && role !== 'school-admin') return null;

  return (
    <>
      <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 group relative overflow-hidden ${isHidden ? 'opacity-60 grayscale' : ''}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/5 dark:to-transparent rounded-bl-[5rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-700" />
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600">
            <ClipboardList size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
            {exam.category}
          </span>
        </div>

        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">{exam.title}</h3>
        <div className="space-y-3 mb-8 relative z-10">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><BookOpen size={14} className="text-blue-600" /></div>
            {exam.courseName}
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><User size={14} className="text-emerald-600" /></div>
            {exam.teacherName}
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><Clock size={14} className="text-amber-600" /></div>
            {exam.durationMinutes} mins • {exam.questions.length} Questions
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50 dark:border-slate-800 relative z-10">
          {role === 'student' ? (
            <button
              disabled={isLocked}
              onClick={onStart}
              className={`w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all py-2 rounded-xl ${isLocked ? 'text-slate-400 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : 'text-blue-600 dark:text-blue-400 hover:gap-4 bg-blue-50/50 dark:bg-blue-900/20'}`}
            >
              {isLocked ? (
                <>Locked with Code <Lock size={14} /></>
              ) : (
                <>Start Exam <ChevronRight size={16} /></>
              )}
            </button>
          ) : (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-3">
                <span className={exam.status === 'available' ? 'text-green-600 font-bold' : 'text-slate-400'}>
                  {exam.status === 'available' ? '• Active' : '• Draft'}
                </span>
                {(role === 'teacher' || role === 'school-admin') && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleLockClick}
                      className={`p-1 rounded ${isLocked ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:bg-slate-50'}`}
                      title={isLocked ? 'Unlock' : 'Lock with Code'}
                    >
                      <Lock size={14} />
                    </button>
                    <button
                      onClick={handleHideToggle}
                      className={`p-1 rounded ${isHidden ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:bg-slate-50'}`}
                      title={isHidden ? 'Unveil' : 'Hide'}
                    >
                      {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {role === 'school-admin' && (
                      <button
                        onClick={() => setShowPrincipalModal(true)}
                        className="p-1 rounded text-indigo-600 hover:bg-indigo-50"
                        title="Set Principal Password"
                      >
                        <ShieldCheck size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button className="text-slate-400 hover:text-blue-600 transition-colors font-bold uppercase text-[10px] tracking-widest">
                View Details
              </button>
            </div>
          )}
        </div>
      </div>

      {showLockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Lock Exam</h2>
              <button
                onClick={() => { setShowLockModal(false); setLockPassword(''); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600">Set a password for students to unlock this exam.</p>
            <input
              type="password"
              placeholder="Enter exam access password"
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowLockModal(false); setLockPassword(''); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLockSave}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
              >
                Lock Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Unlock Exam</h2>
              <button
                onClick={() => { setShowUnlockModal(false); setUnlockPassword(''); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600">Enter the password to unlock this exam.</p>
            <input
              type="password"
              placeholder="Enter exam password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnlockModal(false); setUnlockPassword(''); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                disabled={!isLockOwner}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors"
              >
                Unlock Exam
              </button>
            </div>
            {isLocked && !isLockOwner && (
              <p className="text-xs text-rose-600 font-bold">You did not create this lock. Unlock is restricted to lock owner.</p>
            )}
          </div>
        </div>
      )}

      {showPrincipalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Principal Password</h2>
              <button
                onClick={() => { setShowPrincipalModal(false); setPrincipalPasswordInput(''); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600">Set the password required for School Admin authorization to start this official exam.</p>
            <input
              type="password"
              placeholder="Enter principal password"
              value={principalPasswordInput}
              onChange={(e) => setPrincipalPasswordInput(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPrincipalModal(false); setPrincipalPasswordInput(''); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrincipalPasswordSave}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
              >
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface FlexibleQuestion {
  id: string;
  text: string;
  type: 'explain' | 'options' | 'group';
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  subQuestions?: FlexibleQuestion[];
  points?: number;
}

const ExamCreator = ({ type, editingExam, onCancel, onSave }: {
  type: 'Exam' | 'Assignment';
  editingExam?: any;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const { role } = useUser();
  const isEditing = !!editingExam;

  const [examData, setExamData] = useState<Partial<Exam>>({
    title: editingExam?.title || '',
    category: editingExam?.exam_type || editingExam?.category || 'Mid-term',
    durationMinutes: editingExam?.duration_minutes || 60,
    courseName: '',
    questions: []
  });
  const [totalMarks, setTotalMarks] = useState<number>(editingExam?.total_points || 100);
  const [instructions, setInstructions] = useState<string>(editingExam?.instructions || '');
  const [subjectId, setSubjectId] = useState<string>(editingExam?.subject_id || '');
  const [gradeId, setGradeId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>(editingExam?.section_id || ''); // classId to save as section_id
  const [showScore, setShowScore] = useState<boolean>(editingExam?.show_score !== false);
  const [isGraded, setIsGraded] = useState<boolean>(!!editingExam?.is_graded);
  const [assessmentType, setAssessmentType] = useState<string>(editingExam?.assessment_type || 'quiz-1');
  const [examPassword, setExamPassword] = useState<string>(editingExam?.exam_password || '');
  const [passwordRequired, setPasswordRequired] = useState<boolean>(!!editingExam?.password_required);
  const [gradesForExam, setGradesForExam] = useState<any[]>([]);
  const [sectionsForGrade, setSectionsForGrade] = useState<any[]>([]);
  const [coursesForSection, setCoursesForSection] = useState<any[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);

  useEffect(() => {
    if (role === 'teacher') {
      (async () => {
        const t = await getTeacherCoursesForExams();
        const courses = Array.isArray(t) ? t : [];
        setTeacherCourses(courses);

        // Build unique grade list from teacher's own courses
        const gradeMap = new Map<string, any>();
        courses.forEach((c: any) => {
          const gLevel = String(c.grade_level || '');
          if (gLevel && !gradeMap.has(gLevel)) {
            gradeMap.set(gLevel, { id: gLevel, name: `Grade ${gLevel}` });
          }
        });
        setGradesForExam(Array.from(gradeMap.values()).sort((a, b) => Number(a.id) - Number(b.id)));

        // If editing, pre-populate sections and courses from editingExam.section_id
        if (editingExam?.section_id) {
          const matchedCourse = courses.find((c: any) => c.class_id === editingExam.section_id);
          if (matchedCourse) {
            const gLevel = String(matchedCourse.grade_level || '');
            setGradeId(gLevel);
            // Sections for this grade
            const filtered = courses.filter((c: any) => String(c.grade_level || '') === gLevel);
            const sectionMap = new Map<string, any>();
            filtered.forEach((c: any) => {
              if (c.class_id && !sectionMap.has(c.class_id)) {
                sectionMap.set(c.class_id, { id: c.class_id, name: c.section_name ? `Section ${c.section_name}` : c.class_name || c.class_id });
              }
            });
            setSectionsForGrade(Array.from(sectionMap.values()));
            setCoursesForSection(courses.filter((c: any) => c.class_id === editingExam.section_id));
          }
        }
      })();
    }
  }, [role]);

  const [assignmentDetails, setAssignmentDetails] = useState({
    description: '',
    dueDate: '',
    fileName: '',
    isDocumentOnly: false
  });

  const [questions, setQuestions] = useState<FlexibleQuestion[]>(() => {
    if (editingExam?.questions && editingExam.questions.length > 0) {
      return editingExam.questions.map((q: any) => ({
        id: String(q.id || Date.now() + Math.random()),
        text: q.question_text || q.text || '',
        type: q.question_type || q.type || 'options',
        options: (typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json) || q.options || [],
        correctOptionId: q.correct_answer || q.correctOptionId || null,
        points: q.points || 1
      }));
    }
    return [{ id: '1', text: '', type: 'options', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correctOptionId: 'a' }];
  });

  const addQuestion = (parentId?: string) => {
    const newQuestion: FlexibleQuestion = {
      id: Date.now().toString(),
      text: '',
      type: 'explain'
    };

    if (parentId) {
      const updateSubQuestions = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
        return qs.map(q => {
          if (q.id === parentId) {
            return { ...q, subQuestions: [...(q.subQuestions || []), newQuestion] };
          }
          if (q.subQuestions) {
            return { ...q, subQuestions: updateSubQuestions(q.subQuestions) };
          }
          return q;
        });
      };
      setQuestions(updateSubQuestions(questions));
    } else {
      setQuestions([...questions, newQuestion]);
    }
  };

  const removeQuestion = (id: string) => {
    const filterQuestions = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.filter(q => q.id !== id).map(q => ({
        ...q,
        subQuestions: q.subQuestions ? filterQuestions(q.subQuestions) : undefined
      }));
    };
    setQuestions(filterQuestions(questions));
  };

  const updateQuestion = (id: string, updates: Partial<FlexibleQuestion>) => {
    const updateQs = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.map(q => {
        if (q.id === id) {
          const newQ = { ...q, ...updates };
          if (updates.type === 'options' && !newQ.options) {
            newQ.options = [{ id: 'a', text: '' }, { id: 'b', text: '' }];
            newQ.correctOptionId = 'a';
          }
          if (updates.type === 'group' && !newQ.subQuestions) {
            newQ.subQuestions = [];
          }
          return newQ;
        }
        if (q.subQuestions) {
          return { ...q, subQuestions: updateQs(q.subQuestions) };
        }
        return q;
      });
    };
    setQuestions(updateQs(questions));
  };

  const addOption = (qId: string) => {
    const updateQs = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.map(q => {
        if (q.id === qId && q.options) {
          const nextId = String.fromCharCode(97 + q.options.length);
          return { ...q, options: [...q.options, { id: nextId, text: '' }] };
        }
        if (q.subQuestions) {
          return { ...q, subQuestions: updateQs(q.subQuestions) };
        }
        return q;
      });
    };
    setQuestions(updateQs(questions));
  };

  const updateOption = (qId: string, oIdx: number, text: string) => {
    const updateQs = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.map(q => {
        if (q.id === qId && q.options) {
          const newOptions = [...q.options];
          newOptions[oIdx] = { ...newOptions[oIdx], text };
          return { ...q, options: newOptions };
        }
        if (q.subQuestions) {
          return { ...q, subQuestions: updateQs(q.subQuestions) };
        }
        return q;
      });
    };
    setQuestions(updateQs(questions));
  };

  const totalQuestionPoints = useMemo(() => {
    const sumPoints = (qs: FlexibleQuestion[]): number =>
      qs.reduce((sum, q) => {
        const subSum = q.subQuestions ? sumPoints(q.subQuestions) : 0;
        return sum + (Number(q.points) || 0) + subSum;
      }, 0);
    return sumPoints(questions);
  }, [questions]);

  const pointsDiff = totalQuestionPoints - totalMarks;

  const handleSave = async (publish: boolean = false) => {
    if (passwordRequired && !examPassword.trim()) {
      alert('Please enter a password for the exam.');
      return;
    }

    const examQuestions = assignmentDetails.isDocumentOnly
      ? []
      : questions.map((question) => ({
        id: question.id,
        text: question.text,
        correctOptionId: question.correctOptionId || null,
        points: Number(question.points) || 1,
        options: question.options?.map((option) => ({ id: option.id, text: option.text })) || []
      }));

    try {
      if (role === 'teacher') {
        let examId: string;
        if (isEditing) {
          // UPDATE existing draft
          const updated = await updateTeacherExam(editingExam.id, {
            title: examData.title || `Untitled ${type}`,
            duration: Number(examData.durationMinutes || 60),
            totalMarks: Number(totalMarks || 100),
            subjectId: subjectId || undefined,
            classId: sectionId || undefined,
            questions: examQuestions,
            showScore,
            isGraded,
            assessmentType: isGraded ? assessmentType : null,
            examPassword: passwordRequired ? examPassword.trim() : null,
            passwordRequired,
          });
          examId = updated?.id || editingExam.id;
        } else {
          // CREATE new exam
          const created = await saveTeacherExam({
            classId: sectionId,
            title: examData.title || `Untitled ${type}`,
            examType: examData.category || 'Mid-term',
            totalMarks: Number(totalMarks || 100),
            duration: Number(examData.durationMinutes || 60),
            instructions: String(instructions || ''),
            gradeId,
            subjectId: subjectId || undefined,
            questions: examQuestions,
            showScore,
            isGraded,
            assessmentType: isGraded ? assessmentType : null,
            examPassword: passwordRequired ? examPassword.trim() : null,
            passwordRequired,
          });
          examId = created?.id;
        }

        if (publish && examId) {
          await publishTeacherExam(examId);
        }

        onSave();
      } else {
        await createExam({
          title: examData.title || `Untitled ${type}`,
          courseId: null,
          courseName: examData.courseName || 'General Course',
          category: examData.category as ExamCategory,
          durationMinutes: examData.durationMinutes || 60,
          questions: examQuestions
        });
        onSave();
      }
    } catch (error: any) {
      console.error('Exam save failed:', error);
      alert(error?.message || 'Could not save exam.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <X size={24} />
          </button>
          <h1 className="text-2xl font-bold dark:text-white">{isEditing ? `Edit ${type}` : `Create New ${type}`}</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={() => handleSave(false)} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Save size={20} />
            Save Draft
          </button>
          <button onClick={() => handleSave(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            Publish {type}
          </button>
        </div>
      </div>

      {/* Basic Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
        {/* Points tally banner */}
        {role === 'teacher' && questions.length > 0 && (
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-bold ${
            pointsDiff === 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 border border-amber-200 dark:border-amber-800'
          }`}>
            <span>Questions total: <span className="text-lg">{totalQuestionPoints}</span> pts</span>
            <span>Exam total: <span className="text-lg">{totalMarks}</span> pts</span>
            <span>{pointsDiff === 0 ? '✓ Balanced' : pointsDiff > 0 ? `${pointsDiff} pts over` : `${Math.abs(pointsDiff)} pts remaining`}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {role === 'teacher' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Grade</label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={gradeId} onChange={e => {
                  const val = e.target.value;
                  setGradeId(val);
                  setSectionId('');
                  setSubjectId('');
                  // Build sections for this grade from teacher's courses
                  const filtered = teacherCourses.filter((c: any) => String(c.grade_level || '') === val);
                  const sectionMap = new Map<string, any>();
                  filtered.forEach((c: any) => {
                    if (c.class_id && !sectionMap.has(c.class_id)) {
                      sectionMap.set(c.class_id, { id: c.class_id, name: c.section_name ? `Section ${c.section_name}` : c.class_name || c.class_id });
                    }
                  });
                  setSectionsForGrade(Array.from(sectionMap.values()));
                  setCoursesForSection([]);
                }}>
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Grade</option>
                  {gradesForExam.map(g => <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{g.name}</option>)}
                </select>
              </div>
            )}
            {role === 'teacher' && gradeId && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Section</label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={sectionId} onChange={e => {
                  const val = e.target.value;
                  setSectionId(val);
                  setSubjectId('');
                  // Courses taught in this specific class/section
                  setCoursesForSection(teacherCourses.filter((c: any) => c.class_id === val));
                }}>
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Section</option>
                  {sectionsForGrade.map(s => <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s.name}</option>)}
                </select>
              </div>
            )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Exam Title</label>
            <input
              type="text"
              placeholder="e.g. Mid-term Calculus"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
              value={examData.title}
              onChange={e => setExamData({ ...examData, title: e.target.value })}
            />
          </div>
          {/* Course Name removed — subject dropdown used instead */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
            <select
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              value={examData.category}
              onChange={e => setExamData({ ...examData, category: e.target.value as ExamCategory })}
            >
              <option value="Mid-term" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mid-term</option>
              <option value="Final" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Final</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration (Minutes)</label>
            <input
              type="number"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
              value={examData.durationMinutes}
              onChange={e => setExamData({ ...examData, durationMinutes: parseInt(e.target.value) })}
            />
          </div>
          {role === 'teacher' && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Marks</label>
                <input type="number" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value || 0))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Course / Subject</label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!sectionId}>
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{sectionId ? 'Select Subject' : 'Select a section first'}</option>
                  {coursesForSection.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name || c.title || c.course_name}</option>)}
                </select>
              </div>
              <div className="space-y-1 col-span-full">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Instructions for Students</label>
                <textarea rows={3} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Instructions for students..." />
              </div>

              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Show Score to Students</label>
                    <p className="text-xs text-slate-500">Allow students to see their score and percentage immediately after submission.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScore(!showScore)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showScore ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showScore ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Is Graded Exam?</label>
                    <p className="text-xs text-slate-500">Automatically sync results to student gradebook under an assessment type.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGraded(!isGraded)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isGraded ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isGraded ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {isGraded && (
                  <div className="space-y-1 col-span-full md:col-span-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assessment Type (Gradebook Category)</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                      value={assessmentType}
                      onChange={e => setAssessmentType(e.target.value)}
                    >
                      <option value="quiz-1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Quiz 1</option>
                      <option value="quiz-2" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Quiz 2</option>
                      <option value="test-1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Test 1</option>
                      <option value="mid-exam" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mid-Term Exam</option>
                      <option value="mid-assignment" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mid-Term Assignment</option>
                      <option value="assignment" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Assignment</option>
                      <option value="final-exam" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Final Exam</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Require Exam Password</label>
                    <p className="text-xs text-slate-500">Require students to enter a password to start or resume the exam.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasswordRequired(!passwordRequired)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      passwordRequired ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        passwordRequired ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {passwordRequired && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 col-span-full animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <Lock size={16} className="text-blue-500" />
                      <label className="text-sm font-semibold text-slate-900 dark:text-white">Exam Password</label>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter exam password (e.g. 123456)"
                      value={examPassword}
                      onChange={e => setExamPassword(e.target.value)}
                      className="w-full max-w-md px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-wider focus:border-blue-500 outline-none transition-colors"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Students must enter this password to start the exam and to resume if they reload or leave the page.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Type-Specific Form */}
      {type === 'Assignment' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              <h3 className="font-bold dark:text-white">Assignment Mode</h3>
            </div>
            <button
              onClick={() => setAssignmentDetails({ ...assignmentDetails, isDocumentOnly: !assignmentDetails.isDocumentOnly })}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${assignmentDetails.isDocumentOnly
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                }`}
            >
              {assignmentDetails.isDocumentOnly ? 'DOCUMENT-ONLY MODE ACTIVE' : 'SWITCH TO DOCUMENT-ONLY'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignment Description</label>
              <textarea
                rows={4}
                placeholder="Provide clear instructions for the assignment..."
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                value={assignmentDetails.description}
                onChange={e => setAssignmentDetails({ ...assignmentDetails, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Due Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                  value={assignmentDetails.dueDate}
                  onChange={e => setAssignmentDetails({ ...assignmentDetails, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supporting Document (Max 2MB)</label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors group cursor-pointer h-full min-h-[80px]">
                  <div className="text-center">
                    <Upload className="mx-auto text-slate-400 group-hover:text-blue-500 mb-2" size={24} />
                    <p className="text-xs text-slate-500">{assignmentDetails.fileName || 'Click to upload PDF or DOCX'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions Builder */}
      {(!assignmentDetails.isDocumentOnly || type === 'Exam') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold dark:text-white">Question Structure</h2>
            <button
              onClick={() => addQuestion()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-600 px-4 py-2 rounded-lg flex items-center gap-1 font-bold text-sm hover:shadow-sm transition-all"
            >
              <Plus size={18} /> New Root Question
            </button>
          </div>

          <div className="space-y-4 pb-20">
            {questions.map((q, idx) => (
              <QuestionNode
                key={q.id}
                q={q}
                index={idx}
                onUpdate={updateQuestion}
                onRemove={removeQuestion}
                onAddSub={addQuestion}
                onAddOption={addOption}
                onUpdateOption={updateOption}
              />
            ))}
            {questions.length === 0 && (
              <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <Plus className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">No questions added yet.</p>
                <button
                  onClick={() => addQuestion()}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  Add your first question
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionNode = ({
  q,
  level = 0,
  index,
  onUpdate,
  onRemove,
  onAddSub,
  onAddOption,
  onUpdateOption
}: {
  q: FlexibleQuestion,
  level?: number,
  index?: number,
  onUpdate: (id: string, updates: Partial<FlexibleQuestion>) => void,
  onRemove: (id: string) => void,
  onAddSub: (parentId?: string) => void,
  onAddOption: (qId: string) => void,
  onUpdateOption: (qId: string, oIdx: number, text: string) => void
}) => (
  <div className={`bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 relative group ${level > 0 ? 'ml-4 md:ml-8 mt-4' : ''}`}>
    <div className="flex items-start gap-2 md:gap-4">
      <span className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-bold shrink-0 text-xs md:text-sm">
        {level === 0 ? (index !== undefined ? index + 1 : '•') : '•'}
      </span>
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <input
            type="text"
            placeholder="Enter question text..."
            className="flex-1 text-lg font-medium bg-transparent border-none focus:ring-0 dark:text-white outline-none"
            value={q.text}
            onChange={e => onUpdate(q.id, { text: e.target.value })}
          />
          {/* Points input per question */}
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={0}
              placeholder="pts"
              className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold text-center"
              value={q.points ?? ''}
              onChange={e => onUpdate(q.id, { points: e.target.value === '' ? undefined : Number(e.target.value) })}
              title="Points for this question"
            />
            <span className="text-xs text-slate-400 font-medium">pts</span>
          </div>
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg p-1 border dark:border-slate-700">
            <button
              onClick={() => onUpdate(q.id, { type: 'explain' })}
              className={`p-1.5 rounded-md transition-all ${q.type === 'explain' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
              title="Explain Question"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => onUpdate(q.id, { type: 'options' })}
              className={`p-1.5 rounded-md transition-all ${q.type === 'options' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
              title="Multiple Choice"
            >
              <CheckSquare size={16} />
            </button>
            <button
              onClick={() => onUpdate(q.id, { type: 'group' })}
              className={`p-1.5 rounded-md transition-all ${q.type === 'group' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
              title="Question Group"
            >
              <Layers size={16} />
            </button>
          </div>
        </div>

        {q.type === 'options' && q.options && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
            {q.options.map((opt, oIdx) => (
              <div key={opt.id} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctOptionId === opt.id}
                  onChange={() => onUpdate(q.id, { correctOptionId: opt.id })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-400 font-medium uppercase">{opt.id}.</span>
                <input
                  type="text"
                  placeholder={`Option ${opt.id.toUpperCase()}`}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 dark:text-white"
                  value={opt.text}
                  onChange={e => onUpdateOption(q.id, oIdx, e.target.value)}
                />
              </div>
            ))}
            <button
              onClick={() => onAddOption(q.id)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Plus size={16} /> Add Option
            </button>
          </div>
        )}

        {q.type === 'group' && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            {q.subQuestions?.map(subQ => (
              <QuestionNode
                key={subQ.id}
                q={subQ}
                level={level + 1}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onAddSub={onAddSub}
                onAddOption={onAddOption}
                onUpdateOption={onUpdateOption}
              />
            ))}
            <button
              onClick={() => onAddSub(q.id)}
              className="flex items-center gap-2 text-sm text-blue-600 font-bold ml-8 hover:underline"
            >
              <Plus size={16} /> Add Sub-question
            </button>
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(q.id)}
        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={20} />
      </button>
    </div>
  </div>
);

export default Exams;
