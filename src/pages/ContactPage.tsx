import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, Mail, MapPin, Phone, Send } from 'lucide-react';
import { publicContact } from '../data/ziqualaContent';
import { contactErrorKey, sendContactInquiry } from '../services/contactService';

export const ContactPage = () => {
  const { t } = useTranslation('public');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorKey, setErrorKey] = useState('contact.deliveryError');
  const inFlight = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status === 'success' || status === 'error') noticeRef.current?.focus();
  }, [status]);
  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) || '').trim();
    const inquiry = { name: value('name'), email: value('email'), phone: value('phone'), subject: value('subject'), message: value('message') };
    if (Object.values(inquiry).some(text => !text) || !/^[+\d() .-]{7,40}$/.test(inquiry.phone)) {
      setErrorKey('contact.invalidInput');
      setStatus('error');
      return;
    }
    inFlight.current = true;
    setStatus('submitting');
    try {
      await sendContactInquiry(inquiry);
      setStatus('success');
    } catch (error) {
      setErrorKey(contactErrorKey(error));
      setStatus('error');
    } finally {
      inFlight.current = false;
    }
  };
  const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest-700 dark:border-white/25 dark:bg-brand-forest-950 dark:text-white dark:focus-visible:outline-brand-gold-300';
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 md:py-24" aria-labelledby="contact-title">
      <h1 id="contact-title" className="font-serif text-4xl text-brand-heading sm:text-6xl">{t('contact.title')}</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-200">{t('contact.intro')}</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {(['school', 'monastery'] as const).map(place => (
          <article key={place} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/15 dark:bg-brand-forest-950 sm:p-8">
            <h2 className="text-2xl font-bold text-brand-heading">{t(`contact.${place}`)}</h2>
            <address className="mt-5 space-y-5 text-base not-italic leading-8 text-slate-700 dark:text-slate-200">
              <p className="flex items-start gap-3"><MapPin size={22} className="mt-1 shrink-0" aria-hidden="true" /><span><strong className="block">{t('contact.address')}</strong>{t(place === 'school' ? publicContact.schoolAddress : publicContact.monasteryAddress)}</span></p>
              <p><a href={publicContact.phoneHref} className="inline-flex items-center gap-3 underline underline-offset-4"><Phone size={22} className="shrink-0" aria-hidden="true" /><span dir="ltr">{publicContact.phoneDisplay}</span></a></p>
              <p><a href={`mailto:${publicContact.email}`} className="inline-flex max-w-full items-center gap-3 underline underline-offset-4"><Mail size={22} className="shrink-0" aria-hidden="true" /><span className="break-all">{publicContact.email}</span></a></p>
            </address>
            {place === 'school' && <p className="mt-5 flex items-start gap-3 text-base leading-8 text-slate-700 dark:text-slate-200"><Clock3 size={22} className="mt-1 shrink-0" aria-hidden="true" /><span><strong className="block">{t('contact.hours')}</strong>{t(publicContact.officeHours)}</span></p>}
          </article>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/15 dark:bg-brand-forest-950 sm:p-8">
        <h2 className="text-2xl font-bold text-brand-heading">{t('contact.inquiry')}</h2>
        <p id="inquiry-help" className="mt-3 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-200">{t('contact.emailHelp')}</p>
        {status === 'success' ? (
          <div ref={noticeRef} tabIndex={-1} role="status" className="mt-6 rounded-xl border border-emerald-600 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100">
            <CheckCircle2 size={32} aria-hidden="true" />
            <h3 className="mt-3 text-2xl font-bold">{t('contact.successTitle')}</h3>
            <p className="mt-3 text-lg leading-8">{t('contact.successMessage')}</p>
            <button type="button" onClick={() => setStatus('idle')} className="mt-5 text-base font-bold underline underline-offset-4">{t('contact.sendAnother')}</button>
          </div>
        ) : <form onSubmit={submitInquiry} onInvalid={() => { setErrorKey('contact.invalidInput'); setStatus('error'); }} aria-describedby="inquiry-help" aria-busy={status === 'submitting'} className="mt-6">
          {status === 'error' && <div ref={noticeRef} tabIndex={-1} role="alert" className="mb-6 rounded-xl border border-red-600 bg-red-50 p-5 text-red-950 dark:border-red-400 dark:bg-red-950 dark:text-red-100"><AlertCircle size={24} aria-hidden="true" /><p className="mt-2 text-base font-semibold leading-8">{t(errorKey)}</p></div>}
          <fieldset disabled={status === 'submitting'} className="grid min-w-0 gap-6 sm:grid-cols-2">
          <label className="text-base font-semibold">{t('contact.fullName')}<input name="name" autoComplete="name" required maxLength={120} className={inputClass} /></label>
          <label className="text-base font-semibold">{t('contact.email')}<input type="email" name="email" autoComplete="email" required maxLength={254} className={inputClass} /></label>
          <label className="text-base font-semibold">{t('contact.phone')}<input type="tel" name="phone" autoComplete="tel" required maxLength={40} className={inputClass} /></label>
          <label className="text-base font-semibold">{t('contact.subject')}<input name="subject" required maxLength={160} className={inputClass} /></label>
          <label className="text-base font-semibold sm:col-span-2">{t('contact.message')}<textarea name="message" required maxLength={2000} rows={6} className={inputClass} /></label>
          <button type="submit" disabled={status === 'submitting'} className="inline-flex w-fit items-center gap-3 rounded-lg bg-brand-gold-400 px-6 py-4 text-base font-bold text-brand-forest-950 hover:bg-brand-gold-300 disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-700">{status === 'submitting' ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}<span role="status">{t(status === 'submitting' ? 'contact.sending' : 'contact.send')}</span></button>
          </fieldset>
        </form>}
      </div>
    </section>
  );
};
