import { uiText } from '../localization';
interface Props {
  list: {
    page: number; pageSize: number; loading: boolean; error: string | null;
    pagination: { total: number };
    setPage: (page: number) => void; setPageSize: (size: number) => void;
    refresh: () => Promise<unknown>;
  };
}
export function ListPagination({ list }: Props) {
  const { page, pageSize, pagination: { total }, loading } = list;
  return <div className="space-y-2 p-4 border-t border-slate-200 dark:border-slate-800">
    {list.error && <p role="alert" className="text-sm text-red-600">{uiText(list.error)}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
      <span aria-live="polite">{loading ? uiText('Loading...') : uiText('Showing {{value0}}–{{value1}} of {{value2}}', { value0: total ? (page - 1) * pageSize + 1 : 0, value1: Math.min(page * pageSize, total), value2: total })}</span>
      <div className="flex flex-wrap items-center gap-3">
        <label>{uiText('Rows per page')}{' '}<select value={pageSize} disabled={loading} onChange={event => list.setPageSize(Number(event.target.value))} className="rounded border p-1 bg-white dark:bg-slate-900">{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
        <button type="button" disabled={loading || page <= 1} onClick={() => list.setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">{uiText('Previous')}</button>
        <span>{page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
        <button type="button" disabled={loading || page * pageSize >= total} onClick={() => list.setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">{uiText('Next')}</button>
        <button type="button" disabled={loading} onClick={() => { list.refresh().catch(() => {}); }} className="rounded border px-3 py-1 disabled:opacity-40">{uiText('Refresh')}</button>
      </div>
    </div>
  </div>;
}
