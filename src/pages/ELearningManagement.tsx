import { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  eLearningAudiences,
  eLearningGrades,
  eLearningLanguages,
  eLearningMaterialTypes,
  eLearningSubjects,
  extractGoogleDriveFileId,
  loadELearningBooks,
  saveELearningBooks,
  type ELearningBook,
  type ELearningStatus,
} from '../data/eLearningData';

type BookForm = Omit<ELearningBook, 'id' | 'createdAt' | 'updatedAt' | 'coverClass'>;

const emptyForm: BookForm = {
  title: '',
  author: '',
  grade: 'Grade 1',
  subject: 'English',
  language: 'Amharic',
  materialType: 'Student Textbook',
  audience: 'Students',
  description: '',
  driveUrl: '',
  status: 'draft',
  featured: false,
  allowDownload: false,
};

const coverClasses = [
  'from-emerald-400 via-emerald-700 to-teal-950',
  'from-sky-400 via-blue-700 to-indigo-950',
  'from-amber-500 via-orange-600 to-rose-800',
  'from-fuchsia-600 via-purple-700 to-indigo-950',
  'from-yellow-400 via-amber-600 to-stone-900',
];

export const ELearningManagement = () => {
  const [books, setBooks] = useState(loadELearningBooks);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const persist = (next: ELearningBook[], message: string) => {
    setBooks(next);
    saveELearningBooks(next);
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return books.filter((book) => !search || `${book.title} ${book.subject} ${book.grade} ${book.author}`.toLowerCase().includes(search));
  }, [books, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (book: ELearningBook) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, coverClass: _coverClass, ...editable } = book;
    setEditingId(book.id);
    setForm(editable);
    setFormError('');
    setShowForm(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.subject || !form.grade) {
      setFormError('Title, grade collection, and subject are required.');
      return;
    }
    if (form.driveUrl && !extractGoogleDriveFileId(form.driveUrl)) {
      setFormError('Paste a valid Google Drive file link, such as /file/d/FILE_ID/view.');
      return;
    }
    if (form.driveUrl) {
      const fileId = extractGoogleDriveFileId(form.driveUrl);
      const duplicate = books.find((book) => book.id !== editingId && extractGoogleDriveFileId(book.driveUrl) === fileId);
      if (duplicate) {
        setFormError(`That Drive file is already catalogued as “${duplicate.title}”.`);
        return;
      }
    }

    const timestamp = new Date().toISOString();
    if (editingId) {
      const next = books.map((book) => book.id === editingId ? { ...book, ...form, updatedAt: timestamp } : book);
      persist(next, 'Book details updated.');
    } else {
      const created: ELearningBook = {
        ...form,
        id: `book-${Date.now()}`,
        coverClass: coverClasses[books.length % coverClasses.length],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      persist([created, ...books], form.status === 'published' ? 'Book published to the gallery.' : 'Book saved as a draft.');
    }
    setShowForm(false);
  };

  const updateStatus = (book: ELearningBook, status: ELearningStatus) => {
    const next = books.map((item) => item.id === book.id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
    persist(next, status === 'published' ? 'Book published.' : status === 'archived' ? 'Book archived.' : 'Book moved to drafts.');
  };

  const toggleFeatured = (book: ELearningBook) => {
    const next = books.map((item) => item.id === book.id ? { ...item, featured: !item.featured, updatedAt: new Date().toISOString() } : item);
    persist(next, book.featured ? 'Removed from landing-page gallery.' : 'Added to landing-page gallery.');
  };

  const deleteBook = (book: ELearningBook) => {
    if (!window.confirm(`Remove “${book.title}” from this demo catalogue?`)) return;
    persist(books.filter((item) => item.id !== book.id), 'Book removed from the catalogue.');
  };

  const stats = {
    published: books.filter((book) => book.status === 'published').length,
    drafts: books.filter((book) => book.status === 'draft').length,
    shared: books.filter((book) => book.grade === 'Shared Books' && book.status === 'published').length,
    linked: books.filter((book) => Boolean(extractGoogleDriveFileId(book.driveUrl))).length,
  };
  const statCards = [
    { label: 'Published books', value: stats.published, icon: Eye },
    { label: 'Drafts', value: stats.drafts, icon: Edit3 },
    { label: 'Shared books', value: stats.shared, icon: Sparkles },
    { label: 'Drive links added', value: stats.linked, icon: Link2 },
  ];
  const galleryBooks = books.filter((book) => book.status === 'published' && book.featured).slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 p-8 text-white shadow-2xl md:p-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[44px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]"><BookOpen size={14} /> Academic Manager workspace</div>
            <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">eLearning Management</h1>
            <p className="mt-4 max-w-2xl leading-7 text-emerald-50/80">Ingest approved Google Drive links, classify books by grade and subject, manage Shared Books, and control what appears publicly.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 shadow-lg"><Plus size={18} /> Add Drive book</button>
        </div>
      </section>

      {notice && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"><CheckCircle2 size={18} /> {notice}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.label}</p><item.icon size={19} className="text-emerald-700" /></div>
            <p className="mt-4 text-3xl font-black">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Visual preview</p>
            <h2 className="mt-2 text-2xl font-black">Landing-page book gallery</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Published books marked as featured appear here and on the public homepage.</p>
          </div>
          <span className="text-xs font-black text-slate-400">{galleryBooks.length} featured</span>
        </div>

        {galleryBooks.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {galleryBooks.map((book) => (
              <button key={book.id} type="button" onClick={() => openEdit(book)} className="group min-w-0 text-left" title={`Edit ${book.title}`}>
                <div className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-gradient-to-br ${book.coverClass} p-4 text-white shadow-lg transition duration-300 group-hover:-translate-y-1`}>
                  <div className="absolute inset-y-0 left-0 w-2 bg-black/20" />
                  <div className="relative flex h-full flex-col">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/70">{book.grade}</p>
                    <div className="my-auto">
                      <BookOpen size={25} className="mb-3 text-white/80" />
                      <p className="line-clamp-3 text-sm font-black leading-tight">{book.title}</p>
                    </div>
                    <p className="truncate text-[9px] font-bold text-white/70">{book.subject}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{book.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Click to edit</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm font-bold text-slate-500 dark:border-slate-700">Mark a published book as featured to place it in the gallery.</div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-black">Book catalogue</h2><p className="mt-1 text-xs font-semibold text-slate-500">Draft, publish, feature, archive, or edit every digital book.</p></div>
          <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950" /></div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((book) => (
            <article key={book.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex min-w-0 gap-4">
                <div className={`grid h-24 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${book.coverClass} text-white shadow-md`}><BookOpen size={22} /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-900 dark:text-white">{book.title}</h3>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${book.status === 'published' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : book.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600 dark:bg-slate-800'}`}>{book.status}</span>
                    {book.featured && <span className="rounded-full bg-purple-100 px-2 py-1 text-[9px] font-black uppercase text-purple-800">Landing gallery</span>}
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">{book.grade} · {book.subject} · {book.language} · {book.materialType}</p>
                  <p className="mt-2 line-clamp-1 text-sm text-slate-500">{book.description}</p>
                  <p className={`mt-2 text-[10px] font-black uppercase ${book.driveUrl ? 'text-emerald-700' : 'text-amber-700'}`}>{book.driveUrl ? 'Drive preview connected' : 'Demo entry — Drive link pending'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {book.driveUrl && <a href={book.driveUrl} target="_blank" rel="noreferrer" title="Open Drive file" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800"><ExternalLink size={17} /></a>}
                <button onClick={() => toggleFeatured(book)} title={book.featured ? 'Remove from landing gallery' : 'Feature on landing gallery'} className={`grid h-10 w-10 place-items-center rounded-xl ${book.featured ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><Sparkles size={17} /></button>
                {book.status !== 'published' ? <button onClick={() => updateStatus(book, 'published')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-100 px-3 text-xs font-black text-emerald-800"><Eye size={16} /> Publish</button> : <button onClick={() => updateStatus(book, 'draft')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-100 px-3 text-xs font-black text-amber-800"><EyeOff size={16} /> Unpublish</button>}
                <button onClick={() => openEdit(book)} title="Edit book" className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700"><Edit3 size={17} /></button>
                <button onClick={() => updateStatus(book, 'archived')} title="Archive book" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800"><Archive size={17} /></button>
                <button onClick={() => deleteBook(book)} title="Delete book" className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700"><Trash2 size={17} /></button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <div className="p-16 text-center text-sm font-bold text-slate-500">No books match that search.</div>}
        </div>
      </section>

      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">Demo mode stores catalogue changes only in this browser. The future backend will preserve the same workflow while adding permanent records, permission validation, and audit history.</p>

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
              <div><h2 className="text-xl font-black">{editingId ? 'Edit digital book' : 'Add Google Drive book'}</h2><p className="mt-1 text-xs font-semibold text-slate-500">Academic content ingestion gate</p></div>
              <button onClick={() => setShowForm(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><X size={19} /></button>
            </div>
            <form onSubmit={submit} className="space-y-6 p-6">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{formError}</div>}
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase text-slate-500">Google Drive file link</span><input value={form.driveUrl} onChange={(event) => setForm({ ...form, driveUrl: event.target.value })} placeholder="https://drive.google.com/file/d/…/view" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950" /><span className="block text-[11px] text-slate-400">May remain empty for the supplied demo entries; new live books should use an approved Drive file link.</span></label>
                <label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase text-slate-500">Book title *</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950" /></label>
                <label className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Author / source</span><input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                <label className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Grade collection *</span><select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">{eLearningGrades.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Subject *</span><select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">{eLearningSubjects.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Language</span><select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">{eLearningLanguages.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Material type</span><select value={form.materialType} onChange={(event) => setForm({ ...form, materialType: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">{eLearningMaterialTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Audience</span><select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as BookForm['audience'] })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">{eLearningAudiences.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Publishing status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ELearningStatus })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
                <label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase text-slate-500">Description</span><textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /><span className="text-sm font-bold">Feature on landing gallery</span></label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><input type="checkbox" checked={form.allowDownload} onChange={(event) => setForm({ ...form, allowDownload: event.target.checked })} /><span className="text-sm font-bold">Allow download</span></label>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-5 py-3 text-sm font-black text-slate-500">Cancel</button><button type="submit" className="rounded-xl bg-emerald-800 px-6 py-3 text-sm font-black text-white">{editingId ? 'Save changes' : 'Add to catalogue'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
