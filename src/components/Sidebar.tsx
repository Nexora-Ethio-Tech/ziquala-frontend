import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Megaphone,
  Package,
  Settings,
  UserSquare2,
  Users,
  X,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useUser, type UserRole } from '../context/UserContext';
import { useStore } from '../context/useStore';
import { useTranslation } from 'react-i18next';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
};

const dashboardRoutes: Record<UserRole, string> = {
  'super-admin': '/dashboard/super-admin',
  'academic-manager': '/dashboard/academic-manager',
  'school-admin': '/dashboard/school-admin',
  'vice-principal': '/dashboard/vice-principal',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
  parent: '/dashboard/parent',
  librarian: '/dashboard/librarian',
};

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { role, logout, schoolName } = useUser();
  const { isExamLockedDown, selectedBranchId } = useStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const displaySchoolName = i18n.language === 'am'
    ? schoolName.amharic
    : i18n.language === 'om'
      ? schoolName.oromic
      : schoolName.english;

  const parentChildId = role === 'parent'
    ? new URLSearchParams(location.search).get('childId')
    : null;

  const parentPath = (tab: string) => {
    const params = new URLSearchParams({ tab });
    if (parentChildId) params.set('childId', parentChildId);
    return `/dashboard/parent?${params.toString()}`;
  };

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'super-admin': {
        const items: NavItem[] = [
          { icon: LayoutDashboard, label: t('nav.overview', 'Overview'), path: dashboardRoutes['super-admin'] },
          { icon: Building2, label: t('nav.branches', 'Branches'), path: '/branches' },
          { icon: BarChart3, label: t('nav.analytics', 'Analytics'), path: '/analytics' },
        ];
        if (selectedBranchId) {
          items.push(
            { icon: Users, label: t('nav.staffManagement', 'Staff Management'), path: '/staff' },
            { icon: Package, label: t('nav.inventory', 'Inventory'), path: '/inventory' },
          );
        }
        items.push(
          { icon: LibraryBig, label: t('nav.elearningManagement', 'eLearning Management'), path: '/elearning-management' },
          { icon: Megaphone, label: t('nav.newsEvents', 'News & Events'), path: '/website-posts' },
          { icon: Settings, label: t('nav.settings', 'Settings'), path: '/settings' },
        );
        return items;
      }
      case 'academic-manager':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard', 'Dashboard'), path: dashboardRoutes['academic-manager'] },
          { icon: Users, label: t('nav.students', 'Students'), path: '/students' },
          { icon: UserSquare2, label: t('nav.staffManagement', 'Staff Management'), path: '/staff' },
          { icon: CalendarCheck, label: t('nav.attendance', 'Attendance'), path: '/attendance' },
          { icon: Package, label: t('nav.inventory', 'Inventory'), path: '/inventory' },
          { icon: LibraryBig, label: t('nav.elearningLibrary', 'eLearning Library'), path: '/elearning-library' },
          { icon: Settings, label: t('nav.settings', 'Settings'), path: '/settings' },
        ];
      case 'school-admin':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard', 'Dashboard'), path: dashboardRoutes['school-admin'] },
          { icon: BookOpen, label: t('nav.classes', 'Classes'), path: '/classes' },
          { icon: GraduationCap, label: t('nav.subjects', 'Subjects'), path: '/subjects' },
          { icon: Users, label: t('nav.students', 'Students'), path: '/students' },
          { icon: UserSquare2, label: t('nav.staffManagement', 'Staff Management'), path: '/staff' },
          { icon: CalendarCheck, label: t('nav.attendance', 'Attendance'), path: '/attendance' },
          { icon: BookOpen, label: t('nav.scheduleBuilder', 'Schedule Builder'), path: '/schedule-builder' },
          { icon: Package, label: t('nav.inventory', 'Inventory'), path: '/inventory' },
          { icon: LibraryBig, label: t('nav.elearningLibrary', 'eLearning Library'), path: '/elearning-library' },
          { icon: Settings, label: t('nav.settings', 'Settings'), path: '/settings' },
        ];
      case 'vice-principal':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard', 'Dashboard'), path: dashboardRoutes['vice-principal'] },
          { icon: UserSquare2, label: t('nav.teachers', 'Teachers'), path: '/teachers' },
          { icon: CalendarCheck, label: t('nav.attendanceOversight', 'Attendance Oversight'), path: '/vp-attendance' },
          { icon: ClipboardList, label: t('nav.gradeManagement', 'Grade Management'), path: '/vp-grade-management' },
          { icon: FileText, label: t('nav.transcripts', 'Transcripts'), path: '/vp-transcripts' },
          { icon: BookOpen, label: t('nav.communicationBook', 'Communication Book'), path: '/vp-communication' },
          { icon: LibraryBig, label: t('nav.elearningLibrary', 'eLearning Library'), path: '/elearning-library' },
        ];
      case 'teacher':
        return [
          { icon: LayoutDashboard, label: t('nav.teacherPortal', 'Teacher Portal'), path: dashboardRoutes.teacher },
          { icon: BookOpen, label: t('nav.weeklyPlans', 'Weekly Plans'), path: '/dashboard/teacher?tab=plans' },
          { icon: CalendarCheck, label: t('nav.attendance', 'Attendance'), path: '/attendance' },
          { icon: BookOpen, label: t('nav.mySchedule', 'My Schedule'), path: '/schedule' },
          { icon: ClipboardCheck, label: t('nav.gradeEntry', 'Grade Entry'), path: '/grades' },
          { icon: ClipboardList, label: t('nav.exams', 'Exams'), path: '/exams' },
          { icon: LibraryBig, label: t('nav.elearningLibrary', 'eLearning Library'), path: '/elearning-library' },
        ];
      case 'student':
        return [
          { icon: LayoutDashboard, label: t('nav.myDashboard', 'My Dashboard'), path: dashboardRoutes.student },
          { icon: BookOpen, label: t('nav.gradesCourses', 'Grades & Courses'), path: '/courses' },
          { icon: CalendarCheck, label: t('nav.academicHistory', 'Academic History'), path: '/attendance' },
          { icon: ClipboardList, label: t('nav.exams', 'Exams'), path: '/exams' },
          { icon: LibraryBig, label: t('nav.elearningLibrary', 'eLearning Library'), path: '/elearning-library' },
        ];
      case 'parent':
        return [
          { icon: LayoutDashboard, label: t('nav.familyDashboard', 'Family Dashboard'), path: parentPath('dashboard') },
          { icon: BookOpen, label: t('nav.gradesCourses', 'Grades & Courses'), path: parentPath('grades') },
          { icon: GraduationCap, label: t('nav.academicHistory', 'Academic History'), path: parentPath('history') },
          { icon: ClipboardList, label: t('nav.communicationBook', 'Communication Book'), path: parentPath('communication-book') },
          { icon: LibraryBig, label: t('nav.elearningLibrary', 'eLearning Library'), path: '/elearning-library' },
        ];
      case 'librarian':
        return [
          { icon: LayoutDashboard, label: t('nav.librarianPortal', 'Librarian Portal'), path: dashboardRoutes.librarian },
          { icon: LibraryBig, label: t('nav.library', 'Library'), path: '/library' },
          { icon: BookOpen, label: t('nav.elearningLibrary', 'eLearning Library'), path: '/elearning-library' },
        ];
      default:
        return [];
    }
  };

  const isActive = (path: string) => {
    const [pathname, query = ''] = path.split('?');
    if (role === 'parent') {
      const expectedTab = new URLSearchParams(query).get('tab') || 'dashboard';
      const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';
      return pathname === location.pathname && expectedTab === currentTab;
    }
    if (query) return pathname === location.pathname && query === location.search.slice(1);
    return pathname === location.pathname;
  };

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-30 flex h-screen w-72 flex-col border-r border-slate-200 bg-white text-slate-900 transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 dark:text-white lg:static lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    )}>
      <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-school-primary text-white shadow-lg shadow-school-primary/20">
            <BookOpen size={27} />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-base font-black leading-tight">{displaySchoolName}</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.22em] text-school-secondary">{t('sidebar.academicPortal', 'Academic Portal')}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-2">
        {getNavItems().map((item) => (
          <NavLink
            key={`${item.path}-${item.label}`}
            to={isExamLockedDown ? '#' : item.path}
            onClick={(event) => {
              if (isExamLockedDown) event.preventDefault();
              else if (window.innerWidth < 1024) onClose();
            }}
            className={cn(
              'group flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all',
              isExamLockedDown && 'cursor-not-allowed opacity-50',
              isActive(item.path)
                ? 'bg-school-primary text-white shadow-lg shadow-school-primary/20'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
            )}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-5 dark:border-slate-800">
        <button
          onClick={() => { logout(); navigate('/'); }}
          disabled={isExamLockedDown}
          className="flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/20"
        >
          <LogOut size={20} />
          {t('sidebar.signOut', 'Sign out')}
        </button>
      </div>
    </aside>
  );
};
