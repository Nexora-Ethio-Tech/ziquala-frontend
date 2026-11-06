import { useTranslation } from 'react-i18next';

import { LanguageSelector } from '../components/LanguageSelector';

import { publicText as uiText } from "../publicLocalization";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';

import { ArrowRight, LogIn, Menu, Moon, Sun, X } from 'lucide-react';

import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useTheme } from '../context/ThemeContext';

import { publicNavigation, ziqualaIdentity } from '../data/ziqualaContent';

import craterCommunity from '../assets/monastery/crater-community.webp';

import studentAssembly from '../assets/school/student-assembly.webp';

import schoolLogo from '../assets/school/school-logo.webp';

export const BrandMark = ({ compact = false }: { compact?: boolean }) => {
  useTranslation('public');
  return (
  <div className="flex max-w-full flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
    <div className={`${compact ? 'h-10 w-10' : 'h-8 w-8 sm:h-12 sm:w-12'} shrink-0 overflow-hidden rounded-full border border-brand-forest-950/10 bg-white`}>
      <img width={160} height={159} decoding="async" src={schoolLogo} alt={uiText("")} className="h-full w-full object-cover" />
    </div>
    <div className="hidden min-w-0 flex-1 min-[360px]:block">
      <p className={`${compact ? 'text-sm' : 'text-sm sm:text-base'} truncate font-semibold sm:font-black leading-tight sm:leading-normal tracking-tight text-slate-950 dark:text-white`}>
        <span className="sm:hidden">{uiText('copy.ziqualaAboShort')}</span>
        <span className="hidden sm:inline">{uiText(ziqualaIdentity.shortName)}</span>
      </p>
      <p className="hidden sm:block text-base font-bold uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-400 truncate">{uiText("copy.primaryGrade18")}</p>
    </div>
  </div>
);
};

export const PublicHeader = () => {
  useTranslation('public');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(76);
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => setHeaderHeight(header.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => { setMenuOpen(false); setOpenDropdown(null); }, [location.key, location.pathname, location.hash]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const main = document.getElementById('public-main-content');
    const previousInert = main?.inert || false;
    const previousOverflow = document.body.style.overflow;
    const previousMenuState = document.body.getAttribute('data-public-menu-open');
    document.body.setAttribute('data-public-menu-open', 'true');
    if (main) main.inert = true;
    document.querySelector<HTMLElement>('#public-navigation-menu a[href]')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key === 'Tab') {
        const controls = [...document.querySelectorAll<HTMLElement>('header a[href], header button:not([disabled]), header select:not([disabled]), #public-navigation-menu a[href]')]
          .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousMenuState === null) document.body.removeAttribute('data-public-menu-open');
      else document.body.setAttribute('data-public-menu-open', previousMenuState);
      if (main) main.inert = previousInert;
      menuToggleRef.current?.focus();
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <>
      <a href="#public-main-content" onClick={() => document.getElementById('public-main-content')?.focus()} className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-white px-5 py-3 font-bold text-slate-950 focus:not-sr-only">{uiText("copy.skipToMainContent")}</a>
      <header ref={headerRef} className="sticky top-0 z-50 w-full max-w-full border-b border-black/10 bg-brand-canvas backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex min-h-[4.75rem] w-full max-w-[90rem] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 sm:gap-x-4 sm:px-6 md:py-3 lg:px-10 xl:min-h-[4.75rem] xl:py-0">
          <Link to="/" onClick={() => setMenuOpen(false)} aria-label={uiText("copy.ziqualaAboSchoolHome")} className="min-w-0 max-w-full flex-1 md:flex-none">
            <BrandMark />
          </Link>

          <nav className="hidden max-w-full flex-wrap items-center gap-x-7 md:order-last md:flex md:w-full md:justify-center xl:order-none xl:w-auto" aria-label={uiText("copy.quickNavigation")}>
            {publicNavigation.map((item) => (
              <div key={item.to} className="relative flex h-12 items-center xl:h-[4.75rem]" onMouseEnter={() => { if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) setOpenDropdown(item.to); }} onMouseLeave={event => { if (!event.currentTarget.contains(document.activeElement)) setOpenDropdown(null); }} onFocus={event => { if (event.target.tagName === 'A' && event.target.matches(':focus-visible') && !event.currentTarget.contains(event.relatedTarget)) setOpenDropdown(item.to); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenDropdown(null); }} onKeyDown={event => {
                if (event.key === 'Escape') { event.preventDefault(); setOpenDropdown(null); event.currentTarget.querySelector('a')?.focus(); }
                if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && item.children.length) {
                  event.preventDefault(); setOpenDropdown(item.to);
                  const group = event.currentTarget;
                  requestAnimationFrame(() => { const links = group.querySelectorAll<HTMLElement>('[data-public-submenu] a'); (event.key === 'ArrowDown' ? links[0] : links[links.length - 1])?.focus(); });
                }
              }}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  aria-haspopup={item.children.length ? 'true' : undefined}
                  aria-expanded={item.children.length ? openDropdown === item.to : undefined}
                  aria-controls={item.children.length ? `public-submenu-${item.to === '/' ? 'home' : item.to.slice(1)}` : undefined}
                  onClick={event => {
                    // Coarse pointers can open the submenu with a first tap;
                    // a second tap follows the parent link as usual.
                    if (item.children.length && !window.matchMedia('(hover: hover) and (pointer: fine)').matches && openDropdown !== item.to) {
                      event.preventDefault(); setOpenDropdown(item.to);
                    }
                  }}
                  className={({ isActive }) => `relative py-2 text-sm font-bold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform ${isActive
                    ? 'text-brand-forest-950 after:scale-x-100 after:bg-brand-forest-800 dark:text-white dark:after:bg-brand-gold-400'
                    : 'text-slate-600 after:scale-x-0 after:bg-brand-forest-800 hover:text-brand-forest-900 hover:after:scale-x-100 dark:text-slate-300 dark:hover:text-white'
                    }`}
                >
                  {uiText(item.label)}
                </NavLink>
                {item.children.length > 0 && (
                  <div id={`public-submenu-${item.to === '/' ? 'home' : item.to.slice(1)}`} data-public-submenu className={`absolute left-1/2 top-full z-10 w-64 -translate-x-1/2 border-t-4 border-brand-gold-400 bg-white dark:bg-brand-forest-950 p-3 shadow-2xl ${openDropdown === item.to ? 'visible' : 'invisible'}`}>
                    <p className="px-3 pb-2 pt-1 text-base font-black uppercase tracking-[0.24em] text-brand-forest-700 dark:text-brand-forest-300">{uiText("copy.jumpTo")}</p>
                    {item.children.map((child) => (
                      <Link key={child.hash} to={`${item.to}${child.hash}`} className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white transition hover:bg-slate-100 hover:text-brand-gold-700 dark:hover:bg-white/10 dark:hover:text-brand-gold-300">
                        {uiText(child.label)}<ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1 sm:gap-2">
            <LanguageSelector compact />
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center text-slate-600 transition-colors hover:text-brand-gold-700 dark:text-slate-300 dark:hover:text-brand-gold-300"
              aria-label={uiText(theme === 'light' ? "copy.switchToDarkMode" : "copy.switchToLightMode")}
              aria-pressed={theme === 'dark'}
              title={uiText(theme === 'light' ? "copy.useDarkTheme" : "copy.useLightTheme")}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <Link to="/login" className="hidden items-center gap-2 border-l border-black/15 px-4 py-2.5 text-sm font-black text-brand-forest-950 transition-colors hover:text-brand-gold-700 dark:border-white/15 dark:text-white dark:hover:text-brand-gold-300 md:inline-flex">
              <LogIn size={17} />{uiText(" copy.portalLogin")}</Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="ml-1 inline-flex h-11 items-center gap-2 border border-brand-forest-950/20 px-3 text-xs font-black uppercase tracking-[0.16em] text-brand-forest-950 transition-colors hover:border-brand-forest-900 hover:bg-brand-forest-900 hover:text-white dark:border-white/25 dark:text-white dark:hover:bg-white dark:hover:text-slate-950 sm:px-4 md:hidden"
              aria-label={uiText(menuOpen ? "copy.closeNavigationMenu" : "copy.openNavigationMenu")}
              aria-expanded={menuOpen}
              aria-controls="public-navigation-menu"
              ref={menuToggleRef}
            >
              <span className="hidden sm:inline">{uiText(menuOpen ? "copy.close" : "copy.menu")}</span>
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <m.div
            id="public-navigation-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ top: headerHeight }}
            className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-white text-slate-900 dark:bg-brand-forest-950 dark:text-white md:hidden"
          >
            <div className="mx-auto grid min-h-full max-w-[90rem] gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:px-10">
              <div className="flex flex-col">
                <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.exploreZiquala")}</p>
                <nav className="mt-7 border-t border-slate-200 dark:border-white/20" aria-label={uiText("copy.mainNavigation")}>
                  {publicNavigation.map((item, index) => (
                    <div key={item.to} className="border-b border-slate-200 dark:border-white/20 py-4 sm:py-5">
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) => `group flex items-center justify-between transition-colors ${isActive ? 'text-brand-gold-700 dark:text-brand-gold-300' : 'text-slate-900 hover:text-brand-gold-700 dark:text-white dark:hover:text-brand-gold-200'}`}
                      >
                        <span className="flex items-baseline gap-4 sm:gap-6">
                          <span className="font-mono text-sm text-slate-600 dark:text-slate-200">{uiText(String(index + 1).padStart(2, '0'))}</span>
                          <span className="font-serif text-3xl sm:text-4xl">{uiText(item.label)}</span>
                        </span>
                        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                      </NavLink>
                      {item.children.length > 0 && (
                        <div className="ml-9 mt-4 flex flex-wrap gap-x-5 gap-y-2 sm:ml-14">
                          {item.children.map((child) => (
                            <Link key={child.hash} to={`${item.to}${child.hash}`} onClick={() => setMenuOpen(false)} className="text-xs font-bold text-slate-600 dark:text-slate-200 transition hover:text-brand-gold-700 dark:hover:text-brand-gold-300">{uiText(child.label)}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-8 inline-flex w-full items-center justify-center gap-3 bg-brand-gold-400 px-6 py-4 text-sm font-black text-brand-forest-950 sm:w-fit">
                  <LogIn size={18} />{uiText(" copy.enterTheSchoolPortal")}</Link>
              </div>

              <div className="grid content-start gap-4 sm:grid-cols-2">
                <Link to="/school" onClick={() => setMenuOpen(false)} className="group relative min-h-72 overflow-hidden sm:min-h-[30rem]">
                  <img width={1280} height={719} loading="lazy" decoding="async" src={studentAssembly} alt={uiText("copy.ziqualaAboStudentsInTheSchoolCourtyard")} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 hidden dark:block bg-gradient-to-t from-brand-forest-950 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 bg-white p-6 dark:bg-transparent">
                    <p className="text-base font-black uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.school")}</p>
                    <p className="mt-2 font-serif text-3xl">{uiText("copy.learningForTomorrow")}</p>
                  </div>
                </Link>
                <Link to="/monastery" onClick={() => setMenuOpen(false)} className="group relative min-h-72 overflow-hidden sm:min-h-[30rem]">
                  <img src={craterCommunity} alt={uiText("copy.ziqualaMonasteryCommunityNearTheCraterLake")} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 hidden dark:block bg-gradient-to-t from-brand-forest-950 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 bg-white p-6 dark:bg-transparent">
                    <p className="text-base font-black uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.monastery")}</p>
                    <p className="mt-2 font-serif text-3xl">{uiText("copy.aLivingHeritage")}</p>
                  </div>
                </Link>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const PublicLayout = () => {
  useTranslation('public');

  return (
    <LazyMotion features={domAnimation} strict>
    <div className="public-site min-h-screen overflow-x-clip text-left bg-brand-canvas text-slate-900 dark:text-slate-100">
      <PublicHeader />
      <main id="public-main-content" tabIndex={-1}><Outlet /></main>
    </div>
    </LazyMotion>
  );
};
