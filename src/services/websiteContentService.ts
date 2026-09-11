import api from './api';

export type WebsiteContentType = 'team' | 'community' | 'uniform';
export type WebsiteContentStatus = 'draft' | 'published' | 'archived';

export interface WebsiteContentItem {
  id: string;
  content_type: WebsiteContentType;
  title: string;
  subtitle: string;
  body: string;
  image_url: string;
  media_url: string;
  cta_label: string;
  cta_url: string;
  category: string;
  display_order: number;
  status: WebsiteContentStatus;
  featured: boolean;
  event_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export type WebsiteContentPayload = Omit<WebsiteContentItem, 'id' | 'created_at' | 'updated_at'>;

const unwrap = (response: any): WebsiteContentItem[] => response.data?.data || [];

export const websiteContentService = {
  async getPublic(type?: WebsiteContentType): Promise<WebsiteContentItem[]> {
    const response = await api.get('/website-content/public', { params: type ? { type } : undefined });
    return unwrap(response);
  },

  async getAll(type?: WebsiteContentType): Promise<WebsiteContentItem[]> {
    const response = await api.get('/website-content', { params: type ? { type } : undefined });
    return unwrap(response);
  },

  async create(payload: WebsiteContentPayload): Promise<WebsiteContentItem> {
    const response = await api.post('/website-content', payload);
    return response.data.data;
  },

  async update(id: string, payload: WebsiteContentPayload): Promise<WebsiteContentItem> {
    const response = await api.post(`/website-content/${id}/update`, payload);
    return response.data.data;
  },

  async updateStatus(id: string, status: WebsiteContentStatus): Promise<WebsiteContentItem> {
    const response = await api.post(`/website-content/${id}/status`, { status });
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.post(`/website-content/${id}/delete`);
  },
};
