import { HomeHero, SchoolHero } from '../pages/PublicHeroes';
import { publicText } from '../publicLocalization';

/** Retain the parser-discovered hero while a public route chunk loads. */
export function PublicHeroFallback() {
  return <div aria-busy="true" aria-label={publicText('runtime.message0')} className="public-site min-h-screen bg-brand-canvas">
    <div className="h-[4.75rem]" />
    {window.location.pathname.replace(/\/$/, '') === '/school' ? <SchoolHero /> : <HomeHero />}
  </div>;
}
