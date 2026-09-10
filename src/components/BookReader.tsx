import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, Loader2, Maximize2, Minimize2, X } from 'lucide-react';
import { getGoogleDriveDownloadUrl, getGoogleDrivePreviewUrl, type ELearningBook } from '../data/eLearningData';
import { bookText } from '../utils/localizeBook';
import { uiText } from '../localization';

export const BookReader = ({ book, onClose }: { book: ELearningBook; onClose: () => void }) => {
  useTranslation();
  const viewerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const previewUrl = getGoogleDrivePreviewUrl(book.driveUrl);
  const downloadUrl = book.allowDownload ? getGoogleDriveDownloadUrl(book.driveUrl) : '';

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      setExpanded(false);
    } else if (expanded) {
      setExpanded(false);
    } else {
      setExpanded(true);
      await viewerRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={viewerRef} role="dialog" aria-modal="true" aria-labelledby="book-reader-title" className={`flex w-full flex-col overflow-hidden bg-white text-slate-950 shadow-2xl dark:bg-slate-950 dark:text-white ${expanded ? 'h-dvh' : 'h-dvh sm:h-[94dvh] sm:max-w-7xl sm:rounded-2xl'}`} onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const controls = viewerRef.current?.querySelectorAll<HTMLElement>('a[href], button, iframe');
          const first = controls?.[0];
          const last = controls?.[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="book-reader-title" className="truncate font-black">{bookText(book, 'title')}</h2>
            <p className="text-xs text-slate-500">{uiText(book.grade)} · {uiText(book.subject)}</p>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label={uiText('Close viewer')} className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><X size={20} /></button>
          {previewUrl && <div className="flex w-full flex-wrap items-center gap-2">
            {downloadUrl && <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white"><Download size={18} />{uiText('Download book')}</a>}
            <button onClick={toggleFullscreen} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-bold dark:bg-slate-800">{expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}{uiText(expanded ? 'Exit fullscreen' : 'Fullscreen')}</button>
            <a href={book.driveUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-emerald-700 dark:text-emerald-300"><ExternalLink size={18} />{uiText('Open in Google Drive')}</a>
          </div>}
        </header>
        {previewUrl ? <>
          {!loaded && <p role="status" className="flex items-center justify-center gap-2 p-3 text-sm"><Loader2 size={18} className="animate-spin" />{uiText('Loading book…')}</p>}
          <iframe key={previewUrl} src={previewUrl} title={bookText(book, 'title')} allow="fullscreen" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} className="min-h-0 w-full flex-1 border-0 bg-slate-100" />
          <p className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-500 dark:border-slate-800">{uiText('Read here without downloading. If the book does not load, open it in Google Drive.')}</p>
        </> : <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-8 text-center">
          <div className="max-w-md"><h3 className="text-2xl font-black">{uiText('Book file not available yet')}</h3><p className="mt-3 leading-7 text-slate-500">{uiText('Reading and downloading will be available when the school adds this book’s file.')}</p></div>
        </div>}
      </div>
    </div>
  );
};
