
import {
  Bell, Search, User, LogOut, Moon, Sun, Menu,
  Calendar as CalendarIcon, X, ChevronDown, Lock,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '../pages/Calendar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}


export const Header = ({ title, onMenuClick }: HeaderProps) => {
  const { user, logout, selectedBranch, role } = useUser();
  const { isExamLockedDown } = useStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('ziquala_language', lng);
  };

  const handleLogout = () => {
    logout();
  };

  const handleChangePassword = () => {
    setIsMenuOpen(false);
    navigate('/change-password');
  };



  return (
    <>
      <header className="h-16 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 transition-colors duration-300">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0 shrink">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden shrink-0"
            aria-label="Open Menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate min-w-0">
            {title}
          </h1>
          {selectedBranch && role === 'super-admin' && (
            <span className="hidden md:inline-flex shrink-0 bg-school-primary/10 text-school-primary px-3 py-1 rounded-full text-xs font-bold border border-school-primary/20 whitespace-nowrap">
              {t('header.branch')} {selectedBranch.name}
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          {/* Search — hidden on xs */}
          <div className={cn("relative group hidden sm:block shrink min-w-0", isExamLockedDown && "opacity-50 pointer-events-none")}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder={t('header.search')}
              disabled={isExamLockedDown}
              className="pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-100 border-none rounded-full text-xs focus:ring-2 focus:ring-blue-500 outline-none w-24 md:w-36 lg:w-48 xl:w-56 shrink min-w-0"
            />
          </div>

          {/* Language */}
          <select
            value={i18n.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isExamLockedDown}
            title="Change language"
            aria-label="Select language"
            className={cn("bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:text-school-primary transition-colors", isExamLockedDown && "opacity-50 cursor-not-allowed")}
          >
            <option value="en">EN</option>
            <option value="am">AM</option>
            <option value="om">OM</option>
          </select>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            disabled={isExamLockedDown}
            className={cn("p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Calendar — hidden on mobile to save space */}
          <button
            onClick={() => setShowCalendar(true)}
            disabled={isExamLockedDown}
            className={cn("hidden sm:flex p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
            title="Open Calendar"
          >
            <CalendarIcon size={20} />
          </button>

          {/* Notifications — hidden on mobile to save space */}
          <button
            type="button"
            disabled={isExamLockedDown}
            title="Notifications"
            className={cn("relative hidden sm:flex p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
          >
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-school-secondary rounded-full border-2 border-white dark:border-slate-900" />
          </button>

          {/* User Profile + Role Switcher */}
          <div className="relative pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
            {/* Trigger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 md:gap-3 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <div className="text-right hidden sm:block min-w-0">
                <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white leading-tight truncate max-w-[120px] md:max-w-[180px] lg:max-w-[220px]">
                  {user?.name || t('header.guest')}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <p className="text-[10px] md:text-xs font-bold text-school-primary uppercase tracking-widest whitespace-nowrap">
                    {t(`roles.${role || ''}`, (role || '').replace(/-/g, ' '))}
                  </p>
                  <ChevronDown
                    size={12}
                    className={cn("text-slate-400 shrink-0 transition-transform duration-200", isMenuOpen && "rotate-180")}
                  />
                </div>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-school-primary to-school-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-school-primary/20 shrink-0">
                <User size={18} />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                {/* Backdrop to close on outside click */}
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

                {/* Responsive dropdown: full-width offset on xs, fixed width on sm+ */}
                <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden z-50">
                  {/* Header info */}
                  <div className="px-5 pt-4 pb-3 bg-gradient-to-br from-school-primary/5 to-school-accent/5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-school-primary/10 text-school-primary rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
                      {t(`roles.${role || ''}`, (role || '').replace(/-/g, ' '))}
                    </span>
                  </div>

                  {/* Mobile-only: Calendar & Notifications shortcuts */}
                  <div className="sm:hidden px-2 pt-2 border-b border-slate-100 dark:border-slate-800 pb-2 flex gap-2">
                    <button
                      onClick={() => { setIsMenuOpen(false); setShowCalendar(true); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      <CalendarIcon size={15} />
                      Calendar
                    </button>
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all relative"
                    >
                      <Bell size={15} />
                      <span className="absolute top-1.5 left-[calc(50%-6px)] w-2 h-2 bg-school-secondary rounded-full border border-white dark:border-slate-900" />
                      Alerts
                    </button>
                  </div>

                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    {/* Change Password — available for all roles except super-admin */}
                    {role !== 'super-admin' && (
                      <button
                        onClick={handleChangePassword}
                        className="w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
                      >
                        <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Lock size={15} />
                        </span>
                        {t('header.changePassword')}
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                    >
                      <span className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
                        <LogOut size={15} />
                      </span>
                      {t('header.signOut')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/20">
            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              title="Close calendar"
              className="absolute top-4 right-4 z-[110] p-2 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <X size={20} />
            </button>
            <div className="p-4 md:p-6">
              <Calendar compact={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
