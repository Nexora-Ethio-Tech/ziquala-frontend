import { useTranslation } from 'react-i18next';

import { publicText as uiText } from "../publicLocalization";

import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { Link } from 'react-router-dom';

import { portalRoles } from '../data/ziqualaContent';

import { SectionTitle, PublicCommunityHighlights } from './PublicSections';

export const NewsPage = () => {
  useTranslation('public');
  return (
  <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
    <SectionTitle as="h1" eyebrow={uiText("copy.newsEvents")} copy={uiText("copy.aDedicatedPublicSpaceForSchoolAnnouncementsCeremoniesAcademicDate")}>{uiText("copy.stayConnectedWithZiqualaAbo")}</SectionTitle>
    <PublicCommunityHighlights compact />
  </section>
);
};

export const PortalScopePage = () => {
  useTranslation('public');
  return (
  <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 md:py-28">
    <SectionTitle as="h1" eyebrow={uiText("copy.portalScope")} copy={uiText("copy.theZiqualaSystemFocusesStrictlyOnAcademicAndAdministrativeManagem")}>{uiText("copy.approvedUserRoles")}</SectionTitle>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {portalRoles.map((role) => (
        <div key={role} className="p-5 rounded-xl bg-brand-surface border border-slate-200 dark:border-white/10 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-brand-gold-700 dark:text-brand-gold-300" />
          <span className="font-black">{uiText(role)}</span>
        </div>
      ))}
    </div>
    <div className="mt-10 flex justify-center"><Link to="/login" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-brand-forest-900 text-white font-black">{uiText("copy.continueToLogin ")}<ArrowRight size={18} /></Link></div>
  </section>
);
};
