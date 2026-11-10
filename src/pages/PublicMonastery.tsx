import { useTranslation } from 'react-i18next';

import { publicText as uiText } from "../publicLocalization";

import { useEffect, useRef, useState } from 'react';

import { m, useReducedMotion } from 'framer-motion';

import { ArrowRight, Building2, CheckCircle2, Copy, ExternalLink, HeartHandshake, Mail, MessageCircle, Mountain, Pause, Play, PlayCircle, Phone, Send, Users, Volume2, VolumeX } from 'lucide-react';

import { Link } from 'react-router-dom';

import { monasteryContact, monasteryDonation, monasteryHistory, monasteryDocumentContent, monasteryDevelopmentProjects, ziqualaIdentity } from '../data/ziqualaContent';

import monasteryMark from '../assets/monastery/monastery-mark.webp';

import monasteryHeroVideo from '../assets/monastery/monastery-forest-hero.mp4';

import craterCommunity from '../assets/monastery/crater-community.webp';

import monksByLake from '../assets/monastery/monks-by-lake.webp';

import monkOnPath from '../assets/monastery/monk-on-path.webp';

import monasteryCommunity from '../assets/monastery/monastery-community.webp';

import monasteryMuseum from '../assets/monastery/museum-building.webp';

import church from '../assets/monastery/church.webp';

import ziqualaAerial from '../assets/monastery/ziquala-aerial.webp';

import ziqualaAerialSmall from '../assets/monastery/ziquala-aerial-640.webp';

import sewingProject from '../assets/monastery/projects/sewing.webp';

import textileWeaving from '../assets/monastery/projects/textile-weaving.webp';

import cropHarvest from '../assets/monastery/projects/crop-harvest.webp';

import oxFarming from '../assets/monastery/projects/ox-farming.webp';

import livestock from '../assets/monastery/projects/livestock.webp';

import abbotHarvest from '../assets/monastery/projects/abbot-harvest.webp';

import wofchoProject from '../assets/monastery/projects/wofcho-project.webp';

import oilProject from '../assets/monastery/projects/oil-project.webp';

import cbeLogo from '../assets/cbe-logo.svg';

import { ScrollReveal, DocumentContentBand, SectionTitle } from './PublicSections';

export const monasteryProjects = [
  {
    title: "copy.oilProcessingProject",
    product: "copy.refinedOilAndValueAddedProductsFromAdulalaCity",
    copy: "copy.theMonasterySOilProcessingProjectInAdulalaCityContributesSteadyIn",
    image: oilProject,
    alt: "copy.oilProcessingProjectInAdulalaCity",
  },
  {
    title: "copy.wofchoProject",
    product: "copy.communityBasedProduceFromWenberMariamVillage",
    copy: "copy.basedInWenberMariamVillageTheWofchoProjectSupportsPracticalProduc",
    image: wofchoProject,
    alt: "copy.wofchoProjectInWenberMariamVillage",
  },
  {
    title: "copy.sewingTextileWork",
    product: "copy.sewnGarmentsTextilesAndRepairWork",
    copy: "copy.theSewingProjectTurnsPracticalSkillIntoUsefulTextileProductsAndRe",
    image: sewingProject,
    alt: "copy.aMemberOfTheMonasteryCommunityWorkingAtASewingMachine",
  },
  {
    title: "copy.traditionalTextileWeaving",
    product: "copy.handwovenTextilesMadeOnManualLooms",
    copy: "copy.traditionalFloorLoomWeavingTransformsPracticalCraftIntoUsefulText",
    image: textileWeaving,
    alt: "copy.womenWeavingTextilesOnTraditionalManualFloorLoomsInsideAWorkshop",
  },
  {
    title: "copy.sharedHarvest",
    product: "copy.seasonalCropsAndHarvestedProduce",
    copy: "copy.theCommunityCultivatesAndGathersSeasonalCropsThatHelpFeedTheMonas",
    image: cropHarvest,
    alt: "copy.membersOfTheMonasteryCommunityHarvestingCropsTogether",
  },
  {
    title: "copy.traditionalFarming",
    product: "copy.traditionallyCultivatedFarmProduce",
    copy: "copy.oxPoweredCultivationPutsTheMonasterySLandToProductiveUseSupportin",
    image: oxFarming,
    alt: "copy.traditionalFarmingWithOxenOnMonasteryLand",
  },
  {
    title: "copy.livestockCare",
    product: "copy.responsiblyRaisedLivestock",
    copy: "copy.livestockCareIsAnotherImportantLivelihoodActivityThroughWhichTheM",
    image: livestock,
    alt: "copy.calvesCaredForThroughTheMonasteryLivestockProject",
  },
  {
    title: "copy.leadershipInCultivation",
    product: "copy.aCommunityLedModelOfProduction",
    copy: "copy.theMonasterySLeadershipParticipatesDirectlyInCultivationAndHarves",
    image: abbotHarvest,
    alt: "copy.theMonasteryAbbotParticipatingInCropHarvesting",
  },
] as const;

export const MonasteryProjects = () => {
  useTranslation('public');
  return (
  <section id="monastery-projects" className="scroll-mt-24 bg-brand-muted py-20 md:py-28">
    <div className="mx-auto max-w-[90rem] px-5 lg:px-10">
      <ScrollReveal effect="wipe">
        <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-400">{uiText("copy.sustainingTheMonastery")}</p>
          <div>
            <h2 className="text-brand-heading font-serif text-4xl font-medium leading-[1.02] tracking-[-0.035em] sm:text-5xl md:text-6xl">{uiText("copy.incomeGeneratingProjects")}</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">{uiText("copy.farmingFoodProductionSewingAndLivestockCareGenerateTheIncomeTheMo")}</p>
          </div>
        </div>
      </ScrollReveal>

      <div className="mt-12 grid gap-8">
        {monasteryProjects.map((project, index) => (
          <ScrollReveal key={project.title} direction={index % 2 === 0 ? 'left' : 'right'} effect="slide">
            <article className="grid overflow-hidden bg-brand-surface md:grid-cols-2">
              <div className={`relative min-h-72 overflow-hidden bg-white dark:bg-brand-forest-800 md:min-h-[30rem] ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                <img src={project.image} alt={uiText(project.alt)} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 hover:scale-[1.035]" />
                <span className="absolute left-5 top-5 bg-brand-gold-400 px-3 py-2 font-mono text-sm font-black text-brand-forest-950">{uiText(String(index + 1).padStart(2, '0'))}</span>
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                <p className="text-base font-black uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-400">{uiText("copy.productFocus")}</p>
                <h3 className="text-brand-heading mt-4 font-serif text-4xl sm:text-5xl">{uiText(project.title)}</h3>
                <p className="mt-5 text-base font-black uppercase tracking-[0.16em] text-brand-forest-700 dark:text-brand-forest-300">{uiText(project.product)}</p>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">{uiText(project.copy)}</p>
                <a href="#monastery-contact" className="mt-8 inline-flex w-fit items-center gap-2 border-b border-brand-forest-800 pb-2 text-sm font-black text-brand-forest-900 dark:border-brand-gold-300 dark:text-brand-gold-300">{uiText("copy.askAboutThisProject ")}<ArrowRight size={17} /></a>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);
};

export const MonasteryHistory = () => {
  useTranslation('public');
  return (
  <section id="monastery-history" className="scroll-mt-24 bg-brand-surface py-20 md:py-28">
    <div className="mx-auto max-w-[90rem] px-5 lg:px-10">
      <ScrollReveal effect="wipe">
        <div className="grid gap-8 border-b border-black/15 pb-12 dark:border-white/15 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
          <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.aLivingHistory")}</p>
          <div>
            <h2 className="text-brand-heading font-serif text-4xl font-medium leading-[1.1] tracking-[-0.025em] sm:text-5xl md:text-6xl">{uiText("copy.theHistoryOfDebreKewakibtAbuneGebreMenfesKidusCommunalMonastery")}</h2>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-600 dark:text-slate-300">{uiText("copy.aCenturiesOldCenterOfHistoryHolinessAndLearningIfWeAreGivenTheHis")}</p>
          </div>
        </div>
      </ScrollReveal>

      <div className="divide-y divide-black/15 dark:divide-white/15">
        {monasteryHistory.map((chapter, index) => (
          <ScrollReveal key={chapter.title} direction={index % 2 === 0 ? 'left' : 'right'} effect="slide" delay={Math.min(index * 0.04, 0.16)}>
            <article className="grid gap-5 py-9 md:grid-cols-[11rem_1fr] md:gap-10 md:py-12">
              <div>
                <p className="font-mono text-base font-black text-brand-gold-700 dark:text-brand-gold-400">{uiText(String(index + 1).padStart(2, '0'))}</p>
                <p className="mt-3 text-base font-black leading-6 text-brand-forest-800 dark:text-brand-forest-300">{uiText(chapter.period)}</p>
              </div>
              <div className="max-w-4xl">
                <h3 className="text-brand-heading text-2xl font-black leading-10 md:text-3xl">{uiText(chapter.title)}</h3>
                <p className="mt-4 text-base leading-9 text-slate-600 dark:text-slate-300 md:text-lg">{uiText(chapter.body)}</p>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>

      <div id="monastery-film" className="mt-6 scroll-mt-24">
      <ScrollReveal direction="left" effect="scale">
        <div className="grid overflow-hidden border border-slate-200 bg-white text-slate-900 dark:border-brand-forest-800 dark:bg-brand-forest-950 dark:text-white lg:grid-cols-[1.35fr_.65fr]">
          <div className="aspect-video min-h-64 bg-white dark:bg-black lg:min-h-[28rem]">
          <iframe
            src="https://www.youtube-nocookie.com/embed/6zhMGpFsfGg?start=118&rel=0"
            title={uiText("copy.theHistoryOfTheMonastery")}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-10 md:p-12">
            <p className="text-base font-black uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.monasteryHistoryFilm")}</p>
            <h3 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">{uiText("copy.aBriefHistoryOfTheMonastery")}</h3>
            <p className="mt-5 leading-7 text-slate-600 dark:text-slate-200">{uiText("copy.watchTheMonasterySHistoryFilmFromTheSelectedStartingPointAt158")}</p>
            <a href="https://youtu.be/6zhMGpFsfGg?t=118" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 font-black text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.watchDirectlyOnYouTube ")}<ExternalLink size={17} /></a>
          </div>
        </div>
      </ScrollReveal>
      </div>
    </div>
  </section>
);
};

export const MonasteryMuseum = () => {
  useTranslation('public');
  return (
  <section id="monastery-museum" className="scroll-mt-24 overflow-hidden bg-brand-canvas py-20 text-brand-forest-950 dark:bg-brand-forest-950 dark:text-white md:py-28">
    <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-5 lg:grid-cols-[1.18fr_.82fr] lg:gap-16 lg:px-10">
      <ScrollReveal effect="wipe" direction="left" className="relative">
        <div className="relative min-h-[22rem] overflow-hidden sm:min-h-[30rem] lg:min-h-[38rem]">
          <img width={1024} height={460} loading="lazy" src={monasteryMuseum} alt={uiText("copy.theZiqualaAboMonasteryMuseumBuilding")} decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-1000 hover:scale-[1.025]" />
          <div className="absolute inset-0 hidden dark:block bg-gradient-to-t from-brand-forest-950/65 via-transparent to-transparent" />
          <span className="absolute bottom-5 left-5 border border-slate-200 bg-white text-slate-900 dark:border-white/35 dark:bg-brand-forest-950/55 dark:text-white px-4 py-2 text-sm font-black uppercase tracking-[0.22em] backdrop-blur-sm">{uiText("copy.monasteryHeritage")}</span>
        </div>
      </ScrollReveal>

      <ScrollReveal effect="rise" delay={0.14}>
        <div className="max-w-xl">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-brand-gold-700/30 text-brand-gold-700 dark:border-brand-gold-300/50 dark:text-brand-gold-300"><Building2 size={25} /></span>
          <p className="mt-8 text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.theMonasteryMuseum")}</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">{uiText("copy.theMonasteryMuseum_132")}</h2>
          <ul className="mt-5 space-y-2 text-lg leading-8 text-slate-700 dark:text-slate-100">
            <li>{uiText('monastery.museum.manuscripts')}</li>
            <li>{uiText('monastery.museum.vessels')}</li>
          </ul>
          <p className="mt-6 text-lg leading-8 text-slate-700 dark:text-slate-100">{uiText("copy.aDedicatedPlaceForSafeguardingAndSharingTheHistoryHeritageAndLivi")}</p>
          <p className="mt-5 leading-7 text-slate-600 dark:text-slate-200">{uiText("copy.informationAboutTheCollectionAndVisitorAccessCanBeConfirmedThroug")}</p>
          <a href="#monastery-contact" className="group mt-8 inline-flex items-center gap-3 border-b border-brand-gold-700/70 pb-2 text-sm font-black text-brand-gold-700 dark:border-brand-gold-300/70 dark:text-brand-gold-300">{uiText("copy.askAboutVisiting ")}<ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></a>
        </div>
      </ScrollReveal>
    </div>
  </section>
);
};

export const MonasteryDonation = () => {
  useTranslation('public');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const accountRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  const copyAccountNumber = async () => {
    window.clearTimeout(copyTimer.current);
    setCopied(false);
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(monasteryDonation.accountNumber);
      setCopied(true);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
      if (accountRef.current) {
        const range = document.createRange();
        range.selectNodeContents(accountRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  return (
    <section id="donate" className="scroll-mt-24 bg-white py-20 text-slate-900 dark:bg-brand-forest-950 dark:text-white md:py-28">
      <ScrollReveal effect="scale" className="mx-auto max-w-[90rem] px-5 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.supportTheMonastery")}</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">{uiText("copy.helpPreserveALivingSpiritualHeritage")}</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 dark:text-brand-forest-50/75">{uiText("copy.donationsHelpTheMonasteryMeetItsNeedsSustainItsCommunityCareForIt")}</p>
          </div>
          <div className="border border-slate-200 bg-white dark:border-white/20 dark:bg-white/10 p-6 sm:p-9">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white p-1 shadow-lg"><img src={cbeLogo} alt={uiText("copy.commercialBankOfEthiopiaLogo")} className="h-full w-full object-contain" /></span>
              <div>
                <p className="text-base font-black uppercase tracking-[0.22em] text-slate-600 dark:text-brand-forest-200">{uiText("copy.cBEDonationAccount")}</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{uiText(monasteryDonation.bankName)}</p>
              </div>
            </div>
            <p className="mt-8 text-base font-black uppercase tracking-[0.22em] text-slate-600 dark:text-brand-forest-200">{uiText("copy.accountNumber")}</p>
            <p ref={accountRef} dir="ltr" className="mt-3 break-all font-mono text-3xl font-black tracking-tight sm:text-4xl">{uiText(monasteryDonation.accountNumber)}</p>
            <button type="button" onClick={copyAccountNumber} className="mt-6 inline-flex items-center gap-2 border border-slate-300 dark:border-white/30 px-5 py-3 text-sm font-black transition hover:bg-slate-100 dark:hover:bg-white dark:hover:text-brand-forest-950">
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {uiText(copied ? "copy.accountNumberCopied" : "copy.copyAccountNumber")}
            </button>
            <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-200">{copyFailed ? uiText('copy.clipboardUnavailable') : copied ? uiText('copy.accountNumberCopied') : ''}</p>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-200">{uiText("copy.pleaseConfirmTheAccountHolderDetailsWithTheMonasteryThroughItsOff")}</p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};

export const MonasteryContact = () => {
  useTranslation('public');
  const contactItems = [
    { label: "copy.email", value: monasteryContact.email, href: `mailto:${monasteryContact.email}`, icon: Mail },
    { label: "copy.phone", value: monasteryContact.phoneDisplay, href: monasteryContact.phoneHref, icon: Phone },
    { label: "copy.telegram", value: '@gebreabo', href: monasteryContact.telegram, icon: Send },
    { label: "copy.youTube", value: '@ziqualaabomedia', href: monasteryContact.youtube, icon: PlayCircle },
    { label: "copy.facebook", value: 'Ziquala Abo', href: monasteryContact.facebook, icon: MessageCircle },
  ];

  return (
    <section id="monastery-contact" className="scroll-mt-24 border-t border-black/10 bg-brand-surface py-20 dark:border-white/10 md:py-24">
      <ScrollReveal className="mx-auto max-w-[90rem] px-5 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-300">{uiText("copy.contactTheMonastery")}</p>
            <h2 className="text-brand-heading mt-5 font-serif text-4xl sm:text-5xl">{uiText("copy.stayConnected")}</h2>
            <p className="mt-5 max-w-md leading-7 text-slate-600 dark:text-slate-300">{uiText("copy.useTheMonasterySVerifiedChannelsForEnquiriesMediaAndCommunityUpda")}</p>
            <address className="mt-5 text-base not-italic leading-8">{uiText(monasteryContact.monasteryAddress)}</address>
            <Link to="/contact" className="mt-4 inline-block font-bold underline underline-offset-4">{uiText("contact.title")}</Link>
          </div>
          <div className="grid border-t border-black/15 dark:border-white/15 sm:grid-cols-2">
            {contactItems.map((item) => (
              <a key={item.label} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined} className="group flex min-h-32 items-center gap-4 border-b border-black/15 py-6 sm:px-6 sm:odd:border-r dark:border-white/15">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-brand-gold-700/20 text-brand-gold-700 transition group-hover:bg-brand-gold-400 group-hover:text-brand-forest-950 dark:border-brand-gold-300/30 dark:text-brand-gold-300 dark:group-hover:text-brand-forest-950"><item.icon size={19} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-black uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-400">{uiText(item.label)}</span>
                  <span className="mt-2 block break-words font-bold text-brand-forest-950 dark:text-white">{uiText(item.value)}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};

export const MonasteryDocumentSections = () => {
  useTranslation('public');
  return (
  <>
    <DocumentContentBand eyebrow="copy.overview" title="monastery.overview.title" copy={monasteryDocumentContent.overview} dark />
    <DocumentContentBand eyebrow="monastery.spiritualLife.eyebrow" title="monastery.spiritualLife.title" copy={monasteryDocumentContent.spiritualLife} />
    <section className="bg-brand-surface py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow={uiText("monastery.development.eyebrow")} copy={uiText("monastery.development.subtitle")}>{uiText("monastery.development.title")}</SectionTitle>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {monasteryDevelopmentProjects.map((project, index) => <ScrollReveal key={project.title} effect="scale" delay={index * 0.06}><article className="border border-black/10 bg-brand-canvas p-7 dark:border-white/10"><p className="font-mono text-base font-black text-brand-gold-700 dark:text-brand-gold-300">{String(index + 1).padStart(2, '0')}</p><h3 className="text-brand-heading mt-6 text-xl font-black">{uiText(project.title)}</h3><p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{uiText(project.body)}</p></article></ScrollReveal>)}
        </div>
      </div>
    </section>
    <DocumentContentBand eyebrow="monastery.legacy.eyebrow" title="monastery.legacy.title" copy={monasteryDocumentContent.conclusion} dark />
  </>
);
};

export const MonasteryHero = () => {
  useTranslation('public');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) { videoRef.current?.pause(); setIsPaused(true); }
  }, [reduceMotion]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setIsPaused(false)).catch(() => setIsPaused(true));
    } else {
      video.pause();
      setIsPaused(true);
    }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <section className="relative flex min-h-[680px] items-end overflow-hidden bg-white text-slate-900 dark:bg-brand-forest-950 dark:text-white">
      <video
        ref={videoRef}
        src={monasteryHeroVideo}
        poster={craterCommunity}
        autoPlay={!reduceMotion}
        loop
        muted={isMuted}
        playsInline
        preload={reduceMotion ? 'none' : 'metadata'}
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden="true" />

      <div className="absolute right-5 top-5 z-20 flex gap-2 sm:right-8 sm:top-8">
        <button type="button" onClick={togglePlayback} aria-label={uiText(isPaused ? "copy.playMonasteryBackgroundVideo" : "copy.pauseMonasteryBackgroundVideo")} aria-pressed={isPaused} className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 dark:border-white/35 bg-white text-slate-700 dark:bg-brand-forest-950/35 dark:text-white backdrop-blur transition hover:bg-white hover:text-brand-forest-950">
          {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
        </button>
        <button type="button" onClick={toggleSound} aria-label={uiText(isMuted ? "copy.enableMonasteryVideoSound" : "copy.muteMonasteryVideoSound")} aria-pressed={!isMuted} className="grid h-11 w-11 place-items-center rounded-full border border-slate-300 dark:border-white/35 bg-white text-slate-700 dark:bg-brand-forest-950/35 dark:text-white backdrop-blur transition hover:bg-white hover:text-brand-forest-950">
          {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>

      <m.div
        initial={reduceMotion ? false : { opacity: 0, y: 42 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto grid w-full max-w-7xl items-end gap-8 px-5 pb-16 pt-24 lg:grid-cols-[1fr_.65fr] lg:px-8 md:pb-24"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:p-8 text-slate-900">
          <div className="flex items-center gap-4">
            <img src={monasteryMark} alt={uiText("copy.ziqualaAboMediaMark")} className="h-20 w-20 rounded-xl bg-slate-50 object-contain p-2" />
            <p className="text-base font-black uppercase tracking-[0.28em] text-brand-gold-800">{uiText("copy.monasteryInformation")}</p>
          </div>
          <h1 className="mt-7 max-w-5xl font-serif text-4xl font-medium leading-tight tracking-[-0.045em] md:text-6xl text-brand-forest-950">{uiText(ziqualaIdentity.monasteryNameEn)}</h1>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:p-8 text-slate-900">
          <p className="text-lg leading-8 text-slate-700">{uiText("copy.aDedicatedSpaceForTheMonasterySHistorySpiritualCommunityIncomeGen")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#monastery-history" className="inline-flex items-center gap-2 bg-brand-gold-400 px-5 py-3 text-sm font-black text-brand-forest-950 hover:bg-brand-gold-300 transition-colors">{uiText("copy.readTheHistory ")}<ArrowRight size={17} /></a>
            <a href="#donate" className="inline-flex items-center gap-2 border border-slate-300 hover:border-brand-forest-900 px-5 py-3 text-sm font-black text-slate-900 transition-colors">{uiText("copy.supportTheMonastery ")}<HeartHandshake size={17} /></a>
          </div>
        </div>
      </m.div>
    </section>
  );
};

export const MonasteryPage = () => {
  useTranslation('public');
  return (
  <>
    <MonasteryHero />

    <MonasteryDocumentSections />

    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
      <ScrollReveal effect="wipe">
        <SectionTitle eyebrow={uiText("copy.aSeparatePublicExperience")} copy={uiText("copy.theArchiveContainsExtensiveProfessionalDocumentationOfTheCraterLa")}>{uiText("copy.faithPlaceAndLivingHeritage")}</SectionTitle>
      </ScrollReveal>
      <div className="grid gap-5 lg:grid-cols-3">
          {[
            { icon: Mountain, title: "copy.history", copy: "copy.readTheSuppliedAmharicHistoryFromTheMonasterySSixthCenturyFoundat" },
            { icon: Users, title: "copy.monasticCommunity", copy: "copy.profilesOfMonksAndCommunityMembersWillBePublishedOnlyAfterNamesRo" },
            { icon: HeartHandshake, title: "copy.livelihoodProjects", copy: "copy.agricultureFoodProductionSewingAndLivestockHelpGenerateTheIncomeT" },
          ].map((item, index) => (
            <ScrollReveal key={item.title} effect="scale" delay={index * 0.1}>
              <div className="min-h-full rounded-xl border border-slate-200 bg-brand-surface p-8 transition duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-white/10">
                <item.icon size={32} className="text-brand-gold-700 dark:text-brand-gold-300" />
                <h2 className="text-brand-heading mt-8 text-2xl font-black">{uiText(item.title)}</h2>
                <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{uiText(item.copy)}</p>
              </div>
            </ScrollReveal>
          ))}
      </div>
    </section>

    <MonasteryHistory />

    <MonasteryMuseum />

    <MonasteryProjects />

    <section id="monastery-media" className="scroll-mt-24 bg-brand-canvas text-slate-950 dark:text-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
        <ScrollReveal effect="rise">
          <SectionTitle eyebrow={uiText("copy.monasteryMedia")} copy={uiText("copy.aFirstCuratedSelectionFromTheReadOnlyArchiveTheOriginalHighResolu")}>{uiText("copy.archivePreview")}</SectionTitle>
        </ScrollReveal>
        <ScrollReveal effect="wipe" direction="left" delay={0.08}>
        <div className="grid gap-4 md:grid-cols-12">
          <figure className="relative min-h-[500px] overflow-hidden md:col-span-7 md:row-span-2">
            <img width={1280} height={591} loading="lazy" decoding="async" src={church} alt={uiText("copy.theChurchAtZiqualaAboMonastery")} className="absolute inset-0 h-full w-full object-cover" />
          </figure>
          <figure className="relative min-h-[300px] overflow-hidden md:col-span-5">
            <img width={820} height={1024} loading="lazy" decoding="async" srcSet={`${ziqualaAerialSmall} 640w, ${ziqualaAerial} 820w`} sizes="(min-width: 1024px) 45vw, 100vw" src={ziqualaAerial} alt={uiText("copy.aerialViewOfZiqualaCraterLakeAndMonastery")} className="absolute inset-0 h-full w-full object-cover" />
          </figure>
          <figure className="relative min-h-[300px] overflow-hidden md:col-span-5">
            <img src={monksByLake} alt={uiText("copy.monasteryCommunityGatheredNearTheCraterLake")} className="absolute inset-0 h-full w-full object-cover" />
          </figure>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <figure className="relative min-h-[320px] overflow-hidden"><img src={monkOnPath} alt={uiText("copy.aMonkWalkingThroughTheZiqualaLandscape")} className="absolute inset-0 h-full w-full object-cover" /></figure>
          <figure className="relative min-h-[320px] overflow-hidden"><img src={monasteryCommunity} alt={uiText("copy.membersOfTheMonasteryCommunity")} className="absolute inset-0 h-full w-full object-cover" /></figure>
        </div>
        </ScrollReveal>
      </div>
    </section>

    <MonasteryDonation />

    <MonasteryContact />
  </>
);
};
