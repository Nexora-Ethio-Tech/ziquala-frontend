import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { bookText } from '../utils/localizeBook';
import { publicText as uiText } from '../publicLocalization';
import type { ELearningBook } from '../data/eLearningData';

export const BookCover = ({ book, compact = false }: { book: ELearningBook; compact?: boolean }) => {
  useTranslation('public');
  return (
  <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${book.coverClass} text-white shadow-xl ${compact ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
    <div className="absolute inset-y-0 left-0 w-3 bg-black/20" />
    <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.2),transparent_28%,rgba(0,0,0,.2))]" />
    <div className="relative flex h-full flex-col p-5">
      <p className="w-fit rounded bg-slate-950/80 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">{uiText(book.grade)}</p>
      <div className="my-auto">
        <BookOpen className="mb-4 text-white/80" size={compact ? 24 : 32} />
        <p className={`${compact ? 'text-base' : 'text-xl'} rounded bg-slate-950/80 p-2 font-black leading-tight`}>{bookText(book, 'title')}</p>
      </div>
      <p className="w-fit rounded bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-white">{uiText(book.subject)}</p>
    </div>
  </div>
);
};

