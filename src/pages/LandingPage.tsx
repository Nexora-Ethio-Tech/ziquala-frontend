import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  Landmark,
  LogIn,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Mountain,
  Music2,
  Newspaper,
  PlayCircle,
  Phone,
  Send,
  Sparkles,
  Sun,
  Trees,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  monasteryContact,
  monasteryDonation,
  monasteryHistory,
  portalRoles,
  publicNavigation,
  schoolBoardLeaders,
  schoolGoals,
  schoolPurpose,
  schoolStaff,
  ziqualaBranches,
  type SchoolStaffGroup,
  socialLinks,
  ziqualaIdentity,
} from '../data/ziqualaContent';
import { ELearningPage, FeaturedBookGallery } from './ELearningPage';
import monasteryMark from '../assets/monastery/monastery-mark.webp';
import craterCommunity from '../assets/monastery/crater-community.webp';
import monksByLake from '../assets/monastery/monks-by-lake.webp';
import monkOnPath from '../assets/monastery/monk-on-path.webp';
import monasteryCommunity from '../assets/monastery/monastery-community.webp';
import schoolBuilding from '../assets/school/school-building.jpg';
import studentAssembly from '../assets/school/student-assembly.jpg';
import schoolLogo from '../assets/school/school-logo.jpg';
import church from '../assets/monastery/church.jpg';
import monksReading from '../assets/monastery/monks-reading.webp';
import injeraMaking from '../assets/monastery/projects/injera-making.webp';
import sewingProject from '../assets/monastery/projects/sewing.webp';
import cropHarvest from '../assets/monastery/projects/crop-harvest.webp';
import oxFarming from '../assets/monastery/projects/ox-farming.webp';
import livestock from '../assets/monastery/projects/livestock.webp';
import abbotHarvest from '../assets/monastery/projects/abbot-harvest.webp';

const SectionTitle = ({ eyebrow, children, copy }: { eyebrow: string; children: ReactNode; copy?: string }) => (
  <div className="max-w-3xl mb-10 md:mb-14">
    <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">{eyebrow}</p>
    <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white">{children}</h2>
    {copy && <p className="mt-5 text-base md:text-lg leading-8 text-slate-600 dark:text-slate-300">{copy}</p>}
  </div>
);

const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} shrink-0 overflow-hidden rounded-full border border-emerald-950/10 bg-white`}>
      <img src={schoolLogo} alt="" className="h-full w-full object-cover" />
    </div>
    <div className="min-w-0">
      <p className={`${compact ? 'text-sm' : 'text-base'} font-black tracking-tight text-slate-950 dark:text-white truncate`}>{ziqualaIdentity.shortName}</p>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 truncate">Primary · Grade 1–8</p>
    </div>
  </div>
);

const socialIcon = (platform: string) => {
  if (platform === 'youtube') return PlayCircle;
  if (platform === 'facebook') return MessageCircle;
  if (platform === 'tiktok') return Music2;
  return Send;
};

const PublicHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f4f0e7]/95 backdrop-blur-xl dark:border-white/10 dark:!bg-slate-950/95">
        <div className="mx-auto flex h-[4.75rem] max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link to="/" onClick={() => setMenuOpen(false)} aria-label="Ziquala Abo School home" className="min-w-0">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-7 xl:flex" aria-label="Quick navigation">
            {publicNavigation.slice(0, 4).map((item) => (
              <div key={item.to} className="group relative flex h-[4.75rem] items-center">
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `relative py-2 text-[13px] font-bold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform ${isActive
                    ? 'text-emerald-950 after:scale-x-100 after:bg-emerald-800 dark:text-white dark:after:bg-amber-400'
                    : 'text-slate-600 after:scale-x-0 after:bg-emerald-800 hover:text-emerald-900 hover:after:scale-x-100 dark:text-slate-300 dark:hover:text-white'
                    }`}
                >
                  {item.label}
                </NavLink>
                {item.children.length > 0 && (
                  <div className="invisible absolute left-1/2 top-full w-64 -translate-x-1/2 translate-y-2 border-t-4 border-amber-400 bg-emerald-950 p-3 opacity-0 shadow-2xl transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <p className="px-3 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.24em] text-emerald-300">Jump to</p>
                    {item.children.map((child) => (
                      <Link key={child.hash} to={`${item.to}${child.hash}`} className="flex items-center justify-between border-t border-white/10 px-3 py-3 text-sm font-bold text-white transition hover:bg-white/10 hover:text-amber-300">
                        {child.label}<ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center text-slate-500 transition-colors hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-300"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-pressed={theme === 'dark'}
              title={theme === 'light' ? 'Use dark theme' : 'Use light theme'}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <Link to="/login" className="hidden items-center gap-2 border-l border-black/15 px-4 py-2.5 text-sm font-black text-emerald-950 transition-colors hover:text-amber-700 dark:border-white/15 dark:text-white dark:hover:text-amber-300 md:inline-flex">
              <LogIn size={17} /> Portal Login
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="ml-1 inline-flex h-11 items-center gap-2 border border-emerald-950/20 px-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-950 transition-colors hover:border-emerald-900 hover:bg-emerald-900 hover:text-white dark:border-white/25 dark:text-white dark:hover:bg-white dark:hover:text-slate-950 sm:px-4"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="public-navigation-menu"
            >
              <span className="hidden sm:inline">{menuOpen ? 'Close' : 'Menu'}</span>
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="public-navigation-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 top-[4.75rem] z-40 overflow-y-auto bg-emerald-950 text-white"
          >
            <div className="mx-auto grid min-h-full max-w-[90rem] gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:px-10">
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">Explore Ziquala</p>
                <nav className="mt-7 border-t border-white/20" aria-label="Main navigation">
                  {publicNavigation.map((item, index) => (
                    <div key={item.to} className="border-b border-white/20 py-4 sm:py-5">
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) => `group flex items-center justify-between transition-colors ${isActive ? 'text-amber-300' : 'text-white hover:text-amber-200'}`}
                      >
                        <span className="flex items-baseline gap-4 sm:gap-6">
                          <span className="font-mono text-[10px] text-white/45">{String(index + 1).padStart(2, '0')}</span>
                          <span className="font-serif text-3xl sm:text-4xl">{item.label}</span>
                        </span>
                        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                      </NavLink>
                      {item.children.length > 0 && (
                        <div className="ml-9 mt-4 flex flex-wrap gap-x-5 gap-y-2 sm:ml-14">
                          {item.children.map((child) => (
                            <Link key={child.hash} to={`${item.to}${child.hash}`} onClick={() => setMenuOpen(false)} className="text-xs font-bold text-white/60 transition hover:text-amber-300">{child.label}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-8 inline-flex w-full items-center justify-center gap-3 bg-amber-400 px-6 py-4 text-sm font-black text-emerald-950 sm:w-fit">
                  <LogIn size={18} /> Enter the school portal
                </Link>
              </div>

              <div className="grid content-start gap-4 sm:grid-cols-2">
                <Link to="/school" onClick={() => setMenuOpen(false)} className="group relative min-h-72 overflow-hidden sm:min-h-[30rem]">
                  <img src={studentAssembly} alt="Ziquala Abo students in the school courtyard" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">School</p>
                    <p className="mt-2 font-serif text-3xl">Learning for tomorrow</p>
                  </div>
                </Link>
                <Link to="/monastery" onClick={() => setMenuOpen(false)} className="group relative min-h-72 overflow-hidden sm:min-h-[30rem]">
                  <img src={craterCommunity} alt="Ziquala monastery community near the crater lake" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Monastery</p>
                    <p className="mt-2 font-serif text-3xl">A living heritage</p>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const PublicFooter = () => (
  <footer className="border-t border-black/10 bg-[#ebe4d5] text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-white">
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 grid gap-10 lg:grid-cols-[1.2fr_.8fr_1fr]">
      <div>
        <BrandMark />
        <p className="mt-5 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">{ziqualaIdentity.fullName}, serving children and families in Bishoftu under the stewardship of the monastery association.</p>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{ziqualaIdentity.location}</p>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Explore</p>
        <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Link to="/school" className="hover:text-emerald-800 dark:hover:text-white">School information</Link>
          <Link to="/monastery" className="hover:text-emerald-800 dark:hover:text-white">Monastery information</Link>
          <Link to="/elearning" className="hover:text-emerald-800 dark:hover:text-white">eLearning</Link>
          <Link to="/news" className="hover:text-emerald-800 dark:hover:text-white">News & events</Link>
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Ziquala Abo Media</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {socialLinks.map((social) => {
            const Icon = socialIcon(social.platform);
            return (
              <a key={social.href} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label} className="grid h-11 w-11 place-items-center rounded-lg bg-black/5 text-slate-700 transition-colors hover:bg-emerald-700 hover:text-white dark:bg-white/5 dark:text-slate-300">
                <Icon size={19} />
              </a>
            );
          })}
        </div>
      </div>
    </div>
    <div className="border-t border-black/10 px-5 py-5 text-center text-xs text-slate-500 dark:border-white/10">
      © 2026 Ziquala Abo School. Public content is separated between school and monastery areas.
    </div>
  </footer>
);

const PublicLayout = () => {
  const location = useLocation();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (location.hash) {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-[#f4f0e7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicHeader />
      <main><Outlet /></main>
      <PublicFooter />
    </div>
  );
};

const HomePage = () => {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <section className="relative isolate flex min-h-[calc(100svh-4.75rem)] items-end overflow-hidden bg-[#f4f0e7] text-emerald-950 dark:bg-emerald-950 dark:text-white">
        <motion.img
          initial={reduceMotion ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          src={schoolBuilding}
          alt="The Ziquala Abo School building in Bishoftu"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45 dark:opacity-100"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(244,240,231,.98)_0%,rgba(244,240,231,.88)_45%,rgba(244,240,231,.2)_82%),linear-gradient(0deg,rgba(244,240,231,.82)_0%,transparent_55%)] dark:bg-[linear-gradient(90deg,rgba(2,44,32,.94)_0%,rgba(2,44,32,.72)_44%,rgba(2,44,32,.15)_78%),linear-gradient(0deg,rgba(3,30,24,.72)_0%,transparent_50%)]" />
        <div className="absolute inset-0 -z-10 bg-[#f4f0e7]/45 dark:bg-emerald-950/30 sm:hidden" />
        <div className="mx-auto grid w-full max-w-[90rem] gap-12 px-5 pb-12 pt-24 md:pb-16 lg:grid-cols-[1fr_18rem] lg:items-end lg:px-10 lg:pb-20">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl"
          >
            <p className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.28em] text-amber-800 dark:text-amber-300">
              <span className="h-px w-9 bg-amber-700 dark:bg-amber-300" /> Bishoftu · KG–Grade 8
            </p>
            <h1 className="mt-7 max-w-5xl font-serif text-5xl font-medium leading-[0.95] tracking-[-0.045em] sm:text-6xl md:text-8xl lg:text-[6.4rem]">
              Learning with roots. <span className="text-amber-700 dark:text-amber-300">Growing with purpose.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-700 dark:text-white/78 sm:text-lg md:leading-8">
              A school where modern knowledge, Ethiopian values, and responsible citizenship shape confident learners.
            </p>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-4">
              <Link to="/school" className="group inline-flex items-center gap-3 bg-amber-400 px-6 py-4 text-sm font-black text-emerald-950 transition-colors hover:bg-amber-300">
                Discover the school <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/elearning" className="group inline-flex items-center gap-3 border-b border-emerald-900/50 py-3 text-sm font-black text-emerald-950 transition-colors hover:border-amber-700 hover:text-amber-800 dark:border-white/55 dark:text-white dark:hover:border-amber-300 dark:hover:text-amber-200">
                Explore eLearning <BookOpen size={18} />
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="border-l border-emerald-900/25 bg-white/75 p-5 text-sm leading-7 text-slate-600 backdrop-blur-sm dark:border-white/30 dark:bg-transparent dark:py-0 dark:pr-0 dark:text-white/72"
          >
            <p lang="am" className="font-serif text-lg leading-8 text-emerald-950 dark:text-white">{ziqualaIdentity.amharicName}</p>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Official school identity</p>
          </motion.div>
        </div>
      </section>

      <section id="destinations" className="scroll-mt-24 px-5 py-20 dark:bg-slate-950 md:py-28 lg:px-10">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-10 border-b border-black/15 pb-14 dark:border-white/15 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-800 dark:text-emerald-400">One heritage · Two destinations</p>
            <h2 className="max-w-4xl font-serif text-4xl font-medium leading-[1.02] tracking-[-0.035em] text-emerald-950 dark:text-white sm:text-5xl md:text-6xl">
              The school and monastery belong to one story, with space for each to speak clearly.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.12fr_.88fr]">
            <Link to="/school" className="group relative min-h-[34rem] overflow-hidden bg-emerald-950 text-white">
              <img src={studentAssembly} alt="Ziquala Abo students gathered in the school courtyard" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">School experience</p>
                <div className="mt-3 flex items-end justify-between gap-8">
                  <div>
                    <h3 className="font-serif text-5xl font-medium sm:text-6xl">Learn. Grow. Lead.</h3>
                    <p className="mt-4 max-w-xl leading-7 text-white/75">Explore learning, student life, leadership, school news, and the Grade 1–8 academic experience.</p>
                  </div>
                  <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-full border border-white/50 transition group-hover:translate-x-1 group-hover:bg-white group-hover:text-emerald-950 sm:grid"><ArrowRight /></span>
                </div>
              </div>
            </Link>

            <Link to="/monastery" className="group relative min-h-[34rem] overflow-hidden bg-stone-950 text-white">
              <img src={craterCommunity} alt="The Ziquala monastic community near the crater lake" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">Monastery experience</p>
                <h3 className="mt-3 font-serif text-5xl font-medium sm:text-6xl">Faith. Place. Heritage.</h3>
                <p className="mt-4 max-w-lg leading-7 text-white/75">Enter a dedicated space for history, sacred life, community projects, and the monastery media archive.</p>
                <span className="mt-7 inline-flex items-center gap-3 text-sm font-black">Visit the monastery <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section id="home-overview" className="scroll-mt-24 border-y border-black/10 bg-white text-emerald-950 dark:border-emerald-800/20 dark:bg-emerald-950 dark:text-white">
        <div className="mx-auto grid max-w-[90rem] divide-y divide-black/10 px-5 dark:divide-white/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-10">
          {[
            ['Students', '1,534 enrolled'],
            ['Campuses', '2 in Bishoftu'],
            ['Grades', 'KG 1–Grade 8'],
          ].map(([label, value]) => (
            <div key={label} className="py-8 sm:px-7 first:pl-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">{label}</p>
              <p className="mt-2 font-serif text-xl text-emerald-950 dark:text-white/90">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

const LeadershipAlbum = () => {
  const profiles = schoolBoardLeaders.map((leader) => ({
    ...leader,
    role: 'የት/ቤቱ ቦርድ አመራር',
    englishRole: 'School Board Leadership',
  }));
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(() => window.matchMedia('(min-width: 768px)').matches ? 2 : 1);
  const nextPage = (page + 1) % profiles.length;
  const pageCount = Math.ceil(profiles.length / pageSize);
  const activeSpread = Math.floor(page / pageSize);
  const move = (direction: number) => setPage((current) => (current + (direction * pageSize) + profiles.length) % profiles.length);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updatePageSize = (matches: boolean) => {
      const size = matches ? 2 : 1;
      setPageSize(size);
      setPage((current) => Math.floor(current / size) * size);
    };
    const handleChange = (event: MediaQueryListEvent) => updatePageSize(event.matches);
    updatePageSize(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const AlbumPage = ({ index, right = false }: { index: number; right?: boolean }) => {
    const profile = profiles[index];
    return (
      <article className={`relative min-w-0 bg-[#fffdf5] p-5 text-slate-900 sm:p-7 lg:p-8 ${right ? 'hidden border-l border-amber-900/15 md:block' : ''}`}>
        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#a16207_0.55px,transparent_0.55px)] [background-size:8px_8px]" />
        <div className="relative">
          <div className="relative mx-auto max-w-[13rem] rotate-[-0.35deg] rounded-sm bg-white p-2.5 pb-4 shadow-[0_12px_35px_rgba(67,43,15,.22)] sm:max-w-[15rem] sm:p-3 sm:pb-5">
            <span className="absolute -left-2 -top-2 h-8 w-16 -rotate-12 bg-amber-100/80 shadow-sm" />
            <span className="absolute -right-2 -top-2 h-8 w-16 rotate-12 bg-amber-100/80 shadow-sm" />
            <div className="aspect-[4/5] overflow-hidden bg-stone-200">
              <img src={profile.image} alt={`${profile.englishName}, ${profile.englishRole}`} className="h-full w-full object-cover object-top" />
            </div>
          </div>
          <div className="mx-auto mt-7 max-w-md text-center">
            <p lang="am" className="text-xs font-black uppercase tracking-[0.12em] text-emerald-800">{profile.role}</p>
            <h3 lang="am" className="mt-3 text-xl font-black leading-tight sm:text-2xl">{profile.name}</h3>
            <p className="mt-2 text-sm font-bold text-slate-500">{profile.englishName}</p>
            <p className="mt-1 text-xs font-semibold text-amber-800">{profile.englishRole}</p>
          </div>
          <p className={`mt-7 font-serif text-xs italic text-amber-900/55 ${right ? 'text-right' : 'text-left'}`}>Page {index + 1}</p>
        </div>
      </article>
    );
  };

  return (
    <section id="school-leadership" data-leadership-section className="scroll-mt-24 bg-stone-100 py-20 dark:bg-slate-900/50 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow="School board · የት/ቤቱ ቦርድ" copy="The school board consists of the four leaders shown here. School management and staff are presented separately below.">Board leadership</SectionTitle>
        <div className="relative mx-auto max-w-5xl rounded-[1.75rem] bg-gradient-to-br from-amber-950 via-amber-900 to-stone-950 p-2.5 shadow-[0_30px_80px_rgba(67,43,15,.3)] sm:p-4">
          <div className="relative grid overflow-hidden rounded-[1.1rem] md:grid-cols-2">
            <AlbumPage index={page} />
            <AlbumPage index={nextPage} right />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-950/15 to-transparent md:block" />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={() => move(-1)} aria-label="Previous leadership photo" className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><ChevronLeft size={21} /></button>
          <div className="flex items-center gap-2" aria-label={`Leadership page ${activeSpread + 1} of ${pageCount}`}>
            {Array.from({ length: pageCount }, (_, index) => (
              <button key={index} type="button" onClick={() => setPage(index * pageSize)} aria-label={`Show leadership page ${index + 1}`} className={`h-2.5 rounded-full transition-all ${index === activeSpread ? 'w-8 bg-emerald-700' : 'w-2.5 bg-slate-300 dark:bg-slate-700'}`} />
            ))}
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Next leadership photo" className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><ChevronRight size={21} /></button>
        </div>
      </div>
    </section>
  );
};

const staffGroups: Array<{ id: SchoolStaffGroup; label: string; shortLabel: string }> = [
  { id: 'office', label: 'Office & management', shortLabel: 'Office' },
  { id: 'primary', label: 'Grade 1–8 teachers', shortLabel: 'Grade 1–8' },
  { id: 'kindergarten', label: 'Kindergarten team', shortLabel: 'Kindergarten' },
];

const StaffGallery = () => {
  const [activeGroup, setActiveGroup] = useState<SchoolStaffGroup>('office');
  const visibleStaff = schoolStaff.filter((member) => member.group === activeGroup);

  return (
    <section id="school-staff" className="scroll-mt-24 overflow-hidden bg-[#ebe4d5] py-20 dark:bg-slate-950 md:py-28">
      <div className="mx-auto max-w-[90rem] px-5 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionTitle eyebrow="Our people" copy="School management, primary teachers, and kindergarten staff are kept separate from the four-member school board.">Meet the school team</SectionTitle>
          <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Staff groups">
            {staffGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={activeGroup === group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`shrink-0 border px-4 py-3 text-xs font-black transition-colors sm:px-5 ${activeGroup === group.id
                  ? 'border-emerald-900 bg-emerald-900 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950'
                  : 'border-emerald-950/20 text-emerald-950 hover:border-emerald-800 dark:border-white/20 dark:text-white dark:hover:border-amber-300'
                  }`}
              >
                <span className="sm:hidden">{group.shortLabel}</span>
                <span className="hidden sm:inline">{group.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-7 [scrollbar-color:#a16207_transparent] sm:gap-5" role="tabpanel" aria-live="polite">
          {visibleStaff.map((member) => (
            <article key={`${member.group}-${member.name}-${member.role}`} className="w-[74vw] max-w-[17rem] shrink-0 snap-start sm:w-[17rem]">
              <div className="aspect-[4/5] overflow-hidden bg-stone-300 dark:bg-slate-800">
                <img src={member.image} alt={`${member.name}, ${member.role}`} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition duration-500 hover:scale-[1.025]" />
              </div>
              <div className="border-t-4 border-amber-500 bg-white px-4 py-5 dark:bg-slate-900">
                <h3 lang="am" className="text-base font-black leading-6 text-emerald-950 dark:text-white">{member.name}</h3>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{member.role}</p>
              </div>
            </article>
          ))}
          <div className="w-1 shrink-0" aria-hidden="true" />
        </div>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-900/55 dark:text-white/45">Swipe or scroll to meet the full team · {visibleStaff.length} people</p>
      </div>
    </section>
  );
};

const monasteryProjects = [
  {
    title: 'Injera preparation',
    product: 'Fresh, locally prepared injera',
    copy: 'Prepared through the monastery’s working community, injera production supplies daily food and creates income that helps cover essential monastery expenses.',
    image: injeraMaking,
    alt: 'Injera being prepared as part of daily monastery work',
  },
  {
    title: 'Sewing & textile work',
    product: 'Sewn garments, textiles, and repair work',
    copy: 'The sewing project turns practical skill into useful textile products and repair services while creating a dependable source of income.',
    image: sewingProject,
    alt: 'A member of the monastery community working at a sewing machine',
  },
  {
    title: 'Shared harvest',
    product: 'Seasonal crops and harvested produce',
    copy: 'The community cultivates and gathers seasonal crops that help feed the monastery and generate funds for its continuing needs.',
    image: cropHarvest,
    alt: 'Members of the monastery community harvesting crops together',
  },
  {
    title: 'Traditional farming',
    product: 'Traditionally cultivated farm produce',
    copy: 'Ox-powered cultivation puts the monastery’s land to productive use, supporting food security and sustainable agricultural income.',
    image: oxFarming,
    alt: 'Traditional farming with oxen on monastery land',
  },
  {
    title: 'Livestock care',
    product: 'Responsibly raised livestock',
    copy: 'Livestock care is another important livelihood activity through which the monastery builds resilience and supports its operating expenses.',
    image: livestock,
    alt: 'Calves cared for through the monastery livestock project',
  },
  {
    title: 'Leadership in cultivation',
    product: 'A community-led model of production',
    copy: 'The monastery’s leadership participates directly in cultivation and harvest, showing that these enterprises are a shared foundation for the community’s sustainability.',
    image: abbotHarvest,
    alt: 'The monastery abbot participating in crop harvesting',
  },
] as const;

const MonasteryProjects = () => (
  <section id="monastery-projects" className="scroll-mt-24 bg-[#ebe4d5] py-20 dark:bg-slate-900 md:py-28">
    <div className="mx-auto max-w-[90rem] px-5 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-400">Sustaining the monastery</p>
        <div>
          <h2 className="font-serif text-4xl font-medium leading-[1.02] tracking-[-0.035em] text-emerald-950 dark:text-white sm:text-5xl md:text-6xl">Income-generating projects.</h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">Farming, food production, sewing, and livestock care generate the income the monastery needs for everyday expenses, community life, and long-term sustainability.</p>
        </div>
      </div>

      <div className="mt-12 grid gap-8">
        {monasteryProjects.map((project, index) => (
          <article key={project.title} className="grid overflow-hidden bg-white dark:bg-slate-950 md:grid-cols-2">
            <div className={`relative min-h-72 overflow-hidden bg-stone-300 dark:bg-slate-800 md:min-h-[30rem] ${index % 2 === 1 ? 'md:order-2' : ''}`}>
              <img src={project.image} alt={project.alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 hover:scale-[1.035]" />
              <span className="absolute left-5 top-5 bg-amber-400 px-3 py-2 font-mono text-[10px] font-black text-emerald-950">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-400">Product focus</p>
              <h3 className="mt-4 font-serif text-4xl text-emerald-950 dark:text-white sm:text-5xl">{project.title}</h3>
              <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{project.product}</p>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">{project.copy}</p>
              <a href="#monastery-contact" className="mt-8 inline-flex w-fit items-center gap-2 border-b border-emerald-800 pb-2 text-sm font-black text-emerald-900 dark:border-amber-300 dark:text-amber-300">Ask about this project <ArrowRight size={17} /></a>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const MonasteryHistory = () => (
  <section id="monastery-history" className="scroll-mt-24 bg-white py-20 dark:bg-slate-950 md:py-28">
    <div className="mx-auto max-w-[90rem] px-5 lg:px-10">
      <div className="grid gap-8 border-b border-black/15 pb-12 dark:border-white/15 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">A living history</p>
        <div>
          <h2 lang="am" className="font-serif text-4xl font-medium leading-[1.1] tracking-[-0.025em] text-emerald-950 dark:text-white sm:text-5xl md:text-6xl">የደብረ ዝቋላ ገዳም ታሪክ</h2>
          <p lang="am" className="mt-6 max-w-3xl text-lg leading-9 text-slate-600 dark:text-slate-300">የዘመናት የታሪክ፣ የቅድስና እና የትምህርት ማዕከል። ከዘመነ አክሱም እስከ ዛሬ የዘለቀውን የገዳሙን ታሪክ ከተሰጠን የገዳሙ ሰነድ እናቀርባለን።</p>
        </div>
      </div>

      <div className="divide-y divide-black/15 dark:divide-white/15">
        {monasteryHistory.map((chapter, index) => (
          <article key={chapter.title} className="grid gap-5 py-9 md:grid-cols-[11rem_1fr] md:gap-10 md:py-12">
            <div>
              <p className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">{String(index + 1).padStart(2, '0')}</p>
              <p lang="am" className="mt-3 text-sm font-black leading-6 text-emerald-800 dark:text-emerald-300">{chapter.period}</p>
            </div>
            <div className="max-w-4xl">
              <h3 lang="am" className="text-2xl font-black leading-10 text-emerald-950 dark:text-white md:text-3xl">{chapter.title}</h3>
              <p lang="am" className="mt-4 text-base leading-9 text-slate-600 dark:text-slate-300 md:text-lg">{chapter.body}</p>
            </div>
          </article>
        ))}
      </div>

      <div id="monastery-film" className="mt-6 grid scroll-mt-24 overflow-hidden bg-emerald-950 text-white lg:grid-cols-[1.35fr_.65fr]">
        <div className="aspect-video min-h-64 bg-black lg:min-h-[28rem]">
          <iframe
            src="https://www.youtube-nocookie.com/embed/6zhMGpFsfGg?start=118&rel=0"
            title="የዝቋላ አቦ ገዳም ታሪክ"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-10 md:p-12">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">History film · የገዳሙ ታሪክ</p>
          <h3 lang="am" className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">ስለ ገዳሙ አጭር ታሪክ</h3>
          <p className="mt-5 leading-7 text-white/70">Watch the monastery’s history film from the selected starting point at 1:58.</p>
          <a href="https://youtu.be/6zhMGpFsfGg?t=118" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 font-black text-amber-300">Watch directly on YouTube <ExternalLink size={17} /></a>
        </div>
      </div>
    </div>
  </section>
);

const MonasteryDonation = () => {
  const [copied, setCopied] = useState(false);
  const copyAccountNumber = () => {
    void navigator.clipboard.writeText(monasteryDonation.accountNumber).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <section id="donate" className="scroll-mt-24 bg-emerald-950 py-20 text-white md:py-28">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">Support the monastery</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">Help preserve a living spiritual heritage.</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-50/75">Donations help the monastery meet its needs, sustain its community, care for its heritage, and continue its service.</p>
        </div>
        <div className="border border-white/20 bg-white/10 p-6 sm:p-9">
          <Landmark className="text-amber-300" size={34} />
          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Donation account number</p>
          <p className="mt-3 break-all font-mono text-3xl font-black tracking-tight sm:text-4xl">{monasteryDonation.accountNumber}</p>
          <button type="button" onClick={copyAccountNumber} className="mt-6 inline-flex items-center gap-2 border border-white/30 px-5 py-3 text-sm font-black transition hover:bg-white hover:text-emerald-950">
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {copied ? 'Account number copied' : 'Copy account number'}
          </button>
          <p className="mt-7 max-w-xl text-sm leading-7 text-emerald-50/65">Please confirm the bank name and account-holder details with the monastery through its official email, phone, or Telegram before transferring funds.</p>
        </div>
      </div>
    </section>
  );
};

const MonasteryContact = () => {
  const contactItems = [
    { label: 'Email', value: monasteryContact.email, href: `mailto:${monasteryContact.email}`, icon: Mail },
    { label: 'Phone', value: monasteryContact.phoneDisplay, href: monasteryContact.phoneHref, icon: Phone },
    { label: 'Telegram', value: '@gebreabo', href: monasteryContact.telegram, icon: Send },
    { label: 'YouTube', value: '@ziqualaabomedia', href: monasteryContact.youtube, icon: PlayCircle },
    { label: 'Facebook', value: 'Ziquala Abo', href: monasteryContact.facebook, icon: MessageCircle },
  ];

  return (
    <section id="monastery-contact" className="scroll-mt-24 border-t border-black/10 bg-white py-20 dark:border-white/10 dark:bg-slate-900 md:py-24">
      <div className="mx-auto max-w-[90rem] px-5 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">Contact the monastery</p>
            <h2 className="mt-5 font-serif text-4xl text-emerald-950 dark:text-white sm:text-5xl">Stay connected.</h2>
            <p className="mt-5 max-w-md leading-7 text-slate-600 dark:text-slate-300">Use the monastery’s verified channels for enquiries, media, and community updates.</p>
          </div>
          <div className="grid border-t border-black/15 dark:border-white/15 sm:grid-cols-2">
            {contactItems.map((item) => (
              <a key={item.label} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined} className="group flex min-h-32 items-center gap-4 border-b border-black/15 py-6 sm:px-6 sm:odd:border-r dark:border-white/15">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-emerald-900/20 text-emerald-800 transition group-hover:bg-emerald-900 group-hover:text-white dark:border-white/20 dark:text-amber-300 dark:group-hover:bg-amber-400 dark:group-hover:text-slate-950"><item.icon size={19} /></span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">{item.label}</span>
                  <span className="mt-2 block break-words font-bold text-emerald-950 dark:text-white">{item.value}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const SchoolPage = () => (
  <>
    <section className="relative flex min-h-[42rem] items-end overflow-hidden bg-emerald-950 text-white">
      <img src={schoolBuilding} alt="Ziquala Abo Primary School campus" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/55 to-emerald-950/10" />
      <div className="relative mx-auto grid w-full max-w-[90rem] items-end gap-10 px-5 pb-14 lg:grid-cols-[1fr_.65fr] lg:px-10 lg:pb-20">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">The school · KG 1–Grade 8 · Two campuses</p>
          <h1 className="mt-6 max-w-5xl font-serif text-5xl font-medium leading-[.96] tracking-[-0.04em] sm:text-6xl md:text-8xl">Education rooted in knowledge, ethics, and service.</h1>
        </div>
        <p className="border-l border-white/35 pl-6 text-lg leading-8 text-white/78">A student-centred school serving 1,534 learners across kindergarten and primary campuses in Bishoftu.</p>
      </div>
    </section>

    <section id="school-purpose" className="mx-auto max-w-[90rem] scroll-mt-24 px-5 py-20 lg:px-10 md:py-28">
      <div className="grid gap-12 border-b border-black/15 pb-20 dark:border-white/15 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-800 dark:text-emerald-400">Our vision</p>
          <h2 className="mt-5 font-serif text-4xl font-medium leading-tight tracking-[-0.03em] text-emerald-950 dark:text-white md:text-5xl">Independent thinkers with strong roots.</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">{schoolPurpose.vision}</p>
        </div>
        <div className="lg:border-l lg:border-black/15 lg:pl-20 dark:lg:border-white/15">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-400">Our mission</p>
          <h2 className="mt-5 font-serif text-4xl font-medium leading-tight tracking-[-0.03em] text-emerald-950 dark:text-white md:text-5xl">Quality learning. Character for life.</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">{schoolPurpose.mission}</p>
        </div>
      </div>

      <div className="pt-20">
        <SectionTitle eyebrow="Core objectives" copy="Four commitments drawn from the school’s supplied vision, mission, and objectives.">What guides every learner</SectionTitle>
        <div className="grid border-t border-black/15 dark:border-white/15 md:grid-cols-2">
        {schoolGoals.map((goal, index) => (
          <div key={goal} className="flex min-h-44 gap-6 border-b border-black/15 py-8 pr-8 odd:md:border-r odd:md:pr-10 even:md:pl-10 dark:border-white/15">
            <span className="font-serif text-2xl text-amber-700 dark:text-amber-400">0{index + 1}</span>
            <p className="max-w-md text-lg font-bold leading-8 text-slate-700 dark:text-slate-200">{goal}</p>
          </div>
        ))}
        </div>
      </div>
    </section>

    <LeadershipAlbum />

    <StaffGallery />

    <FeaturedBookGallery />

    <section id="school-campuses" className="scroll-mt-24 bg-white py-20 dark:bg-slate-900/50 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[.65fr_1.35fr] lg:items-end">
          <div>
            <Building2 className="text-amber-700 dark:text-amber-400" size={34} />
            <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-400">Two Bishoftu campuses</p>
          </div>
          <div>
            <h2 className="font-serif text-4xl text-emerald-950 dark:text-white sm:text-5xl">1,534 students from KG 1 through Grade 8.</h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">The kindergarten branch and main primary campus provide a connected path across two locations in Bishoftu.</p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {ziqualaBranches.map((branch, index) => (
            <article key={branch.id} className="border border-black/10 bg-[#f4f0e7] p-7 dark:border-white/10 dark:bg-slate-950 sm:p-9">
              <div className="flex items-start justify-between gap-5">
                <p className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">0{index + 1}</p>
                <p className="text-right text-4xl font-black text-emerald-950 dark:text-white">{branch.enrollment.toLocaleString()}</p>
              </div>
              <h3 className="mt-10 font-serif text-3xl text-emerald-950 dark:text-white">{branch.name}</h3>
              <p className="mt-4 font-black text-emerald-700 dark:text-emerald-300">{branch.grades}</p>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{branch.location}</p>
              <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{branch.enrollment.toLocaleString()} students</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-6 border border-amber-800/20 bg-amber-50 p-7 dark:border-amber-300/15 dark:bg-amber-300/5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-xl font-black text-emerald-950 dark:text-white">Student assessment details</h3>
            <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">The exact weighting for classroom work, continuous assessment, and examinations still needs confirmation before it is published as official school policy.</p>
          </div>
          <Link to="/news" className="inline-flex items-center gap-2 font-black text-emerald-800 dark:text-amber-300"><Newspaper size={18} /> School updates</Link>
        </div>
      </div>
    </section>
  </>
);

const MonasteryPage = () => (
  <>
    <section className="relative min-h-[680px] flex items-end overflow-hidden bg-slate-950 text-white">
      <img src={craterCommunity} alt="Ziquala monastery clergy at the crater lake" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/10" />
      <div className="relative max-w-7xl mx-auto w-full px-5 lg:px-8 pb-16 md:pb-24 grid lg:grid-cols-[1fr_.65fr] gap-12 items-end">
        <div>
          <div className="flex items-center gap-4">
            <img src={monasteryMark} alt="Ziquala Abo Media mark" className="h-20 w-20 object-contain rounded-xl bg-white/95 p-2" />
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">Monastery information</p>
          </div>
          <h1 className="mt-7 text-5xl md:text-7xl font-black tracking-[-0.045em] leading-none">Ziquala Abo Monastery</h1>
        </div>
        <div>
          <p className="text-lg leading-8 text-white/75">A dedicated space for the monastery’s history, spiritual community, income-generating projects, and media archive—kept separate from school photography and academic content.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#monastery-history" className="inline-flex items-center gap-2 bg-amber-400 px-5 py-3 text-sm font-black text-emerald-950">Read the history <ArrowRight size={17} /></a>
            <a href="#donate" className="inline-flex items-center gap-2 border border-white/35 px-5 py-3 text-sm font-black text-white">Support the monastery <HeartHandshake size={17} /></a>
          </div>
        </div>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
      <SectionTitle eyebrow="A separate public experience" copy="The archive contains extensive professional documentation of the crater lake, clergy, monastic life, interviews, journeys, and community activity.">Faith, place, and living heritage</SectionTitle>
      <div className="grid lg:grid-cols-3 gap-5">
        {[
          { icon: Mountain, title: 'History', copy: 'Read the supplied Amharic history from the monastery’s sixth-century foundation through its trials, restoration, and life today.' },
          { icon: Users, title: 'Monastic community', copy: 'Profiles of monks and community members will be published only after names, roles, and permissions are confirmed.' },
          { icon: HeartHandshake, title: 'Livelihood projects', copy: 'Agriculture, food production, sewing, and livestock help generate the income the monastery needs to sustain itself.' },
        ].map((item) => (
          <div key={item.title} className="p-8 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <item.icon size={32} className="text-emerald-700 dark:text-emerald-400" />
            <h2 className="mt-8 text-2xl font-black">{item.title}</h2>
            <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{item.copy}</p>
          </div>
        ))}
      </div>
    </section>

    <MonasteryHistory />

    <MonasteryProjects />

    <section id="monastery-media" className="scroll-mt-24 bg-[#f4f0e7] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
        <SectionTitle eyebrow="Monastery media" copy="A first curated selection from the read-only archive. The original high-resolution files remain safely on the Transcend drive.">Archive preview</SectionTitle>
        <div className="grid gap-4 md:grid-cols-12">
          <figure className="relative min-h-[500px] overflow-hidden md:col-span-7 md:row-span-2">
            <img src={church} alt="The church at Ziquala Abo Monastery" className="absolute inset-0 h-full w-full object-cover" />
          </figure>
          <figure className="relative min-h-[300px] overflow-hidden md:col-span-5">
            <img src={monksReading} alt="Monks reading together" className="absolute inset-0 h-full w-full object-cover" />
          </figure>
          <figure className="relative min-h-[300px] overflow-hidden md:col-span-5">
            <img src={monksByLake} alt="Monastery community gathered near the crater lake" className="absolute inset-0 h-full w-full object-cover" />
          </figure>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <figure className="relative min-h-[320px] overflow-hidden"><img src={monkOnPath} alt="A monk walking through the Ziquala landscape" className="absolute inset-0 h-full w-full object-cover" /></figure>
          <figure className="relative min-h-[320px] overflow-hidden"><img src={monasteryCommunity} alt="Members of the monastery community" className="absolute inset-0 h-full w-full object-cover" /></figure>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-5 rounded-xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/5 md:flex-row md:items-center">
          <div className="flex gap-4">
            <PlayCircle size={32} className="shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-black">Documentary and interview archive available</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Large source videos will be streamed through an approved media host rather than bundled into the frontend.</p>
            </div>
          </div>
          <a href={monasteryContact.youtube} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 font-black text-slate-950">Watch on YouTube <ExternalLink size={17} /></a>
        </div>
      </div>
    </section>

    <MonasteryDonation />

    <MonasteryContact />
  </>
);

const NewsPage = () => (
  <>
    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
      <SectionTitle eyebrow="News & events" copy="A dedicated public space for school announcements, ceremonies, academic dates, community events, and verified monastery project updates.">Stay connected with Ziquala Abo</SectionTitle>
      <div className="grid md:grid-cols-3 gap-5">
        {[
          { icon: CalendarDays, label: 'School calendar', title: 'Academic dates and upcoming events', copy: 'Term dates, meetings, examinations, ceremonies, and holidays will be published here.' },
          { icon: GraduationCap, label: 'School updates', title: 'Learning, achievement, and community', copy: 'Verified school announcements and student-facing updates will remain separate from monastery media.' },
          { icon: Trees, label: 'Monastery projects', title: 'Heritage and community initiatives', copy: 'Approved project updates can link directly to the dedicated monastery experience.' },
        ].map((item) => (
          <article key={item.label} className="p-8 min-h-[330px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex flex-col">
            <item.icon size={32} className="text-emerald-700 dark:text-emerald-400" />
            <p className="mt-12 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">{item.label}</p>
            <h2 className="mt-3 text-2xl font-black">{item.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.copy}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 p-6 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-center">
        <Sparkles className="mx-auto text-amber-600" />
        <p className="mt-4 font-black">Publishing tools will connect here later</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The frontend is ready for the future Ziquala announcements API.</p>
      </div>
    </section>
  </>
);

const PortalScopePage = () => (
  <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
    <SectionTitle eyebrow="Portal scope" copy="The Ziquala system focuses strictly on academic and administrative management.">Approved user roles</SectionTitle>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {portalRoles.map((role) => (
        <div key={role} className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-700 dark:text-emerald-400" />
          <span className="font-black">{role}</span>
        </div>
      ))}
    </div>
    <div className="mt-10 flex justify-center"><Link to="/login" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-900 text-white font-black">Continue to login <ArrowRight size={18} /></Link></div>
  </section>
);

export const LandingPage = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<HomePage />} />
      <Route path="school" element={<SchoolPage />} />
      <Route path="monastery" element={<MonasteryPage />} />
      <Route path="elearning" element={<ELearningPage />} />
      <Route path="news" element={<NewsPage />} />
      <Route path="portal" element={<PortalScopePage />} />
      <Route path="about" element={<Navigate to="/school" replace />} />
      <Route path="programs" element={<Navigate to="/school" replace />} />
      <Route path="school-life" element={<Navigate to="/school" replace />} />
      <Route path="branches" element={<Navigate to="/school" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);
