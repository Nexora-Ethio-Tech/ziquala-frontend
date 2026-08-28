import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, Menu, X, Sun, Moon } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { useLanguage, type Language } from "../context/LanguageContext";
import { useTheme } from "../../../context/ThemeContext";
import ApplyButtonSection from "./ApplyButton";

export default function Navbar() {
  const { language, setLanguage, translations } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (mobileMenuOpen || previous === undefined) return;

    if (latest > previous && latest > 50) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const navLinks = [
    { path: "/", label: translations.nav.home },
    { path: "/about", label: translations.nav.about },
    { path: "/programs", label: translations.nav.programs },
    { path: "/branches", label: translations.nav.branches },
    { path: "/login", label: "Admin Login" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: "-100%", opacity: 0 }}
        animate={{ y: hidden ? "-100%" : 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-zinc-950/60 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 transition-colors duration-300"
      >
        {/* LOGO & BRAND */}
        <Link to="/" className="flex items-center gap-3 md:gap-4 select-none cursor-pointer">
          <img
            src="/school.png"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full transition-all duration-300 border border-zinc-200 dark:border-white/10"
            alt="Ziquala Abo Logo"
          />
          <span className="font-bold tracking-widest uppercase text-xs md:text-sm text-zinc-900 dark:text-white">
            Ziquala Abo
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden lg:flex items-center gap-8 font-medium text-[10px] tracking-[0.25em] uppercase text-zinc-500 dark:text-zinc-400">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `hover:text-zinc-900 dark:hover:text-white transition-all relative py-2 ${
                  isActive ? "text-zinc-900 dark:text-white font-bold" : ""
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* CONTROLS AREA */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* DESKTOP LANGUAGE SELECTOR */}
          <div className="hidden sm:flex relative items-center bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-full px-3 py-1.5 group select-none">
            <select
              className="appearance-none bg-transparent text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 outline-none cursor-pointer pr-4 hover:text-zinc-900 dark:hover:text-white transition-colors"
              name="language"
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="en" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">EN</option>
              <option value="am" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">AM</option>
              <option value="or" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">OR</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 text-zinc-400 pointer-events-none group-hover:text-zinc-700 dark:group-hover:text-white transition-colors" />
          </div>

          {/* THEME TOGGLE */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* DESKTOP ACTION BUTTON */}
          <div className="hidden sm:block">
            <ApplyButtonSection className="px-4 py-2 text-xs md:text-sm" />
          </div>

          {/* MOBILE HAMBURGER TOGGLE */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer rounded-full hover:bg-zinc-100 dark:hover:bg-white/5"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </motion.nav>

      {/* MOBILE FULL-SCREEN NAVIGATION MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-white dark:bg-zinc-950/98 backdrop-blur-2xl z-[999] flex flex-col p-8 lg:hidden"
          >
            {/* Header section inside drawer */}
            <div className="flex justify-between items-center pb-8 border-b border-zinc-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <img
                  src="/school.png"
                  className="h-10 w-10 rounded-full"
                  alt="Logo"
                />
                <span className="font-bold tracking-wider text-sm uppercase text-zinc-900 dark:text-white">
                  Ziquala Abo
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer rounded-full hover:bg-zinc-100 dark:hover:bg-white/5"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Links with stagger build */}
            <div className="flex-1 flex flex-col justify-center gap-6 pl-4">
              {navLinks.map((link, idx) => (
                <motion.div
                  key={link.path}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05, ease: "easeOut" }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-400 hover:text-zinc-900 dark:hover:text-white uppercase flex items-center gap-4 group"
                  >
                    <span className="text-xs sm:text-sm font-mono text-amber-500/60 group-hover:text-amber-500 transition-colors">
                      0{idx + 1}.
                    </span>
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Mobile Actions Footer */}
            <div className="pt-8 border-t border-zinc-200 dark:border-white/5 flex flex-col gap-6 items-center">
              {/* Language + Theme row */}
              <div className="flex items-center gap-4 w-full justify-center">
                <div className="sm:hidden relative flex items-center bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-full px-4 py-2 group select-none max-w-[150px] justify-center">
                  <select
                    className="appearance-none bg-transparent text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 outline-none cursor-pointer pr-4 text-center w-full"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                  >
                    <option value="en" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">EN</option>
                    <option value="am" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">AM</option>
                    <option value="or" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">OR</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 text-zinc-400 pointer-events-none" />
                </div>

                <button
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>

              {/* Display Action Button on tiny screens */}
              <div className="sm:hidden w-full">
                <ApplyButtonSection className="w-full py-3 text-sm text-center block" />
              </div>

              <p className="text-[10px] font-mono tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mt-2">
                Knowledge • Culture • Discipline
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}