import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock3, Mail, MapPin, Phone } from 'lucide-react';
import { publicContact, publicNavigation, socialLinks } from '../data/ziqualaContent';
import schoolLogo from '../assets/school/school-logo.webp';

export const PublicFooter = () => {
  const { t } = useTranslation('public');
  return (
    <footer className="border-t border-black/10 bg-brand-muted text-slate-900 dark:border-white/10 dark:text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1fr_.65fr_1.3fr] lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-3">
            <img width={160} height={159} decoding="async" src={schoolLogo} alt="" className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover" />
            <span className="text-xl font-bold">{t('contact.identity')}</span>
          </Link>
          <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-200">{t('contact.summary')}</p>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3">
            {socialLinks.map(social => <a key={social.href} href={social.href} target="_blank" rel="noreferrer" className="text-base font-semibold underline underline-offset-4">{t(social.label)}</a>)}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-heading">{t('contact.quickLinks')}</h2>
          <nav className="mt-5 grid gap-3 text-base" aria-label={t('contact.quickLinks')}>
            {publicNavigation.map(item => <Link key={item.to} to={item.to} className="w-fit underline-offset-4 hover:underline">{t(item.to === '/contact' ? 'contact.title' : item.label)}</Link>)}
          </nav>
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-heading">{t('contact.details')}</h2>
          <address className="mt-5 space-y-4 text-base not-italic leading-8 text-slate-700 dark:text-slate-200">
            <p className="flex items-start gap-3"><MapPin size={20} className="mt-1 shrink-0" aria-hidden="true" /><span><strong>{t('contact.school')}</strong><br />{t(publicContact.schoolAddress)}</span></p>
            <p className="flex items-start gap-3"><MapPin size={20} className="mt-1 shrink-0" aria-hidden="true" /><span><strong>{t('contact.monastery')}</strong><br />{t(publicContact.monasteryAddress)}</span></p>
            <p className="flex items-center gap-3"><Phone size={20} className="shrink-0" aria-hidden="true" /><a href={publicContact.phoneHref} dir="ltr" className="underline underline-offset-4">{publicContact.phoneDisplay}</a></p>
            <p className="flex items-center gap-3"><Mail size={20} className="shrink-0" aria-hidden="true" /><a href={`mailto:${publicContact.email}`} className="break-all underline underline-offset-4">{publicContact.email}</a></p>
          </address>
          <p className="mt-4 flex items-start gap-3 text-base leading-8 text-slate-700 dark:text-slate-200"><Clock3 size={20} className="mt-1 shrink-0" aria-hidden="true" /><span><strong>{t('contact.hours')}</strong><br />{t(publicContact.officeHours)}</span></p>
        </div>
      </div>
      <p className="border-t border-black/10 px-5 py-5 text-center text-base leading-8 text-slate-600 dark:border-white/10 dark:text-slate-200">{t('footer.copyright')}</p>
    </footer>
  );
};
