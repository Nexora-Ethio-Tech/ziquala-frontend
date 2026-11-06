import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { PublicLayout } from './PublicLayout';
import { PublicAliasRedirect } from '../components/PublicAliasRedirect';
export { PublicLayout } from './PublicLayout';
const HomePage = lazyWithRetry(() => import('./PublicHome').then(m => ({ default: m.HomePage })));
const SchoolPage = lazyWithRetry(() => import('./PublicSchool').then(m => ({ default: m.SchoolPage })));
const MonasteryPage = lazyWithRetry(() => import('./PublicMonastery').then(m => ({ default: m.MonasteryPage })));
const NewsPage = lazyWithRetry(() => import('./PublicOther').then(m => ({ default: m.NewsPage })));
const PortalScopePage = lazyWithRetry(() => import('./PublicOther').then(m => ({ default: m.PortalScopePage })));
const ELearningPage = lazyWithRetry(() => import('./ELearningPage').then(m => ({ default: m.ELearningPage })));
export const LandingPage = () => {
  useTranslation('public');
  return (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<HomePage />} />
      <Route path="school" element={<SchoolPage />} />
      <Route path="monastery" element={<MonasteryPage />} />
      <Route path="elearning" element={<ELearningPage />} />
      <Route path="news" element={<NewsPage />} />
      <Route path="portal" element={<PortalScopePage />} />
      <Route path="about" element={<PublicAliasRedirect to="/school" />} />
      <Route path="programs" element={<PublicAliasRedirect to="/school" />} />
      <Route path="school-life" element={<PublicAliasRedirect to="/school" />} />
      <Route path="branches" element={<PublicAliasRedirect to="/school" defaultHash="#school-campuses" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);
};
