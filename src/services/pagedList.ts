import api from './api';
import { cachedList } from './listCache';
export interface ListPage {
  data: any[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    summary?: Record<string, number>;
    grades?: string[];
    subjects?: string[];
  };
}
export async function getListPage(endpoint: string, filters: Record<string, unknown>, page: number, pageSize: number): Promise<ListPage> {
  const params = { ...filters, page, pageSize };
  return cachedList(`${endpoint}:${JSON.stringify(params)}`, async () => {
    const response = await api.get(endpoint, { params });
    if (!response.data.pagination) throw new Error('The list could not be loaded. Refresh and try again.');
    return response.data;
  });
}
export async function getAllListRows(endpoint: string, filters: Record<string, unknown>): Promise<any[]> {
  const rows: any[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await getListPage(endpoint, filters, page++, 100);
    if (!result.data.length) break;
    rows.push(...result.data);
    total = result.pagination.total;
  } while (rows.length < total);
  return rows;
}
