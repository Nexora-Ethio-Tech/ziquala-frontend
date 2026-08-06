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
  const { i18n } = useTranslation();
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
          { icon: LayoutDashboard, label: 'Overview', path: dashboardRoutes['super-admin'] },
          { icon: Building2, label: 'Branches', path: '/branches' },
          { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        ];
        if (selectedBranchId) {
          items.push(
            { icon: Users, label: 'Staff Management', path: '/staff' },
            { icon: Package, label: 'Inventory', path: '/inventory' },
          );
        }
        items.push(
          { icon: LibraryBig, label: 'eLearning Management', path: '/elearning-management' },
          { icon: Megaphone, label: 'News & Events', path: '/website-posts' },
          { icon: Settings, label: 'Settings', path: '/settings' },
        );
        return items;
      }
      case 'academic-manager':
        return [
          { icon: LayoutDashboard, label: 'Academic Overview', path: dashboardRoutes['academic-manager'] },
          { icon: Building2, label: 'Branches', path: '/branches' },
          { icon: BarChart3, label: 'Academic Analytics', path: '/analytics' },
          { icon: Users, label: 'Students', path: '/students' },
          { icon: UserSquare2, label: 'Teachers & Staff', path: '/staff' },
          { icon: BookOpen, label: 'Classes', path: '/classes' },
          { icon: GraduationCap, label: 'Subjects', path: '/subjects' },
          { icon: CalendarCheck, label: 'Attendance Oversight', path: '/vp-attendance' },
          { icon: ClipboardCheck, label: 'Grade & Point Editing', path: '/academic-grades' },
          { icon: LibraryBig, label: 'eLearning Management', path: '/elearning-management' },
          { icon: FileText, label: 'Transcripts', path: '/vp-transcripts' },
        ];
      case 'school-admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: dashboardRoutes['school-admin'] },
          { icon: BookOpen, label: 'Classes', path: '/classes' },
          { icon: GraduationCap, label: 'Subjects', path: '/subjects' },
          { icon: Users, label: 'Students', path: '/students' },
          { icon: UserSquare2, label: 'Staff Management', path: '/staff' },
          { icon: CalendarCheck, label: 'Attendance', path: '/attendance' },
          { icon: BookOpen, label: 'Schedule Builder', path: '/schedule-builder' },
          { icon: Package, label: 'Inventory', path: '/inventory' },
          { icon: LibraryBig, label: 'eLearning Library', path: '/elearning-library' },
          { icon: Settings, label: 'Settings', path: '/settings' },
        ];
      case 'vice-principal':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: dashboardRoutes['vice-principal'] },
          { icon: UserSquare2, label: 'Teachers', path: '/teachers' },
          { icon: CalendarCheck, label: 'Attendance Oversight', path: '/vp-attendance' },
          { icon: ClipboardList, label: 'Grade Management', path: '/vp-grade-management' },
          { icon: FileText, label: 'Transcripts', path: '/vp-transcripts' },
          { icon: BookOpen, label: 'Communication Book', path: '/vp-communication' },
          { icon: LibraryBig, label: 'eLearning Library', path: '/elearning-library' },
        ];
      case 'teacher':
        return [
          { icon: LayoutDashboard, label: 'Teacher Portal', path: dashboardRoutes.teacher },
          { icon: BookOpen, label: 'Weekly Plans', path: '/dashboard/teacher?tab=plans' },
          { icon: CalendarCheck, label: 'Attendance', path: '/attendance' },
          { icon: BookOpen, label: 'My Schedule', path: '/schedule' },
          { icon: ClipboardCheck, label: 'Grade Entry', path: '/grades' },
          { icon: ClipboardList, label: 'Exams', path: '/exams' },
          { icon: LibraryBig, label: 'eLearning Library', path: '/elearning-library' },
        ];
      case 'student':
        return [
          { icon: LayoutDashboard, label: 'My Dashboard', path: dashboardRoutes.student },
          { icon: BookOpen, label: 'Grades & Courses', path: '/courses' },
          { icon: CalendarCheck, label: 'Academic History', path: '/attendance' },
          { icon: ClipboardList, label: 'Exams', path: '/exams' },
          { icon: LibraryBig, label: 'eLearning Library', path: '/elearning-library' },
        ];
      case 'parent':
        return [
          { icon: LayoutDashboard, label: 'Family Dashboard', path: parentPath('dashboard') },
          { icon: BookOpen, label: 'Grades & Courses', path: parentPath('grades') },
          { icon: GraduationCap, label: 'Academic History', path: parentPath('history') },
          { icon: ClipboardList, label: 'Communication Book', path: parentPath('communication-book') },
          { icon: LibraryBig, label: 'eLearning Library', path: '/elearning-library' },
        ];
      case 'librarian':
        return [
          { icon: LayoutDashboard, label: 'Librarian Portal', path: dashboardRoutes.librarian },
          { icon: LibraryBig, label: 'Library', path: '/library' },
          { icon: BookOpen, label: 'eLearning Library', path: '/elearning-library' },
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
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.22em] text-school-secondary">Academic portal</span>
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
          Sign out
        </button>
      </div>
    </aside>
  );
};
