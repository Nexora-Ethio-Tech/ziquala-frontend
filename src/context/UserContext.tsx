import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'super-admin' | 'academic-manager' | 'school-admin' | 'vice-principal' | 'teacher' | 'student' | 'parent' | 'librarian' | 'storekeeper';
export type SessionRole = UserRole;

export interface User {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
  digitalId?: string;
  branchId?: string;
  branchName?: string;
  status?: string;
  staffProfile?: any;
}

interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface MultilingualText {
  oromic: string;
  amharic: string;
  english: string;
}

const normalizeUserRole = (role?: string): SessionRole | null => {
  if (!role) return null;
  return role.toString().toLowerCase().replace(/[_\s]+/g, '-') as SessionRole;
};

const getDashboardRoute = (role?: string) => {
  const normalizedRole = normalizeUserRole(role);
  switch (normalizedRole) {
    case 'super-admin': return '/dashboard/super-admin';
    case 'academic-manager': return '/dashboard/academic-manager';
    case 'school-admin': return '/dashboard/school-admin';
    case 'teacher': return '/dashboard/teacher';
    case 'student': return '/dashboard/student';
    case 'parent': return '/dashboard/parent';
    case 'vice-principal': return '/dashboard/vice-principal';
    case 'librarian': return '/dashboard/librarian';
    case 'storekeeper': return '/inventory';
    default: return '/';
  }
};

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  role: SessionRole | null;
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
  branches: Branch[];
  gradesLocked: boolean;
  setGradesLocked: (locked: boolean) => void;
  registrationOpen: boolean;
  setRegistrationOpen: (open: boolean) => void;
  gradeSubmissionOpen: boolean;
  setGradeSubmissionOpen: (open: boolean) => void;
  schoolName: MultilingualText;
  setSchoolName: (name: MultilingualText) => void;
  schoolMotto: MultilingualText;
  setSchoolMotto: (motto: MultilingualText) => void;
  login: (credentials: { digitalIdOrEmail: string; password?: string; otp?: string }) => Promise<{ success: boolean; redirect?: string; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<string | null>;
  loading: boolean;
  // VP dual-role support
  isVPTeacher: boolean;
  activeVPMode: 'vp' | 'teacher';
  setActiveVPMode: (mode: 'vp' | 'teacher') => void;
  // Librarian dual-role support
  isTeacherLibrarian: boolean;
  activeLibrarianMode: 'librarian' | 'teacher';
  setActiveLibrarianMode: (mode: 'librarian' | 'teacher') => void;
}



const UserContext = createContext<UserContextType | undefined>(undefined);

const demoModeEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';
export const DEMO_ACCOUNTS: ReadonlyArray<{ id: string; name: string; role: UserRole; password: string }> = [
  { id: 'ZA-SUPER', name: 'Super Admin', role: 'super-admin', password: 'demo123' },
  { id: 'ZA-ACADEMIC', name: 'Academic Manager', role: 'academic-manager', password: 'demo123' },
  { id: 'ZA-SCHOOL', name: 'School Admin', role: 'school-admin', password: 'demo123' },
  { id: 'ZA-VP', name: 'Vice Principal', role: 'vice-principal', password: 'demo123' },
  { id: 'ZA-TEACHER', name: 'Teacher', role: 'teacher', password: 'demo123' },
  { id: 'ZA-LIBRARY', name: 'Librarian', role: 'librarian', password: 'demo123' },
  { id: 'ZA-STORE', name: 'Storekeeper', role: 'storekeeper', password: 'demo123' },
  { id: 'ZA-PARENT', name: 'Parent', role: 'parent', password: 'demo123' },
  { id: 'ZA-STUDENT', name: 'Student', role: 'student', password: 'demo123' },
];
const demoAccounts = Object.fromEntries(DEMO_ACCOUNTS.map((account) => [account.id, account])) as Record<string, (typeof DEMO_ACCOUNTS)[number]>;

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // ─── SECURITY FIX ──────────────────────────────────────────────────────────
  // Do NOT trust localStorage on initial load. Start with null.
  // The verifyToken effect will restore the user ONLY if the token is valid.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Block rendering until verified
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]); // Populated from API only
  // VP dual-role: persisted mode preference
  // If no saved preference, fall back to the user's actual primary role from localStorage.
  const [activeVPMode, setActiveVPModeState] = useState<'vp' | 'teacher'>(() => {
    const saved = localStorage.getItem('ziquala_vp_mode') as 'vp' | 'teacher' | null;
    if (saved) return saved;
    try {
      const savedUser = JSON.parse(localStorage.getItem('ziquala_user') || '{}');
      const primaryRole = (savedUser?.role || '').toLowerCase();
      if (primaryRole === 'teacher') return 'teacher';
    } catch { /* ignore */ }
    return 'vp';
  });
  const setActiveVPMode = (mode: 'vp' | 'teacher') => {
    setActiveVPModeState(mode);
    localStorage.setItem('ziquala_vp_mode', mode);
  };
  // Librarian dual-role: persisted mode preference
  // If no saved preference, fall back to the user's actual primary role from localStorage.
  const [activeLibrarianMode, setActiveLibrarianModeState] = useState<'librarian' | 'teacher'>(() => {
    const saved = localStorage.getItem('ziquala_librarian_mode') as 'librarian' | 'teacher' | null;
    if (saved) return saved;
    try {
      const savedUser = JSON.parse(localStorage.getItem('ziquala_user') || '{}');
      const primaryRole = (savedUser?.role || '').toLowerCase();
      if (primaryRole === 'teacher') return 'teacher';
    } catch { /* ignore */ }
    return 'librarian';
  });
  const setActiveLibrarianMode = (mode: 'librarian' | 'teacher') => {
    setActiveLibrarianModeState(mode);
    localStorage.setItem('ziquala_librarian_mode', mode);
  };
  const [gradesLocked, setGradesLocked] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(() => {
    return localStorage.getItem('ziquala_registration_open') !== 'false';
  });
  const [gradeSubmissionOpen, setGradeSubmissionOpen] = useState(() => {
    return localStorage.getItem('ziquala_grade_submission_open') !== 'false';
  });

  const [schoolName, setSchoolName] = useState<MultilingualText>(() => {
    const saved = localStorage.getItem('ziquala_school_name');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          oromic: 'Mana Barnoota Zuqaalaa Aabboo',
          amharic: 'የዝቋላ አቦ ገዳም አፀደ ህፃናትና አንደኛ ደረጃ ት/ቤት',
          english: 'Ziquala Abo School'
        };
      }
    }
    return {
      oromic: 'Mana Barnoota Zuqaalaa Aabboo',
      amharic: 'የዝቋላ አቦ ገዳም አፀደ ህፃናትና አንደኛ ደረጃ ት/ቤት',
      english: 'Ziquala Abo School'
    };
  });

  const [schoolMotto, setSchoolMotto] = useState<MultilingualText>(() => {
    const saved = localStorage.getItem('ziquala_school_motto');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          oromic: 'Beekumsa ammayyaa, ogummaa hafuuraa fi lammummaa itti gaafatamummaa qabu.',
          amharic: 'ዘመናዊ ዕውቀት፣ መንፈሳዊ ጥበብ እና ኃላፊነት የተሞላ ዜግነት።',
          english: 'Modern knowledge, spiritual wisdom, and responsible citizenship.'
        };
      }
    }
    return {
      oromic: 'Beekumsa ammayyaa, ogummaa hafuuraa fi lammummaa itti gaafatamummaa qabu.',
      amharic: 'ዘመናዊ ዕውቀት፣ መንፈሳዊ ጥበብ እና ኃላፊነት የተሞላ ዜግነት።',
      english: 'Modern knowledge, spiritual wisdom, and responsible citizenship.'
    };
  });

  // ─── Load public system settings (branding, global flags) ────────────────
  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const { default: settingsService } = await import('../services/settingsService');
        const settings = await settingsService.getPublicSystemSettings();
        if (settings.school_name_oromic) {
          setSchoolName({
            oromic: settings.school_name_oromic,
            amharic: settings.school_name_amharic || '',
            english: settings.school_name_english || '',
          });
        }
        if (settings.school_motto_oromic) {
          setSchoolMotto({
            oromic: settings.school_motto_oromic,
            amharic: settings.school_motto_amharic || '',
            english: settings.school_motto_english || '',
          });
        }
        if (settings.grades_locked !== undefined) {
          setGradesLocked(settings.grades_locked === 'true');
        }
        if (settings.registration_open !== undefined) {
          setRegistrationOpen(settings.registration_open !== 'false');
        }
        if (settings.grade_submission_open !== undefined) {
          setGradeSubmissionOpen(settings.grade_submission_open !== 'false');
        }
      } catch {
        // Keep local defaults if API unavailable
      }
    };
    loadPublicSettings();
  }, []);

  // ─── Fetch Real Branches ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { default: api } = await import('../services/api');
        let apiBranches: Branch[] = [];

        if (!user) {
          try {
            const res = await api.get('/guest/branches');
            const data = res.data.data || res.data;
            if (Array.isArray(data) && data.length > 0) {
              apiBranches = data.map((b: any) => ({
                id: b.id,
                name: b.name,
                location: b.address || b.location || 'N/A'
              }));
              setBranches(apiBranches);
            }
          } catch {
            // Keep default branches
          }
          return;
        }

        if (user.role === 'super-admin') {
          const res = await api.get('/super-admin/branches');
          if (res.data.success && Array.isArray(res.data.data)) {
            apiBranches = res.data.data.map((b: any) => ({
              id: b.id,
              name: b.name,
              location: b.address || b.location || 'N/A'
            }));
          }
        } else if (user.role === 'academic-manager' || user.role === 'school-admin' || user.role === 'vice-principal') {
          const endpoint = user.role === 'academic-manager' ? '/academic-manager/branches' : '/school-admin/branches';
          const res = await api.get(endpoint);
          if (res.data.success && Array.isArray(res.data.data)) {
            apiBranches = res.data.data.map((b: any) => ({
              id: b.id,
              name: b.name,
              location: b.address || b.location || 'N/A'
            }));
          }
        } else {
          try {
            const res = await api.get('/guest/branches');
            const data = res.data.data || res.data;
            if (Array.isArray(data) && data.length > 0) {
              apiBranches = data.map((b: any) => ({
                id: b.id,
                name: b.name,
                location: b.address || b.location || 'N/A'
              }));
            }
          } catch {
            if ((user as any).branchId) {
              apiBranches = [{
                id: (user as any).branchId,
                name: (user as any).branchName && (user as any).branchName !== 'My Branch' ? (user as any).branchName : 'Bishoftu Campus',
                location: 'N/A'
              }];
            }
          }
        }

        if (apiBranches.length > 0) {
          setBranches(apiBranches);
          const userBranchId = (user as any).branchId;
          const userBranchName = (user as any).branchName;

          const matched = apiBranches.find(b =>
            (userBranchId && b.id === userBranchId) ||
            (userBranchName && userBranchName !== 'My Branch' && b.name.toLowerCase().includes(userBranchName.toLowerCase()))
          ) || apiBranches[0];

          if (matched) {
            setSelectedBranch(matched);
            if ((user as any).branchName === 'My Branch' || !(user as any).branchName) {
              setUser(prev => prev ? { ...prev, branchName: matched.name } as any : null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    };
    fetchBranches();
  }, [user]);

  // ─── Token Verification on Load ────────────────────────────────────────────
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('ziquala_token');
      console.log('[VerifyToken] Token exists:', !!token);

      if (!token) {
        if (demoModeEnabled) {
          try {
            const savedDemoUser = localStorage.getItem('ziquala_demo_user');
            if (savedDemoUser) {
              setUser(JSON.parse(savedDemoUser));
              setLoading(false);
              return;
            }
          } catch {
            localStorage.removeItem('ziquala_demo_user');
          }
        }
        // No token at all — clear any stale user data and stop loading
        localStorage.removeItem('ziquala_user');
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Use axios api instance instead of fetch to leverage interceptors
        const { default: api } = await import('../services/api');
        console.log('[VerifyToken] Calling /auth/me...');
        const res = await api.get('/auth/me');

        if (res.data.success) {
          const rawUser = res.data.data;
          const normalizedRole = normalizeUserRole(rawUser.role) || (rawUser.role as SessionRole);
          console.log('[VerifyToken] Got user from /auth/me:', { role: rawUser.role, normalizedRole, email: rawUser.email });

          const user = {
            id: rawUser.id,
            name: rawUser.name,
            email: rawUser.email,
            role: normalizedRole,
            digitalId: rawUser.digital_id || rawUser.digitalId,
            branchId: rawUser.branch_id || rawUser.branchId,
            branchName: rawUser.branch_name || rawUser.branchName || 'My Branch',
            status: rawUser.status,
            staffProfile: rawUser.staff_profile || rawUser.staffProfile,
          };
          console.log('[VerifyToken] Setting user with role:', user.role);
          setUser(user);
          localStorage.setItem('ziquala_user', JSON.stringify(user));
        } else {
          console.warn('[VerifyToken] /auth/me returned success: false', res.data);
          localStorage.removeItem('ziquala_user');
          localStorage.removeItem('ziquala_token');
          localStorage.removeItem('ziquala_refresh_token');
          setUser(null);
        }
      } catch (err) {
        console.error('[VerifyToken] Error:', err instanceof Error ? err.message : err,
          err instanceof Error && (err as any).response?.data ? (err as any).response.data : '');
        // Token expired or invalid — force logout
        localStorage.removeItem('ziquala_user');
        localStorage.removeItem('ziquala_token');
        localStorage.removeItem('ziquala_refresh_token');
        setUser(null);
      } finally {
        console.log('[VerifyToken] Done, setting loading: false');
        setLoading(false);
      }
    };
    verifyToken();
  }, []);

  // ─── Sync dual-role defaults when user is freshly verified ───────────────
  // Ensures the correct mode is active and persisted to localStorage on first login
  // (lazy initializer may have run before user data was available).
  useEffect(() => {
    if (!user) return;
    const primaryRole = (user.role || '').toLowerCase();

    // VP/Teacher dual role — only apply if user has never set a preference
    if (!localStorage.getItem('ziquala_vp_mode')) {
      const defaultVPMode: 'vp' | 'teacher' = primaryRole === 'teacher' ? 'teacher' : 'vp';
      setActiveVPModeState(defaultVPMode);
      localStorage.setItem('ziquala_vp_mode', defaultVPMode); // persist so next reload is instant
    }

    // Librarian/Teacher dual role — only apply if user has never set a preference
    if (!localStorage.getItem('ziquala_librarian_mode')) {
      const defaultLibMode: 'librarian' | 'teacher' = primaryRole === 'teacher' ? 'teacher' : 'librarian';
      setActiveLibrarianModeState(defaultLibMode);
      localStorage.setItem('ziquala_librarian_mode', defaultLibMode); // persist so next reload is instant
    }
  }, [user?.id]); // run once per user session (keyed on user id)

  // Persist user to localStorage when it changes (for display only, never trusted)
  useEffect(() => {
    if (user) {
      localStorage.setItem('ziquala_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ziquala_user');
      // DO NOT clear tokens here, as user starts as null on app initialization
      // and clearing them here prevents verifyToken from working on page reload/refresh.
      // Token clearing is handled explicitly during logout or verification failure.
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ziquala_school_name', JSON.stringify(schoolName));
  }, [schoolName]);

  useEffect(() => {
    localStorage.setItem('ziquala_school_motto', JSON.stringify(schoolMotto));
  }, [schoolMotto]);

  useEffect(() => {
    localStorage.setItem('ziquala_registration_open', registrationOpen.toString());
  }, [registrationOpen]);

  useEffect(() => {
    localStorage.setItem('ziquala_grade_submission_open', gradeSubmissionOpen.toString());
  }, [gradeSubmissionOpen]);

  const role = user?.role || null;
  const rawStaffProfile = (user as any)?.staffProfile || (user as any)?.staff_profile;
  const staffProfile = typeof rawStaffProfile === 'string' ? (() => {
    try { return JSON.parse(rawStaffProfile); } catch { return null; }
  })() : rawStaffProfile;

  const promoRolesRaw: any[] = staffProfile?.promotion?.roles || [];
  const promoRoles = promoRolesRaw.map((r: any) => typeof r === 'string' ? r.toLowerCase().replace(/_/g, '-') : '');
  const promoTypeRaw = staffProfile?.promotion?.promotionType || '';
  const promoType = typeof promoTypeRaw === 'string' ? promoTypeRaw.toLowerCase().replace(/_/g, '-') : '';

  // Dual role is ONLY active if the user was explicitly promoted:
  // 1. Vice Principal promoted as Teacher / Teacher promoted as Vice Principal
  const isVPTeacher = Boolean(
    (role === 'vice-principal' && (promoRoles.includes('teacher') || promoType === 'teacher')) ||
    (role === 'teacher' && (promoRoles.includes('vice-principal') || promoType === 'vice-principal'))
  );

  // 2. Librarian promoted as Teacher / Teacher promoted as Librarian
  const isTeacherLibrarian = Boolean(
    (role === 'teacher' && (promoRoles.includes('librarian') || promoType === 'librarian')) ||
    (role === 'librarian' && (promoRoles.includes('teacher') || promoType === 'teacher'))
  );


  const login = async (credentials: { digitalIdOrEmail: string; password?: string; otp?: string }): Promise<{ success: boolean; redirect?: string; error?: string }> => {
    const demoId = credentials.digitalIdOrEmail.trim().toUpperCase();
    const demoAccount = demoAccounts[demoId];
    if (demoModeEnabled && demoAccount && credentials.password === demoAccount.password) {
      const demoUser: User = {
        id: `demo-${demoAccount.role}`,
        name: `Ziquala Demo ${demoAccount.name}`,
        email: `${demoAccount.role}@demo.ziquala.local`,
        role: demoAccount.role,
        digitalId: demoId,
      };
      localStorage.setItem('ziquala_demo_user', JSON.stringify(demoUser));
      localStorage.setItem('ziquala_user', JSON.stringify(demoUser));
      setUser(demoUser);
      return { success: true, redirect: getDashboardRoute(demoUser.role) };
    }

    try {
      const { default: api } = await import('../services/api');
      const res = await api.post('/auth/login', {
        email: credentials.digitalIdOrEmail,
        password: credentials.password
      });

      if (res.data.success) {
        const rawUser = res.data.data.user;
        const normalizedRole = normalizeUserRole(rawUser.role) || (rawUser.role as SessionRole);
        console.log('[Login] Backend returned user:', { role: rawUser.role, normalizedRole, email: rawUser.email });

        const user = {
          id: rawUser.id,
          name: rawUser.name,
          email: rawUser.email,
          role: normalizedRole,
          digitalId: rawUser.digital_id || rawUser.digitalId,
          branchId: rawUser.branch_id || rawUser.branchId,
          branchName: rawUser.branch_name || rawUser.branchName || 'My Branch',
          status: rawUser.status,
          staffProfile: rawUser.staff_profile || rawUser.staffProfile,
        };

        // Store tokens BEFORE updating user state
        localStorage.setItem('ziquala_token', res.data.data.accessToken);
        localStorage.setItem('ziquala_refresh_token', res.data.data.refreshToken);
        localStorage.setItem('ziquala_user', JSON.stringify(user));

        console.log('[Login] Tokens stored, setting user state...');
        setUser(user);

        const redirectUrl = getDashboardRoute(user.role);
        console.log('[Login] Redirecting to:', redirectUrl, 'User role:', user.role);
        return { success: true, redirect: redirectUrl };
      }
      return { success: false, error: res.data.error?.message || 'Invalid credentials' };
    } catch (err: any) {
      console.error('Login error:', err);
      return {
        success: false,
        error: err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Unable to connect to server'
      };
    }
  };

  const logout = async () => {
    try {
      console.log("START");
      const token = localStorage.getItem('ziquala_token');
      if (token) {
        const { default: api } = await import('../services/api');
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setSelectedBranch(null);
      localStorage.removeItem('ziquala_user');
      localStorage.removeItem('ziquala_token');
      localStorage.removeItem('ziquala_refresh_token');
      localStorage.removeItem('ziquala_demo_user');
      window.location.href = '/';
    }
  };

  const switchRole = async (_newRole: UserRole): Promise<string | null> => {
    // Note: Backend doesn't support role switching yet
    // This is a placeholder for future implementation
    console.warn('Role switching not implemented in backend');
    return null;
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      role,
      selectedBranch,
      setSelectedBranch,
      branches,
      gradesLocked,
      setGradesLocked,
      registrationOpen,
      setRegistrationOpen,
      gradeSubmissionOpen,
      setGradeSubmissionOpen,
      schoolName,
      setSchoolName,
      schoolMotto,
      setSchoolMotto,
      login,
      logout,
      switchRole,
      loading,
      isVPTeacher,
      activeVPMode,
      setActiveVPMode,
      isTeacherLibrarian,
      activeLibrarianMode,
      setActiveLibrarianMode,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
