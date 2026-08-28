
import { Link } from 'react-router-dom';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { StudentRegistration } from '../components/StudentRegistration';
import { ShootingStars } from '../components/Effects';
import { useUser } from '../context/UserContext';

export const Register = () => {
  const { schoolName, registrationOpen } = useUser();
  const displaySchoolName = schoolName.english;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <ShootingStars />

      <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-500 hover:text-school-primary font-bold transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>

          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-school-primary text-white shadow-lg shadow-school-primary/20">
              <BookOpen size={25} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Admission Portal</h1>
              <p className="text-sm text-slate-500">{displaySchoolName}</p>
            </div>
          </div>
        </div>

        <div className="card p-1 shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-6 md:p-10 bg-white/50 dark:bg-slate-900/50">
            {!registrationOpen ? (
              <div className="text-center py-12 space-y-6">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Online Registration Closed</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                    Online applications are currently closed. Please contact the school administration or check back later for registration updates.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    Ziquala Abo Kindergarten and Primary School
                  </h2>
                  <p className="text-sm sm:text-base font-semibold text-school-primary mt-1">
                    New student registration
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
                    Please provide your details to apply for admission. Our AI system will review your application immediately.
                  </p>
                </div>
                <StudentRegistration isAdminView={false} />
              </>
            )}
          </div>
        </div>

        <p className="text-center text-slate-500 font-medium text-sm">
          Already part of our community?{' '}
          <Link to="/login" className="text-school-primary font-bold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};
