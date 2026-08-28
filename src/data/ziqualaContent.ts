import abbaBirhanemeskelHailemariam from '../assets/leadership/abba-birhanemeskel-hailemariam.webp';
import misganawSolomon from '../assets/leadership/misganaw-solomon.webp';
import tadesseTesfaye from '../assets/leadership/tadesse-tesfaye.webp';
import teshomeBeyene from '../assets/leadership/teshome-beyene.webp';
import yosefTemesgen from '../assets/leadership/yosef-temesgen.webp';

export const ziqualaIdentity = {
  shortName: 'Ziquala Abo School',
  fullName: 'Zuqualla Abbo Primary School (Grade 1–8)',
  amharicName: 'የዝቋላ አቦ ገዳም ፩ኛ ደረጃ ትምህርት ቤት',
  oromoName: 'Mana Baruumsa Zuqaalaa Aabboo Sad. 1ffaa',
  location: 'Bishoftu, Kebele 03, House No. 721',
  owner: 'Ziquala Debre Kewakibt Abune Gebre Menfes Kidus Monastery Association',
  motto: 'Modern knowledge, spiritual wisdom, and responsible citizenship.',
} as const;

export const schoolPurpose = {
  vision: 'To nurture self-directed learners with strong Ethiopian values who create useful ideas, serve their communities, and help their country thrive in a changing world.',
  mission: 'To deliver high-quality education through capable teachers, combining internationally minded learning with Ethiopian values, disciplined work, and ethical character.',
} as const;

export const ziqualaBranches = [
  {
    id: 'bishoftu-kebele-03',
    name: 'Main Campus',
    location: 'Bishoftu, Kebele 03 — near Tokuma School',
    grades: 'Grade 1–8',
    enrollment: 1174,
  },
  {
    id: 'bishoftu-kebele-02',
    name: 'Kebele 02 Branch',
    location: 'Bishoftu, Kebele 02 — around Gizawu Shayi Bet',
    grades: 'KG 1–KG 3',
    enrollment: 360,
  },
] as const;

export const publicNavigation = [
  {
    label: 'Home',
    to: '/',
    children: [
      { label: 'School & monastery', hash: '#destinations' },
    ],
  },
  {
    label: 'School',
    to: '/school',
    children: [
      { label: 'Vision & mission', hash: '#school-purpose' },
      { label: 'Board leadership', hash: '#school-leadership' },
      { label: 'School staff', hash: '#school-staff' },
      { label: 'Campuses', hash: '#school-campuses' },
    ],
  },
  {
    label: 'Monastery',
    to: '/monastery',
    children: [
      { label: 'History', hash: '#monastery-history' },
      { label: 'Museum', hash: '#monastery-museum' },
      { label: 'Livelihood projects', hash: '#monastery-projects' },
      { label: 'History film', hash: '#monastery-film' },
      { label: 'Media archive', hash: '#monastery-media' },
      { label: 'Donate', hash: '#donate' },
      { label: 'Contact', hash: '#monastery-contact' },
    ],
  },
  { label: 'eLearning', to: '/elearning', children: [] },
  { label: 'News & Events', to: '/news', children: [] },
] as const;

export const socialLinks = [
  { label: 'Ziquala Abo Academy', href: 'https://t.me/gebreabo', platform: 'telegram' },
  { label: 'Ziquala Abo Media', href: 'https://t.me/ziquala05', platform: 'telegram' },
  { label: 'YouTube', href: 'https://youtube.com/@ziqualaabomedia', platform: 'youtube' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61587078541651', platform: 'facebook' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@ziquala.abo.media', platform: 'tiktok' },
] as const;

export const monasteryContact = {
  email: 'ziqualaabo@gmail.com',
  phoneDisplay: '0996 21 53 54',
  phoneHref: 'tel:+251996215354',
  telegram: 'https://t.me/gebreabo',
  youtube: 'https://youtube.com/@ziqualaabomedia',
  facebook: 'https://www.facebook.com/profile.php?id=61587078541651',
} as const;

export const monasteryDonation = {
  bankName: 'Commercial Bank of Ethiopia (CBE)',
  accountNumber: '1000011282222',
} as const;

export const monasteryHistory = [
  {
    period: 'ከ6ኛው መቶ ክፍለ ዘመን',
    title: 'የጥንታዊነት እና የሥልጣኔ መገኛ',
    body: 'የደብረ ዝቋላ ገዳም መሠረት በ6ኛው መቶ ክፍለ ዘመን በዘመነ አክሱም የተጣለ ጥንታዊና ታሪካዊ ቅርስ ነው። በደቡባዊ እና መካከለኛው የኢትዮጵያ ክፍል የክርስትና፣ የሥልጣኔ እና የትምህርት ማዕከል ሆኖ ሲያገለግል ቆይቷል። ገዳሙ በ15ኛው መቶ ክፍለ ዘመን ጣሊያናዊው የካርታ ባለሙያ ፍራ ማውሮ ባዘጋጀው የዓለም ካርታ ላይ ከዓለማችን ዋነኛ የመሬት ምልክቶች አንዱ ተደርጎ ተመዝግቧል።',
  },
  {
    period: 'የጻድቁ ተጋድሎ',
    title: 'የአቡነ ገብረ መንፈስ ቅዱስ ዳግም መቀደስ',
    body: 'በ9ኛው መቶ ክፍለ ዘመን በዮዲት ጉዲት ዘመን በርካታ መንፈሳዊ ቅርሶች ሲወድሙ፣ በአጼ ገብረ መስቀል የተሠራው የዝቋላ ደብረ ከዋክብት ገዳም ተሰውሮ ቆይቷል። ታላቁ ጻድቅ አቡነ ገብረ መንፈስ ቅዱስ ወደ ተራራው በመምጣት ገዳሙን ዳግም ቀድሰውታል። በ15ኛው መቶ ክፍለ ዘመን በንጉሥ ዘርአ ያዕቆብ ዘመን ገዳሙ ይበልጥ ተጠናክሮ ተስፋፍቷል።',
  },
  {
    period: '16ኛው–19ኛው መቶ ክፍለ ዘመን',
    title: 'የነገሥታት አሻራ እና የሕንፃ ጥበብ',
    body: 'በ16ኛው መቶ ክፍለ ዘመን በግራኝ አህመድ ወረራ ከፍተኛ ጉዳት ደርሶበት ለሦስት መቶ ዓመታት ያህል ፈራርሶ የቆየው ገዳም፣ በ19ኛው መቶ ክፍለ ዘመን በሸዋው ንጉሥ ሣህለ ሥላሴ እና በአባ ገብረ ሕይወት ትጋት ዳግም ታንጿል። በአጼ ምኒልክ እና በንግሥተ ነገሥታት ዘውዲቱ ዘመን የተገነቡትና የታደሱት አብያተ ክርስቲያናት የገዳሙን ግርማ ሞገስ አሳድገውታል።',
  },
  {
    period: '1928–1933 ዓ.ም',
    title: 'የፈተና፣ የጽናት እና የሰማዕትነት ታሪክ',
    body: 'በፋሽስት ጣሊያን ወረራ ወራሪው ኃይል ገዳሙን በቦምብ ከመደብደቡም በላይ መነኮሳቱን በግፍ ጨፍጭፏል። ይህም ዝቋላ የሃይማኖት ብቻ ሳይሆን የሀገር ፍቅር መስዋዕትነት የተከፈለበት የሰማዕታት ምድር መሆኑን ያሳያል። በደርግ ዘመንም የመሬት ይዞታው ተነጥቆ መነኮሳቱ ለችግር ተጋልጠዋል።',
  },
  {
    period: 'ዛሬ',
    title: 'የታሪክ አደራ ለቀጣዩ ትውልድ',
    body: 'የደብረ ዝቋላ ገዳም የሺህ ዓመታት መንፈሳዊ ጥንካሬን፣ የሀገር ፍቅርን እና የታሪክ አደራን ከዘመናዊ ትምህርት ጋር በማስተሳሰር ለቀጣዩ ትውልድ ያስተላልፋል። ገዳሙ ዛሬም ቅድስናውንና ታሪኩን በጽናት ጠብቆ የዕውቀት ብርሃን ሆኖ ያገለግላል።',
  },
] as const;

export const schoolGoals = [
  'Restore and strengthen the ethical values that have long shaped Ethiopian identity.',
  'Build confidence in science and technology so learners can contribute on a global stage.',
  'Cultivate love of country and care for Ethiopia’s natural and historical heritage.',
  'Develop the physical, intellectual, emotional, and social strengths of every learner.',
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

export type SchoolStaffGroup = 'office' | 'primary' | 'kindergarten';

export const schoolStaff = [
  { name: 'የትምህርት ቤቱ ርዕሰ መምህር', role: 'School Principal', group: 'office', image: '/images/staff/staff-46.jpg' },
  { name: 'አባ ገብረጻድቅ ኃይለእየሱስ ብዙነህ', role: 'የት/ቤቱ ሥራ አስኪያጅ', group: 'office', image: '/images/staff/staff-37.jpg' },
  { name: 'አባ ብርሃነመስቀል ኃይለማርያም', role: 'የት/ቤቱ አካዳሚክ ማናጀር', group: 'office', image: '/images/staff/staff-33.jpg' },
  { name: 'አባ ገብረጻድቅ ትዕዛዙ ወርቅነህ', role: 'የት/ቤቱ ፀሐፊ', group: 'office', image: '/images/staff/staff-36.jpg' },
  { name: 'አባ ሀብተማርያም በፅሐ ጌታነህ', role: 'የት/ቤቱ ግምጃ ቤት', group: 'office', image: '/images/staff/staff-32.jpg' },
  { name: 'አባ ክንፈሚካኤል ወልደጊዮርጊስ ተክለጊዮርጊስ', role: 'Purchaser', group: 'office', image: '/images/staff/staff-34.jpg' },
  { name: 'Firehiwot Markos Hailu', role: 'ፀሐፊ', group: 'office', image: '/images/staff/staff-03.jpg' },
  { name: 'ስንዱ ለገሠ', role: 'Librarian', group: 'office', image: '/images/staff/staff-19.jpg' },
  { name: 'ሸዋለም አያሌው ይመር', role: 'የሒሳብ ሰራተኛ', group: 'office', image: '/images/staff/staff-20.jpg' },

  { name: 'ቅድስት ሸዋፈራሁ ጥላሁን', role: 'የስነጥበብ መምህር', group: 'primary', image: '/images/staff/staff-22.jpg' },
  { name: 'ኤደን ተኮላ አጉኔ', role: 'የአማርኛ መምህር', group: 'primary', image: '/images/staff/staff-40.jpg' },
  { name: 'አብዲሳ አመንቴ ሰንበታ', role: 'የት/ቤቱ ምክትል ርዕሰ መምህር', group: 'primary', image: '/images/staff/staff-38.jpg' },
  { name: 'ስምኦን ገበየሁ ወንዴ', role: 'የኪነጥበብ መምህር', group: 'primary', image: '/images/staff/staff-16.jpg' },
  { name: 'Belayinesh Semagn Kidane', role: 'Amharic Teacher', group: 'primary', image: '/images/staff/staff-02.jpg' },
  { name: 'Adis Desta Kidane', role: 'IT Teacher', group: 'primary', image: '/images/staff/staff-01.jpg' },
  { name: 'Mekonen Tesema', role: 'Mathematics Teacher', group: 'primary', image: '/images/staff/staff-04.jpg' },
  { name: 'ጌታነህ ተረጨ ካሳ', role: 'English Teacher', group: 'primary', image: '/images/staff/staff-48.jpg' },
  { name: 'አክሊሉ ቲመርጋ ብዛኒ', role: 'Mathematics Teacher', group: 'primary', image: '/images/staff/staff-39.jpg' },
  { name: 'ዘነቡ በቀለ እንደሻው', role: 'Amharic Teacher', group: 'primary', image: '/images/staff/staff-44.jpg' },
  { name: 'መክሊት ደጀኔ አሰፋ', role: 'Amharic Teacher', group: 'primary', image: '/images/staff/staff-08.jpg' },
  { name: 'ሐይማኖት ሰለሞን ዱባለ', role: 'English Teacher', group: 'primary', image: '/images/staff/staff-05.jpg' },
  { name: 'የሺእመቤት ተሾመ', role: 'ህብረተሰብ እና ዜግነት መምህር', group: 'primary', image: '/images/staff/staff-45.jpg' },
  { name: 'ስንታየሁ አሸናፊ', role: 'Mathematics Teacher', group: 'primary', image: '/images/staff/staff-17.jpg' },
  { name: 'ፀሐይ አበበ ተክሉ', role: 'Biology Teacher', group: 'primary', image: '/images/staff/staff-50.jpg' },
  { name: 'ጋዲሳ ሹጉ ቱፋ', role: 'Afaan Oromoo Teacher', group: 'primary', image: '/images/staff/staff-47.jpg' },
  { name: 'እስከዳር ታሪኩ እንደኛነው', role: 'የ1ኛ ደረጃ ስፖርት መምህርት', group: 'primary', image: '/images/staff/staff-42.jpg' },
  { name: 'መቅደላዊት ተስፋዬ በየነ', role: 'የስፖርት መምህር', group: 'primary', image: '/images/staff/staff-06.jpg' },
  { name: 'መኮንን ወንድሙ ወልደሐና', role: 'የግብረገብ መምህር', group: 'primary', image: '/images/staff/staff-09.jpg' },
  { name: 'ኃይለ ሸዋንግዛው ብዙነህ', role: 'የቴክኒክ መምህር', group: 'primary', image: '/images/staff/staff-26.jpg' },
  { name: 'ቴዎድሮስ አሰፋ ከበደ', role: 'የሳይንስ መምህር', group: 'primary', image: '/images/staff/staff-23.jpg' },
  { name: 'ፍቅር ደሳለኝ ደምሴ', role: 'የሳይንስ መምህር', group: 'primary', image: '/images/staff/staff-52.jpg' },
  { name: 'አባ ገብረሥላሴ በላቸው አባተ', role: 'የእንግሊዝኛ ቋንቋ መምህር', group: 'primary', image: '/images/staff/staff-35.jpg' },
  { name: 'አባ ሀብተማርያም በፅሐ ጌታነህ', role: 'የሳይንስ መምህር', group: 'primary', image: '/images/staff/staff-31.jpg' },

  { name: 'እስራኤል አበባየሁ ተኮላ', role: 'የኬጂ መምህርት', group: 'kindergarten', image: '/images/staff/staff-41.jpg' },
  { name: 'ሲሳይ ዲንቁ ታደሰ', role: 'የኬጂ መምህርት', group: 'kindergarten', image: '/images/staff/staff-14.jpg' },
  { name: 'አበባዬ ካሳሁን ጋረደው', role: 'የኬጂ ርዕሰ መምህር', group: 'kindergarten', image: '/images/staff/staff-30.jpg' },
  { name: 'ሲሳይ ድንቁ', role: 'የኬጂ መምህርት', group: 'kindergarten', image: '/images/staff/staff-15.jpg' },
  { name: 'ወርቅነሽ ንጉሴ ቦጋለ', role: 'የኬጂ መምህርት', group: 'kindergarten', image: '/images/staff/staff-43.jpg' },
  { name: 'አስቴር ክፍሉ ለማ', role: 'የኬጂ መምህር', group: 'kindergarten', image: '/images/staff/staff-29.jpg' },
  { name: 'ፀሐይ ተድላ ወልደጻድቅ', role: 'የኬጂ መምህር', group: 'kindergarten', image: '/images/staff/staff-49.jpg' },
  { name: 'ቅድስት ሳቡሬ ባዪ', role: 'የኬጂ መምህር', group: 'kindergarten', image: '/images/staff/staff-21.jpg' },
  { name: 'ፀሐይ እሸቱ ከተማ', role: 'የኬጂ መምህር', group: 'kindergarten', image: '/images/staff/staff-51.jpg' },
  { name: 'ነፃነት ግርማ በየነ', role: 'የኬጂ ረዳት መምህር', group: 'kindergarten', image: '/images/staff/staff-27.jpg' },
  { name: 'ቸርነት ሀይሉ ወልዴ', role: 'የኬጂ ረዳት መምህርት', group: 'kindergarten', image: '/images/staff/staff-25.jpg' },
  { name: 'አርሴማዊት ለማ አጎናፍር', role: 'የኬጂ ረዳት መምህርት', group: 'kindergarten', image: '/images/staff/staff-28.jpg' },
  { name: 'ራሔል ቢፍቱ ረጋሳ', role: 'የኬጂ መምህርት', group: 'kindergarten', image: '/images/staff/staff-13.jpg' },
  { name: 'ስንታየሁ ደረሰ ወልዱ', role: 'የኬጂ ረዳት መምህር', group: 'kindergarten', image: '/images/staff/staff-18.jpg' },
  { name: 'ማርሸት ጥላሁን ገረሱ', role: 'የኬጂ ሞግዚት', group: 'kindergarten', image: '/images/staff/staff-10.jpg' },
  { name: 'መቅደስ ሐረገወይን ንጋቱ', role: 'የኬጂ ረዳት መምህር', group: 'kindergarten', image: '/images/staff/staff-07.jpg' },
  { name: 'ትህትና ተካ በዳሶ', role: 'የኬጂ ሞግዚት', group: 'kindergarten', image: '/images/staff/staff-24.jpg' },
  { name: 'ማርታ ማርቆስ ኃይሉ', role: 'የኬጂ ረዳት መምህርት', group: 'kindergarten', image: '/images/staff/staff-11.jpg' },
] as const satisfies ReadonlyArray<{
  name: string;
  role: string;
  group: SchoolStaffGroup;
  image: string;
}>;

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
