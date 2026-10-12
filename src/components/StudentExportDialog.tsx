import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ChevronDown, Columns3, Download, FileSpreadsheet, ListFilter, Loader2, Printer, Users, X } from 'lucide-react';
import { uiText } from '../localization';
import type { ExcelReportGroup } from '../utils/exportUtils';

type ExportAction = 'export' | 'print';

interface StudentExportDialogProps {
  groups: ExcelReportGroup[];
  studentCount: number;
  filters: string;
  busyAction: ExportAction | null;
  error: string | null;
  onClose: () => void;
  onAction: (action: ExportAction, columnKeys: string[]) => void;
}

interface ExportGroupProps {
  group: ExcelReportGroup;
  selected: Set<string>;
  disabled: boolean;
  onToggleGroup: (keys: string[], checked: boolean) => void;
  onToggleColumn: (key: string, checked: boolean) => void;
}

const checkboxClasses = 'h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 disabled:cursor-wait dark:border-slate-600';
const buttonFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

function ExportGroup({ group, selected, disabled, onToggleGroup, onToggleColumn }: ExportGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const selectedCount = group.columns.filter(column => selected.has(column.key)).length;
  const allSelected = selectedCount === group.columns.length;
  const partialSelection = selectedCount > 0 && !allSelected;
  const color = `#${group.color.replace(/^#/, '')}`;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = partialSelection;
  }, [partialSelection]);

  return (
    <section
      aria-labelledby={`${id}-label`}
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      style={{ '--group-color': color } as CSSProperties}
    >
      <div className="flex items-center border-l-4 border-[var(--group-color)] bg-slate-50/80 px-3 dark:bg-slate-800/70">
        <label className="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pr-2">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allSelected}
            aria-checked={partialSelection ? 'mixed' : allSelected}
            disabled={disabled}
            onChange={event => onToggleGroup(group.columns.map(column => column.key), event.target.checked)}
            className={checkboxClasses}
            style={{ accentColor: color }}
          />
          <span className="min-w-0">
            <span id={`${id}-label`} className="block text-sm font-bold leading-5 text-slate-900 dark:text-slate-100">{group.label}</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
              {uiText('{{value0}} of {{value1}} selected', { value0: selectedCount, value1: group.columns.length })}
            </span>
          </span>
        </label>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-columns`}
          aria-label={uiText(expanded ? 'Collapse {{value0}}' : 'Expand {{value0}}', { value0: group.label })}
          onClick={() => setExpanded(current => !current)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white ${buttonFocus}`}
        >
          <ChevronDown aria-hidden="true" size={19} className={`transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div id={`${id}-columns`} hidden={!expanded} className="border-t border-slate-100 p-2 dark:border-slate-800">
        {group.columns.map(column => (
          <label key={column.key} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors motion-reduce:transition-none ${selected.has(column.key) ? 'bg-slate-50/80 dark:bg-slate-800/40' : ''} hover:bg-slate-100 dark:hover:bg-slate-800 ${disabled ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              checked={selected.has(column.key)}
              disabled={disabled}
              onChange={event => onToggleColumn(column.key, event.target.checked)}
              className={checkboxClasses}
              style={{ accentColor: color }}
            />
            <span className="min-w-0 break-words text-sm leading-5 text-slate-700 dark:text-slate-200">{column.header}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function StudentExportDialog({ groups, studentCount, filters, busyAction, error, onClose, onAction }: StudentExportDialogProps) {
  const allKeys = useMemo(() => groups.flatMap(group => group.columns.map(column => column.key)), [groups]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allKeys));
  const selectedKeys = allKeys.filter(key => selected.has(key));
  const selectedCount = selectedKeys.length;
  const busy = busyAction !== null;
  const actionsDisabled = busy || selectedCount === 0 || studentCount === 0;
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
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  const toggleGroup = (keys: string[], checked: boolean) => {
    setSelected(current => {
      const next = new Set(current);
      keys.forEach(key => checked ? next.add(key) : next.delete(key));
      return next;
    });
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
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
        className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-white shadow-2xl outline-none dark:bg-slate-900 sm:h-auto sm:max-h-[90dvh] sm:max-w-4xl sm:rounded-3xl"
      >
        <header className="shrink-0 border-b border-slate-200 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] dark:border-slate-800 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 sm:flex">
              <FileSpreadsheet aria-hidden="true" size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{uiText('Customize student export')}</h2>
              <p id={`${id}-description`} className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{uiText('Choose the information to include in your Excel sheet or printed report.')}</p>
            </div>
            <button ref={closeRef} type="button" aria-label={uiText('Close')} disabled={busy} onClick={onClose} className={`-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white ${buttonFocus}`}>
              <X aria-hidden="true" size={21} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60 sm:gap-3 sm:px-4">
              <Users aria-hidden="true" size={19} className="shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{uiText('Filtered students')}</p>
                <p className="text-lg font-bold leading-6 tabular-nums text-slate-900 dark:text-white">{studentCount.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-indigo-50 px-3 py-2.5 dark:bg-indigo-500/10 sm:gap-3 sm:px-4">
              <Columns3 aria-hidden="true" size={19} className="shrink-0 text-indigo-500 dark:text-indigo-400" />
              <div className="min-w-0" role="status" aria-live="polite" aria-atomic="true">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{uiText('Columns selected')}</p>
                <p className="text-lg font-bold leading-6 tabular-nums text-indigo-800 dark:text-indigo-200">{selectedCount}<span className="px-1 text-sm font-medium text-indigo-400">/</span>{allKeys.length}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/50 px-4 py-4 dark:bg-slate-950/30 sm:px-6 sm:py-5">
          {filters && (
            <div className="mb-4 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <ListFilter aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
              <p className="min-w-0 break-words"><span className="font-semibold text-slate-600 dark:text-slate-300">{uiText('Current filters')}: </span>{filters}</p>
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{uiText('Choose columns')}</h3>
            <div className="flex items-center gap-1">
              <button type="button" disabled={busy || selectedCount === allKeys.length} onClick={() => setSelected(new Set(allKeys))} className={`min-h-11 rounded-lg px-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:cursor-default disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-indigo-500/10 ${buttonFocus}`}>{uiText('Select all')}</button>
              <span aria-hidden="true" className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button type="button" disabled={busy || selectedCount === 0} onClick={() => setSelected(new Set())} className={`min-h-11 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-default disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 ${buttonFocus}`}>{uiText('Clear all')}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4">
            {groups.filter(group => group.columns.length > 0).map(group => (
              <ExportGroup
                key={group.label}
                group={group}
                selected={selected}
                disabled={busy}
                onToggleGroup={toggleGroup}
                onToggleColumn={(key, checked) => toggleGroup([key], checked)}
              />
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:pt-4">
          {error && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"><AlertCircle aria-hidden="true" size={17} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{error}</span></p>}
          <p role="status" className={`mb-3 text-xs leading-5 ${selectedCount === 0 ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {uiText(selectedCount === 0 ? 'Choose at least one column to continue.' : 'Your choices apply to both print and Excel.')}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <button type="button" disabled={busy} onClick={onClose} className={`col-span-2 row-start-2 min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 sm:mr-auto ${buttonFocus}`}>{uiText('Cancel')}</button>
            <button type="button" disabled={actionsDisabled} onClick={() => onAction('print', selectedKeys)} className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-5 ${buttonFocus}`}>
              {busyAction === 'print' ? <Loader2 aria-hidden="true" size={18} className="shrink-0 animate-spin motion-reduce:animate-none" /> : <Printer aria-hidden="true" size={18} className="shrink-0" />}
              <span>{uiText(busyAction === 'print' ? 'Preparing print...' : 'Print')}</span>
            </button>
            <button type="button" disabled={actionsDisabled} onClick={() => onAction('export', selectedKeys)} className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-600 sm:px-5 ${buttonFocus}`}>
              {busyAction === 'export' ? <Loader2 aria-hidden="true" size={18} className="shrink-0 animate-spin motion-reduce:animate-none" /> : <Download aria-hidden="true" size={18} className="shrink-0" />}
              <span>{uiText(busyAction === 'export' ? 'Preparing Excel...' : 'Export Excel')}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
