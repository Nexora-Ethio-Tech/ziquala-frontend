import { type SessionRole } from '../context/UserContext';

export const normalizeRole = (role: string | null | undefined): SessionRole | null => {
  if (!role) return null;
  let normalized = role.toString().toLowerCase().trim();
  normalized = normalized.replace(/[_s]+/g, '-');

  const roleMap: Record<string, SessionRole> = {
    'viceprincipal': 'vice-principal',
    'vice-principal': 'vice-principal',
    'vice_principal': 'vice-principal',
    'schooladmin': 'school-admin',
    'school-admin': 'school-admin',
    'school_admin': 'school-admin',
    'superadmin': 'super-admin',
    'super-admin': 'super-admin',
    'super_admin': 'super-admin',
    'academicmanager': 'academic-manager',
    'academic-manager': 'academic-manager',
    'academic_manager': 'academic-manager',
    'librarian': 'librarian',
    'storekeeper': 'storekeeper',
    'teacher': 'teacher',
    'student': 'student',
    'parent': 'parent'
  };

  return roleMap[normalized] || (normalized as SessionRole);
};
