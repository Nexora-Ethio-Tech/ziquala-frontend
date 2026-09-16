import { LocalizedValidation } from './components/LocalizedValidation';
import { uiText } from "./localization";
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { useUser, type UserRole } from './context/UserContext';
import { Suspense, lazy, type ReactNode } from 'react';
import ScrollToTop from './components/ScrollToTop';
import { Chatbot } from './components/Chatbot';

const StaffCategoryPlaceholder = () => {
  const { t } = useTranslation();
  return (
    <div className="p-12 text-center">
      <p className="text-slate-500">{t('staff.selectCategory')}</p>
    </div>
  );
};
//import LandingPage from './pages/LandingPage/LandingPage';

// Helper to automatically retry dynamic import failures caused by deployment chunk hash changes
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page_has_been_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenRefreshed) {
        window.sessionStorage.setItem('page_has_been_refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Students = lazyWithRetry(() => import('./pages/Students').then((m) => ({ default: m.Students })));
const Teachers = lazyWithRetry(() => import('./pages/Teachers').then((m) => ({ default: m.Teachers })));
const Staff = lazyWithRetry(() => import('./pages/Staff').then((m) => ({ default: m.Staff })));
const AcademicManagerDashboard = lazyWithRetry(() => import('./pages/AcademicManagerDashboard').then((m) => ({ default: m.AcademicManagerDashboard })));
const Branches = lazyWithRetry(() => import('./pages/Branches').then((m) => ({ default: m.Branches })));
const StudentProfile = lazyWithRetry(() => import('./pages/StudentProfile').then((m) => ({ default: m.StudentProfile })));
const StudentRecordPage = lazyWithRetry(() => import('./pages/StudentRecordPage').then((m) => ({ default: m.StudentRecordPage })));
const StudentPortal = lazyWithRetry(() => import('./pages/StudentPortal').then((m) => ({ default: m.StudentPortal })));
const StudentCourses = lazyWithRetry(() => import('./pages/StudentCourses').then((m) => ({ default: m.StudentCourses })));
const AcademicHistory = lazyWithRetry(() => import('./pages/AcademicHistory').then((m) => ({ default: m.AcademicHistory })));
const ParentPortal = lazyWithRetry(() => import('./pages/ParentPortal').then((m) => ({ default: m.ParentPortal })));
const TeacherPortal = lazyWithRetry(() => import('./pages/TeacherPortal').then((m) => ({ default: m.TeacherPortal })));
const TeacherAttendance = lazyWithRetry(() => import('./pages/TeacherAttendance').then((m) => ({ default: m.TeacherAttendance })));
const TeacherSchedule = lazyWithRetry(() => import('./pages/TeacherSchedule').then((m) => ({ default: m.TeacherSchedule })));
const GradeEntry = lazyWithRetry(() => import('./pages/GradeEntry').then((m) => ({ default: m.GradeEntry })));
const ScheduleBuilder = lazyWithRetry(() => import('./pages/ScheduleBuilder').then((m) => ({ default: m.ScheduleBuilder })));
const Inventory = lazyWithRetry(() => import('./pages/Inventory').then((m) => ({ default: m.Inventory })));
const Library = lazyWithRetry(() => import('./pages/Library').then((m) => ({ default: m.Library })));
const Attendance = lazyWithRetry(() => import('./pages/Attendance').then((m) => ({ default: m.Attendance })));
const Settings = lazyWithRetry(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const ChangePassword = lazyWithRetry(() => import('./pages/ChangePassword').then((m) => ({ default: m.ChangePassword })));
const ExamSession = lazyWithRetry(() => import('./pages/ExamSession').then((m) => ({ default: m.ExamSession })));
const Transcripts = lazyWithRetry(() => import('./pages/Transcripts').then((m) => ({ default: m.Transcripts })));
const Exams = lazyWithRetry(() => import('./pages/Exams'));
const RegistrationPage = lazyWithRetry(() => import('./pages/Registration').then((m) => ({ default: m.Registration })));
const WebsitePosts = lazyWithRetry(() => import('./pages/WebsitePosts').then((m) => ({ default: m.WebsitePosts })));
const VicePrincipalDashboard = lazyWithRetry(() => import('./pages/VicePrincipalDashboard').then((m) => ({ default: m.VicePrincipalDashboard })));
const BranchUsers = lazyWithRetry(() => import('./pages/BranchUsers').then((m) => ({ default: m.BranchUsers })));
const Classes = lazyWithRetry(() => import('./pages/Classes').then((m) => ({ default: m.Classes })));
const Subjects = lazyWithRetry(() => import('./pages/Subjects'));
const AttendanceManagement = lazyWithRetry(() => import('./pages/AttendanceManagement').then((m) => ({ default: m.AttendanceManagement })));
const TeacherClasses = lazyWithRetry(() => import('./pages/TeacherClasses').then((m) => ({ default: m.TeacherClasses })));
const TeacherGrades = lazyWithRetry(() => import('./pages/TeacherGrades').then((m) => ({ default: m.TeacherGrades })));
const TeacherStudentGrades = lazyWithRetry(() => import('./pages/TeacherStudentGrades').then((m) => ({ default: m.TeacherStudentGrades })));
const VPAttendanceOversight = lazyWithRetry(() => import('./pages/VPAttendanceOversight').then((m) => ({ default: m.VPAttendanceOversight })));
const VPGradeManagement = lazyWithRetry(() => import('./pages/VPGradeManagement').then((m) => ({ default: m.VPGradeManagement })));
const VPTranscripts = lazyWithRetry(() => import('./pages/VPTranscripts').then((m) => ({ default: m.VPTranscripts })));
const VPCommunication = lazyWithRetry(() => import('./pages/VPCommunication').then((m) => ({ default: m.VPCommunication })));
const LibrarianStaff = lazyWithRetry(() => import('./pages/LibrarianStaff').then((m) => ({ default: m.LibrarianStaff })));
const StudentSchedulePage = lazyWithRetry(() => import('./pages/StudentSchedule'));
const ChatbotManagement = lazyWithRetry(() => import('./pages/ChatbotManagement'));
const ELearningLibrary = lazy(() => import('./pages/ELearningPage').then((m) => ({ default: m.ELearningPage })));
const AcademicGradeManagement = lazy(() => import('./pages/AcademicGradeManagement').then((m) => ({ default: m.AcademicGradeManagement })));
const StorekeeperPortal = lazy(() => import('./pages/StorekeeperPortal').then((m) => ({ default: m.StorekeeperPortal })));
const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-sm font-bold text-slate-500">{uiText("Loading page...")}</div>
  </div>
);

const normalizeRouteRole = (role: string | null) => {
  return role?.toString().toLowerCase().replace(/[_\s]+/g, '-') || '';
};

const getDashboardRoute = (role: string | null) => {
  const normalizedRole = normalizeRouteRole(role);
  switch (normalizedRole) {
    case 'super-admin': return '/dashboard/super-admin';
    case 'academic-manager': return '/dashboard/academic-manager';
    case 'school-admin': return '/dashboard/school-admin';
    case 'teacher': return '/dashboard/teacher';
    case 'student': return '/dashboard/student';
    case 'parent': return '/dashboard/parent';
    case 'vice-principal': return '/dashboard/vice-principal';
    case 'librarian': return '/dashboard/librarian';
    case 'storekeeper': return '/dashboard/storekeeper';
    default: return '/login';
  }
};

const ProtectedRoute = ({
  children,
  allowedRoles
}: {
  children: ReactNode;
  allowedRoles?: UserRole[]
}) => {
  const { user, role } = useUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizedRole = normalizeRouteRole(role) as UserRole;
  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    // Kick them back to their own dashboard instead of the generic root
    return <Navigate to={getDashboardRoute(normalizedRole)} replace />;
  }

  return children;
};

function App() {
  useTranslation();
  const { user, role, loading } = useUser();

  // ─── Block ALL rendering until token verification completes ────────────────
  // Without this, ProtectedRoute would see user=null briefly and redirect to /login
  // even for legitimate users refreshing the page.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500">{uiText("Verifying session...")}</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <LocalizedValidation />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={user ? <Navigate to={getDashboardRoute(role)} replace /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to={getDashboardRoute(role)} replace /> : <Register />}
          />

          {!user ? (
            <>
              <Route path="/*" element={<LandingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to={getDashboardRoute(role)} replace />} />

              {/* Explicit Dashboard Routes */}
              <Route path="dashboard/super-admin" element={<ProtectedRoute allowedRoles={['super-admin']}><Dashboard /></ProtectedRoute>} />
              <Route path="dashboard/academic-manager" element={<ProtectedRoute allowedRoles={['academic-manager']}><Dashboard /></ProtectedRoute>} />
              <Route path="dashboard/school-admin" element={<ProtectedRoute allowedRoles={['school-admin']}><Dashboard /></ProtectedRoute>} />
              <Route path="dashboard/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPortal /></ProtectedRoute>} />
              <Route path="dashboard/student" element={<ProtectedRoute allowedRoles={['student']}><StudentPortal /></ProtectedRoute>} />
              <Route path="dashboard/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentPortal /></ProtectedRoute>} />
              <Route path="dashboard/vice-principal" element={<ProtectedRoute allowedRoles={['vice-principal']}><VicePrincipalDashboard /></ProtectedRoute>} />
              <Route path="dashboard/librarian" element={<ProtectedRoute allowedRoles={['librarian']}><Library /></ProtectedRoute>} />
              <Route path="dashboard/storekeeper" element={<ProtectedRoute allowedRoles={['storekeeper']}><StorekeeperPortal /></ProtectedRoute>} />

              {/* Role specific routes */}
              <Route path="branches" element={
                <ProtectedRoute allowedRoles={['super-admin', 'academic-manager']}>
                  <Branches />
                </ProtectedRoute>
              } />

              <Route path="staff/*" element={
                <ProtectedRoute allowedRoles={['super-admin', 'academic-manager', 'school-admin']}>
                  <Staff />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="teachers" replace />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="librarian" element={<LibrarianStaff />} />
              </Route>

              <Route path="students" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager', 'parent', 'vice-principal']}>
                  <Students />
                </ProtectedRoute>
              } />

              <Route path="students/:studentId/record" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager', 'vice-principal']}>
                  <StudentRecordPage />
                </ProtectedRoute>
              } />

              <Route path="registration" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager']}>
                  <RegistrationPage />
                </ProtectedRoute>
              } />

              <Route path="branch-users" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager']}>
                  <BranchUsers />
                </ProtectedRoute>
              } />

              <Route path="classes" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager']}>
                  <Classes />
                </ProtectedRoute>
              } />

              <Route path="subjects" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager']}>
                  <Subjects />
                </ProtectedRoute>
              } />

              <Route path="attendance-management" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager']}>
                  <AttendanceManagement />
                </ProtectedRoute>
              } />

              <Route path="teacher-classes" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherClasses />
                </ProtectedRoute>
              } />

              <Route path="teacher-grades" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherGrades />
                </ProtectedRoute>
              } />

              <Route path="teacher-student-grades/:studentId" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherStudentGrades />
                </ProtectedRoute>
              } />

              <Route path="vp-attendance" element={
                <ProtectedRoute allowedRoles={['super-admin']}>
                  <VPAttendanceOversight />
                </ProtectedRoute>
              } />

              <Route path="vp-communication" element={
                <ProtectedRoute allowedRoles={['vice-principal', 'super-admin', 'academic-manager']}>
                  <VPCommunication />
                </ProtectedRoute>
              } />

              <Route path="vp-grade-locks" element={
                <ProtectedRoute allowedRoles={['vice-principal', 'super-admin', 'academic-manager']}>
                  <Navigate to="/vp-grade-management" replace />
                </ProtectedRoute>
              } />

              <Route path="teacher-classes" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherClasses />
                </ProtectedRoute>
              } />

              <Route path="teacher-grades" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherGrades />
                </ProtectedRoute>
              } />

              <Route path="teacher-student-grades/:studentId" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherStudentGrades />
                </ProtectedRoute>
              } />

              <Route path="vp-transcripts" element={
                <ProtectedRoute allowedRoles={['vice-principal', 'super-admin', 'academic-manager']}>
                  <VPTranscripts />
                </ProtectedRoute>
              } />

              <Route path="vp-grade-management" element={
                <ProtectedRoute allowedRoles={['vice-principal', 'super-admin', 'academic-manager']}>
                  <VPGradeManagement />
                </ProtectedRoute>
              } />

              <Route path="chatbot-management" element={
                <ProtectedRoute allowedRoles={['super-admin']}>
                  <ChatbotManagement />
                </ProtectedRoute>
              } />

              <Route path="students/:id" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager', 'vice-principal']}>
                  <StudentProfile />
                </ProtectedRoute>
              } />

              <Route path="teachers" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager', 'vice-principal']}>
                  <Teachers />
                </ProtectedRoute>
              } />

              <Route path="attendance" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'teacher', 'student']}>
                  {role === 'teacher' ? <TeacherAttendance /> :
                    role === 'student' ? <AcademicHistory /> :
                      <Attendance />}
                </ProtectedRoute>
              } />

              <Route path="inventory" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager']}>
                  <Inventory />
                </ProtectedRoute>
              } />

              <Route path="schedule-builder" element={
                <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'academic-manager', 'vice-principal']}>
                  <ScheduleBuilder />
                </ProtectedRoute>
              } />

              <Route path="library" element={
                <ProtectedRoute allowedRoles={['librarian', 'super-admin']}>
                  <Library />
                </ProtectedRoute>
              } />

              <Route path="website-posts" element={
                <ProtectedRoute allowedRoles={['super-admin']}>
                  <WebsitePosts />
                </ProtectedRoute>
              } />

              <Route path="courses" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentCourses />
                </ProtectedRoute>
              } />

              <Route path="student-schedule" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentSchedulePage />
                </ProtectedRoute>
              } />

              <Route path="schedule" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherSchedule />
                </ProtectedRoute>
              } />

              <Route path="grades" element={
                <ProtectedRoute allowedRoles={['teacher', 'vice-principal', 'school-admin', 'academic-manager']}>
                  {normalizeRouteRole(role) === 'vice-principal' ? <VPGradeManagement /> : <GradeEntry />}
                </ProtectedRoute>
              } />

              <Route path="transcripts" element={
                <ProtectedRoute allowedRoles={['vice-principal', 'super-admin', 'academic-manager']}>
                  <Transcripts />
                </ProtectedRoute>
              } />

              <Route path="exams" element={
                <ProtectedRoute allowedRoles={['teacher', 'school-admin', 'academic-manager', 'vice-principal', 'student', 'parent']}>
                  <Exams />
                </ProtectedRoute>
              } />

              <Route path="academic-grades" element={
                <ProtectedRoute allowedRoles={['academic-manager', 'super-admin']}>
                  <AcademicGradeManagement />
                </ProtectedRoute>
              } />

              <Route path="elearning-management" element={
                <ProtectedRoute allowedRoles={['academic-manager', 'super-admin']}>
                  <Navigate to="/elearning-library" replace />
                </ProtectedRoute>
              } />

              <Route path="elearning-library" element={
                <ProtectedRoute allowedRoles={['super-admin', 'academic-manager', 'school-admin', 'vice-principal', 'teacher', 'librarian', 'storekeeper', 'parent', 'student']}>
                  <ELearningLibrary />
                </ProtectedRoute>
              } />
              <Route path="settings" element={<ProtectedRoute allowedRoles={['super-admin', 'school-admin', 'academic-manager']}><Settings /></ProtectedRoute>} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="exam/:examId" element={<ExamSession />} />

              {/* Catch-all within layout */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
      <Chatbot />
    </BrowserRouter>
  );
}

export default App;
