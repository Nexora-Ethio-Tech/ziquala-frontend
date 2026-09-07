import { uiError, uiText } from "../../localization";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Lock, StopCircle, Send, CheckCircle2, KeyRound, XCircle } from 'lucide-react';
import { ExamProgress } from './components/ExamProgress';
import { QuestionCard } from './components/QuestionCard';
import { SubmitOverlay } from './components/SubmitOverlay';
import { useAntiCheat } from './hooks/useAntiCheat';
import {
  getExamById, startExamSession, saveExamAnswer,
  submitExam, verifyExamPassword, validateResetPin, terminateExam,
} from '../../services/examService';
import type { ExamDetail } from '../../services/examService';

type ScreenState = 'loading' | 'error' | 'pre-start' | 'password' | 'active' | 'terminated' | 'submitted';

export const ExamSession: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<ScreenState>('loading');
  const [examDetail, setExamDetail] = useState<ExamDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [examEndTime, setExamEndTime] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variationCode, setVariationCode] = useState('');

  // Warning modal
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState('');

  // Submit overlay
  const [submitStatus, setSubmitStatus] = useState<'submitting' | 'success' | 'error' | null>(null);
  const [finalScore, setFinalScore] = useState<{ score: number; total: number; pct: number } | null>(null);

  // Password
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Reset PIN (after termination)
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Stop confirm
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const submittingRef = useRef(false);
  const STORAGE_KEY = `exam_session_${examId}`;

  // ── Load exam ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        const data = await getExamById(examId);
        setExamDetail(data);
        setVariationCode(data.variationCode || '');
        setAnswers(data.savedAnswers || {});

        const dur = Number(data.exam.durationMinutes) * 60 * 1000;
        const end = data.session.endTime || (Date.now() + dur);
        setExamEndTime(end);

        // Restore from localStorage if available
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const p = JSON.parse(saved);
            setAnswers(p.answers || data.savedAnswers || {});
            if (p.endTime) setExamEndTime(p.endTime);
          } catch { /* ignore */ }
        }

        if (data.session.status === 'submitted') {
          setScreen('submitted');
          if (data.session.finalScore !== null && data.session.finalScore !== undefined) {
            setFinalScore({
              score: 0,
              total: 0,
              pct: Math.round(Number(data.session.finalScore))
            });
          }
        } else if (data.session.status === 'terminated') {
          setScreen('terminated');
        } else if (data.session.status === 'active') {
          // Resume active session
          setSessionId(data.session.id);
          if (data.exam.passwordRequired) {
            setScreen('password');
          } else {
            setScreen('active');
          }
        } else {
          setScreen('pre-start');
        }
      } catch (err: any) {
        setLoadError(err?.message || 'Unable to load exam.');
        setScreen('error');
      }
    })();
  }, [examId]);

  // ── Persist answers locally ────────────────────────────────────────────────
  useEffect(() => {
    if (screen === 'active' && examEndTime > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, endTime: examEndTime }));
    }
  }, [answers, examEndTime, screen, STORAGE_KEY]);

  // ── Warn before unload ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (screen === 'active') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [screen]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!examId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitStatus('submitting');
    try {
      const result = await submitExam(examId);
      localStorage.removeItem(STORAGE_KEY);
      setFinalScore({
        score: result.score,
        total: result.total_marks,
        pct: Math.round(result.percentage),
      });
      setSubmitStatus('success');
      setScreen('submitted');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch {
      setSubmitStatus('error');
      submittingRef.current = false;
    }
  }, [examId, STORAGE_KEY]);

  const handleTimeUp = useCallback(() => { handleSubmit(); }, [handleSubmit]);

  const handleSelectOption = useCallback(async (questionId: string, optionId: string) => {
    if (!examId) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    try {
      await saveExamAnswer(examId, questionId, optionId, sessionId || undefined);
    } catch { /* best-effort */ }
  }, [examId, sessionId]);

  const handleStop = useCallback(async () => {
    if (!examId || submittingRef.current) return;
    submittingRef.current = true;
    setShowStopConfirm(false);
    setSubmitStatus('submitting');
    try {
      await terminateExam(examId, 'manual_stop');
      localStorage.removeItem(STORAGE_KEY);
      setSubmitStatus('success');
      setScreen('submitted');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch {
      setSubmitStatus('error');
      submittingRef.current = false;
    }
  }, [examId, STORAGE_KEY]);

  // Anti-cheat callbacks
  const onWarning = useCallback((count: number, type: string) => {
    setWarningCount(count);
    setWarningType(type);
    setShowWarning(true);
  }, []);

  const onTerminate = useCallback(() => {
    setScreen('terminated');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const { requestFullscreen, exitFullscreen } = useAntiCheat({
    examId: examId || '',
    enabled: screen === 'active',
    onWarning,
    onTerminate,
  });

  // ── Start exam ─────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!examId) return;
    try {
      const session = await startExamSession(examId);
      setSessionId(session?.id || null);
      const dur = Number(examDetail?.exam.durationMinutes || 60) * 60 * 1000;
      const end = session?.session_start
        ? new Date(session.session_start).getTime() + dur
        : Date.now() + dur;
      setExamEndTime(end);
      setScreen('active');
      requestFullscreen();
    } catch (err: any) {
      alert(uiError(err?.message || 'Failed to start exam.'));
    }
  }, [examId, examDetail, requestFullscreen]);

  const handlePasswordSubmit = useCallback(async () => {
    if (!examId || !passwordInput.trim()) return;
    setPasswordError('');
    try {
      const result = await verifyExamPassword(examId, passwordInput.trim());
      setSessionId(result?.session?.id || null);
      
      // If the session was already active before, preserve the endTime
      if (examDetail?.session?.status !== 'active') {
        const dur = Number(examDetail?.exam.durationMinutes || 60) * 60 * 1000;
        setExamEndTime(Date.now() + dur);
      }
      
      setPasswordInput('');
      setScreen('active');
      requestFullscreen();
    } catch {
      setPasswordError('Incorrect password. Please try again.');
    }
  }, [examId, passwordInput, examDetail, requestFullscreen]);

  const handlePinSubmit = useCallback(async () => {
    if (!examId || !pinInput.trim()) return;
    setPinError('');
    setPinLoading(true);
    try {
      const ok = await validateResetPin(examId, pinInput.trim());
      if (ok) {
        setPinInput('');
        // Reload exam detail to get refreshed session
        const data = await getExamById(examId);
        setExamDetail(data);
        setAnswers(data.savedAnswers || {});
        const dur = Number(data.exam.durationMinutes) * 60 * 1000;
        setExamEndTime(Date.now() + dur);
        setScreen('active');
        requestFullscreen();
      } else {
        setPinError('Invalid or expired PIN. Ask your teacher for a new one.');
      }
    } catch {
      setPinError('Invalid PIN.');
    } finally {
      setPinLoading(false);
    }
  }, [examId, pinInput, requestFullscreen]);

  const questions = useMemo(() => examDetail?.questions || [], [examDetail]);
  const answeredCount = useMemo(
    () => questions.filter(q => answers[q.id] !== undefined).length,
    [questions, answers]
  );

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">{uiText("Loading exam...")}</p>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{uiText("Unable to Load Exam")}</h2>
          <p className="text-slate-400 mb-6">{uiError(loadError)}</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold">{uiText("Go Back")}</button>
        </div>
      </div>
    );
  }

  if (screen === 'submitted') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 text-center border border-slate-700">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">{uiText("Exam Complete")}</h2>
          <p className="text-slate-400 mb-6">
            {uiText(examDetail?.exam?.showScore === false
              ? 'Your answers have been saved successfully. The teacher has chosen to hide scores for this exam.'
              : 'Your answers have been saved and graded.')}
          </p>
          {finalScore && examDetail?.exam?.showScore !== false && (
            <div className="bg-slate-700/50 rounded-2xl p-6 mb-6">
              <p className="text-slate-400 text-sm font-medium mb-1">{uiText("Your Score")}</p>
              <p className="text-5xl font-black text-white">{finalScore.pct}<span className="text-2xl text-slate-400">{uiText("%")}</span></p>
              {finalScore.total > 0 && (
                <p className="text-slate-400 text-sm mt-1">{finalScore.score}{uiText(" / ")}{finalScore.total}{uiText(" marks")}</p>
              )}
              <div className="mt-4 h-3 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${finalScore.pct >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${finalScore.pct}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={() => { exitFullscreen(); navigate('/exams'); }}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-colors"
          >{uiText("Return to Exams")}</button>
        </div>
      </div>
    );
  }

  if (screen === 'terminated') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 text-center border-2 border-red-500/50">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{uiText("Exam Terminated")}</h2>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">{uiText("Your exam session was terminated due to security violations. Contact your teacher for a reset PIN to regain access.")}</p>

          <div className="space-y-3 mb-6">
            <label className="block text-left text-xs font-black text-slate-400 uppercase tracking-widest">{uiText("Enter Teacher Reset PIN")}</label>
            <input
              type="text"
              placeholder={uiText("Enter PIN (e.g. 1234)")}
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
              className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 focus:border-blue-500 rounded-xl text-white text-center font-mono text-lg tracking-widest outline-none transition-colors"
            />
            {uiText(pinError && <p className="text-red-400 text-sm font-medium">{uiError(pinError)}</p>)}
            <button
              onClick={handlePinSubmit}
              disabled={pinLoading || !pinInput.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-xl font-bold transition-colors"
            >
              {uiText(pinLoading ? 'Verifying...' : 'Unlock with PIN')}
            </button>
          </div>

          <button
            onClick={() => { exitFullscreen(); navigate('/exams'); }}
            className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
          >{uiText("Return to Exams List")}</button>
        </div>
      </div>
    );
  }

  if (screen === 'pre-start') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{uiText(examDetail?.exam.title)}</h2>
          {uiText(variationCode && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-900/40 text-indigo-400 text-xs font-black uppercase tracking-widest border border-indigo-700/50 mb-4">{uiText("Version ")}{uiText(variationCode)}
            </span>
          ))}
          <div className="bg-slate-800 rounded-2xl p-6 text-left mb-8 space-y-3 border border-slate-700">
            <h3 className="text-slate-300 font-black text-xs uppercase tracking-widest mb-4">{uiText("Exam Rules")}</h3>
            {[
              'Do not switch browser tabs or minimize the window.',
              'The exam runs in fullscreen mode.',
              '3 security violations will automatically terminate your exam.',
              `Duration: ${examDetail?.exam.durationMinutes} minutes.`,
              'All questions are displayed on one page – scroll to answer.',
            ].map((rule, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-blue-400 font-black mt-0.5">{uiText("•")}</span>
                <span className="text-slate-400 text-sm">{uiText(rule)}</span>
              </div>
            ))}
            {uiText(examDetail?.exam.instructions && (
              <div className="pt-3 border-t border-slate-700">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{uiText("Instructions")}</p>
                <p className="text-slate-300 text-sm">{uiText(examDetail.exam.instructions)}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => examDetail?.exam.passwordRequired ? setScreen('password') : handleStart()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >{uiText("Start Exam")}</button>
        </div>
      </div>
    );
  }

  if (screen === 'password') {
    const isResuming = examDetail?.session?.status === 'active';
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-800 rounded-3xl p-8 text-center border border-slate-700">
          <KeyRound className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2">
            {uiText(isResuming ? 'Exam Resume Locked' : 'Exam Password Required')}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {uiText(isResuming
              ? 'You left the exam page. The teacher must enter the password to allow you to resume.'
              : 'Your teacher has set a password for this exam.')}
          </p>
          <input
            type="password"
            placeholder={uiText("Enter exam password")}
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
            autoFocus
            className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 focus:border-blue-500 rounded-xl text-white text-center font-mono tracking-widest outline-none transition-colors mb-3"
          />
          {uiText(passwordError && <p className="text-red-400 text-sm mb-3">{uiError(passwordError)}</p>)}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (isResuming) {
                  navigate('/exams');
                } else {
                  setScreen('pre-start');
                }
              }}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors"
            >
              {uiText(isResuming ? 'Cancel' : 'Back')}
            </button>
            <button
              onClick={handlePasswordSubmit}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
            >
              {uiText(isResuming ? 'Verify & Resume' : 'Verify & Start')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE exam ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Warning modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{uiText("Security Warning ")}{warningCount}{uiText("/3")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{uiText("Detected: ")}<span className="font-semibold text-slate-800 dark:text-slate-200">{uiText(warningType)}</span>
            </p>
            <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-6">
              {uiText(warningCount === 2 ? '⚠ Next violation will terminate your exam!' : 'Stay on this page to avoid penalties.')}
            </p>
            <button
              onClick={() => { setShowWarning(false); requestFullscreen(); }}
              className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >{uiText("I Understand – Resume")}</button>
          </div>
        </div>
      )}

      {/* Stop confirm modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <StopCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{uiText("Stop Exam?")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{uiText("Your answers so far will be saved and scored. This action cannot be undone.")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowStopConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{uiText("Continue Exam")}</button>
              <button onClick={handleStop} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors">{uiText("Stop & Save")}</button>
            </div>
          </div>
        </div>
      )}

      <SubmitOverlay
        status={submitStatus}
        onRetry={() => { submittingRef.current = false; handleSubmit(); }}
        onClose={() => { exitFullscreen(); navigate('/exams'); }}
      />

      {/* Sticky progress header */}
      <ExamProgress
        title={uiText(examDetail?.exam.title || '')}
        variationCode={variationCode}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        endTime={examEndTime}
        onTimeUp={handleTimeUp}
      />

      {/* Questions – all on one scrollable page */}
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-32 space-y-6">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            questionNumber={idx + 1}
            totalQuestions={questions.length}
            selectedOptionId={answers[q.id]}
            onSelectOption={(optId) => handleSelectOption(q.id, optId)}
          />
        ))}
        {questions.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="font-medium">{uiText("No questions found for this exam.")}</p>
          </div>
        )}
      </main>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* Stop Exam – bottom left */}
          <button
            onClick={() => setShowStopConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl font-bold text-sm transition-colors"
          >
            <StopCircle size={16} />{uiText("Stop Exam")}</button>

          {/* Answered progress – center */}
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {answeredCount}{uiText(" of ")}{questions.length}{uiText(" answered")}</span>

          {/* Finish – bottom right */}
          <button
            onClick={handleSubmit}
            disabled={submittingRef.current}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-colors"
          >
            <Send size={16} />{uiText("Finish Exam")}</button>
        </div>
      </div>
    </div>
  );
};
