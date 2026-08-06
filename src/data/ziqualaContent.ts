import abbaBirhanemeskelHailemariam from '../assets/leadership/abba-birhanemeskel-hailemariam.webp';
import misganawSolomon from '../assets/leadership/misganaw-solomon.webp';
import tadesseTesfaye from '../assets/leadership/tadesse-tesfaye.webp';
import teshomeBeyene from '../assets/leadership/teshome-beyene.webp';
import yosefTemesgen from '../assets/leadership/yosef-temesgen.webp';

export const ziqualaIdentity = {
  shortName: 'Ziquala Abo School',
  fullName: 'Ziquala Abo Monastery Kindergarten and Primary School',
  amharicName: 'የዝቋላ አቦ ገዳም አፀደ ህፃናትና አንደኛ ደረጃ ት/ቤት',
  oromoName: 'Mana Barnoota Zuqaalaa Aabboo Oolmaa Daa’immanii fi Sadarkaa 1ffaa',
  location: 'Bishoftu, Kebele 03, House No. 721',
  owner: 'Ziquala Debre Kewakibt Abune Gebre Menfes Kidus Monastery Association',
  motto: 'Modern knowledge, spiritual wisdom, and responsible citizenship.',
} as const;

// Temporary frontend data until the Ziquala backend provides its branch list.
// The location below is the only campus address confirmed in the supplied files.
export const ziqualaBranches = [
  {
    id: 'bishoftu-kebele-03',
    name: 'Bishoftu Campus — Kebele 03',
    location: ziqualaIdentity.location,
  },
] as const;

export const publicNavigation = [
  { label: 'Home', to: '/' },
  { label: 'School', to: '/school' },
  { label: 'Monastery', to: '/monastery' },
  { label: 'eLearning', to: '/elearning' },
  { label: 'News & Events', to: '/news' },
] as const;

export const socialLinks = [
  { label: 'Ziquala Abo Academy', href: 'https://t.me/gebreabo', platform: 'telegram' },
  { label: 'Ziquala Abo Media', href: 'https://t.me/ziquala05', platform: 'telegram' },
  { label: 'YouTube', href: 'https://youtube.com/@ziqualaabomedia', platform: 'youtube' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61587078541651', platform: 'facebook' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@ziquala.abo.media', platform: 'tiktok' },
] as const;

export const schoolGoals = [
  'Develop capable citizens grounded in knowledge, discipline, faith, and love of country.',
  'Connect modern scientific learning with spiritual wisdom and strong ethical formation.',
  'Build students’ knowledge, understanding, practical skills, creativity, and confidence.',
  'Deliver equitable, high-quality education aligned with Ethiopia’s education policy.',
] as const;

export const managementStructure = [
  'Monastery Association',
  'School Board',
  'Managing Director',
  'Academic Manager',
  'School Administration',
  'Principal & Vice Principal',
  'Teachers and Academic Departments',
] as const;

export const schoolBoardLeaders = [
  {
    name: 'አቶ ተሾመ በየነ',
    englishName: 'Ato Teshome Beyene',
    image: teshomeBeyene,
  },
  {
    name: 'ዶ/ር ምስጋናው ሰለሞን',
    englishName: 'Dr. Misganaw Solomon',
    image: misganawSolomon,
  },
  {
    name: 'አቶ ታደሰ ተስፋዬ',
    englishName: 'Ato Tadesse Tesfaye',
    image: tadesseTesfaye,
  },
  {
    name: 'አቶ ዮሴፍ ተመስገን',
    englishName: 'Ato Yosef Temesgen',
    image: yosefTemesgen,
  },
] as const;

export const academicManagerProfile = {
  name: 'አባ ብርሃነመስቀል ኃይለማርያም',
  englishName: 'Abba Birhanemeskel Hailemariam',
  title: 'የት/ቤቱ አካዳሚክ ማናጀር',
  englishTitle: 'School Academic Manager',
  image: abbaBirhanemeskelHailemariam,
} as const;

export const eLearningCollections = [
  {
    grade: 'Grades 1–6',
    title: 'Environmental Science',
    description: 'Teacher guides and curriculum-aligned environmental science material in Amharic.',
    audience: 'Teachers',
  },
  {
    grade: 'Grades 3–8',
    title: 'English Language',
    description: 'English teacher guides and supporting classroom material organized by grade.',
    audience: 'Teachers',
  },
  {
    grade: 'Grades 5–6',
    title: 'Mathematics',
    description: 'Mathematics textbooks, syllabi, and teacher guides in multiple languages.',
    audience: 'Students & Teachers',
  },
  {
    grade: 'Grades 2–6',
    title: 'Civics & Moral Education',
    description: 'Learning material focused on character, citizenship, values, and responsibility.',
    audience: 'Students & Teachers',
  },
  {
    grade: 'Grades 6–8',
    title: 'Career & Technical Education',
    description: 'Student textbooks and teacher guides supporting practical and technical learning.',
    audience: 'Students & Teachers',
  },
  {
    grade: 'School-wide',
    title: 'Academic Planning',
    description: 'Annual plans, weekly plans, assessment guidance, schedules, and academic templates.',
    audience: 'Academic Staff',
  },
] as const;

export const portalRoles = [
  'Super Admin',
  'Academic Manager',
  'School Admin',
  'Vice Principal',
  'Teacher',
  'Librarian',
  'Parent',
  'Student',
] as const;
