import { uiText } from "../localization";

import { Link } from 'react-router-dom';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { StudentRegistration } from '../components/StudentRegistration';
import { ShootingStars } from '../components/Effects';
import { useUser } from '../context/UserContext';

export const Register = () => {
  const { schoolName, registrationOpen } = useUser();
  const displaySchoolName = schoolName.english;

  return (
    <div className="admissions-page min-h-screen bg-brand-canvas text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <ShootingStars />

      <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-200 hover:text-brand-forest-800 dark:hover:text-brand-forest-200 font-bold transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />{uiText("Back to Login")}</Link>

          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-school-primary text-white shadow-lg shadow-school-primary/20">
              <BookOpen size={25} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-brand-heading">{uiText("Admission Portal")}</h1>
              <p className="text-base text-slate-600 dark:text-slate-200">{uiText(displaySchoolName)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-brand-surface dark:border-white/10 p-1 shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-6 md:p-10 bg-brand-surface">
            {!registrationOpen ? (
              <div className="text-center py-12 space-y-6">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-brand-heading">{uiText("Online Registration Closed")}</h2>
                  <p className="text-slate-600 dark:text-slate-200 max-w-md mx-auto text-base leading-relaxed">{uiText("Online applications are currently closed. Please contact the school administration or check back later for registration updates.")}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 text-left">
                  <h2 className="text-2xl sm:text-3xl font-black text-brand-heading">{uiText("Ziquala Abo Kindergarten and Primary School")}</h2>
                  <p className="text-base font-semibold text-brand-forest-700 dark:text-brand-forest-300 mt-1">{uiText("New student registration")}</p>
                  <p className="text-slate-600 dark:text-slate-200 mt-3 max-w-xl text-base leading-relaxed">{uiText("Please provide your details to apply for admission. Our AI system will review your application immediately.")}</p>
                </div>
                <StudentRegistration isAdminView={false} />
              </>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 dark:text-slate-200 font-medium text-base">{uiText("Already part of our community?")}{uiText(" ")}
          <Link to="/login" className="text-brand-forest-700 dark:text-brand-forest-300 font-bold hover:underline">{uiText("Sign in here")}</Link>
        </p>
      </div>
    </div>
  );
};
