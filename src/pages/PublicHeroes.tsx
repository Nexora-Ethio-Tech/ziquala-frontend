import { useTranslation } from 'react-i18next';
import { publicText as uiText } from '../publicLocalization';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import schoolBuilding from '../assets/school/school-building.webp';
import schoolLogo from '../assets/school/school-logo.webp';

// Stable first-paint content: no API, motion runtime, or downloadable font.
export function HomeHero() { useTranslation('public'); return (<section className="relative isolate flex min-h-[calc(100svh-4.75rem)] items-end overflow-hidden bg-brand-canvas text-brand-forest-950 dark:text-white">
        <img          width={1280}
          height={719}
          fetchPriority="high" loading="eager"
          decoding="async"
          src={schoolBuilding}
          alt={uiText("copy.theZiqualaAboSchoolBuildingInBishoftu")}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-black/10 dark:bg-black/25" aria-hidden="true" />
        <div className="mx-auto grid grid-cols-1 w-full max-w-[90rem] gap-8 px-5 pb-28 pt-24 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-end lg:px-10">
          <div            className="min-w-0 max-w-5xl rounded-2xl border border-white/40 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-white/20 dark:bg-slate-950/50 sm:p-10"
          >
            <p className="flex items-center gap-3 text-base font-black uppercase tracking-[0.28em] text-brand-gold-800 dark:text-brand-gold-300">
              <span className="h-px w-9 bg-brand-gold-700 dark:bg-brand-gold-300" />{uiText(" copy.bishoftuKGGrade8")}</p>
            <h1 className="mt-7 min-w-0 max-w-5xl break-words font-serif text-4xl font-medium leading-[0.95] tracking-[-0.045em] min-[360px]:text-5xl sm:text-6xl md:text-8xl lg:text-[6.4rem]">{uiText("copy.learningWithRoots ")}<span className="text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.growingWithPurpose")}</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-800 dark:text-slate-100 sm:text-lg md:leading-8">{uiText("copy.aSchoolWhereModernKnowledgeEthiopianValuesAndResponsibleCitizensh")}</p>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-4">
              <Link to="/register" className="group inline-flex items-center gap-3 bg-brand-gold-400 px-6 py-4 text-sm font-black text-brand-forest-950 transition-colors hover:bg-brand-gold-300">{uiText("copy.joinOurSchool")}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></Link>
              <Link to="/school" className="group inline-flex items-center gap-3 bg-brand-gold-400 px-6 py-4 text-sm font-black text-brand-forest-950 transition-colors hover:bg-brand-gold-300">{uiText("copy.discoverTheSchool ")}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/elearning" className="group inline-flex items-center gap-3 border-b border-brand-forest-900/50 py-3 text-sm font-black text-brand-forest-950 transition-colors hover:border-brand-gold-700 hover:text-brand-gold-800 dark:border-white/55 dark:text-white dark:hover:border-brand-gold-300 dark:hover:text-brand-gold-200">{uiText("copy.exploreELearning ")}<BookOpen size={18} />
              </Link>
            </div>
          </div>
          <div            className="hero-identity-card mr-20 flex items-center gap-4 rounded-2xl border border-white/40 bg-white/80 p-5 text-sm leading-7 text-slate-600 shadow-lg backdrop-blur-md dark:border-white/20 dark:bg-slate-950/50 dark:text-slate-100"
          >
            <img width={160} height={159} decoding="async" src={schoolLogo} alt={uiText("copy.ziqualaAboSchoolLogo")} className="h-16 w-16 shrink-0 rounded-full border-4 border-white object-cover shadow-lg sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-8 text-brand-forest-950 dark:text-white">{uiText('school.purpose.name')}</p>
              <p className="mt-3 text-base font-black uppercase tracking-[0.14em] text-brand-gold-700 dark:text-brand-gold-300 sm:tracking-[0.24em]">{uiText("copy.officialSchoolIdentity")}</p>
            </div>
          </div>
        </div>
      </section>); }

export function SchoolHero() { useTranslation('public'); return (<section className="relative flex min-h-[max(42rem,calc(100svh-4.75rem))] items-end overflow-hidden bg-white text-slate-900 dark:bg-brand-forest-950 dark:text-white">
      <img width={1280} height={719} fetchPriority="high" loading="eager" decoding="async" src={schoolBuilding} alt={uiText("copy.ziqualaAboPrimarySchoolCampus")} className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-black/10 dark:bg-black/25" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-[90rem] items-end gap-8 px-5 pb-14 pt-24 lg:grid-cols-[1fr_.65fr] lg:px-10 lg:pb-20">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-white/20 dark:bg-slate-950/50 sm:p-10">
          <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.theSchoolKG1Grade8TwoCampuses")}</p>
          <h1 className="mt-6 max-w-5xl font-serif text-5xl font-medium leading-[.96] tracking-[-0.04em] sm:text-6xl md:text-8xl">{uiText("copy.educationRootedInKnowledgeEthicsAndService")}</h1>
          <div className="mt-8"><Link to="/register" className="group inline-flex items-center gap-3 bg-brand-gold-400 px-6 py-4 text-sm font-black text-brand-forest-950 transition-colors hover:bg-brand-gold-300">{uiText("copy.joinOurSchool")}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></Link></div>
        </div>
        <p className="rounded-2xl border border-white/40 bg-white/80 p-6 text-lg leading-8 text-slate-700 shadow-lg backdrop-blur-md dark:border-white/20 dark:bg-slate-950/50 dark:text-slate-100 sm:p-10">{uiText("copy.aStudentCentredSchoolServing1534LearnersAcrossKindergartenAndPrim")}</p>
      </div>
    </section>); }
