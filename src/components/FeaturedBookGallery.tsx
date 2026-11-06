import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { BookCover } from './BookCover';
import { bookText } from '../utils/localizeBook';
import { publicText as uiText } from '../publicLocalization';
import type { ELearningBook } from '../data/eLearningData';
import { eLearningService } from '../services/eLearningService';

export const FeaturedBookGallery = () => {
  useTranslation('public');
  const [books, setBooks] = useState<ELearningBook[]>([]);
  const sentinel = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '600px' });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport) return;
    let active = true;
    setLoadError(false);
    eLearningService.getBooks().then(loaded => { if (active) setBooks(loaded); }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [nearViewport, attempt]);

  const featured = books.filter((book) => book.status === 'published' && book.featured).slice(0, 5);
  if (loadError) return (
    <div role="alert" className="mx-auto max-w-7xl px-5 py-12 text-slate-600 dark:text-slate-300">
      <p>{uiText('library.loadError')}</p>
      <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-3 min-h-11 rounded-xl bg-brand-forest-800 px-5 py-3 font-bold text-white">{uiText('library.retry')}</button>
    </div>
  );
  if (featured.length === 0) return <div ref={sentinel} aria-hidden="true" />;

  return (
    <section className="border-y border-slate-200 bg-brand-surface dark:border-white/10">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 md:py-28">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.digitalBookshelf")}</p>
            <h2 className="text-brand-heading mt-4 text-3xl font-black tracking-tight md:text-5xl">{uiText("copy.exploreBooksFromTheELearningLibrary")}</h2>
            <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{uiText("copy.browseByGradeAndSubjectOrDiscoverMaterialSharedAcrossTheWholeScho")}</p>
          </div>
          <Link to="/elearning" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-forest-900 px-5 py-3 text-sm font-black text-white">{uiText("copy.openFullLibrary ")}<BookOpen size={17} />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {featured.map((book) => (
            <Link key={book.id} to={`/elearning?book=${encodeURIComponent(book.id)}`} className="group">
              <div className="transition duration-300 group-hover:-translate-y-2"><BookCover book={book} compact /></div>
              <p className="mt-4 line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{bookText(book, 'title')}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{uiText(book.grade)}{uiText(" · ")}{uiText(book.subject)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

