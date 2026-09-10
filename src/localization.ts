import i18n from './i18n';
import enCopy from './locales/copy.en.json';
import amCopy from './locales/copy.am.json';
import omCopy from './locales/copy.om.json';
import en from './locales/en.json';
import am from './locales/am.json';
import om from './locales/om.json';

export type Language = 'en' | 'am' | 'om';
export const normalizeLanguage = (language: string): Language => {
  const base = language.toLowerCase().split('-')[0];
  return base === 'am' ? 'am' : base === 'om' || base === 'or' ? 'om' : 'en';
};
export const localeTag = () => ({ en: 'en-ET', am: 'am-ET', om: 'om-ET' })[normalizeLanguage(i18n.language)];
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');
type Message = Record<Language, string>;
const messages = new Map<string, Message>();
const caseFolded = new Map<string, Message>();
const templates: { pattern: RegExp; keys: string[]; message: Message; specificity: number }[] = [];
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const register = (source: string, message: Message) => {
  messages.set(normalize(source), message);
  caseFolded.set(normalize(source).toLowerCase(), message);
  for (const value of Object.values(message)) {
    const key = normalize(value);
    if (!messages.has(key)) messages.set(key, message);
    if (!caseFolded.has(key.toLowerCase())) caseFolded.set(key.toLowerCase(), message);
    const keys = [...key.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]);
    const literal = key.replace(/\{\{\w+\}\}/g, '');
    // Never treat arbitrary names or free text as a message made only of placeholders.
    if (keys.length && /[A-Za-z\u1200-\u137f]{2}/.test(literal)) {
      const pattern = key.split(/\{\{\w+\}\}/g).map(escapeRegExp).join('(.*?)');
      templates.push({ pattern: new RegExp('^' + pattern + '$'), keys, message, specificity: literal.length });
    }
  }
};
const indexExisting = (english: any, amharic: any, oromo: any) => {
  for (const [key, value] of Object.entries(english)) {
    if (typeof value === 'string' && typeof amharic?.[key] === 'string' && typeof oromo?.[key] === 'string') {
      register(value, { en: value, am: amharic[key], om: oromo[key] });
    } else if (value && typeof value === 'object') indexExisting(value, amharic?.[key], oromo?.[key]);
  }
};
indexExisting(en, am, om);
for (const [source, translation] of Object.entries(amCopy)) {
  const oromo = (omCopy as Record<string, string>)[source];
  if (oromo) register(source, { en: (enCopy as Record<string, string>)[source] || source, am: translation, om: oromo });
}
templates.sort((a, b) => b.specificity - a.specificity);

function lookup(text: string): { message: Message; values?: Record<string, string> } | undefined {
  const message = messages.get(text) || caseFolded.get(text.toLowerCase());
  if (message) return { message };
  for (const template of templates) {
    const match = text.match(template.pattern);
    if (match) return { message: template.message, values: Object.fromEntries(template.keys.map((key, i) => [key, match[i + 1]])) };
  }
}

/** Translate system presentation text. Form values, API payloads, and React nodes stay intact. */
export function uiText<T>(value: T, values?: Record<string, unknown>): T {
  if (Array.isArray(value)) return value.map(item => uiText(item)) as T;
  if (typeof value !== 'string' || !value.trim()) return value;
  const entry = lookup(normalize(value));
  let translated = entry?.message[normalizeLanguage(i18n.language)] ?? value;
  if (entry) translated = (value.match(/^\s*/)?.[0] || '') + translated + (value.match(/\s*$/)?.[0] || '');
  const substitutions = values ?? entry?.values;
  if (substitutions) translated = translated.replace(/\{\{(\w+)\}\}/g, (match, key) => key in substitutions ? String(substitutions[key] ?? '') : match);
  return translated as T;
}

/** Known server messages retain their detail; unexpected errors get a localized fallback. */
export function uiError(value: unknown, values?: Record<string, unknown>): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && lookup(normalize(value))) return uiText(value, values);
  if (normalizeLanguage(i18n.language) === 'en' && typeof value === 'string') return uiText(value, values);
  return uiText('The request could not be completed. Please try again.');
}

/** Translate the system labels in a generated print document, preserving its markup. */
export function localizeHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.documentElement.lang = normalizeLanguage(i18n.language);
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script, style, [data-user-content]')) continue;
    node.textContent = uiText(node.textContent || '');
  }
  return '<!doctype html>\n' + document.documentElement.outerHTML;
}
