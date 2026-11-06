import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

type Position = { x: number; y: number };
const positions = new Map<string, Position>();
const remember = (key: string) => {
  positions.delete(key);
  positions.set(key, { x: window.scrollX, y: window.scrollY });
  if (positions.size > 80) positions.delete(positions.keys().next().value!);
};

// One owner for route scrolling, mounted across lazy routes and session checks.
export default function ScrollToTop() {
  const location = useLocation();
  const action = useNavigationType();
  const entry = `${location.key}:${location.pathname}${location.search}${location.hash}`;
  const activeEntry = useRef(entry);
  const previous = useRef<{ pathname: string; hash: string; search: string } | null>(null);
  useEffect(() => {
    const prior = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const save = () => remember(activeEntry.current);
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('popstate', save);
    document.addEventListener('click', save, true);
    return () => {
      history.scrollRestoration = prior;
      window.removeEventListener('scroll', save);
      window.removeEventListener('popstate', save);
      document.removeEventListener('click', save, true);
    };
  }, []);

  useLayoutEffect(() => {
    const prior = previous.current;
    previous.current = { pathname: location.pathname, hash: location.hash, search: location.search };
    activeEntry.current = entry;
    // Query-only changes, including the book viewer, preserve place and focus.
    if (prior?.pathname === location.pathname && prior.hash === location.hash && prior.search !== location.search) return;
    const saved = action === 'POP' ? positions.get(entry) : undefined;
    let anchor = '';
    try { anchor = decodeURIComponent(location.hash.slice(1)); } catch { /* Invalid fragments are harmless. */ }
    let cancelled = false;
    let aligned = false;
    let frame = 0;
    let observer: MutationObserver;
    let resize: ResizeObserver;
    let timeout = 0;
    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect(); resize?.disconnect(); window.clearTimeout(timeout);
    };
    const attempt = () => {
      if (cancelled) return;
      const main = document.querySelector<HTMLElement>('main, h1');
      if (!main || !main.getClientRects().length || main.closest('[inert]')) return;
      const target = anchor ? document.getElementById(anchor) : main;
      if (anchor && (!target || !target.getClientRects().length)) return;
      if (saved) {
        window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
        if (document.documentElement.scrollHeight - innerHeight < saved.y - 2) return;
      } else if (anchor && target) {
        const height = document.querySelector('header')?.getBoundingClientRect().height || 0;
        window.scrollTo({ top: Math.max(0, scrollY + target.getBoundingClientRect().top - height - 16), behavior: 'instant' });
      } else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (prior && !aligned && !document.querySelector('dialog[open]')) {
        const focusTarget = saved ? main : target;
        if (focusTarget && !focusTarget.closest('[inert]')) {
          if (!focusTarget.hasAttribute('tabindex')) {
            focusTarget.tabIndex = -1;
            focusTarget.addEventListener('blur', () => focusTarget.removeAttribute('tabindex'), { once: true });
          }
          focusTarget.focus({ preventScroll: true });
        }
      }
      aligned = true;
      // A nearby lazy bookshelf can still expand above this section after the jump.
      // Observe those layout changes briefly; user input always cancels restoration.
      if (!anchor && !saved) stop();
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(attempt); };
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert'] });
    resize = new ResizeObserver(schedule);
    resize.observe(document.documentElement);
    timeout = window.setTimeout(() => {
      if (!aligned && !saved) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      stop();
    }, 5000);
    // Stop retrying when the visitor starts interacting with the new page.
    window.addEventListener('wheel', stop, { passive: true, once: true });
    window.addEventListener('touchstart', stop, { passive: true, once: true });
    window.addEventListener('pointerdown', stop, { once: true });
    window.addEventListener('keydown', stop, { once: true });
    schedule();
    return () => {
      stop();
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [entry, location.pathname, location.hash, action]);
  return null;
}
