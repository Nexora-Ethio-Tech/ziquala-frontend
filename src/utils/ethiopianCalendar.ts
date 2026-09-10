import { uiText } from '../localization';
import { localeTag } from "../localization";
/**
 * Ethiopian Calendar Utilities
 *
 * Ethiopian calendar is ~7 years and 8 months behind Gregorian.
 * Ethiopian New Year (Enkutatash): September 11 (September 12 in leap years).
 *
 * Academic year convention in Ethiopia:
 *   - Starts: Meskerem (≈ Sep 11) each year
 *   - First Semester: Meskerem – Tir (≈ Sep – Jan)
 *   - Second Semester: Yekatit – Sene (≈ Feb – Jun)
 *   - School year label = the EC year it starts in (e.g. "2018" means Sep 2025 – Jun 2026)
 *
 * Gregorian → Ethiopian year offset:
 *   - Jan–Sep 10: Gregorian year − 8
 *   - Sep 11–Dec: Gregorian year − 7
 */

// ─── Core conversion ──────────────────────────────────────────────────────────

/**
 * East Africa Time offset (UTC+3, no DST).
 * Converts any Date to its EAT equivalent by shifting UTC ms.
 * The returned Date's getUTC* methods reflect EAT local time.
 */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

const toEATDate = (date: Date): Date =>
  new Date(date.getTime() + EAT_OFFSET_MS);

/** Construct a plain Date (local-time) from EAT-shifted UTC parts. */
const eatToLocalProxy = (date: Date): Date => {
  const eat = toEATDate(date);
  return new Date(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate());
};

/** Return the Ethiopian Calendar year for a given JS Date, evaluated in EAT. */
export function getEthiopianYear(date: Date = new Date()): number {
  return gregorianToEthiopian(eatToLocalProxy(date)).year;
}

/** Return the current Ethiopian Calendar year. */
export const getCurrentECYear = (): number => getEthiopianYear(new Date());

/**
 * Determine the current semester from today's Gregorian date.
 * First Semester : Sep 11 – Jan 31 (Meskerem – Tir)
 * Second Semester: Feb 1  – Jun 30 (Yekatit – Sene)
 * Jul/Aug are summer break – we return 2 (end of previous year).
 */
export function getCurrentSemester(): 1 | 2 {
  const month = new Date().getMonth() + 1; // 1-based
  const day = new Date().getDate();
  // Sep 11 to Jan 31 → First Semester
  if ((month === 9 && day >= 11) || month >= 10 || month === 1) return 1;
  // Feb 1 to Jun 30 → Second Semester
  if (month >= 2 && month <= 6) return 2;
  // Jul–Sep 10: summer / between years → treat as 2
  return 2;
}

// ─── Gregorian ↔ EC academic year string conversion ──────────────────────────

/**
 * Convert a Gregorian academic year string to an Ethiopian Calendar year number.
 * e.g. "2025/2026" → 2018
 */
export function gregorianToECYear(gregorianRange: string): number {
  const startYear = parseInt(gregorianRange.split('/')[0], 10);
  return startYear - 7;
}

/**
 * Convert an Ethiopian Calendar year number to a Gregorian academic year string.
 * e.g. 2018 → "2025/2026"
 */
export function ecYearToGregorian(ecYear: number): string {
  return `${ecYear + 7}/${ecYear + 8}`;
}

/** Format an EC year for display, e.g. 2018 → "2018 E.C." */
export const formatECYear = (ecYear: number): string => `${ecYear} E.C.`;

/** Format semester number for display. */
export const formatSemester = (sem: 1 | 2): string =>
  sem === 1 ? 'First Semester' : 'Second Semester';

// ─── Available academic years ─────────────────────────────────────────────────

/**
 * Returns the last N Ethiopian Calendar years (including current), in descending order.
 * The active year is the one ≤ currentECYear.
 */
export function getAvailableECYears(count = 4): number[] {
  const current = getCurrentECYear();
  return Array.from({ length: count }, (_, i) => current - i).filter(y => y >= 2018);
}

/**
 * Returns available Gregorian year strings corresponding to available EC years.
 * e.g. [2018, 2017, 2016] → ["2025/2026", "2024/2025", "2023/2024"]
 */
export function getAvailableGregorianYears(count = 4): string[] {
  return getAvailableECYears(count).map(ecYearToGregorian);
}

// ─── Access control helpers ───────────────────────────────────────────────────

/**
 * Return true if the requested academic year is accessible.
 * A year is accessible if it is ≤ the current EC year.
 * Teachers/Students cannot view grades for future academic years.
 */
export function isYearAccessible(gregorianRange: string): boolean {
  const requestedEC = gregorianToECYear(gregorianRange);
  const currentEC = getCurrentECYear();
  return requestedEC <= currentEC;
}

/**
 * Return true if the requested semester is accessible for the given year.
 * If the year is a past year, both semesters are always accessible.
 * If the year is the current year, only semesters up to the current one are accessible.
 */
export function isSemesterAccessible(gregorianRange: string, semester: 1 | 2): boolean {
  if (!isYearAccessible(gregorianRange)) return false;
  const requestedEC = gregorianToECYear(gregorianRange);
  const currentEC = getCurrentECYear();
  if (requestedEC < currentEC) return true; // past year – both semesters accessible
  // Current year: only allow semesters ≤ current semester
  return semester <= getCurrentSemester();
}

/**
 * Parses an Ethiopian date string YYYY-MM-DD into year, month, and day parts.
 */
export function parseEthiopianDateString(value: string): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Convert a Gregorian Date or date string to Ethiopian calendar parts.
 * - If given a Date object, uses its LOCAL time components.
 * - If given a string:
 *   - Plain YYYY-MM-DD → parsed as local midnight (no UTC shift).
 *   - ISO datetime (contains 'T') → the UTC timestamp is shifted to EAT (+3h)
 *     before extraction, so stored UTC timestamps display the correct EAT day.
 */
export function gregorianToEthiopian(date: Date | string): { year: number; month: number; day: number } {
  let year: number, month: number, day: number;

  if (typeof date === 'string') {
    if (date.includes('T') || date.endsWith('Z')) {
      // ISO datetime: shift to EAT before reading date parts
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return { year: 2018, month: 1, day: 1 };
      const eat = new Date(parsed.getTime() + EAT_OFFSET_MS);
      year = eat.getUTCFullYear();
      month = eat.getUTCMonth() + 1;
      day = eat.getUTCDate();
    } else {
      // Plain YYYY-MM-DD: parse as local date to avoid UTC shift
      const parts = date.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return { year: 2018, month: 1, day: 1 };
      year = parts[0]; month = parts[1]; day = parts[2];
    }
  } else {
    if (isNaN(date.getTime())) return { year: 2018, month: 1, day: 1 };
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const ethYear = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = (n % 30) + 1;

  return { year: ethYear, month: ethMonth, day: ethDay };
}

/**
 * Converts an Ethiopian calendar date string YYYY-MM-DD to a Gregorian ISO string YYYY-MM-DD.
 */
export function ethiopianToGregorianIso(ethDateStr: string): string {
  const parts = parseEthiopianDateString(ethDateStr);
  if (!parts) return '';
  const { year, month, day } = parts;

  const era = 1724220;
  const jdn = era + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day;

  const j = jdn + 32044;
  const g = Math.floor(j / 146097);
  const dg = j % 146097;
  const c = Math.floor(((Math.floor(dg / 36524) + 1) * 3) / 4);
  const dc = dg - c * 36524;
  const b = Math.floor(dc / 1461);
  const db = dc % 1461;
  const a = Math.floor(((Math.floor(db / 365) + 1) * 3) / 4);
  const da = db - a * 365;

  const y = g * 400 + c * 100 + b * 4 + a;
  const m = Math.floor((da * 5 + 308) / 153) - 2;
  const d = da - Math.floor(((m + 4) * 153) / 5) + 122;

  const gregYear = y - 4800 + Math.floor((m + 2) / 12);
  const gregMonth = ((m + 2) % 12) + 1;
  const gregDay = d + 1;

  const dateObj = new Date(gregYear, gregMonth - 1, gregDay);
  const finalYear = dateObj.getFullYear();
  const finalMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
  const finalDay = String(dateObj.getDate()).padStart(2, '0');

  return `${finalYear}-${finalMonth}-${finalDay}`;
}

const ETHIOPIAN_MONTHS_LABELS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

/**
 * Formats a Gregorian Date/date string to a beautiful Ethiopian date string label.
 */
export function formatEthiopianLabel(dateInput: string | Date | null): string {
  if (!dateInput) return '';
  try {
    const { year, month, day } = gregorianToEthiopian(dateInput);
    return `${day} ${uiText(ETHIOPIAN_MONTHS_LABELS[month - 1])} ${year} ${uiText("E.C.")}`;
  } catch {
    return '';
  }
}

/**
 * Get today's date as an Ethiopian Calendar ISO string (YYYY-MM-DD format).
 * Uses EAT (UTC+3) to determine "today" regardless of the browser's timezone.
 */
export function getTodayEthiopianDate(): string {
  const eatProxy = eatToLocalProxy(new Date());
  const { year, month, day } = gregorianToEthiopian(eatProxy);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get current month as Ethiopian Calendar ISO string (YYYY-MM format).
 * Uses EAT (UTC+3) to determine "today" regardless of the browser's timezone.
 */
export function getCurrentEthiopianMonth(): string {
  const eatProxy = eatToLocalProxy(new Date());
  const { year, month } = gregorianToEthiopian(eatProxy);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Format any date as Ethiopian date display string (e.g., "1 Meskerem 2018 E.C.")
 * Replaces: new Date(...).toLocaleDateString(localeTag())
 */
export function formatEthiopianDateOnly(dateInput: string | Date | null): string {
  return formatEthiopianLabel(dateInput);
}

