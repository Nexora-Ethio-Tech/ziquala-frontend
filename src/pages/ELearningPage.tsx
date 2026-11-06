import { BookReader } from '../components/BookReader';
import { useTranslation } from 'react-i18next';
import { bookText } from '../utils/localizeBook';
import { publicText as uiText } from "../publicLocalization";
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BookCover } from '../components/BookCover';
import {
  BookOpen,
  Download,
  Filter,
  Library,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  eLearningGrades,
  eLearningLanguages,
  eLearningMaterialTypes,
  getGoogleDriveDownloadUrl,
  type ELearningBook,
} from '../data/eLearningData';
import { useUser } from '../context/UserContext';
import { eLearningService } from '../services/eLearningService';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const BookManagement = lazy(() => import('./ELearningManagement').then(module => ({ default: module.ELearningManagement })));

export const ELearningPage = () => {
  const { i18n } = useTranslation();
  const { role } = useUser();
  const canManage = role === 'academic-manager' || role === 'super-admin';
  const [managing, setManaging] = useState(false);
  const [books, setBooks] = useState<ELearningBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('All Grades');
  const [subject, setSubject] = useState('All Subjects');
  const [language, setLanguage] = useState('All Languages');
  const [materialType, setMaterialType] = useState('All Types');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (managing) return;
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    eLearningService.getBooks()
      .then((loadedBooks) => {
        if (!mounted) return;
        setBooks(loadedBooks);
      })
      .catch(() => {
        if (mounted) { setBooks([]); setLoadError(true); }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [managing, attempt]);

  const publishedBooks = useMemo(() => books.filter((book) => {
    if (book.status !== 'published') return false;
    if (['super-admin', 'academic-manager', 'school-admin', 'vice-principal', 'teacher', 'librarian'].includes(role || '')) return true;
    return book.audience === 'Public' || book.audience === 'Students';
  }), [books, role]);
  const selectedBook = publishedBooks.find(book => book.id === searchParams.get('book')) || null;
  const openBook = (book: ELearningBook) => {
    const next = new URLSearchParams(searchParams);
    next.set('book', book.id);
    setSearchParams(next, { state: { ...location.state, bookReaderFrom: location.pathname + location.search } });
  };
  const closeBook = () => {
    if (location.state?.bookReaderFrom) { navigate(-1); return; }
    const next = new URLSearchParams(searchParams);
    next.delete('book');
    setSearchParams(next, { replace: true });
  };
  const subjects = useMemo(() => {
    const visible = grade === 'All Grades' ? publishedBooks : publishedBooks.filter((book) => book.grade === grade);
    return Array.from(new Set(visible.map((book) => book.subject))).sort();
  }, [grade, publishedBooks]);

  const filteredBooks = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return publishedBooks.filter((book) => {
      const searchable = `${bookText(book, 'title')} ${book.title} ${book.author} ${uiText(book.subject)} ${book.subject} ${uiText(book.grade)} ${book.grade} ${uiText(book.language)} ${book.language} ${uiText(book.materialType)} ${book.materialType}`.toLocaleLowerCase();
      return (!search || searchable.includes(search))
        && (grade === 'All Grades' || book.grade === grade)
        && (subject === 'All Subjects' || book.subject === subject)
        && (language === 'All Languages' || book.language === language)
        && (materialType === 'All Types' || book.materialType === materialType);
    });
  }, [publishedBooks, query, grade, subject, language, materialType, i18n.language]);

  const clearFilters = () => {
    setQuery('');
    setGrade('All Grades');
    setSubject('All Subjects');
    setLanguage('All Languages');
    setMaterialType('All Types');
  };


  if (canManage && managing) return (
    <div className="px-4 py-6 sm:px-6">
      <button onClick={() => setManaging(false)} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-forest-800 px-4 py-3 text-sm font-bold text-white"><BookOpen size={18} />{uiText("copy.backToBooks")}</button>
      <Suspense fallback={<p role="status">{uiText("copy.loading")}</p>}><BookManagement /></Suspense>
    </div>
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-brand-gold-200 bg-brand-canvas dark:border-white/10">
        <div className="absolute right-0 top-0 hidden h-full w-1/2 dark:block bg-[radial-gradient(circle_at_top_right,rgba(5,90,64,.15),transparent_62%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 md:py-28">
          <div className="grid h-16 w-16 place-items-center rounded-xl border border-slate-200 bg-white text-brand-forest-900 dark:border-brand-forest-800 dark:bg-brand-forest-900 dark:text-white"><Library size={30} /></div>
          {canManage && <button onClick={() => setManaging(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-forest-800 px-5 py-3 text-sm font-bold text-white"><SlidersHorizontal size={18} />{uiText("copy.manageBooks")}</button>}
          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.digitalLearningLibrary")}</p>
          <h1 className="text-brand-heading mt-5 max-w-4xl text-5xl font-black leading-none tracking-[-0.045em] md:text-7xl">{uiText("copy.findTheRightBookFaster")}</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{uiText("copy.searchPartialBookNamesThenNarrowTheCatalogueByGradeSubjectLanguag")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 md:py-20">
        <div className="lg:sticky lg:top-40 xl:top-24 z-30 rounded-3xl border border-slate-200 bg-brand-surface p-5 shadow-xl shadow-slate-200/30 backdrop-blur-xl dark:border-white/10 dark:shadow-none">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={21} />
            <input aria-label={uiText("copy.searchPartOfATitleAuthorOrSubject")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={uiText("copy.searchPartOfATitleAuthorOrSubject")} className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm font-semibold outline-none focus:border-brand-forest-600 dark:border-slate-700 dark:bg-brand-forest-950" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select aria-label={uiText("copy.allGrades")} value={grade} onChange={(event) => { setGrade(event.target.value); setSubject('All Subjects'); }} className="rounded-xl border border-slate-200 bg-brand-surface px-3 py-3 text-sm font-bold dark:border-slate-700">
              <option value="All Grades">{uiText("copy.allGrades")}</option>
              {eLearningGrades.map((item) => <option key={item} value={item}>{uiText(item)}</option>)}
            </select>
            <select aria-label={uiText("copy.allSubjects")} value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl border border-slate-200 bg-brand-surface px-3 py-3 text-sm font-bold dark:border-slate-700">
              <option value="All Subjects">{uiText("copy.allSubjects")}</option>
              {subjects.map((item) => <option key={item} value={item}>{uiText(item)}</option>)}
            </select>
            <select aria-label={uiText("copy.allLanguages")} value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-xl border border-slate-200 bg-brand-surface px-3 py-3 text-sm font-bold dark:border-slate-700">
              <option value="All Languages">{uiText("copy.allLanguages")}</option>
              {eLearningLanguages.map((item) => <option key={item} value={item}>{uiText(item)}</option>)}
            </select>
            <select aria-label={uiText("copy.allTypes")} value={materialType} onChange={(event) => setMaterialType(event.target.value)} className="rounded-xl border border-slate-200 bg-brand-surface px-3 py-3 text-sm font-bold dark:border-slate-700">
              <option value="All Types">{uiText("copy.allTypes")}</option>
              {eLearningMaterialTypes.map((item) => <option key={item} value={item}>{uiText(item)}</option>)}
            </select>
            <button onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-600 dark:text-slate-300 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700">
              <X size={16} />{uiText(" copy.clearFilters")}</button>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.catalogueResults")}</p>
            <h2 className="text-brand-heading mt-2 text-2xl font-black">{uiText('library.resultCount', { count: filteredBooks.length })}</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 dark:bg-brand-forest-800"><Filter size={14} />{uiText(" copy.gradeSubjectBooks")}</div>
        </div>

        {!loading && !loadError && searchParams.has('book') && !selectedBook && (
          <div role="status" className="mt-8 rounded-2xl border border-slate-300 p-6 dark:border-slate-700">
            <p>{uiText('library.bookUnavailable')}</p>
            <button type="button" onClick={closeBook} className="mt-3 min-h-11 font-bold underline">{uiText('library.dismiss')}</button>
          </div>
        )}
        {loadError ? (
          <div role="alert" className="mt-8 rounded-3xl border border-slate-300 px-6 py-12 text-center dark:border-slate-700">
            <p>{uiText('library.loadError')}</p>
            <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 min-h-11 rounded-xl bg-brand-forest-800 px-5 py-3 font-bold text-white">{uiText('library.retry')}</button>
          </div>
        ) : loading ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 px-6 py-20 text-center text-sm font-bold text-slate-600 dark:text-slate-300 dark:border-slate-700">{uiText("copy.loadingBooks")}</div>
        ) : filteredBooks.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredBooks.map((book) => (
              <article key={book.id} className="min-w-0">
              <button onClick={() => openBook(book)} className="group w-full text-left">
                <div className="transition duration-300 group-hover:-translate-y-2"><BookCover book={book} /></div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-slate-200 bg-white dark:border-brand-forest-800 px-2 py-1 text-[9px] font-black uppercase text-brand-forest-800 dark:bg-brand-forest-900/30 dark:text-brand-forest-300">{uiText(book.grade)}</span>
                  <span className="rounded-full bg-brand-gold-100 px-2 py-1 text-[9px] font-black uppercase text-brand-gold-800 dark:bg-brand-gold-900/30 dark:text-brand-gold-300">{uiText(book.audience)}</span>
                </div>
                <h3 className="text-brand-heading mt-3 line-clamp-2 font-black leading-snug ">{bookText(book, 'title')}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{uiText(book.subject)}{uiText(" · ")}{uiText(book.language)}</p>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => openBook(book)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-forest-800 px-3 text-xs font-bold text-white"><BookOpen size={16} />{uiText("copy.readOnline")}</button>
                {book.allowDownload && getGoogleDriveDownloadUrl(book.driveUrl) && <a href={getGoogleDriveDownloadUrl(book.driveUrl)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold dark:border-slate-700"><Download size={16} />{uiText("copy.downloadBook")}</a>}
              </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 px-6 py-20 text-center dark:border-slate-700">
            <SlidersHorizontal className="mx-auto text-slate-400" size={35} />
            <p className="mt-4 text-lg font-black">{uiText(books.length === 0 ? "copy.noBooksAddedYet" : "copy.noBooksMatchTheseFilters")}</p>
            <button onClick={clearFilters} className="mt-3 text-sm font-black text-brand-forest-700">{uiText("copy.clearFiltersAndShowAllBooks")}</button>
          </div>
        )}

      </section>

      {selectedBook && <BookReader key={selectedBook.id} book={selectedBook} onClose={closeBook} />}

    </>
  );
};
