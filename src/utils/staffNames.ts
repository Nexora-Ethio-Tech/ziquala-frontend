import storedNames from '../data/staffNames.json';

export interface StaffNameFields {
  nameAm?: string;
  nameEn?: string;
  title?: string;
  aliases?: readonly string[];
}

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
const knownNames = new Map(Object.values(storedNames).flatMap(person =>
  [person.nameAm, person.nameEn, ...person.aliases].map(name => [normalizeName(name), person] as const)
));
const knownName = (person: StaffNameFields) => [person.nameAm, person.nameEn, person.title]
  .map(name => name ? knownNames.get(normalizeName(name)) : undefined).find(Boolean);

/** Compatibility aliases identify old records; they are never display text. */
export function staffNameVariants(person: StaffNameFields): string[] {
  const known = knownName(person);
  return [...new Set([person.nameAm, person.nameEn, person.title, ...(person.aliases || []),
    known?.nameAm, known?.nameEn, ...(known?.aliases || [])].filter((value): value is string => !!value))];
}

// Phonetic fallback for newly authored Amharic names without an English field.
// This is a character mapping, with no word dictionary or translation service.
const rows: [number, string][] = [
  [0x1200, 'h'], [0x1208, 'l'], [0x1210, 'h'], [0x1218, 'm'], [0x1220, 's'],
  [0x1228, 'r'], [0x1230, 's'], [0x1238, 'sh'], [0x1240, 'q'], [0x1250, 'q'],
  [0x1260, 'b'], [0x1268, 'v'], [0x1270, 't'], [0x1278, 'ch'], [0x1280, 'h'],
  [0x1290, 'n'], [0x1298, 'ny'], [0x12a8, 'k'], [0x12b8, 'kh'], [0x12c8, 'w'],
  [0x12d8, 'z'], [0x12e0, 'zh'], [0x12e8, 'y'], [0x12f0, 'd'], [0x1300, 'j'],
  [0x1308, 'g'], [0x1320, 't'], [0x1328, 'ch'], [0x1330, 'p'], [0x1338, 'ts'],
  [0x1340, 'ts'], [0x1348, 'f'], [0x1350, 'p'],
];
const syllables = new Map<number, { consonant: string; order: number }>(rows.flatMap(([base, consonant]) =>
  Array.from({ length: 8 }, (_, order) => [base + order, { consonant, order }] as const)
));

export function transliterateStaffName(name: string): string {
  const characters = [...name];
  const text = characters.map((character, index) => {
    const code = character.codePointAt(0)!;
    if ((code >= 0x12a0 && code <= 0x12a7) || (code >= 0x12d0 && code <= 0x12d7)) {
      return ['a', 'u', 'i', 'a', 'e', 'e', 'o', 'wa'][code % 8];
    }
    const syllable = syllables.get(code);
    if (!syllable) return character;
    const next = syllables.get(characters[index + 1]?.codePointAt(0) || 0);
    const vowel = syllable.order === 5 ? (next?.order === 5 ? 'e' : '')
      : ['e', 'u', 'i', 'a', 'e', '', 'o', 'wa'][syllable.order];
    return syllable.consonant + vowel;
  }).join('');
  return text.replace(/(^|[\s-])([a-z])/g, (_, separator, letter) => separator + letter.toUpperCase());
}

/** Names bypass publicText/i18next, including names from live website posts. */
export function staffDisplayName(person: StaffNameFields, language: string): string {
  const known = knownName(person);
  if (language.toLowerCase().split('-')[0] === 'am') {
    return person.nameAm || known?.nameAm || person.title || person.nameEn || '';
  }
  return person.nameEn || known?.nameEn || transliterateStaffName(person.nameAm || person.title || '');
}
