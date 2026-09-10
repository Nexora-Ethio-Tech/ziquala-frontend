import { uiText } from "../../../localization";
import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { ExamTimer } from './ExamTimer';

interface ExamProgressProps {
  title: string;
  variationCode?: string;
  totalQuestions: number;
  answeredCount: number;
  endTime: number;
  onTimeUp: () => void;
}

export const ExamProgress: React.FC<ExamProgressProps> = ({
  title,
  variationCode,
  totalQuestions,
  answeredCount,
  endTime,
  onTimeUp,
}) => {
  const percent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const allAnswered = answeredCount === totalQuestions;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Title + version */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <h1 className="text-sm font-black text-slate-800 dark:text-white truncate">{uiText(title)}</h1>
          {uiText(variationCode && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">{uiText("Version ")}{uiText(variationCode)}
            </span>
          ))}
        </div>

        {/* Progress pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {allAnswered ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : (
            <Circle size={14} className="text-slate-400" />
          )}
          <span className={`text-xs font-black ${allAnswered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {answeredCount}{uiText("/")}{totalQuestions}
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="hidden sm:block w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allAnswered ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Timer */}
        <ExamTimer endTime={endTime} onTimeUp={onTimeUp} />
      </div>

      {/* Thin overall progress bar at very bottom of header */}
      <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full transition-all duration-500 ${allAnswered ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
