import { useTranslation } from 'react-i18next';

import { publicText as uiText, publicVariants } from "../publicLocalization";

import { useEffect, useState, type ReactNode } from 'react';

import { m, useReducedMotion } from 'framer-motion';

import { Newspaper } from 'lucide-react';

import { websiteContentService, type WebsiteContentItem } from '../services/websiteContentService';

import schoolBuilding from '../assets/school/school-building.webp';

import studentAssembly from '../assets/school/student-assembly.webp';

export const SectionTitle = ({ eyebrow, children, copy, as: Heading = 'h2' }: { eyebrow: string; children: ReactNode; copy?: string; as?: 'h1' | 'h2' }) => {
  useTranslation('public');
  return (
  <div className="max-w-3xl mb-10 text-left md:mb-14">
    <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText(eyebrow)}</p>
    <Heading className="text-brand-heading mt-4 text-3xl md:text-5xl font-black tracking-tight">{uiText(children)}</Heading>
    {uiText(copy && <p className="mt-5 text-base md:text-lg leading-8 text-slate-600 dark:text-slate-300">{uiText(copy)}</p>)}
  </div>
);
};

export type RevealEffect = 'rise' | 'slide' | 'scale' | 'wipe';

export const ScrollReveal = ({ children, className = '', delay = 0, direction = 'up', effect = 'rise' }: { children: ReactNode; className?: string; delay?: number; direction?: 'up' | 'left' | 'right'; effect?: RevealEffect }) => {
  useTranslation('public');
  const reduceMotion = useReducedMotion();
  const side = direction === 'left' ? -1 : 1;
  const initialState = effect === 'scale'
      ? { opacity: 0, scale: 0.9, y: 24 }
      : effect === 'slide'
        ? { opacity: 0, x: side * 72, rotate: side * 1.4 }
        : { opacity: 0, y: 54 };
  const visibleState = effect === 'scale'
      ? { opacity: 1, scale: 1, y: 0 }
      : effect === 'slide'
        ? { opacity: 1, x: 0, rotate: 0 }
        : { opacity: 1, y: 0 };

  if (effect === 'wipe') {
    return (
      <m.div
        initial={reduceMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: false, amount: 0.08 }}
        className={className}
      >
        <m.div
          variants={{
            hidden: { opacity: 0, clipPath: direction === 'right' ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', scale: 1.035 },
            visible: { opacity: 1, clipPath: 'inset(0 0 0 0)', scale: 1 },
          }}
          transition={{ duration: 1.05, delay, ease: [0.16, 1, 0.3, 1] }}
        >
          {uiText(children)}
        </m.div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={reduceMotion ? false : initialState}
      whileInView={visibleState}
      viewport={{ once: false, amount: 0.14 }}
      transition={effect === 'scale'
        ? { type: 'spring', stiffness: 105, damping: 17, mass: 0.9, delay }
        : { duration: 0.82, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {uiText(children)}
    </m.div>
  );
};

export const DocumentContentBand = ({ title, eyebrow, copy, dark = false }: { title: string; eyebrow: string; copy: string; dark?: boolean }) => {
  useTranslation('public');
  return (
  <section className={`py-20 md:py-28 bg-brand-canvas text-brand-forest-950 dark:text-white ${dark ? 'dark:bg-brand-forest-950' : 'dark:bg-brand-forest-900'}`}>
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <ScrollReveal effect="wipe">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText(eyebrow)}</p>
        <h2 className="mt-5 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{uiText(title)}</h2>
        <p className={`mt-6 max-w-4xl whitespace-pre-line text-lg leading-9 text-slate-600 ${dark ? 'dark:text-slate-100' : 'dark:text-slate-300'}`}>{uiText(copy)}</p>
      </ScrollReveal>
    </div>
  </section>
);
};

export const PublicCommunityHighlights = ({ compact = false }: { compact?: boolean }) => {
  useTranslation('public');
  const [items, setItems] = useState<WebsiteContentItem[]>([]);

  useEffect(() => {
    let mounted = true;
    websiteContentService.getPublic('community')
      .then((content) => {
        if (mounted) setItems(content);
      })
      .catch(() => {
        if (mounted) setItems([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fallback = [
    { id: 'calendar', title: "copy.academicDatesAndUpcomingEvents", subtitle: 'copy.schoolCalendar', body: "copy.termDatesMeetingsExaminationsCeremoniesAndHolidaysWillBePublished", image_url: studentAssembly, category: 'School calendar', event_date: null },
    { id: 'student-life', title: "copy.learningAchievementAndCommunity", subtitle: 'copy.schoolUpdates', body: "copy.verifiedSchoolAnnouncementsAndStudentFacingUpdatesWillRemainSepar", image_url: schoolBuilding, category: 'Student life', event_date: null },
    { id: 'community', title: "copy.clubsServiceAndExtracurricularLife", subtitle: 'copy.activities', body: "copy.publishedActivitiesCanShowSportsClubsServiceDaysCeremoniesAndWide", image_url: studentAssembly, category: 'Activities', event_date: null },
  ];
  const existingTitles = new Set(items.map((i) => i.title.trim().toLowerCase()));
  const missingFallback = fallback.filter((f) => !publicVariants(f.title).some(title => existingTitles.has(title.trim().toLowerCase())));
  const cards = [...items, ...missingFallback];

  return (
    <section id="school-community" className={`scroll-mt-24 ${compact ? '' : 'bg-white py-20 dark:bg-brand-forest-900/50 md:py-28'}`}>
      <div className={compact ? '' : 'mx-auto max-w-7xl px-5 lg:px-8'}>
        {!compact && (
          <SectionTitle eyebrow={uiText("copy.beyondTheClassroom")} copy={uiText("copy.aPublicSpaceForExtracurricularActivitiesCeremoniesSchoolEventsClu")}>{uiText("copy.communityActivitiesAndEvents")}</SectionTitle>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          {cards.slice(0, compact ? 6 : 3).map((item, index) => (
            <m.article
              key={item.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.52, delay: Math.min(index * 0.08, 0.24) }}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-brand-surface shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-white/10"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-white dark:bg-brand-forest-800">
                {item.image_url ? (
                  <img src={item.image_url} alt={uiText(item.title)} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                ) : (
                  <div className="grid h-full place-items-center bg-brand-surface text-brand-heading"><Newspaper size={38} /></div>
                )}
              </div>
              <div className="p-6">
                <p className="text-base font-black uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-400">{uiText(item.category || item.subtitle || 'copy.schoolUpdate')}</p>
                <h3 className="text-brand-heading mt-3 text-2xl font-black">{uiText(item.title)}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{uiText(item.body)}</p>
                {item.event_date && <p className="mt-5 text-base font-black uppercase tracking-[0.18em] text-brand-gold-700 dark:text-brand-gold-300">{uiText(item.event_date)}</p>}
              </div>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  );
};
