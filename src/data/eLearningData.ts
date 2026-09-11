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

export const extractGoogleDriveFileId = (url: string) => {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'drive.google.com') return '';
    const fileId = parsed.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1]
      || parsed.searchParams.get('id') || '';
    return /^[a-zA-Z0-9_-]+$/.test(fileId) ? fileId : '';
  } catch {
    return '';
  }
};

const driveFileUrl = (url: string, download: boolean) => {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return '';
  const target = new URL(download ? 'https://drive.google.com/uc' : `https://drive.google.com/file/d/${fileId}/preview`);
  if (download) {
    target.searchParams.set('export', 'download');
    target.searchParams.set('id', fileId);
  }
  const resourceKey = new URL(url.trim()).searchParams.get('resourcekey');
  if (resourceKey) target.searchParams.set('resourcekey', resourceKey);
  return target.toString();
};

export const getGoogleDrivePreviewUrl = (url: string) => driveFileUrl(url, false);
export const getGoogleDriveDownloadUrl = (url: string) => driveFileUrl(url, true);
