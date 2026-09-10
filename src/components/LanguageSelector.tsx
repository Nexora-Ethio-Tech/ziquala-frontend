import { useTranslation } from 'react-i18next';
import { uiText, normalizeLanguage } from '../localization';

export function LanguageSelector({ disabled = false }: { disabled?: boolean }) {
  const { i18n } = useTranslation();
  return <select disabled={disabled} aria-label={uiText('Select language')} title={uiText('Change language')}
    value={normalizeLanguage(i18n.language)} onChange={event => { void i18n.changeLanguage(event.target.value); }}
    className="max-w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
    <option value="en">English</option>
    <option value="am">አማርኛ</option>
    <option value="om">Afaan Oromoo</option>
  </select>;
}
