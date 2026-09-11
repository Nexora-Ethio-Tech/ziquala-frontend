import api from './api';
import type { ELearningBook } from '../data/eLearningData';

type BookPayload = Omit<ELearningBook, 'id' | 'createdAt' | 'updatedAt' | 'coverClass'> & {
  coverClass?: string;
};

const unwrapBooks = (response: any): ELearningBook[] => response.data?.data || [];
const unwrapBook = (response: any): ELearningBook => response.data?.data;

export const eLearningService = {
  async getBooks(): Promise<ELearningBook[]> {
    return unwrapBooks(await api.get('/elearning/books'));
  },

  async createBook(payload: BookPayload): Promise<ELearningBook> {
    return unwrapBook(await api.post('/elearning/books', payload));
  },

  async updateBook(id: string, payload: BookPayload): Promise<ELearningBook> {
    return unwrapBook(await api.post(`/elearning/books/${id}/update`, payload));
  },

  async updateBookStatus(id: string, payload: { status?: ELearningBook['status']; featured?: boolean }): Promise<ELearningBook> {
    return unwrapBook(await api.post(`/elearning/books/${id}/status`, payload));
  },

  async deleteBook(id: string): Promise<void> {
    await api.post(`/elearning/books/${id}/delete`);
  },
};
