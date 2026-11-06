import { HomeHero } from './PublicHeroes';
import { useTranslation } from 'react-i18next';

import { publicText as uiText } from "../publicLocalization";

import { m, useReducedMotion } from 'framer-motion';

import { ArrowRight, BookOpen } from 'lucide-react';

import { Link } from 'react-router-dom';

import { ziqualaIdentity } from '../data/ziqualaContent';

import { FeaturedBookGallery } from '../components/FeaturedBookGallery';

import schoolBuilding from '../assets/school/school-building.webp';

import studentAssembly from '../assets/school/student-assembly.webp';

import schoolLogo from '../assets/school/school-logo.webp';

import ziqualaAerial from '../assets/monastery/ziquala-aerial.webp';

import ziqualaAerialSmall from '../assets/monastery/ziquala-aerial-640.webp';

export const HomePage = () => {
  useTranslation('public');
  const reduceMotion = useReducedMotion();

  return (
    <>
      <HomeHero />

      <section id="destinations" className="scroll-mt-24 px-5 py-20 dark:bg-brand-forest-950 md:py-28 lg:px-10">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-10 border-b border-black/15 pb-14 dark:border-white/15 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.oneHeritageTwoDestinations")}</p>
            <h2 className="text-brand-heading max-w-4xl font-serif text-4xl font-medium leading-[1.02] tracking-[-0.035em] sm:text-5xl md:text-6xl">{uiText("copy.theSchoolAndMonasteryBelongToOneStoryWithSpaceForEachToSpeakClear")}</h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.12fr_.88fr]">
            <Link to="/school" className="group relative min-h-[34rem] overflow-hidden border border-slate-200 bg-white text-slate-900 dark:border-brand-forest-800 dark:bg-brand-forest-950 dark:text-white">
              <img width={1280} height={719} loading="lazy" decoding="async" src={studentAssembly} alt={uiText("copy.ziqualaAboStudentsGatheredInTheSchoolCourtyard")} className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
              <div className="absolute inset-0 hidden dark:block bg-gradient-to-t from-brand-forest-950 via-brand-forest-950/80 to-brand-forest-950/75" />
              <div className="absolute inset-x-0 bottom-0 bg-white p-7 dark:bg-transparent sm:p-10">
                <p className="text-base font-black uppercase tracking-[0.25em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.schoolExperience")}</p>
                <div className="mt-3 flex items-end justify-between gap-8">
                  <div>
                    <h3 className="font-serif text-5xl font-medium sm:text-6xl">{uiText("copy.learnGrowLead")}</h3>
                    <p className="mt-4 max-w-xl leading-7 text-slate-700 dark:text-slate-100">{uiText("copy.exploreLearningStudentLifeLeadershipSchoolNewsAndTheGrade18Academ")}</p>
                  </div>
                  <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-full border border-slate-300 dark:border-white/50 transition group-hover:translate-x-1 group-hover:bg-white group-hover:text-brand-forest-950 sm:grid"><ArrowRight /></span>
                </div>
              </div>
            </Link>

            <Link to="/monastery" className="group relative min-h-[34rem] overflow-hidden border border-slate-200 bg-white text-slate-900 dark:border-brand-forest-800 dark:bg-brand-forest-950 dark:text-white">
              <img width={820} height={1024} loading="lazy" decoding="async" srcSet={`${ziqualaAerialSmall} 640w, ${ziqualaAerial} 820w`} sizes="(min-width: 1024px) 45vw, 100vw" src={ziqualaAerial} alt={uiText("copy.aerialViewOfZiqualaCraterLakeAndMonastery")} className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
              <div className="absolute inset-0 hidden dark:block bg-gradient-to-t from-brand-forest-950 via-brand-forest-950/80 to-brand-forest-950/75" />
              <div className="absolute inset-x-0 bottom-0 bg-white p-7 dark:bg-transparent sm:p-10">
                <p className="text-base font-black uppercase tracking-[0.25em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.monasteryExperience")}</p>
                <h3 className="mt-3 font-serif text-5xl font-medium sm:text-6xl">{uiText("monastery.heritage")}</h3>
                <p className="mt-4 max-w-lg leading-7 text-slate-700 dark:text-slate-100">{uiText("copy.enterADedicatedSpaceForHistorySacredLifeCommunityProjectsAndTheMo")}</p>
                <span className="mt-7 inline-flex items-center gap-3 text-sm font-black">{uiText("copy.visitTheMonastery ")}<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section id="home-overview" className="scroll-mt-24 border-y border-black/10 bg-brand-surface text-brand-forest-950 dark:border-brand-forest-800/20 dark:text-white">
        <div className="mx-auto grid max-w-[90rem] divide-y divide-black/10 px-5 dark:divide-white/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-10">
          {[
            ['Students', '1,534 enrolled'],
            ['Campuses', '2 in Bishoftu'],
            ['Grades', 'KG 1–Grade 8'],
          ].map(([label, value]) => (
            <div key={label} className="py-8 sm:px-7 first:pl-0">
              <p className="text-base font-black uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-300">{uiText(label)}</p>
              <p className="mt-2 font-serif text-xl text-brand-forest-950 dark:text-white/90">{uiText(value)}</p>
            </div>
          ))}
        </div>
      </section>
      <div id="home-books" className="scroll-mt-24"><FeaturedBookGallery /></div>
    </>
  );
};
