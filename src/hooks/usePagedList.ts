import { useEffect, useRef, useState } from 'react';
import { clearListCache } from '../services/listCache';
import { getListPage, type ListPage } from '../services/pagedList';

export function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function usePagedList(endpoint: string, filters: Record<string, unknown>, enabled = true) {
  const identity = `${endpoint}:${JSON.stringify(filters)}:${localStorage.getItem('ziquala_token') || ''}`;
  const [position, setPosition] = useState({ identity, page: 1, pageSize: 50 });
  const page = position.identity === identity ? position.page : 1;
  const pageSize = position.pageSize;
  const [result, setResult] = useState<ListPage>({ data: [], pagination: { total: 0, page: 1, pageSize } });
  const [loadedIdentity, setLoadedIdentity] = useState('');
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const load = async (force = false) => {
    const request = ++sequence.current;
    if (force) clearListCache();
    setLoading(true);
    setError(null);
    try {
      const response = await getListPage(endpoint, filters, page, pageSize);
      if (request === sequence.current) {
        const lastPage = Math.max(1, Math.ceil(response.pagination.total / pageSize));
        if (page > lastPage) setPosition({ identity, page: lastPage, pageSize });
        setResult(response);
        setLoadedIdentity(identity);
      }
      return response;
    } catch (err: any) {
      if (request === sequence.current) {
        setResult({ data: [], pagination: { total: 0, page, pageSize } });
        setLoadedIdentity(identity);
        setError(err.message || 'Failed to load list');
      }
      throw err;
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (position.identity !== identity) setPosition({ identity, page: 1, pageSize });
    if (enabled) load().catch(() => {});
    return () => { sequence.current += 1; };
  }, [identity, page, pageSize, enabled]);
  const visible = loadedIdentity === identity;
  return {
    data: visible ? result.data : [],
    pagination: visible ? result.pagination : { total: 0, page, pageSize },
    page, pageSize,
    loading: enabled && (loading || !visible),
    error,
    setPage: (next: number) => setPosition({ identity, page: next, pageSize }),
    setPageSize: (next: number) => setPosition({ identity, page: 1, pageSize: next }),
    refresh: () => load(true),
    updateRows: (update: (rows: any[]) => any[]) => setResult(current => ({ ...current, data: update(current.data) })),
  };
}
