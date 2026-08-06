export type ELearningAudience = 'Public' | 'Students' | 'Teachers' | 'Academic Staff';
export type ELearningStatus = 'draft' | 'published' | 'archived';

export interface ELearningBook {
  id: string;
  title: string;
  author: string;
  grade: string;
  subject: string;
  language: string;
  materialType: string;
  audience: ELearningAudience;
  description: string;
  driveUrl: string;
  status: ELearningStatus;
  featured: boolean;
  allowDownload: boolean;
  coverClass: string;
  createdAt: string;
  updatedAt: string;
}

export const ELEARNING_STORAGE_KEY = 'ziquala_elearning_books';
export const ELEARNING_UPDATED_EVENT = 'ziquala-elearning-updated';

export const eLearningGrades = [
  'Shared Books',
  'KG',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
] as const;

export const eLearningSubjects = [
  'General Reading',
  'Spiritual & Moral Education',
  'Reference',
  'Amharic',
  'Afaan Oromo',
  'English',
  'Mathematics',
  'Environmental Science',
  'Civics & Moral Education',
  'Career & Technical Education',
] as const;

export const eLearningLanguages = ['Amharic', 'Afaan Oromo', 'English', 'Multilingual'] as const;
export const eLearningMaterialTypes = ['Student Textbook', 'Workbook', 'Teacher Guide', 'Reference Book', 'Story Book'] as const;
export const eLearningAudiences: ELearningAudience[] = ['Public', 'Students', 'Teachers', 'Academic Staff'];

const now = '2026-08-06T00:00:00.000Z';

export const defaultELearningBooks: ELearningBook[] = [
  {
    id: 'demo-shared-ethiopian-values',
    title: 'Ethiopian Values and Responsible Citizenship',
    author: 'Ziquala Academic Collection',
    grade: 'Shared Books',
    subject: 'Spiritual & Moral Education',
    language: 'Amharic',
    materialType: 'Reference Book',
    audience: 'Public',
    description: 'A shared reading collection supporting character, faith, citizenship, and community responsibility.',
    driveUrl: '',
    status: 'published',
    featured: true,
    allowDownload: false,
    coverClass: 'from-amber-500 via-orange-600 to-rose-800',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-shared-reading',
    title: 'Young Readers Story Collection',
    author: 'Ziquala Academic Collection',
    grade: 'Shared Books',
    subject: 'General Reading',
    language: 'Multilingual',
    materialType: 'Story Book',
    audience: 'Students',
    description: 'Shared stories for reading practice across several primary grade levels.',
    driveUrl: '',
    status: 'published',
    featured: true,
    allowDownload: false,
    coverClass: 'from-fuchsia-600 via-purple-700 to-indigo-950',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-grade-2-civics',
    title: 'Grade 2 Civics and Moral Education',
    author: 'Academic Textbook Collection',
    grade: 'Grade 2',
    subject: 'Civics & Moral Education',
    language: 'Amharic',
    materialType: 'Student Textbook',
    audience: 'Students',
    description: 'A student learning book focused on values, citizenship, and responsibility.',
    driveUrl: '',
    status: 'published',
    featured: false,
    allowDownload: false,
    coverClass: 'from-rose-500 via-red-700 to-slate-950',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-grade-3-english',
    title: 'Grade 3 English Student Book',
    author: 'Academic Textbook Collection',
    grade: 'Grade 3',
    subject: 'English',
    language: 'English',
    materialType: 'Student Textbook',
    audience: 'Students',
    description: 'English language lessons, reading activities, and classroom practice for Grade 3.',
    driveUrl: '',
    status: 'published',
    featured: true,
    allowDownload: false,
    coverClass: 'from-sky-400 via-blue-700 to-indigo-950',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-grade-4-environment',
    title: 'Grade 4 Environmental Science',
    author: 'Academic Textbook Collection',
    grade: 'Grade 4',
    subject: 'Environmental Science',
    language: 'Amharic',
    materialType: 'Student Textbook',
    audience: 'Students',
    description: 'Environmental science learning material organized for Grade 4 students.',
    driveUrl: '',
    status: 'published',
    featured: true,
    allowDownload: false,
    coverClass: 'from-emerald-400 via-emerald-700 to-teal-950',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-grade-5-math',
    title: 'Grade 5 Mathematics Student Textbook',
    author: 'Academic Textbook Collection',
    grade: 'Grade 5',
    subject: 'Mathematics',
    language: 'English',
    materialType: 'Student Textbook',
    audience: 'Students',
    description: 'Curriculum-aligned mathematics lessons and exercises for Grade 5.',
    driveUrl: '',
    status: 'published',
    featured: true,
    allowDownload: false,
    coverClass: 'from-cyan-500 via-sky-700 to-blue-950',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-grade-5-math-guide',
    title: 'Grade 5 Mathematics Teacher Guide',
    author: 'Academic Textbook Collection',
    grade: 'Grade 5',
    subject: 'Mathematics',
    language: 'English',
    materialType: 'Teacher Guide',
    audience: 'Teachers',
    description: 'Teacher-only instructional guidance supporting the Grade 5 mathematics textbook.',
    driveUrl: '',
    status: 'published',
    featured: false,
    allowDownload: false,
    coverClass: 'from-slate-600 via-slate-800 to-black',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-grade-6-cte',
    title: 'Grade 6 Career and Technical Education',
    author: 'Academic Textbook Collection',
    grade: 'Grade 6',
    subject: 'Career & Technical Education',
    language: 'Amharic',
    materialType: 'Student Textbook',
    audience: 'Students',
    description: 'Practical and technical learning material for Grade 6 students.',
    driveUrl: '',
    status: 'published',
    featured: false,
    allowDownload: false,
    coverClass: 'from-yellow-400 via-amber-600 to-stone-900',
    createdAt: now,
    updatedAt: now,
  },
];

export const loadELearningBooks = (): ELearningBook[] => {
  if (typeof window === 'undefined') return defaultELearningBooks;
  try {
    const saved = window.localStorage.getItem(ELEARNING_STORAGE_KEY);
    if (!saved) return defaultELearningBooks;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaultELearningBooks;
  } catch {
    return defaultELearningBooks;
  }
};

export const saveELearningBooks = (books: ELearningBook[]) => {
  window.localStorage.setItem(ELEARNING_STORAGE_KEY, JSON.stringify(books));
  window.dispatchEvent(new CustomEvent(ELEARNING_UPDATED_EVENT));
};

export const extractGoogleDriveFileId = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const pathMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch?.[1]) return pathMatch[1];
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.endsWith('google.com')) return '';
    return parsed.searchParams.get('id') || '';
  } catch {
    return '';
  }
};

export const getGoogleDrivePreviewUrl = (url: string) => {
  const fileId = extractGoogleDriveFileId(url);
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
};
