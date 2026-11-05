import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./HighSchoolLanding";
import AboutUs from "./components/AboutUs";
import ProgramsPage from "./components/ProgramsPage";
import BranchesPage from "./components/BranchesPage";
import Navbar from "./components/Navbar";
import { LanguageProvider } from "./context/LanguageContext";
import Footer from "./components/Footer";
import { Chatbot } from '../../components/Chatbot';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function LandingInner() {
  return (
    <div className="min-h-screen antialiased selection:bg-amber-500/20 font-sans w-full bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-300">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/branches" element={<BranchesPage />} />
      </Routes>
      <Footer />
      <Chatbot />
    </div>
  );
}

export default function LandingPage() {
  return (
    <LanguageProvider>
      <ScrollToTop />
      <LandingInner />
    </LanguageProvider>
  );
}
