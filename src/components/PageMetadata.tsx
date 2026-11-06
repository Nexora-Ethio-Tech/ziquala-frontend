import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import config from '../data/seoPages.json';

export function PageMetadata() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation('public');
  useEffect(() => {
    const requestedPath = pathname.replace(/\/+$/, '') || '/';
    const canonicalPath = (config.aliases as Record<string, string>)[requestedPath] || requestedPath;
    const page = (config.pages as Record<string, { titleKey: string; descriptionKey: string; indexable: boolean }>)[canonicalPath];
    const brand = t(config.brandKey);
    const label = t(page?.titleKey || config.pages['/portal'].titleKey);
    const title = canonicalPath === '/' ? `${brand} | ${label}` : `${label} | ${brand}`;
    const description = t(page?.descriptionKey || config.pages['/portal'].descriptionKey);
    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', page?.indexable ? 'index, follow' : 'noindex, follow');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', brand);
    setMeta('property', 'og:locale', `${i18n.resolvedLanguage || 'en'}_ET`);
    const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (page) {
      const canonical = new URL(canonicalPath, config.origin).href;
      const element = existing || document.createElement('link');
      element.rel = 'canonical';
      element.href = canonical;
      if (!existing) document.head.appendChild(element);
      setMeta('property', 'og:url', canonical);
    } else {
      existing?.remove();
      document.head.querySelector('meta[property="og:url"]')?.remove();
    }
  }, [pathname, t, i18n.resolvedLanguage]);
  return null;
}
