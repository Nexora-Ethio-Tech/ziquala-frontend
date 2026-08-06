import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  Filter,
  Library,
  Maximize2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ELEARNING_UPDATED_EVENT,
  eLearningGrades,
  eLearningLanguages,
  eLearningMaterialTypes,
  getGoogleDrivePreviewUrl,
  loadELearningBooks,
  type ELearningBook,
} from '../data/eLearningData';
import { useUser } from '../context/UserContext';

const BookCover = ({ book, compact = false }: { book: ELearningBook; compact?: boolean }) => (
  <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${book.coverClass} text-white shadow-xl ${compact ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
    <div className="absolute inset-y-0 left-0 w-3 bg-black/20" />
    <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.2),transparent_28%,rgba(0,0,0,.2))]" />
    <div className="relative flex h-full flex-col p-5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">{book.grade}</p>
      <div className="my-auto">
        <BookOpen className="mb-4 text-white/80" size={compact ? 24 : 32} />
        <p className={`${compact ? 'text-base' : 'text-xl'} font-black leading-tight`}>{book.title}</p>
      </div>
      <p className="text-[10px] font-bold text-white/70">{book.subject}</p>
    </div>
  </div>
);

export const FeaturedBookGallery = () => {
  const [books, setBooks] = useState(loadELearningBooks);

  useEffect(() => {
    const reload = () => setBooks(loadELearningBooks());
    window.addEventListener(ELEARNING_UPDATED_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(ELEARNING_UPDATED_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  const featured = books.filter((book) => book.status === 'published' && book.featured).slice(0, 5);
  if (featured.length === 0) return null;

  return (
    <section className="border-y border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/50">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 md:py-28">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">Digital bookshelf</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">Explore books from the eLearning library.</h2>
            <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">Browse by grade and subject, or discover material shared across the whole school.</p>
          </div>
          <Link to="/elearning" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-black text-white">
            Open full library <BookOpen size={17} />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {featured.map((book) => (
            <Link key={book.id} to={`/elearning?book=${encodeURIComponent(book.id)}`} className="group">
              <div className="transition duration-300 group-hover:-translate-y-2"><BookCover book={book} compact /></div>
              <p className="mt-4 line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{book.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{book.grade} · {book.subject}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ELearningPage = () => {
  const { role } = useUser();
  const [books, setBooks] = useState(loadELearningBooks);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('All Grades');
  const [subject, setSubject] = useState('All Subjects');
  const [language, setLanguage] = useState('All Languages');
  const [materialType, setMaterialType] = useState('All Types');
  const [selectedBook, setSelectedBook] = useState<ELearningBook | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reload = () => setBooks(loadELearningBooks());
    window.addEventListener(ELEARNING_UPDATED_EVENT, reload);
    window.addEventListener('storage', reload);
    const bookId = new URLSearchParams(window.location.search).get('book');
    if (bookId) {
      const match = loadELearningBooks().find((book) => book.id === bookId && book.status === 'published');
      if (match) setSelectedBook(match);
    }
    return () => {
      window.removeEventListener(ELEARNING_UPDATED_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  const publishedBooks = useMemo(() => books.filter((book) => {
    if (book.status !== 'published') return false;
    if (['super-admin', 'academic-manager', 'school-admin', 'vice-principal', 'teacher', 'librarian'].includes(role || '')) return true;
    return book.audience === 'Public' || book.audience === 'Students';
  }), [books, role]);
  const subjects = useMemo(() => {
    const visible = grade === 'All Grades' ? publishedBooks : publishedBooks.filter((book) => book.grade === grade);
    return Array.from(new Set(visible.map((book) => book.subject))).sort();
  }, [grade, publishedBooks]);

  const filteredBooks = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return publishedBooks.filter((book) => {
      const searchable = `${book.title} ${book.author} ${book.subject} ${book.grade} ${book.language} ${book.materialType}`.toLocaleLowerCase();
      return (!search || searchable.includes(search))
        && (grade === 'All Grades' || book.grade === grade)
        && (subject === 'All Subjects' || book.subject === subject)
        && (language === 'All Languages' || book.language === language)
        && (materialType === 'All Types' || book.materialType === materialType);
    });
  }, [publishedBooks, query, grade, subject, language, materialType]);

  const clearFilters = () => {
    setQuery('');
    setGrade('All Grades');
    setSubject('All Subjects');
    setLanguage('All Languages');
    setMaterialType('All Types');
  };

  const previewUrl = selectedBook ? getGoogleDrivePreviewUrl(selectedBook.driveUrl) : '';

  return (
    <>
      <section className="relative overflow-hidden border-b border-amber-200 bg-amber-50 dark:border-white/10 dark:bg-slate-900">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(5,90,64,.15),transparent_62%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 md:py-28">
          <div className="grid h-16 w-16 place-items-center rounded-xl bg-emerald-900 text-white"><Library size={30} /></div>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-emerald-800 dark:text-emerald-400">Digital learning library</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-none tracking-[-0.045em] text-slate-950 dark:text-white md:text-7xl">Find the right book, faster.</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">Search partial book names, then narrow the catalogue by grade, subject, language, or material type. Shared books remain available in their own collection.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 md:py-20">
        <div className="sticky top-24 z-30 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/30 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-none">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={21} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search part of a title, author, or subject…" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-semibold outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select value={grade} onChange={(event) => { setGrade(event.target.value); setSubject('All Subjects'); }} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
              <option>All Grades</option>
              {eLearningGrades.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
              <option>All Subjects</option>
              {subjects.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
              <option>All Languages</option>
              {eLearningLanguages.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={materialType} onChange={(event) => setMaterialType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
              <option>All Types</option>
              {eLearningMaterialTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700">
              <X size={16} /> Clear filters
            </button>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Catalogue results</p>
            <h2 className="mt-2 text-2xl font-black">{filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} found</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 dark:bg-slate-800"><Filter size={14} /> Grade → Subject → Books</div>
        </div>

        {filteredBooks.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredBooks.map((book) => (
              <button key={book.id} onClick={() => setSelectedBook(book)} className="group text-left">
                <div className="transition duration-300 group-hover:-translate-y-2"><BookCover book={book} /></div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{book.grade}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{book.audience}</span>
                </div>
                <h3 className="mt-3 line-clamp-2 font-black leading-snug text-slate-950 group-hover:text-emerald-800 dark:text-white dark:group-hover:text-emerald-300">{book.title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{book.subject} · {book.language}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 px-6 py-20 text-center dark:border-slate-700">
            <SlidersHorizontal className="mx-auto text-slate-400" size={35} />
            <p className="mt-4 text-lg font-black">No books match these filters</p>
            <button onClick={clearFilters} className="mt-3 text-sm font-black text-emerald-700">Clear filters and show all books</button>
          </div>
        )}

      </section>

      {selectedBook && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null); }}>
          <div ref={viewerRef} className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <p className="truncate font-black">{selectedBook.title}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{selectedBook.grade} · {selectedBook.subject} · {selectedBook.materialType}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => viewerRef.current?.requestFullscreen()} title="Fullscreen" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"><Maximize2 size={18} /></button>
                {selectedBook.driveUrl && <a href={selectedBook.driveUrl} target="_blank" rel="noreferrer" title="Open in Google Drive" className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"><ExternalLink size={18} /></a>}
                <button onClick={() => setSelectedBook(null)} title="Close viewer" className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"><X size={19} /></button>
              </div>
            </div>
            {previewUrl ? (
              <iframe src={previewUrl} title={selectedBook.title} allow="fullscreen" className="min-h-0 flex-1 bg-slate-100" />
            ) : (
              <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto bg-slate-100 p-8 dark:bg-slate-900">
                <div className="max-w-md text-center">
                  <div className="mx-auto w-44"><BookCover book={selectedBook} /></div>
                  <h2 className="mt-7 text-2xl font-black">Preview link not added yet</h2>
                  <p className="mt-3 leading-7 text-slate-500">This is a demo catalogue entry. The Academic Manager can paste the approved Google Drive link from eLearning Management.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
