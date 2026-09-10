import { defaultELearningBooks, type ELearningBook } from '../data/eLearningData';
import { uiText } from '../localization';

/** Translate supplied catalog copy, while retaining titles/descriptions authored by staff. */
export function bookText(book: ELearningBook, field: 'title' | 'description'): string {
  const original = defaultELearningBooks.find(item => item.id === book.id);
  return original?.[field] === book[field] ? uiText(book[field]) : book[field];
}
