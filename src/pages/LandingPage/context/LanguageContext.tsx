import enLegacy from '../../../locales/legacy-landing.en.json';
import amLegacy from '../../../locales/legacy-landing.am.json';
import omLegacy from '../../../locales/legacy-landing.om.json';
import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '../../../locales/languages';
import React, { createContext, useContext } from "react";

export type Language = "en" | "am" | "or";

export interface ProgramItem {
  title: string;
  desc: string;
  img: string;
}

export interface StudentItem {
  name: string;
  achievement: string;
  message: string;
  img: string;
}

export interface StatItemData {
  value: string;
  label: string;
  final: string;
}

export interface AboutLeader {
  name: string;
  role: string;
  message: string;
  img: string;
}

export interface AboutValue {
  title: string;
  desc: string;
}

export interface TranslationSchema {
  nav: {
    home: string;
    about: string;
    programs: string;
    schoolLife: string;
    branches: string;
    menu: string;
  };
  hero: {
    welcome: string;
    title: string;
    subtitlePrefix: string;
    subtitleExcellence: string;
    subtitleSuffix: string;
    scroll: string;
  };
  founder: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    quote: string;
    button: string;
    name: string;
    role: string;
  };
  stats: {
    badge: string;
    title: string;
    items: StatItemData[];
  };
  programs: {
    desc: string;
    title: string;
    items: ProgramItem[];
    label: string;
  };
  studentBook: {
    title: string;
    subtitle: string;
    coverTitle: string;
    coverSubtitle: string;
    coverEdition: string;
    legacyTitle: string;
    legacyDesc: string;
    students: StudentItem[];
    classOf: string;
    endOfVolume: string;
    futureAwaits: string;
  };
  cta: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    desc: string;
    button: string;
  };
  about: {
    hero: {
      title: string;
      subtitle: string;
    };
    foundersTitle: string;
    directorsTitle: string;
    leaders: {
      girma: AboutLeader;
      aberash: AboutLeader;
      yodit: AboutLeader;
    };
    difference: {
      title: string;
      subtitle: string;
      values: {
        integrity: AboutValue;
        leadership: AboutValue;
        growth: AboutValue;
        learning: AboutValue;
      };
    };
    missionVision: {
      title: string;
      visionTitle: string;
      visionDesc: string;
      missionTitle: string;
      missionDesc: string;
    };
    promise: {
      title: string;
      desc: string;
    };
  };
  programsPage: {
    title: string;
    desc: string;
    kgTitle: string;
    kgDesc: string;
    primaryTitle: string;
    primaryDesc: string;
    middleTitle: string;
    middleDesc: string;
    highTitle: string;
    highDesc: string;
    oromoTitle: string;
    oromoDesc: string;
  };
  schoolLifePage: {
    title: string;
    desc: string;
    clubsTitle: string;
    clubsDesc: string;
    scienceClubTitle: string;
    scienceClubDesc: string;
    debateClubTitle: string;
    debateClubDesc: string;
    artClubTitle: string;
    artClubDesc: string;
    sportsTitle: string;
    sportsDesc: string;
    charityTitle: string;
    charityDesc: string;
    uniformTitle: string;
    uniformDesc: string;
  };
  branchesPage: {
    title: string;
    desc: string;
    mainTitle: string;
    mainAddr: string;
    mainContact: string;
    primaryTitle: string;
    primaryAddr: string;
    primaryContact: string;
    cityTitle: string;
    cityAddr: string;
    cityContact: string;
    townTitle: string;
    townAddr: string;
    townContact: string;
    directorLabel: string;
  };
}

const translations: Record<Language, TranslationSchema> = { en: enLegacy, am: amLegacy, or: omLegacy };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: TranslationSchema;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const active = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const language: Language = active === 'om' ? 'or' : active;
  const setLanguage = (lang: Language) => { void i18n.changeLanguage(normalizeLanguage(lang)); };

  const value: LanguageContextType = {
    language,
    setLanguage,
    translations: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
