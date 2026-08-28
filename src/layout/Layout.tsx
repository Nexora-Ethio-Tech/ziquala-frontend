
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Chatbot } from '../components/Chatbot';
import { ShootingStars } from '../components/Effects';
import { useUser } from '../context/UserContext';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const Layout = () => {
  const location = useLocation();
  const { role, user, schoolName } = useUser();
  const { t } = useTranslation();

  const displaySchoolName = schoolName.english;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const shouldShowStars = role === 'student' || role === 'parent' || !user;

  const getTitle = (path: string) => {
    if (role === 'student') {
      switch (path) {
        case '/': return 'Student Dashboard';
        case '/courses': return 'Grades & Courses';
        case '/attendance': return 'Academic History';
        default: return 'Student Portal';
      }
    }

    if (role === 'parent') {
      const tab = new URLSearchParams(location.search).get('tab') || 'dashboard';
      switch (tab) {
        case 'dashboard': return 'Family Dashboard';
        case 'grades': return 'Grades & Courses';
        case 'history': return 'Academic History';
        case 'communication-book': return 'Communication Book';
        default: return 'Parent Portal';
      }
    }

    if (role === 'super-admin') {
      switch (path) {
        case '/': return 'Network Overview';
        case '/branches': return 'Branch Management';
        case '/analytics': return 'Global Analytics';
        default: return 'Super Admin Console';
      }
    }

    if (role === 'teacher') {
      switch (path) {
        case '/': return 'Teacher Portal';
        case '/attendance': return 'Student Attendance';
        case '/schedule': return 'My Teaching Schedule';
        default: return 'Teacher Workstation';
      }
    }

    if (role === 'academic-manager') return 'Academic Management';

    switch (path) {
      case '/': return 'Dashboard Overview';
      case '/students': return 'Student Information System';
      case '/teachers': return 'Teacher Workstation';
      case '/attendance': return 'Attendance Tracking';
      case '/settings': return 'System Settings';
      default: return `${displaySchoolName} IMS`;
    }
  };

  const isExamPage = location.pathname.startsWith('/exam/');

  // During an active exam, show only the exam UI (no sidebar, no header, no chatbot)
  if (isExamPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
      {shouldShowStars && <ShootingStars />}
      {/* Sidebar Backdrop for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          title={getTitle(location.pathname)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="p-4 md:p-8 flex-1 w-full">
          <Outlet />
        </main>
        <Chatbot />
      </div>
    </div>
  );
};
