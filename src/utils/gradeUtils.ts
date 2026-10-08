/**
 * Utility functions for normalizing and formatting grade levels across the application.
 */

/**
 * Normalizes a grade level for grading configuration lookups and database mapping.
 * - Kindergarten levels: "KG 1", "KG 2", "KG 3"
 * - Standard grades: "1", "2", ..., "12"
 */
export const normalizeGradeForConfig = (rawGrade?: string | null): string => {
  if (!rawGrade) return 'default';
  const trimmed = String(rawGrade).trim();

  // Kindergarten check: "KG 1", "KG 2", "KG 3", "KG1", "kg-2", etc.
  const kgMatch = trimmed.match(/^kg\s*[-_]?\s*([1-3])/i) || trimmed.match(/kg\s*[-_]?\s*([1-3])/i);
  if (kgMatch) {
    return `KG ${kgMatch[1]}`;
  }

  // Standard numeric grade check: "Grade 1" -> "1", "Grade 10" -> "10", "2" -> "2"
  const gradeMatch = trimmed.match(/^(?:grade\s*[-_]?\s*)?(\d{1,2})/i);
  if (gradeMatch) {
    return gradeMatch[1];
  }

  return trimmed || 'default';
};

/**
 * Returns a clean, user-friendly display string for a grade level.
 * - "KG 1", "KG 2", "KG 3" -> "KG 1", "KG 2", "KG 3"
 * - "1", "2", ..., "12" -> "Grade 1", "Grade 2", ..., "Grade 12"
 */
export const formatGradeDisplay = (gradeLevel?: string | null): string => {
  if (!gradeLevel || gradeLevel === 'default') return '';
  const trimmed = String(gradeLevel).trim();
  if (trimmed.toUpperCase().startsWith('KG')) {
    const kgMatch = trimmed.match(/^kg\s*[-_]?\s*([1-3])/i) || trimmed.match(/kg\s*[-_]?\s*([1-3])/i);
    return kgMatch ? `KG ${kgMatch[1]}` : trimmed.toUpperCase();
  }
  const cleanNum = trimmed.replace(/^grade\s*/i, '').trim();
  return cleanNum ? `Grade ${cleanNum}` : trimmed;
};
