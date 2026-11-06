import { SchoolHero } from './PublicHeroes';
import { OfficialSchoolPurpose } from '../components/OfficialSchoolPurpose';

import { useTranslation } from 'react-i18next';

import { localeTag } from "../publicLocalization";

import { publicText as uiText } from "../publicLocalization";
import { staffDisplayName, staffNameVariants } from '../utils/staffNames';

import { useEffect, useRef, useState } from 'react';

import { m } from 'framer-motion';

import { ArrowRight, Building2, ChevronLeft, ChevronRight, Shirt, Users } from 'lucide-react';

import { Link } from 'react-router-dom';

import { schoolDocumentContent, annualCelebrations, schoolBoardLeaders, schoolStaff, ziqualaBranches, type SchoolStaffGroup } from '../data/ziqualaContent';

import { FeaturedBookGallery } from '../components/FeaturedBookGallery';

import { websiteContentService, type WebsiteContentItem } from '../services/websiteContentService';

import schoolBuilding from '../assets/school/school-building.webp';

import studentAssembly from '../assets/school/student-assembly.webp';

import { SectionTitle, DocumentContentBand, ScrollReveal, PublicCommunityHighlights } from './PublicSections';

export const LeadershipAlbum = () => {
  useTranslation('public');
  const profiles = schoolBoardLeaders;
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
    const { i18n } = useTranslation('public');
    const profile = profiles[index];
    const displayName = staffDisplayName(profile, i18n.resolvedLanguage || i18n.language);
    return (
      <article className={`relative min-w-0 bg-white p-5 text-slate-900 sm:p-7 lg:p-8 ${right ? 'hidden border-l border-brand-gold-900/15 md:block' : ''}`}>
        <div className="absolute inset-0 hidden opacity-35 dark:block [background-image:radial-gradient(#a16207_0.55px,transparent_0.55px)] [background-size:8px_8px]" />
        <div className="relative">
          <div className="relative mx-auto max-w-[13rem] rotate-[-0.35deg] rounded-sm bg-white p-2.5 pb-4 shadow-[0_12px_35px_rgba(67,43,15,.22)] sm:max-w-[15rem] sm:p-3 sm:pb-5">
            <span className="absolute -left-2 -top-2 h-8 w-16 -rotate-12 bg-brand-gold-100/80 shadow-sm" />
            <span className="absolute -right-2 -top-2 h-8 w-16 rotate-12 bg-brand-gold-100/80 shadow-sm" />
            <div className="aspect-[4/5] overflow-hidden bg-white">
              <img src={profile.image} alt={displayName} className="h-full w-full object-cover object-top" />
            </div>
          </div>
          <div className="mx-auto mt-7 max-w-md text-center">
            <h3 className="text-xl font-black leading-tight sm:text-2xl" translate="no" lang={i18n.language === 'am' ? 'am' : 'en'}>{displayName}</h3>
          </div>
          <p className={`mt-7 font-serif text-xs italic text-brand-gold-800 ${right ? 'text-right' : 'text-left'}`}>{uiText("copy.page ")}{index + 1}</p>
        </div>
      </article>
    );
  };

  return (
    <section id="school-leadership" data-leadership-section className="scroll-mt-24 bg-brand-muted py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow={uiText("copy.schoolBoard")} copy={uiText("copy.theSchoolBoardConsistsOfTheFourLeadersShownHereSchoolManagementAn")}>{uiText("copy.boardLeadership")}</SectionTitle>
        <div className="relative mx-auto max-w-5xl rounded-[1.75rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-gradient-to-br dark:from-brand-gold-950 dark:via-brand-gold-900 dark:to-stone-950 p-2.5 shadow-[0_30px_80px_rgba(67,43,15,.3)] sm:p-4">
          <div className="relative grid overflow-hidden rounded-[1.1rem] md:grid-cols-2">
            <AlbumPage index={page} />
            <AlbumPage index={nextPage} right />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-gold-950/15 to-transparent md:block" />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={() => move(-1)} aria-label={uiText("copy.previousLeadershipPhoto")} className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-brand-surface text-slate-700 shadow-sm transition hover:border-brand-forest-700 hover:text-brand-forest-800 dark:hover:text-brand-gold-300 dark:border-slate-700 dark:text-white"><ChevronLeft size={21} /></button>
          <div className="flex items-center gap-2" aria-label={uiText("copy.leadershipPageValue0OfValue1", { value0: activeSpread + 1, value1: pageCount })}>
            {Array.from({ length: pageCount }, (_, index) => (
              <button key={index} type="button" onClick={() => setPage(index * pageSize)} aria-label={uiText("copy.showLeadershipPageValue0", { value0: index + 1 })} aria-pressed={index === activeSpread} className="grid h-11 w-11 place-items-center rounded-full"><span aria-hidden="true" className={`h-2.5 rounded-full transition-all ${index === activeSpread ? 'w-8 bg-brand-forest-700' : 'w-2.5 bg-slate-300 dark:bg-slate-700'}`} /></button>
            ))}
          </div>
          <button type="button" onClick={() => move(1)} aria-label={uiText("copy.nextLeadershipPhoto")} className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-brand-surface text-slate-700 shadow-sm transition hover:border-brand-forest-700 hover:text-brand-forest-800 dark:hover:text-brand-gold-300 dark:border-slate-700 dark:text-white"><ChevronRight size={21} /></button>
        </div>
      </div>
    </section>
  );
};

export const staffGroups: Array<{ id: SchoolStaffGroup; label: string; shortLabel: string }> = [
  { id: 'office', label: "copy.officeManagement", shortLabel: 'school.staffGroups.office' },
  { id: 'primary', label: "copy.grade18Teachers", shortLabel: 'school.staffGroups.primary' },
  { id: 'kindergarten', label: "copy.kindergartenTeam", shortLabel: 'school.staffGroups.kindergarten' },
  { id: 'cleaning', label: "copy.cleaningSecurity", shortLabel: 'copy.cleaningSecurity' },
];

export const StaffGallery = () => {
  const { i18n } = useTranslation('public');
  const [activeGroup, setActiveGroup] = useState<string>('office');
  const [liveTeam, setLiveTeam] = useState<WebsiteContentItem[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setNearViewport(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px' });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport) return;
    let mounted = true;
    const fetchTeam = () => {
      websiteContentService.getPublic('team')
        .then((items) => {
          if (mounted) setLiveTeam(items);
        })
        .catch(() => {
          if (mounted) setLiveTeam([]);
        });
    };

    fetchTeam();

    const handleFocus = () => { if (document.visibilityState === 'visible') fetchTeam(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [nearViewport]);

  const groupLabelMap: Record<string, string> = {
    office: 'Office & management',
    primary: 'Grade 1–8 teachers',
    kindergarten: 'Kindergarten team',
    cleaning: 'Cleaning & Security',
  };

  const categoryToGroup: Record<string, string> = {
    'Office & management': 'office',
    'Grade 1–8 teachers': 'primary',
    'Kindergarten team': 'kindergarten',
    'Cleaning & Security': 'cleaning',
  };

  const fallbackForActive = schoolStaff.filter((m) => m.group === activeGroup);
  const fallbackTitles = new Set(fallbackForActive.flatMap((m) => staffNameVariants(m).map(name => name.trim().toLowerCase())));

  const activeCategoryLabel = groupLabelMap[activeGroup] || 'Office & management';
  const liveForActive = liveTeam.filter((m) => {
    const cat = m.category || 'Office & management';
    return cat === activeCategoryLabel || categoryToGroup[cat] === activeGroup;
  });

  const matchesFallback = (member: WebsiteContentItem) => staffNameVariants(member).some(name => fallbackTitles.has(name.trim().toLowerCase()));
  const newLiveItems = liveForActive.filter((m) => !matchesFallback(m));
  const overriddenLiveMap = new Map(
    liveForActive
      .filter(matchesFallback)
      .flatMap((m) => staffNameVariants(m).map(name => [name.trim().toLowerCase(), m] as const))
  );

  const initialItems = fallbackForActive.map((m, idx) => {
    const dbOverride = staffNameVariants(m).map(name => overriddenLiveMap.get(name.trim().toLowerCase())).find(Boolean);
    return {
      id: dbOverride ? dbOverride.id : `fallback-${idx}-${m.image}`,
      name: staffDisplayName(dbOverride || m, i18n.resolvedLanguage || i18n.language),
      role: dbOverride ? (dbOverride.subtitle || dbOverride.category) : m.role,
      image: dbOverride && dbOverride.image_url ? dbOverride.image_url : m.image,
      body: dbOverride ? dbOverride.body : '',
      display_order: dbOverride ? Number(dbOverride.display_order) : (idx + 1),
    };
  });

  const newlyAddedItems = newLiveItems.map((m, idx) => ({
    id: m.id,
    name: staffDisplayName(m, i18n.resolvedLanguage || i18n.language),
    role: m.subtitle || m.category,
    image: m.image_url,
    body: m.body,
    display_order: Number(m.display_order) || (initialItems.length + idx + 1),
  }));

  const visibleStaff = [...initialItems, ...newlyAddedItems].sort((a, b) => a.display_order - b.display_order);

  return (
    <section ref={sectionRef} id="school-staff" className="scroll-mt-24 overflow-hidden bg-brand-muted py-20 md:py-28">
      <div className="mx-auto max-w-[90rem] px-5 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionTitle eyebrow={uiText("copy.ourPeople")} copy={uiText("copy.schoolManagementPrimaryTeachersAndKindergartenStaffAreKeptSeparat")}>{uiText("copy.meetTheSchoolTeam")}</SectionTitle>
          <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={uiText("copy.staffGroups")}>
            {staffGroups.map((group, groupIndex) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                id={`staff-tab-${group.id}`}
                aria-controls="staff-tabpanel"
                tabIndex={activeGroup === group.id ? 0 : -1}
                aria-selected={activeGroup === group.id}
                onClick={() => setActiveGroup(group.id)}
                onKeyDown={event => {
                  const next = event.key === 'ArrowRight' ? (groupIndex + 1) % staffGroups.length
                    : event.key === 'ArrowLeft' ? (groupIndex - 1 + staffGroups.length) % staffGroups.length
                    : event.key === 'Home' ? 0 : event.key === 'End' ? staffGroups.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setActiveGroup(staffGroups[next].id);
                  document.getElementById(`staff-tab-${staffGroups[next].id}`)?.focus();
                }}
                className={`shrink-0 border px-4 py-3 text-xs font-black transition-colors sm:px-5 ${activeGroup === group.id
                  ? 'border-brand-gold-400 bg-brand-gold-400 text-brand-forest-950'
                  : 'border-brand-forest-950/20 text-brand-forest-950 hover:border-brand-forest-800 dark:border-white/20 dark:text-white dark:hover:border-brand-gold-300'
                  }`}
              >
                <span className="sm:hidden">{uiText(group.shortLabel)}</span>
                <span className="hidden sm:inline">{uiText(group.label)}</span>
              </button>
            ))}
          </div>
        </div>

        <div id="staff-tabpanel" aria-labelledby={`staff-tab-${activeGroup}`} tabIndex={0} className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-7 [scrollbar-color:#a16207_transparent] sm:gap-5" role="tabpanel">
          {visibleStaff.map((member, index) => (
            <m.article
              key={member.id}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.2) }}
              className="w-[74vw] max-w-[17rem] shrink-0 snap-start sm:w-[17rem]"
            >
              <div className="aspect-[4/5] overflow-hidden bg-white dark:bg-brand-forest-800">
                {member.image ? (
                  <img src={member.image} alt={uiText("copy.value0Value1", { value0: member.name, value1: uiText(member.role) })} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition duration-500 hover:scale-[1.025]" />
                ) : (
                  <div className="grid h-full place-items-center bg-brand-surface text-brand-heading"><Users size={42} /></div>
                )}
              </div>
              <div className="border-t-4 border-brand-gold-500 bg-brand-surface px-4 py-5">
                <h3 className="text-brand-heading text-base font-black leading-6" translate="no" lang={i18n.language === 'am' ? 'am' : 'en'}>{member.name}</h3>
                <p className="mt-2 text-base font-bold leading-7 text-slate-600 dark:text-slate-200">{uiText(member.role)}</p>
                {member.body && <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-200">{uiText(member.body)}</p>}
              </div>
            </m.article>
          ))}
          <div className="w-1 shrink-0" aria-hidden="true" />
        </div>
        <p className="mt-2 text-base font-bold uppercase tracking-[0.18em] text-brand-forest-800 dark:text-slate-200">{uiText("copy.swipeOrScrollToMeetTheFullTeam ")}{visibleStaff.length}{uiText(" copy.people")}</p>
      </div>
    </section>
  );
};

export const UniformShowcase = () => {
  useTranslation('public');
  const [items, setItems] = useState<WebsiteContentItem[]>([]);

  useEffect(() => {
    let mounted = true;
    websiteContentService.getPublic('uniform')
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

  const cards = items.length > 0 ? items : [
    {
      id: 'uniform-fallback',
      title: "copy.uniformIdentityAndSchoolPride",
      subtitle: 'Student voice',
      body: "copy.theSuperAdminCanPublishStudentPhotosAndShortExplanationsHereToSho",
      image_url: studentAssembly,
      category: 'Uniform story',
    },
  ];

  return (
    <section id="school-uniform" className="scroll-mt-24 bg-brand-muted py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow={uiText("copy.studentVoice")} copy={uiText("copy.studentsCanExplainTheUniquenessOfTheirUniformWhatEachPartRepresen")}>{uiText("copy.uniformStories")}</SectionTitle>
        <div className="grid gap-5 md:grid-cols-2">
          {cards.slice(0, 4).map((item, index) => (
            <m.article
              key={item.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -36 : 36 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="grid overflow-hidden rounded-xl border border-black/10 bg-brand-surface dark:border-white/10 sm:grid-cols-[.85fr_1fr]"
            >
              <div className="relative min-h-72 bg-white dark:bg-brand-forest-800">
                {item.image_url ? (
                  <img src={item.image_url} alt={uiText(item.title)} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center bg-brand-surface text-brand-heading"><Shirt size={44} /></div>
                )}
              </div>
              <div className="p-7">
                <p className="text-base font-black uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-400">{uiText(item.category || item.subtitle || 'copy.uniform')}</p>
                <h3 className="text-brand-heading mt-4 text-3xl font-black leading-tight">{uiText(item.title)}</h3>
                {item.subtitle && <p className="mt-3 text-base font-black text-brand-forest-700 dark:text-brand-forest-300">{uiText(item.subtitle)}</p>}
                <p className="mt-5 leading-7 text-slate-600 dark:text-slate-300">{uiText(item.body)}</p>
              </div>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export const SchoolDocumentSections = () => {
  useTranslation('public');
  return (
  <>
    <DocumentContentBand eyebrow="school.vision.eyebrow" title="school.vision.title" copy={schoolDocumentContent.vision} />
    <DocumentContentBand eyebrow="school.mission.eyebrow" title="school.mission.title" copy={schoolDocumentContent.mission} dark />
    <section className="bg-brand-surface py-20 md:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><SectionTitle eyebrow={uiText("school.values.eyebrow")} copy={uiText("school.values.subtitle")}>{uiText("school.values.title")}</SectionTitle><div className="mt-10 grid gap-4 md:grid-cols-2">{schoolDocumentContent.values.map((value, index) => <ScrollReveal key={value} effect="slide" delay={index * 0.05}><div className="border-l-4 border-brand-gold-400 bg-brand-canvas p-6 text-lg leading-8 text-slate-700 dark:text-slate-200">{uiText(value)}</div></ScrollReveal>)}</div></div></section>
    <DocumentContentBand eyebrow="school.abbotMessage.title" title="school.abbotMessage.title" copy={schoolDocumentContent.abbotMessage} dark />
    <DocumentContentBand eyebrow="school.socialResponsibility.eyebrow" title="school.socialResponsibility.title" copy={schoolDocumentContent.socialResponsibility} />
    <section className="bg-brand-canvas py-20 md:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><SectionTitle eyebrow={uiText("monastery.celebrations.eyebrow")} copy={uiText("monastery.celebrations.subtitle")}>{uiText("monastery.celebrations.title")}</SectionTitle><div className="mt-10 grid gap-4 md:grid-cols-3">{annualCelebrations.map((event) => <article key={event.title} className="bg-brand-surface p-7"><h3 className="text-brand-heading text-xl font-black">{uiText(event.title)}</h3><p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{uiText(event.body)}</p></article>)}</div></div></section>
  </>
);
};

export const SchoolPage = () => {
  useTranslation('public');
  return (
  <>
    <SchoolHero />

    <OfficialSchoolPurpose />

    <SchoolDocumentSections />

    <LeadershipAlbum />

    <StaffGallery />

    <PublicCommunityHighlights />

    <UniformShowcase />

    <FeaturedBookGallery />

    <section id="school-campuses" className="scroll-mt-24 bg-brand-surface py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[.65fr_1.35fr] lg:items-end">
          <div>
            <Building2 className="text-brand-gold-700 dark:text-brand-gold-400" size={34} />
            <p className="mt-7 text-base font-black uppercase tracking-[0.25em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.twoBishoftuCampuses")}</p>
          </div>
          <div>
            <h2 className="text-brand-heading font-serif text-4xl sm:text-5xl">{uiText("copy.1534StudentsFromKG1ThroughGrade8")}</h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{uiText("copy.theKindergartenBranchAndMainPrimaryCampusProvideAConnectedPathAcr")}</p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {ziqualaBranches.map((branch, index) => (
            <article key={branch.id} className="border border-black/10 bg-brand-canvas p-7 dark:border-white/10 sm:p-9">
              <div className="flex items-start justify-between gap-5">
                <p className="font-mono text-base font-black text-brand-gold-700 dark:text-brand-gold-400">{uiText("0")}{index + 1}</p>
                <p className="text-right text-4xl font-black text-brand-forest-950 dark:text-white">{uiText(branch.enrollment.toLocaleString(localeTag()))}</p>
              </div>
              <h3 className="text-brand-heading mt-10 font-serif text-3xl">{uiText(branch.name)}</h3>
              <p className="mt-4 font-black text-brand-forest-700 dark:text-brand-forest-300">{uiText(branch.grades)}</p>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{uiText(branch.location)}</p>
              <p className="mt-8 text-base font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-200">{uiText(branch.enrollment.toLocaleString(localeTag()))}{uiText(" copy.students")}</p>
            </article>
          ))}
        </div>

      </div>
    </section>
  </>
);
};
