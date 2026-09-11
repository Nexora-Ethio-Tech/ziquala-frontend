import type { ELearningBook } from '../data/eLearningData';

/** Return catalogue copy authored by staff. */
export function bookText(book: ELearningBook, field: 'title' | 'description'): string {
  return book[field];
}
