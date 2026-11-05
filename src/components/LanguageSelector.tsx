import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '../locales/languages';

export function LanguageSelector({ disabled = false }: { disabled?: boolean }) {
  const { i18n, t } = useTranslation('public');
  return <select disabled={disabled} aria-label={t('language.select')} title={t('language.change')}
    value={normalizeLanguage(i18n.resolvedLanguage || i18n.language)} onChange={event => { void i18n.changeLanguage(normalizeLanguage(event.target.value)); }}
    className="max-w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
    <option value="en">{t('language.english')}</option>
    <option value="am">{t('language.amharic')}</option>
    <option value="om">{t('language.oromo')}</option>
  </select>;
}
