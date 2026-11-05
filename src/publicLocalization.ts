import i18n from './i18n';
import { uiText } from './localization';
import sourceKeys from './locales/public.sources.json';
import english from './locales/public.en.json';

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
const keyFor = (value: string) => {
  const text = normalize(value);
  if (i18n.exists(text, { ns: 'public', lng: 'en' }) || i18n.exists(text + '_other', { ns: 'public', lng: 'en' })) return text;
  return (sourceKeys as Record<string, string>)[text];
};

/** Translate public presentation keys, leaving authored content and values intact. */
export function publicText<T>(value: T, values?: Record<string, unknown>): T {
  if (Array.isArray(value)) return value.map(item => publicText(item)) as T;
  if (typeof value !== 'string' || !value.trim()) return value;
  const key = keyFor(value);
  if (!key) return uiText(value, values);
  const text = i18n.t(key, { ...values, ns: 'public' });
  return ((value.match(/^\s*/)?.[0] || '') + text + (value.match(/\s*$/)?.[0] || '')) as T;
}

/** Match stored staff records by their authored names in any supported language. */
export function publicVariants(value: string): string[] {
  const key = keyFor(value);
  return key ? ['en', 'am', 'om'].map(lng => String(i18n.t(key, { lng, ns: 'public' }))) : [value];
}

export type SchoolPurpose = typeof english.school.purpose;
