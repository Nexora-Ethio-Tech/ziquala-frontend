import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Download, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import { uiText } from '../localization';

export type StudentRecordDownloadFormat = 'pdf' | 'excel';

interface StudentRecordDownloadDialogProps {
  busyFormat: StudentRecordDownloadFormat | null;
  error: string | null;
  onClose: () => void;
  onSelect: (format: StudentRecordDownloadFormat) => void;
}

const buttonFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

export function StudentRecordDownloadDialog({ busyFormat, error, onClose, onSelect }: StudentRecordDownloadDialogProps) {
  const busy = busyFormat !== null;
  const id = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  busyRef.current = busy;
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    const backgroundElements = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlayRef.current)
      .map(element => ({ element, inert: element.inert }));

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    backgroundElements.forEach(({ element }) => { element.inert = true; });
    closeRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (!first) {
        event.preventDefault();
        dialogRef.current.focus();
      } else if (event.shiftKey && (activeElement === first || !focusable.includes(activeElement as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !focusable.includes(activeElement as HTMLElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        dialogRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', keepFocusInside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', keepFocusInside);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
      backgroundElements.forEach(({ element, inert }) => { element.inert = inert; });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6"
      onClick={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={busy}
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-2xl outline-none dark:bg-slate-900 sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 sm:flex">
            <Download aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{uiText('Download student record')}</h2>
            <p id={`${id}-description`} className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{uiText("Choose a file type to download this student's admission record.")}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={uiText('Close')}
            disabled={busy}
            onClick={onClose}
            className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white ${buttonFocus}`}
          >
            <X aria-hidden="true" size={21} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onSelect('pdf')}
            className={`flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10 ${buttonFocus}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {busyFormat === 'pdf' ? <Loader2 aria-hidden="true" size={24} className="animate-spin motion-reduce:animate-none" /> : <FileText aria-hidden="true" size={24} />}
            </span>
            <span className="min-w-0">
              <span className="block break-words text-sm font-semibold text-slate-900 dark:text-white">{uiText('Download PDF')}</span>
              <span className="mt-1 block break-words text-xs text-slate-500 dark:text-slate-400">{uiText('Document (.pdf)')}</span>
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSelect('excel')}
            className={`flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10 ${buttonFocus}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              {busyFormat === 'excel' ? <Loader2 aria-hidden="true" size={24} className="animate-spin motion-reduce:animate-none" /> : <FileSpreadsheet aria-hidden="true" size={24} />}
            </span>
            <span className="min-w-0">
              <span className="block break-words text-sm font-semibold text-slate-900 dark:text-white">{uiText('Download Excel')}</span>
              <span className="mt-1 block break-words text-xs text-slate-500 dark:text-slate-400">{uiText('Spreadsheet (.xlsx)')}</span>
            </span>
          </button>
        </div>

        <div role="status" aria-live="polite" aria-atomic="true">
          {busyFormat && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{uiText(busyFormat === 'pdf' ? 'Preparing PDF...' : 'Preparing Excel...')}</p>}
        </div>
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <button type="button" disabled={busy} onClick={onClose} className={`min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 ${buttonFocus}`}>{uiText('Cancel')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
