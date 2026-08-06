import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  LogIn,
  Menu,
  MessageCircle,
  Moon,
  Mountain,
  Music2,
  Newspaper,
  PlayCircle,
  School,
  Send,
  Sparkles,
  Sun,
  Trees,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  academicManagerProfile,
  managementStructure,
  portalRoles,
  publicNavigation,
  schoolBoardLeaders,
  schoolGoals,
  socialLinks,
  ziqualaIdentity,
} from '../data/ziqualaContent';
import { ELearningPage, FeaturedBookGallery } from './ELearningPage';
import monasteryMark from '../assets/monastery/monastery-mark.webp';
import craterCommunity from '../assets/monastery/crater-community.webp';
import monksByLake from '../assets/monastery/monks-by-lake.webp';
import monkOnPath from '../assets/monastery/monk-on-path.webp';
import monasteryCommunity from '../assets/monastery/monastery-community.webp';

const SectionTitle = ({ eyebrow, children, copy }: { eyebrow: string; children: ReactNode; copy?: string }) => (
  <div className="max-w-3xl mb-10 md:mb-14">
    <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">{eyebrow}</p>
    <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white">{children}</h2>
    {copy && <p className="mt-5 text-base md:text-lg leading-8 text-slate-600 dark:text-slate-300">{copy}</p>}
  </div>
);

const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} shrink-0 rounded-xl bg-emerald-800 text-white grid place-items-center shadow-lg shadow-emerald-950/10`}>
      <BookOpen size={compact ? 20 : 24} strokeWidth={2.4} />
    </div>
    <div className="min-w-0">
      <p className={`${compact ? 'text-sm' : 'text-base'} font-black tracking-tight text-slate-950 dark:text-white truncate`}>Ziquala Abo School</p>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 truncate">Kindergarten & Primary</p>
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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-white/10 bg-stone-50/95 dark:bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-20 px-5 lg:px-8 flex items-center justify-between gap-6">
        <Link to="/" onClick={() => setMenuOpen(false)} aria-label="Ziquala Abo School home">
          <BrandMark />
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary navigation">
          {publicNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${isActive
                ? 'bg-emerald-900 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-900/5 dark:hover:bg-white/5'
                }`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="h-10 w-10 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </button>
          <Link to="/login" className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black transition-colors">
            <LogIn size={17} /> Portal Login
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="lg:hidden h-10 w-10 grid place-items-center rounded-lg text-slate-600 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-white/10 bg-stone-50 dark:bg-slate-950 px-5 py-5">
          <nav className="max-w-7xl mx-auto grid gap-1" aria-label="Mobile navigation">
            {publicNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `px-4 py-3 rounded-lg text-sm font-bold ${isActive ? 'bg-emerald-900 text-white' : 'text-slate-700 dark:text-slate-200'}`}
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500 text-slate-950 text-sm font-black">
              <LogIn size={17} /> Portal Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

const PublicFooter = () => (
  <footer className="bg-slate-950 text-white border-t border-white/10">
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 grid gap-10 lg:grid-cols-[1.2fr_.8fr_1fr]">
      <div>
        <BrandMark />
        <p className="mt-5 text-sm leading-7 text-slate-400 max-w-md">{ziqualaIdentity.fullName}, serving children and families in Bishoftu under the stewardship of the monastery association.</p>
        <p className="mt-3 text-sm font-semibold text-slate-300">{ziqualaIdentity.location}</p>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Explore</p>
        <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-300">
          <Link to="/school" className="hover:text-white">School information</Link>
          <Link to="/monastery" className="hover:text-white">Monastery information</Link>
          <Link to="/elearning" className="hover:text-white">eLearning</Link>
          <Link to="/news" className="hover:text-white">News & events</Link>
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Ziquala Abo Media</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {socialLinks.map((social) => {
            const Icon = socialIcon(social.platform);
            return (
              <a key={social.href} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label} className="h-11 w-11 grid place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-emerald-700 hover:text-white transition-colors">
                <Icon size={19} />
              </a>
            );
          })}
        </div>
      </div>
    </div>
    <div className="border-t border-white/10 py-5 px-5 text-center text-xs text-slate-500">
      © 2026 Ziquala Abo School. Public content is separated between school and monastery areas.
    </div>
  </footer>
);

const PublicLayout = () => (
  <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
    <PublicHeader />
    <main><Outlet /></main>
    <PublicFooter />
  </div>
);

const HomePage = () => (
  <>
    <section className="relative overflow-hidden border-b border-slate-200 dark:border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(217,166,49,0.18),transparent_33%),radial-gradient(circle_at_15%_80%,rgba(5,90,64,0.14),transparent_34%)]" />
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28 lg:py-36 grid lg:grid-cols-[1.05fr_.95fr] gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-900/8 dark:bg-emerald-300/10 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-[0.2em]">
            <School size={15} /> Bishoftu · Kindergarten & Primary
          </div>
          <h1 className="mt-7 max-w-4xl text-5xl md:text-7xl font-black tracking-[-0.045em] leading-[0.96] text-slate-950 dark:text-white">
            Knowledge with values. <span className="text-emerald-800 dark:text-emerald-400">Growth with purpose.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg md:text-xl leading-8 text-slate-600 dark:text-slate-300">{ziqualaIdentity.motto} Explore the school and the monastery through two clearly separated public experiences.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/school" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white font-black transition-colors">Explore the school <ArrowRight size={18} /></Link>
            <Link to="/monastery" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-slate-300 dark:border-white/20 hover:border-amber-500 text-slate-800 dark:text-white font-black transition-colors">Visit the monastery <Mountain size={18} /></Link>
          </div>
          <p className="mt-8 text-sm font-semibold text-slate-500 dark:text-slate-400">{ziqualaIdentity.amharicName}</p>
        </div>

        <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] bg-emerald-950 p-8 text-white shadow-2xl shadow-emerald-950/20 md:p-10">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border-[58px] border-white/5" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-emerald-900 shadow-xl">
              <BookOpen size={38} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">Ziquala Abo School</p>
              <p className="mt-4 max-w-md text-3xl font-black leading-tight md:text-4xl">Modern learning shaped by knowledge, character, and service.</p>
              <div className="mt-8 grid grid-cols-2 gap-3 text-sm font-bold text-emerald-50/80">
                <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Academic growth</span>
                <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Ethical formation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
      <SectionTitle eyebrow="Two connected institutions" copy="The school and monastery share stewardship and values, while each keeps its own information, media, and public identity.">Choose where you want to go</SectionTitle>
      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/school" className="group relative overflow-hidden min-h-[360px] p-8 md:p-10 rounded-2xl bg-emerald-950 text-white">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[46px] border-white/5" />
          <School size={42} className="text-amber-400" />
          <p className="mt-16 text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Public school information</p>
          <h2 className="mt-3 text-4xl font-black">The School</h2>
          <p className="mt-4 max-w-lg leading-7 text-emerald-50/75">History, identity, academic goals, management, branches, school scale, and public updates.</p>
          <span className="mt-8 inline-flex items-center gap-2 font-black group-hover:gap-3 transition-all">Enter school area <ArrowRight size={18} /></span>
        </Link>
        <Link to="/monastery" className="group relative overflow-hidden min-h-[360px] rounded-2xl border border-amber-300/30 bg-stone-950 text-white">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full border-[42px] border-amber-300/5" />
          <div className="relative h-full p-8 md:p-10 flex flex-col justify-end">
            <Mountain size={42} className="mb-auto text-amber-400" />
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">Dedicated monastery area</p>
            <h2 className="mt-3 text-4xl font-black">The Monastery</h2>
            <p className="mt-4 max-w-lg leading-7 text-white/75">History, monastic community, governed projects, spiritual heritage, and its own completely separate media gallery.</p>
            <span className="mt-8 inline-flex items-center gap-2 font-black group-hover:gap-3 transition-all">Enter monastery area <ArrowRight size={18} /></span>
          </div>
        </Link>
      </div>
    </section>

    <section className="bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          ['School level', 'Kindergarten & Primary'],
          ['Location', 'Bishoftu, Kebele 03'],
          ['Ownership', 'Monastery Association'],
          ['Academic access', 'eLearning Library'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">{label}</p>
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
    <FeaturedBookGallery />
  </>
);

const LeadershipAlbum = () => {
  const profiles = [
    ...schoolBoardLeaders.map((leader) => ({
      ...leader,
      role: 'የት/ቤቱ ቦርድ አመራር',
      englishRole: 'School Board Leadership',
    })),
    {
      name: academicManagerProfile.name,
      englishName: academicManagerProfile.englishName,
      image: academicManagerProfile.image,
      role: academicManagerProfile.title,
      englishRole: academicManagerProfile.englishTitle,
    },
  ];
  const [page, setPage] = useState(0);
  const nextPage = (page + 1) % profiles.length;
  const move = (direction: number) => setPage((current) => (current + direction + profiles.length) % profiles.length);

  const AlbumPage = ({ index, right = false }: { index: number; right?: boolean }) => {
    const profile = profiles[index];
    return (
      <article className={`relative min-w-0 bg-[#fffdf5] p-5 text-slate-900 sm:p-8 lg:p-10 ${right ? 'hidden border-l border-amber-900/15 md:block' : ''}`}>
        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#a16207_0.55px,transparent_0.55px)] [background-size:8px_8px]" />
        <div className="relative">
          <div className="relative mx-auto max-w-md rotate-[-0.35deg] rounded-sm bg-white p-3 pb-5 shadow-[0_12px_35px_rgba(67,43,15,.22)] sm:p-4 sm:pb-6">
            <span className="absolute -left-2 -top-2 h-8 w-16 -rotate-12 bg-amber-100/80 shadow-sm" />
            <span className="absolute -right-2 -top-2 h-8 w-16 rotate-12 bg-amber-100/80 shadow-sm" />
            <div className="aspect-[4/5] overflow-hidden bg-stone-200">
              <img src={profile.image} alt={`${profile.englishName}, ${profile.englishRole}`} className="h-full w-full object-cover object-top" />
            </div>
          </div>
          <div className="mx-auto mt-7 max-w-md text-center">
            <p lang="am" className="text-xs font-black uppercase tracking-[0.12em] text-emerald-800">{profile.role}</p>
            <h3 lang="am" className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{profile.name}</h3>
            <p className="mt-2 text-sm font-bold text-slate-500">{profile.englishName}</p>
            <p className="mt-1 text-xs font-semibold text-amber-800">{profile.englishRole}</p>
          </div>
          <p className={`mt-7 font-serif text-xs italic text-amber-900/55 ${right ? 'text-right' : 'text-left'}`}>Page {index + 1}</p>
        </div>
      </article>
    );
  };

  return (
    <section id="school-leadership" data-leadership-section className="bg-stone-100 py-20 dark:bg-slate-900/50 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow="School leadership" copy="Meet the school board and Academic Manager through our leadership photo album.">Leadership album</SectionTitle>
        <div className="relative mx-auto max-w-6xl rounded-[1.75rem] bg-gradient-to-br from-amber-950 via-amber-900 to-stone-950 p-2.5 shadow-[0_30px_80px_rgba(67,43,15,.3)] sm:p-4">
          <div className="relative grid overflow-hidden rounded-[1.1rem] md:grid-cols-2">
            <AlbumPage index={page} />
            <AlbumPage index={nextPage} right />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-950/15 to-transparent md:block" />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={() => move(-1)} aria-label="Previous leadership photo" className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><ChevronLeft size={21} /></button>
          <div className="flex items-center gap-2" aria-label={`Photo ${page + 1} of ${profiles.length}`}>
            {profiles.map((profile, index) => (
              <button key={profile.name} type="button" onClick={() => setPage(index)} aria-label={`Show ${profile.englishName}`} className={`h-2.5 rounded-full transition-all ${index === page ? 'w-8 bg-emerald-700' : 'w-2.5 bg-slate-300 dark:bg-slate-700'}`} />
            ))}
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Next leadership photo" className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><ChevronRight size={21} /></button>
        </div>
      </div>
    </section>
  );
};

const SchoolPage = () => (
  <>
    <section className="bg-emerald-950 text-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28 grid lg:grid-cols-[1fr_.8fr] gap-14 items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-400">School information</p>
          <h1 className="mt-5 text-5xl md:text-7xl font-black tracking-[-0.04em] leading-none">Education rooted in knowledge, ethics, and service.</h1>
        </div>
        <p className="text-lg leading-8 text-emerald-50/75">Ziquala Abo School was established to continue the Ethiopian Orthodox Tewahedo Church’s contribution to education by forming knowledgeable, disciplined, ethical, and responsible citizens.</p>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
      <SectionTitle eyebrow="Core identity" copy="The following summary is grounded in the school’s 2014 E.C. internal governance document and will be refined with client-approved public wording.">Why the school exists</SectionTitle>
      <div className="grid md:grid-cols-2 gap-6">
        {schoolGoals.map((goal, index) => (
          <div key={goal} className="p-7 md:p-8 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 rounded-xl flex gap-5">
            <span className="h-10 w-10 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 grid place-items-center font-black">0{index + 1}</span>
            <p className="font-bold leading-7 text-slate-700 dark:text-slate-200">{goal}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
        <SectionTitle eyebrow="Governance" copy="The public management view mirrors the institutional structure while portal access remains limited to the roles approved by the client.">Management structure</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {managementStructure.map((item, index) => (
            <div key={item} className="relative p-6 min-h-36 bg-stone-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl">
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">{String(index + 1).padStart(2, '0')}</p>
              <p className="mt-7 font-black text-slate-950 dark:text-white">{item}</p>
              {index < managementStructure.length - 1 && <ChevronRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 z-10" />}
            </div>
          ))}
        </div>
      </div>
    </section>

    <LeadershipAlbum />

    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28 grid lg:grid-cols-2 gap-8">
      <div className="p-8 md:p-10 rounded-2xl bg-amber-50 dark:bg-amber-300/5 border border-amber-200 dark:border-amber-300/15">
        <Building2 className="text-amber-700 dark:text-amber-400" size={34} />
        <h2 className="mt-8 text-3xl font-black">Branches & school scale</h2>
        <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">Verified branch names, enrollment totals, and student breakdowns will be added when the school approves the current figures. No placeholder numbers will be presented as facts.</p>
      </div>
      <div className="p-8 md:p-10 rounded-2xl bg-emerald-950 text-white">
        <Newspaper className="text-emerald-300" size={34} />
        <h2 className="mt-8 text-3xl font-black">School updates</h2>
        <p className="mt-4 leading-7 text-emerald-50/75">Events, ceremonies, notices, and announcements will appear in a dedicated feed managed through the portal when the backend is connected.</p>
        <Link to="/news" className="mt-7 inline-flex items-center gap-2 font-black text-amber-300">Open news & events <ArrowRight size={18} /></Link>
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
        <p className="text-lg leading-8 text-white/75">A dedicated space for the monastery’s history, spiritual community, governed projects, and media archive—kept separate from school photography and academic content.</p>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
      <SectionTitle eyebrow="A separate public experience" copy="The archive contains extensive professional documentation of the crater lake, clergy, monastic life, interviews, journeys, and community activity.">Faith, place, and living heritage</SectionTitle>
      <div className="grid lg:grid-cols-3 gap-5">
        {[
          { icon: Mountain, title: 'History', copy: 'A verified historical narrative will be prepared from monastery-approved sources and documentary material.' },
          { icon: Users, title: 'Monastic community', copy: 'Profiles of monks and community members will be published only after names, roles, and permissions are confirmed.' },
          { icon: HeartHandshake, title: 'Projects', copy: 'Education, community service, heritage, and other governed projects will receive their own documented updates.' },
        ].map((item) => (
          <div key={item.title} className="p-8 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <item.icon size={32} className="text-emerald-700 dark:text-emerald-400" />
            <h2 className="mt-8 text-2xl font-black">{item.title}</h2>
            <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{item.copy}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
        <SectionTitle eyebrow="Monastery media" copy="A first curated selection from the read-only archive. The original high-resolution files remain safely on the Transcend drive.">Archive preview</SectionTitle>
        <div className="grid md:grid-cols-12 gap-4">
          <figure className="md:col-span-7 md:row-span-2 min-h-[500px] relative overflow-hidden rounded-xl">
            <img src={monksByLake} alt="Monastery community gathered near the crater lake" className="absolute inset-0 h-full w-full object-cover" />
          </figure>
          <figure className="md:col-span-5 min-h-[300px] relative overflow-hidden rounded-xl">
            <img src={monkOnPath} alt="A monk walking through the Ziquala landscape" className="absolute inset-0 h-full w-full object-cover" />
          </figure>
          <figure className="md:col-span-5 min-h-[300px] relative overflow-hidden rounded-xl">
            <img src={monasteryCommunity} alt="Members of the monastery community" className="absolute inset-0 h-full w-full object-cover" />
          </figure>
        </div>
        <div className="mt-8 p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex gap-4">
            <PlayCircle size={32} className="text-amber-400 shrink-0" />
            <div>
              <p className="font-black">Documentary and interview archive available</p>
              <p className="mt-1 text-sm text-slate-400">Large source videos will be streamed through an approved media host rather than bundled into the frontend.</p>
            </div>
          </div>
          <a href="https://youtube.com/@ziqualaabomedia" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-500 text-slate-950 font-black shrink-0">Watch on YouTube <ExternalLink size={17} /></a>
        </div>
      </div>
    </section>
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
