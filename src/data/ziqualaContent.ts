import abbaBirhanemeskelHailemariam from '../assets/leadership/abba-birhanemeskel-hailemariam.webp';
import misganawSolomon from '../assets/leadership/misganaw-solomon.webp';
import tadesseTesfaye from '../assets/leadership/tadesse-tesfaye.webp';
import teshomeBeyene from '../assets/leadership/teshome-beyene.webp';
import yosefTemesgen from '../assets/leadership/yosef-temesgen.webp';

export const ziqualaIdentity = {
  shortName: "copy.ziqualaAboSchool",
  fullName: "copy.ziqualaAboPrimarySchoolGrade18",
  schoolName: 'school.purpose.name',
  location: "copy.bishoftuKebele03",
  owner: "monastery.name",
  monasteryNameAm: "copy.ziqualaDebreKewakibtAbuneGebreMenfesKidusCommunalMonastery_251",
  monasteryNameEn: "monastery.name",
  motto: "copy.modernKnowledgeSpiritualWisdomAndResponsibleCitizenship",
} as const;

export const ziqualaBranches = [
  {
    id: 'bishoftu-kebele-03',
    name: "copy.mainCampus",
    location: "copy.bishoftuKebele03NearTokumaSchool",
    grades: 'Grade 1–8',
    enrollment: 1174,
  },
  {
    id: 'bishoftu-kebele-02',
    name: "copy.kebele02Branch",
    location: "copy.bishoftuKebele02AroundGizawuShayiBet",
    grades: 'KG 1–KG 3',
    enrollment: 360,
  },
] as const;

export const publicNavigation = [
  {
    label: "copy.home",
    to: '/',
    children: [
      { label: "copy.schoolMonastery", hash: '#destinations' },
      { label: "copy.overview_259", hash: '#home-overview' },
      { label: "copy.digitalBookshelf", hash: '#home-books' },
    ],
  },
  {
    label: "copy.school",
    to: '/school',
    children: [
      { label: "copy.visionMission", hash: '#school-purpose' },
      { label: "copy.boardLeadership", hash: '#school-leadership' },
      { label: "copy.schoolStaff", hash: '#school-staff' },
      { label: "copy.campuses", hash: '#school-campuses' },
    ],
  },
  {
    label: "copy.monastery",
    to: '/monastery',
    children: [
      { label: "copy.history", hash: '#monastery-history' },
      { label: "copy.museum", hash: '#monastery-museum' },
      { label: "copy.livelihoodProjects", hash: '#monastery-projects' },
      { label: "copy.historyFilm", hash: '#monastery-film' },
      { label: "copy.mediaArchive", hash: '#monastery-media' },
      { label: "copy.donate", hash: '#donate' },
      { label: "copy.contact", hash: '#monastery-contact' },
    ],
  },
  { label: "copy.eLearning", to: '/elearning', children: [] },
  { label: "contact.nav", to: '/contact', children: [] },
  { label: "copy.newsEvents_268", to: '/news', children: [] },
] as const;

export const socialLinks = [
  { label: "copy.ziqualaAboAcademy", href: 'https://t.me/gebreabo', platform: 'telegram' },
  { label: "copy.ziqualaAboMedia", href: 'https://t.me/ziquala05', platform: 'telegram' },
  { label: "copy.youTube", href: 'https://youtube.com/@ziqualaabomedia', platform: 'youtube' },
  { label: "copy.facebook", href: 'https://www.facebook.com/profile.php?id=61587078541651', platform: 'facebook' },
  { label: "copy.tikTok", href: 'https://www.tiktok.com/@ziquala.abo.media', platform: 'tiktok' },
] as const;

export const publicContact = {
  email: 'ziqualaabo@gmail.com',
  phoneDisplay: '+251 11 433 9350',
  phoneHref: 'tel:+251114339350',
  schoolAddress: 'contact.schoolAddress',
  monasteryAddress: 'contact.monasteryAddress',
  officeHours: 'contact.officeHours',
} as const;

export const monasteryContact = {
  ...publicContact,
  telegram: 'https://t.me/gebreabo',
  youtube: 'https://youtube.com/@ziqualaabomedia',
  facebook: 'https://www.facebook.com/profile.php?id=61587078541651',
} as const;

export const monasteryDonation = {
  bankName: "copy.commercialBankOfEthiopiaCBE",
  accountNumber: '1000011282222',
  schoolBankName: "copy.dashenBank",
  schoolAccountNumber: '5819907149011',
} as const;

export const monasteryDocumentContent = {
  overview: "monastery.overview.body",
  spiritualLife: "monastery.spiritualLife.body",
  conclusion: "monastery.legacy.body",
} as const;

export const monasteryDevelopmentProjects = [
  { title: "monastery.development.oil.title", body: "monastery.development.oil.body" },
  { title: "monastery.development.school.title", body: "monastery.development.school.body" },
  { title: "monastery.development.mill.title", body: "monastery.development.mill.body" },
  { title: "monastery.development.crafts.title", body: "monastery.development.crafts.body" },
  { title: "monastery.development.farming.title", body: "monastery.development.farming.body" },
] as const;

export const schoolDocumentContent = {
  vision: "school.vision.body",
  mission: "school.mission.body",
  values: ["school.values.character", "school.values.faith", "school.values.learning", "school.values.heritage", "school.values.skills"],
  abbotMessage: "school.abbotMessage.body",
  socialResponsibility: "school.socialResponsibility.body",
} as const;

export const annualCelebrations = [
  { title: "monastery.celebrations.gabreMenfesKidus.title", body: "monastery.celebrations.gabreMenfesKidus.body" },
  { title: "monastery.celebrations.kidaneMihret.title", body: "monastery.celebrations.kidaneMihret.body" },
  { title: "monastery.celebrations.filseta.title", body: "monastery.celebrations.filseta.body" },
] as const;

export const monasteryHistory = [
  {
    period: "copy.fromThe6thCentury",
    title: "copy.theOriginOfAntiquityAndCivilization",
    body: "copy.theFoundationOfDebreZqalaMonasteryIsAnAncientAndHistoricalRelicTh",
  },
  {
    period: "copy.theStruggleOfTheRighteous",
    title: "copy.theReConsecrationOfAbuneGebreSHolySpirit",
    body: "copy.inThe9thCenturyDuringTheReignOfJudithGuditManySpiritualRelicsWere",
  },
  {
    period: "copy.16th19thCenturies",
    title: "copy.tracesOfKingsAndArchitecture",
    body: "copy.inThe16thCenturyTheMonasterySufferedGreatDamageDuringTheInvasionO",
  },
  {
    period: "copy.19281933",
    title: "copy.aStoryOfTrialsPerseveranceAndMartyrdom",
    body: "copy.duringTheOccupationOfFascistItalyTheInvadingForceBombedTheMonaste",
  },
  {
    period: "copy.today",
    title: "copy.trustHistoryForTheNextGeneration",
    body: "copy.debreZqalaMonasteryTransmitsThousandsOfYearsOfSpiritualStrengthPa",
  },
] as const;

export const schoolBoardLeaders = [
  {
    name: "copy.mrTeshomeYeine",
    englishName: "copy.atoTeshomeBeyene",
    image: teshomeBeyene,
  },
  {
    name: "copy.thanksToDrSolomon",
    englishName: "copy.drMisganawSolomon",
    image: misganawSolomon,
  },
  {
    name: "copy.mrTadeseTesfaye",
    englishName: "copy.atoTadesseTesfaye",
    image: tadesseTesfaye,
  },
  {
    name: "copy.mrYosefTemesgen",
    englishName: "copy.atoYosefTemesgen",
    image: yosefTemesgen,
  },
] as const;

export const academicManagerProfile = {
  name: "copy.fatherBirhanemresHailemariam",
  englishName: "copy.abbaBirhanemeskelHailemariam",
  title: "copy.theAcademicManagerOfTheSchool",
  englishTitle: 'School Academic Manager',
  image: abbaBirhanemeskelHailemariam,
} as const;

export type SchoolStaffGroup = 'office' | 'primary' | 'kindergarten' | 'cleaning';

export const schoolStaff = [
  { name: "school.staff.abrahamKefyalew", role: "copy.schoolPrincipal", group: 'office', image: '/images/staff/staff-46.jpg' },
  { name: "copy.fatherGebretsadekHaileJesusYouAreMany", role: "copy.theManagerOfTheSchool", group: 'office', image: '/images/staff/staff-37.jpg' },
  { name: "copy.fatherBirhanemresHailemariam", role: "copy.theAcademicManagerOfTheSchool", group: 'office', image: '/images/staff/staff-33.jpg' },
  { name: "copy.fatherKenfemichaelWoldegiorgisTeklegiorgis", role: "copy.purchaser", group: 'office', image: '/images/staff/staff-34.jpg' },
  { name: "copy.firehiwotMarkosHailu", role: "copy.secretary", group: 'office', image: '/images/staff/staff-03.jpg' },
  { name: "copy.heDonatedTheWheat", role: "copy.librarian", group: 'office', image: '/images/staff/staff-19.jpg' },
  { name: "copy.shoalemAyaleuYemir", role: "copy.accountant", group: 'office', image: '/images/staff/staff-20.jpg' },

  { name: "copy.holyShoaferahuTilahun", role: "copy.artTeacher", group: 'primary', image: '/images/staff/staff-22.jpg' },
  { name: "copy.edenTekolaAgune", role: "copy.amharicTeacher", group: 'primary', image: '/images/staff/staff-40.jpg' },
  { name: "copy.abdisaAmenteSunday", role: "copy.theVicePrincipalOfTheSchool", group: 'primary', image: '/images/staff/staff-38.jpg' },
  { name: "copy.iBoughtTheNameMan", role: "copy.artTeacher_346", group: 'primary', image: '/images/staff/staff-16.jpg' },
  { name: "copy.belayineshSemagnKidane", role: "copy.amharicTeacher_348", group: 'primary', image: '/images/staff/staff-02.jpg' },
  { name: "copy.adisDestaKidane", role: "copy.iTTeacher", group: 'primary', image: '/images/staff/staff-01.jpg' },
  { name: "copy.mekonenTesema", role: "copy.mathematicsTeacher", group: 'primary', image: '/images/staff/staff-04.jpg' },
  { name: "copy.lordSprinkledCompensation", role: "copy.englishTeacher", group: 'primary', image: '/images/staff/staff-48.jpg' },
  { name: "copy.crownTimurgaBzani", role: "copy.mathematicsTeacher", group: 'primary', image: '/images/staff/staff-39.jpg' },
  { name: "copy.theRainWillComeAsItWill", role: "copy.amharicTeacher_348", group: 'primary', image: '/images/staff/staff-44.jpg' },
  { name: "copy.meklitDejeneExpanded", role: "copy.amharicTeacher_348", group: 'primary', image: '/images/staff/staff-08.jpg' },
  { name: "copy.religionSolomonDubale", role: "copy.englishTeacher", group: 'primary', image: '/images/staff/staff-05.jpg' },
  { name: "copy.yeshiemabetWasAppointed", role: "copy.societyAndCitizenshipTeacher", group: 'primary', image: '/images/staff/staff-45.jpg' },
  { name: "copy.seeYouWinner", role: "copy.mathematicsTeacher", group: 'primary', image: '/images/staff/staff-17.jpg' },
  { name: "copy.theSunBloomed", role: "copy.biologyTeacher", group: 'primary', image: '/images/staff/staff-50.jpg' },
  { name: "copy.gadisaShuguTufa", role: "copy.afaanOromooTeacher", group: 'primary', image: '/images/staff/staff-47.jpg' },
  { name: "copy.theStoryIsAsItIs", role: "copy.1stGradeSportsTeacher", group: 'primary', image: '/images/staff/staff-42.jpg' },
  { name: "copy.myHopeIsMagdalevit", role: "copy.sportsTeacher", group: 'primary', image: '/images/staff/staff-06.jpg' },
  { name: "copy.theOfficerSBrotherWoldhana", role: "copy.teacherOfAction", group: 'primary', image: '/images/staff/staff-09.jpg' },
  { name: "copy.haileShuanggezawYouAreMany", role: "copy.technicalTeacher", group: 'primary', image: '/images/staff/staff-26.jpg' },
  { name: "copy.teodorosAsefaKebede", role: "copy.scienceTeacher", group: 'primary', image: '/images/staff/staff-23.jpg' },
  { name: "copy.iLoveYou", role: "copy.scienceTeacher", group: 'primary', image: '/images/staff/staff-52.jpg' },
  { name: "copy.abaGebreslaseSaidAbate", role: "copy.englishTeacher_378", group: 'primary', image: '/images/staff/staff-35.jpg' },

  { name: "copy.israelAbayehuTekola", role: "copy.kGTeacher", group: 'kindergarten', image: '/images/staff/staff-41.jpg' },
  { name: "copy.sisayDinguIsRenewed", role: "copy.kGTeacher", group: 'kindergarten', image: '/images/staff/staff-14.jpg' },
  { name: "copy.myFlowerHasFallen", role: "copy.kGPrincipal", group: 'kindergarten', image: '/images/staff/staff-30.jpg' },
  { name: "copy.itSAmazing", role: "copy.kGTeacher", group: 'kindergarten', image: '/images/staff/staff-15.jpg' },
  { name: "copy.yourGoldenKingBogale", role: "copy.kGTeacher", group: 'kindergarten', image: '/images/staff/staff-43.jpg' },
  { name: "copy.estherTheRoom", role: "copy.kGTeacher_387", group: 'kindergarten', image: '/images/staff/staff-29.jpg' },
  { name: "copy.theSunIsHappyAndRighteous", role: "copy.kGTeacher_387", group: 'kindergarten', image: '/images/staff/staff-49.jpg' },
  { name: "copy.saintSabureBayi", role: "copy.kGTeacher_387", group: 'kindergarten', image: '/images/staff/staff-21.jpg' },
  { name: "copy.theCityOfSunSmell", role: "copy.kGTeacher_387", group: 'kindergarten', image: '/images/staff/staff-51.jpg' },
  { name: "copy.freedomIsGlorious", role: "copy.kGAssistantTeacher", group: 'kindergarten', image: '/images/staff/staff-27.jpg' },
  { name: "copy.kindnessIsThePowerMySon", role: "copy.kGAssistantTeacher_394", group: 'kindergarten', image: '/images/staff/staff-25.jpg' },
  { name: "copy.arsemaiteLemaAgonafir", role: "copy.kGAssistantTeacher_394", group: 'kindergarten', image: '/images/staff/staff-28.jpg' },
  { name: "copy.rachelBiftuCalmDown", role: "copy.kGTeacher", group: 'kindergarten', image: '/images/staff/staff-13.jpg' },
  { name: "copy.theSonArrivedWhenWeSawEachOther", role: "copy.kGAssistantTeacher", group: 'kindergarten', image: '/images/staff/staff-18.jpg' },
  { name: "copy.onTheMorningOfTheDayTheyBuriedTheirShadow", role: "copy.kGTutor", group: 'kindergarten', image: '/images/staff/staff-10.jpg' },
  { name: "copy.theMorningOfTheTemple", role: "copy.kGAssistantTeacher", group: 'kindergarten', image: '/images/staff/staff-07.jpg' },
  { name: "copy.humilityReplacedByDaso", role: "copy.kGTutor", group: 'kindergarten', image: '/images/staff/staff-24.jpg' },
  { name: "copy.martaMarkosPower", role: "copy.kGAssistantTeacher_394", group: 'kindergarten', image: '/images/staff/staff-11.jpg' },
] as const satisfies ReadonlyArray<{
  name: string;
  role: string;
  group: SchoolStaffGroup;
  image: string;
}>;

export const eLearningCollections = [
  {
    grade: "copy.grades16",
    title: "copy.environmentalScience",
    description: "copy.teacherGuidesAndCurriculumAlignedEnvironmentalScienceMaterialInAm",
    audience: "copy.teachers",
  },
  {
    grade: "copy.grades38",
    title: "copy.englishLanguage",
    description: "copy.englishTeacherGuidesAndSupportingClassroomMaterialOrganizedByGrad",
    audience: "copy.teachers",
  },
  {
    grade: "copy.grades56",
    title: "copy.mathematics",
    description: "copy.mathematicsTextbooksSyllabiAndTeacherGuidesInMultipleLanguages",
    audience: "copy.studentsTeachers",
  },
  {
    grade: "copy.grades26",
    title: "copy.civicsMoralEducation",
    description: "copy.learningMaterialFocusedOnCharacterCitizenshipValuesAndResponsibil",
    audience: "copy.studentsTeachers",
  },
  {
    grade: "copy.grades68",
    title: "copy.careerTechnicalEducation",
    description: "copy.studentTextbooksAndTeacherGuidesSupportingPracticalAndTechnicalLe",
    audience: "copy.studentsTeachers",
  },
  {
    grade: "copy.schoolWide",
    title: "copy.academicPlanning",
    description: "copy.annualPlansWeeklyPlansAssessmentGuidanceSchedulesAndAcademicTempl",
    audience: "copy.academicStaff",
  },
] as const;

export const portalRoles = [
  "copy.superAdmin",
  "copy.academicManager",
  "copy.schoolAdmin",
  "copy.vicePrincipal",
  "copy.teacher",
  "copy.librarian",
  "copy.parent",
  "copy.student",
] as const;
