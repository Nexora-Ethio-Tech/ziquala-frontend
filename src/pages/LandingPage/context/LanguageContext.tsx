import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "am" | "or";

export interface ProgramItem {
  title: string;
  desc: string;
  img: string;
}

export interface StudentItem {
  name: string;
  achievement: string;
  message: string;
  img: string;
}

export interface StatItemData {
  value: string;
  label: string;
  final: string;
}

export interface AboutLeader {
  name: string;
  role: string;
  message: string;
  img: string;
}

export interface AboutValue {
  title: string;
  desc: string;
}

export interface TranslationSchema {
  nav: {
    home: string;
    about: string;
    programs: string;
    schoolLife: string;
    branches: string;
    menu: string;
  };
  hero: {
    welcome: string;
    title: string;
    subtitlePrefix: string;
    subtitleExcellence: string;
    subtitleSuffix: string;
    scroll: string;
  };
  founder: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    quote: string;
    button: string;
    name: string;
    role: string;
  };
  stats: {
    badge: string;
    title: string;
    items: StatItemData[];
  };
  programs: {
    desc: string;
    title: string;
    items: ProgramItem[];
    label: string;
  };
  studentBook: {
    title: string;
    subtitle: string;
    coverTitle: string;
    coverSubtitle: string;
    coverEdition: string;
    legacyTitle: string;
    legacyDesc: string;
    students: StudentItem[];
    classOf: string;
    endOfVolume: string;
    futureAwaits: string;
  };
  cta: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    desc: string;
    button: string;
  };
  about: {
    hero: {
      title: string;
      subtitle: string;
    };
    foundersTitle: string;
    directorsTitle: string;
    leaders: {
      girma: AboutLeader;
      aberash: AboutLeader;
      yodit: AboutLeader;
    };
    difference: {
      title: string;
      subtitle: string;
      values: {
        integrity: AboutValue;
        leadership: AboutValue;
        growth: AboutValue;
        learning: AboutValue;
      };
    };
    missionVision: {
      title: string;
      visionTitle: string;
      visionDesc: string;
      missionTitle: string;
      missionDesc: string;
    };
    promise: {
      title: string;
      desc: string;
    };
  };
  programsPage: {
    title: string;
    desc: string;
    kgTitle: string;
    kgDesc: string;
    primaryTitle: string;
    primaryDesc: string;
    middleTitle: string;
    middleDesc: string;
    highTitle: string;
    highDesc: string;
    oromoTitle: string;
    oromoDesc: string;
  };
  schoolLifePage: {
    title: string;
    desc: string;
    clubsTitle: string;
    clubsDesc: string;
    scienceClubTitle: string;
    scienceClubDesc: string;
    debateClubTitle: string;
    debateClubDesc: string;
    artClubTitle: string;
    artClubDesc: string;
    sportsTitle: string;
    sportsDesc: string;
    charityTitle: string;
    charityDesc: string;
    uniformTitle: string;
    uniformDesc: string;
  };
  branchesPage: {
    title: string;
    desc: string;
    mainTitle: string;
    mainAddr: string;
    mainContact: string;
    primaryTitle: string;
    primaryAddr: string;
    primaryContact: string;
    cityTitle: string;
    cityAddr: string;
    cityContact: string;
    townTitle: string;
    townAddr: string;
    townContact: string;
    directorLabel: string;
  };
}

const translations: Record<Language, TranslationSchema> = {
  en: {
    nav: {
      home: "Home",
      about: "About",
      programs: "Programs",
      schoolLife: "School Life",
      branches: "Branches",
      menu: "Menu",
    },
    hero: {
      welcome: "Welcome to",
      title: "Abdi Adama",
      subtitlePrefix: "Planting seeds of ",
      subtitleExcellence: "excellence",
      subtitleSuffix: " today.",
      scroll: "Scroll",
    },
    founder: {
      badge: "Our Foundation",
      titleLine1: "Message from",
      titleLine2: "the Founders",
      quote: "Abdi Adama School was established in 1998 E.C. (2005/2006 G.C.) with a dream to create a place where children feel seen, supported, and encouraged to discover their full potential. To build the future of our children, we must plant the seeds of excellence today.",
      button: "Read more ..",
      name: "Ato Girma Lemi",
      role: "Founder & Owner",
    },
    stats: {
      title: "Our Impact",
      items: [
        { value: "7,600", label: "Students", final: "+" },
        { value: "362", label: "Qualified Teachers", final: "+" },
        { value: "18", label: "Clubs & Activities", final: "+" },
        { value: "4", label: "School Branches", final: "" },
      ],
      badge: ""
    },
    programs: {
      items: [
        {
          title: "Excellence in Education",
          desc: "We nurture young minds from kindergarten through grade 12 with a well-rounded curriculum that balances academics, arts, and sports. Our goal is to help each student reach their full potential and develop a lifelong love for learning.",
          img: "grad.jpg",
        },
        {
          title: "Extracurriculars",
          desc: "Beyond the classroom, we offer a wide range of clubs, sports, and activities that help students explore their interests and develop robust leadership and teamwork skills.",
          img: "/team.jpg",
        },
        {
          title: "Learner-Centered",
          desc: "Our curriculum is designed to build strong academic foundations while encouraging curiosity and creativity. We focus on core subjects such as Mathematics, English, Science, Amharic, ICT, and Social Studies.",
          img: "/school.png",
        },
      ],
      label: "Program",
      desc: "",
      title: ""
    },
    studentBook: {
      title: "Student Achievements",
      subtitle: "Scroll to turn the pages.",
      coverTitle: "The Book",
      coverSubtitle: "Of Excellence",
      coverEdition: "2025 Edition",
      legacyTitle: "Our 2025 Legacy",
      legacyDesc: "Our students achieved an unprecedented 98% pass rate in the national exams, with 15 students ranking in the top 100 nationwide. This milestone reflects our commitment to academic excellence.",
      students: [
        {
          name: "Firdos Musa",
          achievement: "Top Scorer - National Exams",
          message: "Hard work, patience, and prayer have guided my journey. I thank Abdi Adama School for giving me the chance to discover my potential and grow into someone who believes in possibilities.",
          img: "/school.png",
        },
        {
          name: "Fuad Abdella",
          achievement: "Excellence in Sciences",
          message: "Hard work and faith brought me here. I'm proud to represent Abdi Adama School and thankful for my teachers' constant support throughout these years.",
          img: "/school.png",
        },
        {
          name: "Saron Leulseged",
          achievement: "Outstanding Leadership",
          message: "I thank my family for believing in me and Abdi Adama School for shaping that belief into achievement. With their support, I have learned that dreams come true through learning and discipline.",
          img: "/school.png",
        },
      ],
      classOf: "Class of 2025",
      endOfVolume: "End of Volume",
      futureAwaits: "Your Future Awaits",
    },
    cta: {
      badge: "Admissions Open",
      titleLine1: "Your Future",
      titleLine2: "Starts Here.",
      desc: "Build your future with an institution dedicated to shaping leaders, innovators, and creators of tomorrow.",
      button: "Apply Now",
    },
    about: {
      hero: {
        title: "Our Story",
        subtitle: "Dedicated to nurturing academic excellence, strong moral character, and fearlessness.",
      },
      foundersTitle: "Founders Welcome Message",
      directorsTitle: "Welcome Message from the Director",
      leaders: {
        girma: {
          name: "Mr. GIRMA LEMI",
          role: "Co-Founder & Owner",
          message: "welcome to abdi adama school, a place built from our shared belief that every child deserves an environment where learning feels inspiring, meaningful, and joyful. when we founded abdi adama school, our dream was to create a place where children feel seen, supported, and encouraged to discover their full potential. we wanted a school that goes beyond textbooks — a place where curiosity is welcomed, kindness is practiced, and learning feels alive. seeing our students grow in confidence and character has been our greatest achievement, and we remain committed to nurturing every child with care and purpose.",
          img: "/school.png",
        },
        aberash: {
          name: "Ms. ABERASH ESHETU",
          role: "Co-Founder & Owner",
          message: "As one of the founders, I share a deep belief that education has the power to transform lives and shape better communities In our country. We founded this school to offer a strong foundation rooted in values, discipline, and creativity. Our vision is to inspire each student to think boldly, act responsibly, and dream fearlessly. we thank every parent, teacher, and student who has joined us on this journey — together, we continue building a brighter future for our community.",
          img: "/school.png",
        },
        yodit: {
          name: "Ms. YODIT YOHANNES",
          role: "School Director",
          message: "It is my pleasure to welcome you to abdi adama school, where every student is guided with care, respect, and high expectations. our mission is to create a safe and supportive learning atmosphere where each child can develop academically, socially, and emotionally. we work closely with families and our dedicated team of teachers to ensure that students receive the best opportunities to explore their potential. thank you for choosing to be part of our school community. together, we look forward to shaping strong minds, positive values, and bright futures.",
          img: "/school.png",
        },
      },
      difference: {
        title: "What makes us different",
        subtitle: "our culture & our values",
        values: {
          integrity: {
            title: "integrity",
            desc: "At Abdi Adama School we believe in doing what is right — always. our community encourages honesty, responsibility and respect. we help students build strong moral character that guides them for life.",
          },
          leadership: {
            title: "leadership",
            desc: "Every student has the ability to lead. through teamwork, projects and school activities, we help learners build confidence, empathy and the courage to inspire others.",
          },
          growth: {
            title: "growth & success",
            desc: "Success is not only about grades — it is about growth. In Abdi Adama we teach students to set goals, work hard, learn from challenges, and believe in their own potential.",
          },
          learning: {
            title: "lifelong learning",
            desc: "Learning does not end in the classroom. we encourage curiosity, creativity and exploration — helping students become lifelong learners ready for an ever-changing world.",
          },
        },
      },
      missionVision: {
        title: "mission & vision",
        visionTitle: "Vision",
        visionDesc: "To provide meaningful, modern and value-based education that prepares students to become confident thinkers, problem-solvers and leaders — ready to contribute to the future of ethiopia and the world.",
        missionTitle: "Mission",
        missionDesc: "To be recognized as a leading school where academic excellence meets strong character development. we proudly teach with international quality while honoring ethiopian culture, identity and tradition.",
      },
      promise: {
        title: "Our Promise to Parents",
        desc: "At Abdi Adama school, we understand that you are placing great trust in us when you choose our school for your child. We promise to provide a safe, respectful, and encouraging environment where every student is guided to grow academically, emotionally, socially, and morally. We believe in open communication and partnership with parents, because we know that education is most effective when school and family work together. We are committed to nurturing confidence, curiosity, discipline, and strong values in every student, while ensuring that each child is seen, heard, and supported every step of the way. your child’s success is our shared goal, and we will always work with dedication and integrity to help them reach their full potential.",
      },
    },
    programsPage: {
      title: "Academic Programs",
      desc: "Our carefully structured academic pathways are designed to nurture potential at every developmental stage.",
      kgTitle: "Kindergarten (KG)",
      kgDesc: "A warm, creative environment focused on early literacy, sensory exploration, and motor skills.",
      primaryTitle: "Primary School (Grades 1-8)",
      primaryDesc: "Building strong foundational competence in Mathematics, Sciences, English, Amharic, and Afaan Oromo.",
      middleTitle: "Middle School (Grades 7-8)",
      middleDesc: "Encouraging critical thinking, scientific curiosity, independent research, and collaborative sports.",
      highTitle: "Secondary School (Grades 9-12)",
      highDesc: "Pre-university curriculum with advanced STEM courses, test preparation, and career mentorship.",
      oromoTitle: "Afaan Oromo Native Medium",
      oromoDesc: "A historic pioneer program in Adama. We enable students to master mathematics and science in their native tongue, ensuring cultural connection and cognitive excellence."
    },
    schoolLifePage: {
      title: "School Life & Culture",
      desc: "An exciting environment beyond academics where students develop character, leadership, and lifelong passions.",
      clubsTitle: "Student Clubs",
      clubsDesc: "Students participate in various interest-based clubs to build friendships and expand their horizons.",
      scienceClubTitle: "Science & ICT Club",
      scienceClubDesc: "Unlocking innovation through hands-on coding, computer science labs, and scientific experimentation.",
      debateClubTitle: "Debate & Public Speaking",
      debateClubDesc: "Nurturing logic, persuasion, and self-confidence to empower the voices of tomorrow's leaders.",
      artClubTitle: "Art & Cultural Heritage",
      artClubDesc: "Celebrating rich Ethiopian traditions through visual arts, poetry, music, and dramatic performances.",
      sportsTitle: "Sports & Athletics",
      sportsDesc: "Building physical health and teamwork through competitive Football, Basketball, Volleyball, and Track.",
      charityTitle: "Community Responsibility",
      charityDesc: "Developing empathy and social responsibility. Our students participate in school-organized initiatives that distribute meals, books, and supplies to families in need within Adama.",
      uniformTitle: "Uniform & Pride",
      uniformDesc: "Our uniform represents discipline, neatness, and unity. Students wear it proudly as representatives of the Abdi Adama legacy."
    },
    branchesPage: {
      title: "Our Campus Branches",
      desc: "Operating four custom facilities across the region to bring high-quality, value-based education closer to you.",
      mainTitle: "Main Campus & High School",
      mainAddr: "Adama City, Oromia, Ethiopia (Admin Hub)",
      mainContact: "+251 (0) 22 111 2233",
      primaryTitle: "Primary & Junior Campus",
      primaryAddr: "Central Adama, Oromia, Ethiopia (Grades KG-8)",
      primaryContact: "+251 (0) 22 111 4455",
      cityTitle: "City-Center Branch",
      cityAddr: "Bole Area, Adama, Ethiopia (KG-Grade 6)",
      cityContact: "+251 (0) 22 111 6677",
      townTitle: "Town Border Campus",
      townAddr: "Outer Adama Region, Ethiopia (KG-Grade 8)",
      townContact: "+251 (0) 22 111 8899",
      directorLabel: "Directing Lead"
    },
  },
  am: {
    nav: {
      home: "ዋና ገጽ",
      about: "ስለ እኛ",
      programs: "ፕሮግራሞች",
      schoolLife: "የትምህርት ቤት ሕይወት",
      branches: "ቅርንጫፎች",
      menu: "ምናሌ",
    },
    hero: {
      welcome: "እንኳን ወደ",
      title: "አብዲ አዳማ",
      subtitlePrefix: "የ",
      subtitleExcellence: "ብልህነትና የስኬት",
      subtitleSuffix: " ዘርን ዛሬ እንተክላለን።",
      scroll: "ወደ ታች ይሸብልሉ",
    },
    founder: {
      badge: "መሠረታችን",
      titleLine1: "መልዕክት ከ",
      titleLine2: "መሥራቾቹ",
      quote: "የአብዲ አዳማ ትምህርት ቤት በ1998 ዓ.ም የተመሠረተው ሕፃናት የሚታዩበት፣ የሚደገፉበት እና ሙሉ አቅማቸውን እንዲያወጡ የሚበረታቱበትን ቦታ የመፍጠር ህልም ይዞ ነው። የልጆቻችንን መጻኢ ዕድል ለመገንባት፣ ዛሬ የስኬትን ዘር መዝራት አለብን።",
      button: "ታሪካችንን ይመልገቱ",
      name: "አቶ ግርማ ለሚ",
      role: "መሥራች እና ባለቤት",
    },
    stats: {
      title: "ተጽዕኖአችን",
      items: [
        { value: "7,600", label: "ተማሪዎች", final: "+" },
        { value: "362", label: "ብቁ መምህራን", final: "+" },
        { value: "18", label: "ክበባት እና እንቅስቃሴዎች", final: "+" },
        { value: "4", label: "የትምህርት ቤት ቅርንጫፎች", final: "" },
      ],
      badge: ""
    },
    programs: {
      items: [
        {
          title: "ምርጥ የትምህርት ጥራት",
          desc: "ከመዋለ ሕፃናት እስከ 12ኛ ክፍል ያሉ ወጣት አእምሮዎችን አካዳሚክ፣ ሥነ-ጥበብ እና ስፖርትን ባካተተ ሁለንተናዊ ሥርዓተ-ትምህርት እናሳድጋለን። ግባችን እያንዳንዱ ተማሪ ሙሉ አቅሙ ላይ እንዲደርስ እና ለዕውቀት ፍቅር እንዲኖረው መርዳት ነው።",
          img: "grad.jpg",
        },
        {
          title: "ተጫማሪ እንቅስቃሴዎች",
          desc: "ከተለመደው የክፍል ትምህርት ባሻገር፣ ተማሪዎች ፍላጎቶቻቸውን እንዲያሳድጉ፣ የአመራር እና የቡድን ሥራ ክህሎቶችን እንዲያዳብሩ ሰፊ የክበባት፣ የስፖርት እና የፈጠራ ሥራዎችን እናቀርባለን።",
          img: "/team.jpg",
        },
        {
          title: "ተማሪ-ተኮር ትምህርት",
          desc: "ሥርዓተ-ትምህርታችን ጠንካራ አካዳሚክ መሠረት ለመገንባት እና የማወቅ ጉጉትን ለማነሳሳት የተነደፈ ነው። እንደ ሂሳብ፣ እንግሊዝኛ፣ ሳይንስ፣ አማርኛ፣ አይሲቲ እና ማኅበራዊ ጥናቶች ባሉ ዋና ዋና ትምህርቶች ላይ እናተኩራለን።",
          img: "/school.png",
        },
      ],
      label: "ፕሮግራም",
      desc: "",
      title: ""
    },
    studentBook: {
      title: "የተማሪዎች ስኬት",
      subtitle: "ገጾቹን ለማጋለጥ ወደ ታች ይሸብልሉ",
      coverTitle: "መጽሐፉ",
      coverSubtitle: "የስኬት መጽሐፍ",
      coverEdition: "የ2024 ዕትም",
      legacyTitle: "የ2024 ውርሳችን",
      legacyDesc: "ተማሪዎቻችን በብሔራዊ ፈተና 98% ማለፊያ በማምጣት ታይቶ የማይታወቅ ስኬት አስመዝግበዋል፣ 15 ተማሪዎች በሀገር አቀፍ ደረጃ በምርጥ 100 ውስጥ ተካተዋል። ይህ ስኬት ለትምህርት ጥራት ያለንን ቁርጠኝነት ያሳያል።",
      students: [
        {
          name: "ፊርዶስ ሙሳ",
          achievement: "ከፍተኛ ውጤት አስመዝጋቢ - ብሔራዊ ፈተና",
          message: "ጠንካራ ሥራ፣ ትዕግሥት እና ጸሎት መንገዴን መርተውታል። አቅሜን እንዳውቅና በምኞቶቼ እንዳምን ዕድል ስለሰጠኝ የአብዲ አዳማ ትምህርት ቤትን አመሰግናለሁ።",
          img: "/school.png",
        },
        {
          name: "ፉአድ አብደላ",
          achievement: "በሳይንስ ትምህርቶች የላቀ ውጤት",
          message: "ትጋትና እምነት እዚህ አድርሰውኛል። አብዲ አዳማ ትምህርት ቤትን በመወከሌ ኩራት ይሰማኛል፣ ለመምህራኖቼም ላደረጉልኝ ተከታታይ ድጋፍ አመሰግናለሁ።",
          img: "/school.png",
        },
        {
          name: "ሳሮን ሌውልሰገድ",
          achievement: "የላቀ የአመራር ብቃት",
          message: "በእኔ ስላመኑ ቤተሰቦቼን እና ያንን እምነት ወደ ስኬት ለቀየረው አብዲ አዳማ ትምህርት ቤት ምስጋናዬ የላቀ ነው። በትምህርት እና በሥነ-ምግባር ህልሞች እውን እንደሚሆኑ ተምሬያለሁ።",
          img: "/school.png",
        },
      ],
      classOf: "የ2024 ምሩቃን",
      endOfVolume: "የመጽሐፉ ማጠቃለያ",
      futureAwaits: "መጻኢ ዕድልዎ ይጠብቅዎታል",
    },
    cta: {
      badge: "ምዝገባ ተጀምሯል",
      titleLine1: "የተሻለ መጻኢ",
      titleLine2: "እዚህ ይጀምራል።",
      desc: "ነገን የሚመሩ፣ አዳዲስ ነገሮችን የሚፈጥሩ መሪዎችን ለማፍራት በተዘጋጀው ትምህርት ቤታችን የወደፊት ሕይወትዎን ይገንቡ።",
      button: "አሁኑኑ ያመልክቱ",
    },
    about: {
      hero: {
        title: "ታሪካችን",
        subtitle: "የትምህርት ጥራት፣ ጠንካራ ሥነ-ምግባር እና ደፋርነትን ለማሳደግ የተነደፈ።",
      },
      foundersTitle: "መልዕክት ከመሥራቾቹ",
      directorsTitle: "መልዕክት ከትምህርት ቤቱ ዳይሬክተር",
      leaders: {
        girma: {
          name: "አቶ ግርማ ለሚ",
          role: "ተባባሪ መሥራች እና ባለቤት",
          message: "እያንዳንዱ ልጅ መማር አነቃቂ፣ ትርጉም ያለው እና አስደሳች ወደሆነበት አካባቢ መምጣት ይገባዋል ከሚለው የጋራ እምነታችን ወደተገነባው የአብዲ አዳማ ትምህርት ቤት እንኳን በደህና መጡ። የአብዲ አዳማ ትምህርት ቤትን ስንመሠርት ህልማችን ልጆች የሚታዩበት፣ የሚደገፉበት እና ሙሉ አቅማቸውን እንዲያወጡ የሚበረታቱበትን ቦታ መፍጠር ነበር። ከመማሪያ መጽሐፍት በላይ የሚሄድ ትምህርት ቤት ፈልገን ነበር — የማወቅ ጉጉት የሚቀበልበት፣ ደግነት የሚተገበርበት እና መማር ሕያው የሚሆንበት። ተማሪዎቻችን በራስ መተማመን እና ባህሪ ሲያድጉ ማየት ትልቁ ስኬታችን ነው፣ እናም እያንዳንዱን ልጅ በጥንቃቄ እና በዓላማ ለማሳደግ ቁርጠኞች ነን።",
          img: "/school.png",
        },
        aberash: {
          name: "ወ/ሮ አበራሽ እሸቱ",
          role: "ተባባሪ መሥራች እና ባለቤት",
          message: "እንደ አንዱ መሥራች፣ ትምህርት በሀገራችን ህይወትን የመለወጥ እና የተሻሉ ማህበረሰቦችን የመቅረጽ ኃይል አለው የሚል ጥልቅ እምነት አለኝ። ይህንን ትምህርት ቤት የመሠረትነው በእሴቶች፣ በዲሲፕሊን እና በፈጠራ ላይ የተመሠረተ ጠንካራ መሠረት ለመስጠት ነው። ራእያችን እያንዳንዱ ተማሪ ደፋር እንዲያስብ፣ በኃላፊነት ስሜት እንዲሠራ እና ያለ ፍርሃት እንዲያልም ማነሳሳት ነው። በዚህ ጉዞ ላይ አብረውን ለተቀላቀሉ ለእያንዳንዱ ወላጅ፣ መምህር እና ተማሪ እናመሰግናለን — አብረን፣ ለማህበረሰባችን ብሩህ የወደፊት ሁኔታ መገንባታችንን እንቀጥላለን።",
          img: "/school.png",
        },
        yodit: {
          name: "ወ/ሮ ዮዲት ዮሐንስ",
          role: "የትምህርት ቤቱ ዳይሬክተር",
          message: "እያንዳንዱ ተማሪ በትጋት፣ በአክብሮት እና በከፍተኛ ጥበቃ በሚመራበት በአብዲ አዳማ ትምህርት ቤት እንኳን በደህና መጡ ለማለት ደስ ይለኛል። ዓላማችን እያንዳንዱ ልጅ በአካዳሚክ፣ በማህበራዊ እና በስሜታዊነት እንዲያድግ ደህንነቱ የተጠበቀ እና ድጋፍ ሰጪ የትምህርት ሁኔታ መፍጠር ነው። ተማሪዎች አቅማቸውን ለመመርመር የተሻሉ እድሎችን እንዲያገኙ ከቤተሰቦች እና ከወሰኑ መምህራኖቻችን ጋር በቅርበት እንሰራለን። የማህበረሰባችን አካል ለመሆን ስለመረጡ እናመሰግናለን። አብረን፣ ጠንካራ አእምሮዎችን፣ አወንታዊ እሴቶችን እና ብሩህ የወደፊት ህይወትን ለመቅረጽ እንጠብቃለን።",
          img: "/school.png",
        },
      },
      difference: {
        title: "የሚለየን ምንድን ነው?",
        subtitle: "ባህላችን እና እሴቶቻችን",
        values: {
          integrity: {
            title: "ታማኝነት",
            desc: "በአብዲ አዳማ ትምህርት ቤት ሁል ጊዜ ትክክለኛውን ነገር ማድረግ እናምናለን። ማህበረሰባችን ታማኝነትን፣ ኃላፊነትን እና አክብሮትን ያበረታታል። ተማሪዎች በሕይወታቸው ውስጥ የሚመራቸውን ጠንካራ የሥነ-ምግባር ባህሪ እንዲገነቡ እንረዳቸዋለን።",
          },
          leadership: {
            title: "አመራር",
            desc: "እያንዳንዱ ተማሪ የመምራት ብቃት አለው። በቡድን ሥራ፣ በፕሮጀክቶች እና በትምህርት ቤት እንቅስቃሴዎች ተማሪዎች በራስ መተማመንን፣ ርህራሄን እና ሌሎችን የማነሳሳት ድፍረትን እንዲገነቡ እንረዳቸዋለን።",
          },
          growth: {
            title: "እድገት እና ስኬት",
            desc: "ስኬት ስለ ውጤት ብቻ አይደለም — ስለ እድገትም ጭምር ነው። በአብዲ አዳማ ተማሪዎችን ግብ እንዲያወጡ፣ ጠንክረው እንዲሰሩ፣ ከችግሮች እንዲማሩ እና በራሳቸው አቅም እንዲያምኑ እናስተምራለን።",
          },
          learning: {
            title: "ቀጣይነት ያለው ትምህርት",
            desc: "መማር በክፍል ውስጥ አያበቃም። ተማሪዎች በየጊዜው ለሚለዋወጠው ዓለም ዝግጁ የሆኑ ቀጣይነት ያለው ተማሪ እንዲሆኑ የማወቅ ጉጉትን፣ ፈጠራን እና ፍለጋን እናበረታታለን።",
          },
        },
      },
      missionVision: {
        title: "ተልዕኮ እና ራዕይ",
        visionTitle: "ራዕይ",
        visionDesc: "ተማሪዎች በራስ መተማመን ያላቸው አሳቢዎች፣ ችግር ፈቺዎች እና መሪዎች እንዲሆኑ የሚያዘጋጅ ትርጉም ያለው፣ ዘመናዊ እና እሴት-ተኮር ትምህርት ለመስጠት — ለኢትዮጵያ እና ለዓለም የወደፊት ዕድገት አስተዋጽኦ ለማድረግ ዝግጁ እንዲሆኑ።",
        missionTitle: "ተልዕኮ",
        missionDesc: "የአካዳሚክ ልህቀት ከጠንካራ ባህሪ ግንባታ ጋር የሚገናኝበት ግንባር ቀደም ትምህርት ቤት ለመሆን። የኢትዮጵያን ባህል፣ ማንነት እና ወግ እያከበርን በአለም አቀፍ ጥራት በኩራት እናስተምራለን።",
      },
      promise: {
        title: "ለወላጆች የገባነው ቃል",
        desc: "በአብዲ አዳማ ትምህርት ቤት ለልጅዎ ትምህርት ቤታችንን ሲመርጡ ታላቅ እምነት እየጣሉብን እንደሆነ እንረዳለን። እያንዳንዱ ተማሪ በአካዳሚክ፣ በስሜታዊነት፣ በማህበራዊ እና በስነ-ምግባር እንዲያድግ ደህንነቱ የተጠበቀ፣ አክብሮት የተሞላበት እና አበረታች አካባቢ ለመስጠት ቃል እንገባለን። ክፍት ግንኙነት እና ከወላጆች ጋር አጋርነት እናምናለን፣ ምክንያቱም ትምህርት ቤት እና ቤተሰብ አብረው ሲሰሩ ትምህርት እጅግ ውጤታማ እንደሚሆን እናውቃለን። እያንዳንዱ ልጅ በየመንገዱ መታየቱን፣ መሰማቱን እና መደገፉን እያረጋገጥን እያንዳንዱ ተማሪ በራስ መተማመን፣ የማወቅ ጉጉት፣ ዲሲፕሊን እና ጠንካራ እሴቶችን እንዲያዳብር ቁርጠኞች ነን። የልጅዎ ስኬት የጋራ ግባችን ነው፣ እናም ሙሉ አቅማቸውን እንዲያሳኩ ለመርዳት ሁል ጊዜ በትጋት እና በታማኝነት እንሰራለን።",
      },
    },
    programsPage: {
      title: "የትምህርት ፕሮግራሞች",
      desc: "ልጆቻችን በእያንዳንዱ የእድገት ደረጃ አቅማቸውን እንዲያወጡ በጥንቃቄ የተቀረጹ የትምህርት መንገዶች።",
      kgTitle: "መዋለ ሕጻናት (KG)",
      kgDesc: "የመጀመሪያ ደረጃ ማንበብና መጻፍ፣ የስሜት ህዋሳት ማነቃቂያ እና የእንቅስቃሴ ክህሎቶች ላይ ትኩረት ያደረገ አስደሳች አካባቢ።",
      primaryTitle: "አንደኛ ደረጃ ትምህርት ቤት (ከ1-8ኛ ክፍል)",
      primaryDesc: "በሂሳብ፣ በሳይንስ፣ በእንግሊዝኛ፣ በአማርኛ እና በአፋን ኦሮሞ ቋንቋዎች ጠንካራ መሰረታዊ ብቃትን መገንባት።",
      middleTitle: "መካከለኛ ደረጃ ትምህርት ቤት (ከ7-8ኛ ክፍል)",
      middleDesc: "ሂሳዊ አስተሳሰብን፣ የሳይንስ የማወቅ ጉጉትን፣ ገለልተኛ ምርምርን እና የቡድን ስፖርቶችን ማበረታታት።",
      highTitle: "ሁለተኛ ደረጃ ትምህርት ቤት (ከ9-12ኛ ክፍል)",
      highDesc: "ከፍተኛ የSTEM ኮርሶችን፣ የብሄራዊ ፈተና ዝግጅትን እና የስራ ሙያ ምክርን ያካተተ ለዩኒቨርሲቲ ዝግጅት የሚሆን ስርአተ ትምህርት።",
      oromoTitle: "የአፋን ኦሮሞ የአፍ መፍቻ ቋንቋ ትምህርት",
      oromoDesc: "በአዳማ ከተማ ፈር ቀዳጅ የሆነ ታሪካዊ ፕሮግራም። ተማሪዎች ሂሳብ እና ሳይንስን በአፍ መፍቻ ቋንቋቸው እንዲማሩ በማድረግ የባህል ትስስርን እና የላቀ የእውቀት ብቃትን እናረጋግጣለን።"
    },
    schoolLifePage: {
      title: "የትምህርት ቤት ህይወት እና ባህል",
      desc: "ተማሪዎች ከክፍል ትምህርት ውጭ ስነ-ምግባርን፣ መሪነትን እና የህይወት ዘመን ፍላጎቶችን የሚያዳብሩበት አስደሳች አካባቢ።",
      clubsTitle: "የተማሪዎች ክበባት",
      clubsDesc: "ተማሪዎች ጓደኝነትን ለመገንባት እና እውቀታቸውን ለማስፋት በተለያዩ የፍላጎት ክበባት ውስጥ ይሳተፋሉ።",
      scienceClubTitle: "የሳይንስ እና አይሲቲ ክበብ",
      scienceClubDesc: "በኮዲንግ፣ በኮምፒውተር ሳይንስ ላቦራቶሪዎች እና በሳይንሳዊ ሙከራዎች ፈጠራን መክፈት።",
      debateClubTitle: "የክርክር እና ህዝባዊ ንግግር ክበብ",
      debateClubDesc: "የነገ መሪዎችን ድምጽ ለማበረታታት አመክንዮን፣ አሳማኝነትን እና በራስ መተማመንን ማሳደግ።",
      artClubTitle: "የስነ-ጥበብ እና የባህል ቅርስ ክበብ",
      artClubDesc: "የኢትዮጵያን የበለጸጉ ወጎች በስነ-ስዕል፣ በግጥም፣ በሙዚቃ እና በቲያትር ትርኢቶች ማክበር።",
      sportsTitle: "ስፖርት እና አትሌቲክስ",
      sportsDesc: "በእግር ኳስ፣ በቅርጫት ኳስ፣ በቮሊቦል እና በሩጫ ውድድሮች አማካኝነት አካላዊ ጤንነትን እና የቡድን ስራን መገንባት።",
      charityTitle: "የማህበረሰብ ኃላፊነት",
      charityDesc: "ርህራሄን እና ማህበራዊ ኃላፊነትን ማሳደግ። ተማሪዎቻችን በአዳማ ከተማ ውስጥ ችግረኛ ለሆኑ ቤተሰቦች ምግብ፣ መጽሃፍ እና አቅርቦቶችን በሚያከፋፍሉ የበጎ አድራጎት ስራዎች ላይ ይሳተፋሉ።",
      uniformTitle: "ዩኒፎርም እና ኩራት",
      uniformDesc: "የእኛ ዩኒፎርም ስነ-ስርዓትን፣ ጽዳትን እና አንድነትን ይወክላል። ተማሪዎች የአብዲ አዳማን ውርስ በመወከል በኩራት ይለብሱታል።"
    },
    branchesPage: {
      title: "የትምህርት ቤት ቅርንጫፎች",
      desc: "ከፍተኛ ጥራት ያለው እና እሴት-ተኮር ትምህርትን ወደ እርስዎ ለማቅረብ በአካባቢው አራት ዘመናዊ ቅርንጫፎችን እናሰራጫለን።",
      mainTitle: "ዋናው ግቢ እና ሁለተኛ ደረጃ ትምህርት ቤት",
      mainAddr: "አዳማ ከተማ፣ ኦሮሚያ፣ ኢትዮጵያ (የአስተዳደር ማእከል)",
      mainContact: "+251 (0) 22 111 2233",
      primaryTitle: "አንደኛ ደረጃ እና ጁኒየር ግቢ",
      primaryAddr: "ማዕከላዊ አዳማ፣ ኦሮሚያ፣ ኢትዮጵያ (ከKG-8ኛ ክፍል)",
      primaryContact: "+251 (0) 22 111 4455",
      cityTitle: "የከተማ መሃል ቅርንጫፍ",
      cityAddr: "ቦሌ አካባቢ፣ አዳማ፣ ኢትዮጵያ (ከKG-6ኛ ክፍል)",
      cityContact: "+251 (0) 22 111 6677",
      townTitle: "የከተማ ዳርቻ ግቢ",
      townAddr: "ከአዳማ ከተማ ውጭ ያሉ አካባቢዎች፣ ኢትዮጵያ (ከKG-8ኛ ክፍል)",
      townContact: "+251 (0) 22 111 8899",
      directorLabel: "መርማሪ መሪ"
    },
  },
  or: {
    nav: {
      home: "Mana Keessaa",
      about: "Waa'ee Keenya",
      programs: "Sagantaalee",
      schoolLife: "Jireenya Mana Barumsaa",
      branches: "Dammeewwan",
      menu: "Miinjuu",
    },
    hero: {
      welcome: "Baga Gara",
      title: "Abdi Adamaa",
      subtitlePrefix: "Sanyii ",
      subtitleExcellence: "filatamaa fi bilchinaa",
      subtitleSuffix: " har'a facaafna.",
      scroll: "Gadi Shifgisi",
    },
    founder: {
      badge: "Hundee Keenya",
      titleLine1: "Ergaa",
      titleLine2: "Hundeesitoota Biraa",
      quote: "Mannii Barumsaa Abdi Adamaa bara 1998 A.L.I.tti kan hundeeffame hawwii daa'imman itti mul'atan, deeggaraman, fi dandeettii isaanii guutuu akka bira gahan itti jajjabeeffaman uumuufi. Jireenya gara fuulduraa daa'imman keenyaa ijaaruuf, har'a sanyii bilchinaa facaajuu qabna.",
      button: "Seenaa Keenya Qoradhaa",
      name: "Obbo Girmaa Lammii",
      role: "Hundeessaa & Abbaa Qabeenyaa",
    },
    stats: {
      title: "Dhiibbaa Keenya",
      items: [
        { value: "7,600", label: "Barattoota", final: "+" },
        { value: "362", label: "Barsiisota Ga'umsa Qaban", final: "+" },
        { value: "18", label: "Kilaabota & Sochiiwwan", final: "+" },
        { value: "4", label: "Dammeewwan Mana Barumsaa", final: "" },
      ],
      badge: ""
    },
    programs: {
      items: [
        {
          title: "Barnoota Qulqullina Qabu",
          desc: "Daa'imman kindergarten irraa jalqabee hanga kutaa 12tti sirna barnootaa jireenya walitti madaalu, barnoota, aartii fi ispoortii wal-gira qabaniin guddisna. Kaayyoon keenya barataan hundi dandeettii isaa isa dhumaa akka bira gahu fi jaalala barnootaa akka horatu gochuudha.",
          img: "grad.jpg",
        },
        {
          title: "Sochiiwwan Dabalataa",
          desc: "Dareen ala, barattoonni fedhii isaanii akka gabbifatanii fi dandeettii geggeessummaa fi gareen hojjechuu akka guddifatan kilaabota, ispoortii fi sochiiwwan adda addaa bal'aa ta'an ni dhiyeessina.",
          img: "/team.jpg",
        },
        {
          title: "Barataa irratti kan xiyyeeffate",
          desc: "Sirni barnoota keenya hundeewwan barnootaa cimaa ijaaruu fi fedhii beekumsaa kakaasuuf kan qophaaye. Nutis barnoota ijoo kan akka Herrega, Ingiliffa, Saayinsii, Amaariffa, ICT fi Qorannoo Hawaasaa irratti xiyyeeffanna.",
          img: "/school.png",
        },
      ],
      label: "Sagantaa",
      desc: "",
      title: ""
    },
    studentBook: {
      title: "Milkaa'ina Barattootaa",
      subtitle: "Fuula garagalchuuf gadi shifgisi.",
      coverTitle: "Kitaabicha",
      coverSubtitle: "Kitaaba Milkaa'inaa",
      coverEdition: "Qophii Bara 2024",
      legacyTitle: "Dhaala Keenya Bara 2024",
      legacyDesc: "Barattoonni keenya qormaata biyyoolessaa irratti dhibbeentaa 98% darbuudhaan milkaa'ina kanaan dura argamee hin beekne galmeessaniiru, barattoonni 15 biyya keessatti dhibba jalqabaa keessatti hammatamaniiru. Kunis qulqullina barnootaatiif kutannoofnee hojjechuu keenya argisiisa.",
      students: [
        {
          name: "Fiirdoos Musaa",
          achievement: "Qabxii Olaanaa - Qormaata Biyyoolessaa",
          message: "Hojiin cimaan, obsi fi kadhannaan daandii koo qajeelchaniiru. Dandeettii koo akkan baradhuu fi abjiiwwan koo akkan dhugoomsu carraa naaf kennuusaatiif Mana Barumsaa Abdi Adamaa nan galateeffadha.",
          img: "/school.png",
        },
        {
          name: "Fuaad Abdayilaa",
          achievement: "Saayinsii Keessatti Olaantummaa",
          message: "Hojiin cimaa fi amantiin as na gahan. Mana Barumsaa Abdi Adamaa bakka bu'uu kootiif nan boona, barsiisota kootiifis deeggarsa walitti aanaa naaf taasisaniif nan galateeffadha.",
          img: "/school.png",
        },
        {
          name: "Saaroon Liyulsegad",
          achievement: "Geggeessummaa Adda Ta'e",
          message: "Maatii koo kan natti amananiif fi Mana Barumsaa Abdi Adamaa kan amantii sana gara milkaa'inaatti jijjiire nan galateeffadha. Barnoota fi naamusaan abjiiwwan dhugoomuu akka danda'an baradheera.",
          img: "/school.png",
        },
      ],
      classOf: "Eebbifamtoota Bara 2024",
      endOfVolume: "Xumura Kitaabichaa",
      futureAwaits: "Gara Fuulduraa Keessan Eeggadhaa",
    },
    cta: {
      badge: "Galmeen Jalqabameera",
      titleLine1: "Gara Fuulduraa Cimaa",
      titleLine2: "Asitti Jalqaba.",
      desc: "Dhaabbata geggeessitoota, kalaqtoota fi uumtoota boruu boce kanaan jireenya keessan gara fuulduraa ijaaraa.",
      button: "Amma Galmeessi",
    },
    about: {
      hero: {
        title: "Seenaa Keenya",
        subtitle: "Barnoota qulqullina qabu, naamusa cimaa fi eenyummaa Itoophiyaa kabachiisuun kan hogganamu.",
      },
      foundersTitle: "Ergaa Hundeesitoota Biraa",
      directorsTitle: "Ergaa Daarektara Mana Barumsaa Biraa",
      leaders: {
        girma: {
          name: "Obbo GIRMAA LAMMII",
          role: "Hundeessaa & Abbaa Qabeenyaa",
          message: "Baga gara mana barumsaa Abdi Adamaatti nagaan dhuftan, bakka barachuu fi bilchina daa'imman keenyaa itti dhugoomsuuf hundeeffame. Yeroo mana barumsaa kana hundessinu, hawwiin keenya daa'imman kan itti mul'atan, deeggaraman fi dandeettii isaanii guutuu kan itti gabbifatan uumuufi. Mana barumsaa kitaaba qofa irra darbe — bakka beekumsi itti simatamu, gaarummaan itti baratamuu fi barachuun lubbuu itti horatu uumuuf yaadnee. Barattoonni keenya amantii fi naamusa qabaniin yommuu guddatan arguun milkii keenya isa guddaadha, nutis tokkoon tokkoon isaanii kunuunsuuf kutannoo qabna.",
          img: "/school.png",
        },
        aberash: {
          name: "Addee ABERASH ESHETUU",
          role: "Hundeessituu & Haadha Qabeenyaa",
          message: "Akka hundeessitoota keessaa tokkootti, barnoonni jireenya jijjiiruu fi hawaasa gaarii ijaaruuf dandeettii guddaa qaba jedheen amana. Mana barumsaa kana kan hundessine hundee cimaa naamusa, seeraa fi kalaqa irratti hundaa'e kennuufi. Mul'anni keenya barataan hundi sodaa malee akka abjootu fi ga'umsaan akka hojjetu kakaasuudha. Galatoomaa maatii, barsiisota fi barattoota sochii kana keessatti nu waliin hirmaachaa jirtan — waliin ta'uun gara fuulduraa ifaa ijaaruu keenya ni itti fufna.",
          img: "/school.png",
        },
        yodit: {
          name: "Addee YODIT YOHANNIS",
          role: "Daarektara Mana Barumsaa",
          message: "Gara mana barumsaa Abdi Adamaatti isan simachuu kootiif gammachuu guddaatu natti dhaga'ama, bakka tokkoon tokkoon barataa kunuunsa, kabajaa fi eeggannoo olaanaadhaan itti qajeelfamu. Kaayyoon keenya haala barachuu nageenya qabu uumuudhaan barataan hundi gama barnootaa, hawaasummaa fi miiraatiin akka guddatu gochuudha. Barattoonni carraa gaarii akka argataniif maatii fi barsiisota keenya waliin dhiyoon hojjenna. Galatoomaa miseensa hawaasa keenyaa ta'uu keessaniif. Waliin ta'uun gara fuulduraa ifaa ijaaruuf hawwiidhaan eegganna.",
          img: "/school.png",
        },
      },
      difference: {
        title: "Maalitu Adda Nu Taasisa",
        subtitle: "aadaa keenya & eenyummaa keenya",
        values: {
          integrity: {
            title: "Amanamummaa",
            desc: "Mana barumsaa Abdi Adamaa keessatti yeroo hundaa waan sirrii ta'e hojjechuu amanna. Hawaasni keenya amanamummaa, itti-gaafatamummaa fi kabaja ni jajjabeessa. Naamusa cimaa jireenya isaanii geggeessu akka ijaarratan barattoota ni gargaarra.",
          },
          leadership: {
            title: "Geggeessummaa",
            desc: "Barataan hundi dandeettii geggeessummaa qaba. Hojii garee, pirojektoota fi sochiiwwan mana barumsaatiin barattoonni ofitti amanamummaa fi sodaa malee yaaduu akka guddifatan ni goona.",
          },
          growth: {
            title: "Guddina & Milkaa'ina",
            desc: "Milkaa'inni qabxii qofa miti — guddina jireenyati. Abdi Adamaa keessatti barattoonni galma akka kaa'atan, akka hojjetanii fi gufuuwwan irraa akka baratan ni barsiinna.",
          },
          learning: {
            title: "Barnoota Jireenya Guutuu",
            desc: "Barachuun daree keessatti hin xumuramu. Barattoonni addunyaa jijjiiramtuuf akka qophaa'aniif fedhii beekumsaa fi kalaqa ni jajjabeessina.",
          },
        },
      },
      missionVision: {
        title: "ergama & mul'ata",
        visionTitle: "Mul'ata",
        visionDesc: "Barnoota qulqulluu fi aadaa irratti hundaa'e kennuudhaan barattoonni yaadota ofitti amanamummaa qabanii fi geggeessitoota gara fuulduraa Itoophiyaa fi addunyaa akka ta'an qopheessuuf.",
        missionTitle: "Ergama",
        missionDesc: "Mana barumsaa barnoonni qulqulluun naamusa waliin itti simatamu ta'uun beekamuu. Aadaa fi eenyummaa Itoophiyaa kabajuudhaan barnoota sadarkaa addunyaa ni kennina.",
      },
      promise: {
        title: "Waadaa Maatiif Galle",
        desc: "Mana Barumsaa Abdi Adamaa yeroo filattan, amantii guddaa akka nu irratti gattan ni hubanna. Daa'imman keessan gama barnootaa, miiraa fi hawaasummaatiin akka guddattu gochuuf naannoo nageenya qabu uumuuf waadaa galla. Qajeelfama maatii waliin hojjechuu amanna, sababni isaas mana barumsaa fi maatiin yoo waliin ta'an barnoonni milkaa'aa ta'a. Ofitti amanamummaa, naamusa fi eenyummaa isaanii akka eeggatan barattoota cinaa ni dhaabbanna. Milkaa'inni daa'imman keessanii galma keenya kan waliiniiti.",
      },
    },
    programsPage: {
      title: "Sagantaalee Barnootaa",
      desc: "Daandiiwwan barnootaa keenya kanneen akka gaariitti qophaa'an tokkoon tokkoon sadarkaa guddinaa irratti dandeettii ijoollee gabbisuuf bocamaniiru.",
      kgTitle: "Daa'imman (KG)",
      kgDesc: "Naannoo ho'aa fi kalaqaan guutame kan dandeettii dubbisuu fi barreessuu jalqabaa, miira kakaasuu fi dandeettii sochii irratti xiyyeeffate.",
      primaryTitle: "Mana Barumsaa Sadarkaa 1ffaa (Kutaa 1-8)",
      primaryDesc: "Barnoota Herregaa, Saayinsii, Ingiliffaa, Amaariffaa fi Afaan Oromootiin gahumsa bu'uuraa cimaa ijaaruu.",
      middleTitle: "Mana Barumsaa Sadarkaa Giddu-galeessaa (Kutaa 7-8)",
      middleDesc: "Yaada bilchinaa, fedhii qorannoo saayinsii, qorannoo of-danda'ee fi ispoortii gareen hojetamu jajjabeessuu.",
      highTitle: "Mana Barumsaa Sadarkaa 2ffaa (Kutaa 9-12)",
      highDesc: "Sirna barnootaa qophii yuunivarsiitii koorsiiwwan STEM dabalataa, qophii qormaata biyyoolessaa fi gorsa hojii of keessaa qabu.",
      oromoTitle: "Barnoota Afaan Oromoo Hordofinsaan",
      oromoDesc: "Magaalaa Adaamaatti sagantaa seenaa hojjete fi jalqabaa ta'e. Barattoonni herregaa fi saayinsii afaan dhalootaatiin akka baratan gochuudhaan kooppula aadaa fi bilchina beekumsaa ni mirkaneessina."
    },
    schoolLifePage: {
      title: "Jireenya Mana Barumsaa & Aadaa",
      desc: "Barnoota dareen ala jireenya gammachiisaa ta'e kan barattoonni naamusa, geggeessummaa fi duudhaalee jireenya guutuu itti gabbifatan.",
      clubsTitle: "Kilaabota Barattootaa",
      clubsDesc: "Barattoonni jaalala fi hiriyyummaa ijaaruuf kilaabota fedhii adda addaa keessatti hirmaatu.",
      scienceClubTitle: "Kilaaba Saayinsii & ICT",
      scienceClubDesc: "Koodingii harkaa, laabota saayinsii kompiutaraa fi qorannoolee saayinsiitiin kalaqa uumuu.",
      debateClubTitle: "Filaannoo Falmii & Dubbii Addunyaa",
      debateClubDesc: "Geggeessitoota boruuf yaada bilchinaa, falmii amansiisaa fi ofitti amanamummaa jajjabeessuu.",
      artClubTitle: "Aartii & Kilaaba Duudhaa Aadaa",
      artClubDesc: "Duudhaalee Itoophiyaa aartii, walaloo, muuziqaa fi tiyaatiraan simachuu fi kabajuu.",
      sportsTitle: "Ispoortii & Atileetiksii",
      sportsDesc: "Kubbaa Miilaa, Kubbaa Saaloo, Kubbaa Voliboolii fi fiigichaan fayyummaa qaamaa fi gareen hojjechuu ijaaruu.",
      charityTitle: "Itti-gaafatamummaa Hawaasaa",
      charityDesc: "Gara-laafummaa fi itti-gaafatamummaa hawaasummaa gabbisuu. Barattoonni keenya maatiiwwan Adamaa keessatti deeggarsa fedhan bira gahuuf midhaan, kitaabota fi meeshaalee biroo ni raabsu.",
      uniformTitle: "Yuunifooramii & Boona",
      uniformDesc: "Yuunifooramiin keenya naamusa, qulqullina fi tokkummaa argisiisa. Barattoonni boonaan uffatu."
    },
    branchesPage: {
      title: "Dammeewwan Mana Barumsaa Keenyaa",
      desc: "Barnoota qulqullina qabu fi aadaa irratti hundaa'e gara keessanitti dhiheessuuf dammeewwan afur naannicha keessatti hojjechiisna.",
      mainTitle: "Campus Guddaa & Mana Barumsaa Sadarkaa 2ffaa",
      mainAddr: "Magaalaa Adaamaa, Oromiyaa, Itoophiyaa (Giddu-gala Bulchiinsaa)",
      mainContact: "+251 (0) 22 111 2233",
      primaryTitle: "Junior & Campus Sadarkaa 1ffaa",
      primaryAddr: "Giddu-gala Adaamaa, Oromiyaa, Itoophiyaa (Kutaa KG-8)",
      primaryContact: "+251 (0) 22 111 4455",
      cityTitle: "Dammee Giddu-gala Magaalaa",
      cityAddr: "Naannoo Bolee, Adaamaa, Itoophiyaa (KG-Kutaa 6)",
      cityContact: "+251 (0) 22 111 6677",
      townTitle: "Town Border Campus",
      townAddr: "Naannoo Adaamaa Daree, Itoophiyaa (KG-Kutaa 8)",
      townContact: "+251 (0) 22 111 8899",
      directorLabel: "Geggeessaa Daarektara"
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: TranslationSchema;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("ziquala_lang");
    if (saved === "en" || saved === "am" || saved === "or") {
      return saved as Language;
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ziquala_lang", lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    translations: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
