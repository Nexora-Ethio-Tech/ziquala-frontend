import { uiText } from "../../../localization";
import React from 'react';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type?: string;
  options: Option[];
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  onSelectOption,
}) => {
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div
      id={`question-${questionNumber}`}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 scroll-mt-20 transition-all duration-200"
    >
      {/* Question Header */}
      <div className="flex items-start gap-4 mb-6">
        <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm shadow-md">
          {questionNumber}
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{uiText("Question ")}{questionNumber}{uiText(" of ")}{totalQuestions}
          </p>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
            {uiText(question.text)}
          </h3>
        </div>
        {uiText(selectedOptionId && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">{uiText("✓ Answered")}</span>
        ))}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id;
          const label = optionLabels[idx] || String(idx + 1);
          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left group ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                  : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700 bg-white dark:bg-slate-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
              }`}
            >
              {/* Letter label */}
              <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm transition-colors ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'
              }`}>
                {uiText(label)}
              </span>

              {/* Radio indicator */}
              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              {/* Option text */}
              <span className={`flex-1 text-base leading-relaxed transition-colors ${
                isSelected
                  ? 'text-blue-900 dark:text-blue-100 font-medium'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {uiText(option.text)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
