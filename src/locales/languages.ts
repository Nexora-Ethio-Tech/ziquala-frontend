export type Language = 'en' | 'am' | 'om';

export const normalizeLanguage = (value: string): Language => {
  const language = value.toLowerCase().split('-')[0];
  return language === 'am' ? 'am' : language === 'om' || language === 'or' ? 'om' : 'en';
};
