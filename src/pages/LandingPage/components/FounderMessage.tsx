import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface Founder {
  id: number;
  name: string;
  role: string;
  quote: string;
  text: string; // Single comprehensive message block
  image: string;
}

export default function FounderMessage() {
  const ref = useRef(null);
  const { translations } = useLanguage();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const foundersData: Founder[] = [
    {
      id: 1,
      name: translations?.founder?.name || "Ziquala Abo School Founders",
      role: translations?.founder?.role || "Founder & Director",
      quote: "Welcome to Ziquala Abo School! | Gara Mana Barumsaa Ziqwaalaa Abo Baga Nagayaan Dhuftan! | እንኳን ደህና መጣችሁ፡፡",
      text: `Dear parents, students, and residents of Adama City,
      On behalf of Ziquala Abo School, I extend a heartfelt welcome! I am Ziquala Abo School Founders, the founder and owner of this remarkable educational institution.
      "To build the future of our children, we must plant the seeds of excellence today."


      Ziquala Abo School was established in 1998 E.C. (2005/2006 G.C.), and since that time, we have been diligently working to produce educated, competent, and patriotic citizens for Ethiopia.

      Ziquala Abo School made history in Adama City as the first private school to open an instructional section in Afaan Oromoo. We also offer classes in Amharic and English.

      Modern Education Rooted in Culture and Language
      A Historic Milestone: Ziquala Abo School made history in Adama City as the first private school to open an instructional section in Afaan Oromoo. This crucial step ensures that children learn profound knowledge in their mother tongue and gain a deep understanding of their culture. Language is the bridge to culture!
      Bilingual Advantage: We offer classes in both languages, Amharic and Afaan Oromoo. This approach lays the foundation for our students to be competitive both nationally and internationally.
      Our Core Focus: To deliver high-quality, contemporary education, we place special emphasis on Mathematics and the English Language. We believe these subjects are key gateway skills for global opportunities.

      Moving Forward Together!
      The mission of Ziquala Abo School is to combine modern knowledge with national values and pass this legacy on to the next generation. Our school empowers students to develop comprehensive life skills, build self-confidence, and prepare themselves to be agents of change for the nation. Choose the school where your child will grow with the best teachers, supported by modern educational resources, and nurtured with a hopeful vision for the future.

      Ziquala Abo School: Competent Generation for a Brighter Ethiopia!

      Ziquala Abo School Founders
      Founder and Owner

      Matii Barattotaa, Barattootaa fi jiraattota Magaalaa Adaamaa jaallatamoo,
      Maqaa Mana Barumsaa Ziqwaalaa Abo tiin Baga Nagayaan dhuftani! Ani Hundeessitoota Mana Barumsaa Ziqwaalaa Abo, Hundeessaa Dhaabbata Barnoota Guddaa Kanaati.
      "Boru ijoollee keenyaa ijaaruuf, har'a sanyii gaarii facaasuu qabna." Mana Barumsaa Ziqwaalaa Abo kan hundeeffame bara 1998 A.L.I. yoo ta'u, erga yeroo sanaa kaasee barattoota beekumsa, dandeettii fi jaalala biyyaaf akka horatan qopheessaa tureera.

      Barnoota Ammayyaa Aadaafi Afaaniin Bu'uureffame.
      Seenaa Kan Hojjete: Mana Barumsaa Ziqwaalaa Abo mana barumsaa dhuunfaa keessatti seenaa hojjeteera. Magaalaa Adaamaatti Afaan Oromoo-tiin kutaa barnootaa banuuf mana barumsaa dhuunfaa jalqabaa ta'eera. Tarkaanfiin kun ijoolleen afaan isaanitiin beekumsa gadifageenyaa akka argataniif, aadaa isaanii sirritti akka beekaniif gumaacha guddaa godheera. Afaan daandii guddinaati!
      Faayidaa Afaan Lamaan Barachuu: Afaan lamaan, Amaaraa fi Afaan Oromoo-tiin, kutaa barnootaa qabna. Kunis barattoonni keenya sadarkaa biyyaalessaafi addunyaatti beekumsa dandeettii qaban akka horataniif bu'ura kaa'a.
      Xiyyeeffannoo Keenya Guddaa: Barnoota ammayyaa fi dandeettii qabu kennuuf, keessumaa Herrega fi Afaan Ingiliziitiin xiyyeeffannaa addaa kennuun hojjechaa jirra. Qorannoon barnootaa kun carraa addunyaalessaa bal'isuuf furtuu guddaa ta'uu isaanii amanneerra.
      Gara Fuulduraatti Waliin!
      Ergamaan Mana Barumsaa Ziqwaalaa Abo beekumsa ammayyaa fi duudhaalee biyyaalessaa walitti fiduun dhalootaaf dabarsuudha. Mana barumsaa keenya keessatti barattoonni dandeettii jireenyaa guutuu akka horataniif, ofitti amanamummaa akka ijaaraniif, akkasumas jijjiirama biyyaaf akka of qopheessaniif dandeessisa.
      Haadhaafi abbaan barumsaaf yaaddan, mana barumsaa ijoolleen keessan barsiisota gaarii wajjiin, meeshaalee barnootaa ammayyaa deeggaramee, fi abdii ifaa qabanii keessatti guddatan filadhaa.
      Mana Barumsaa Ziqwaalaa Abo: Dhaloota Beekumsaan Biyyaaf Gumaachu Horuuf!
      Odeeffannoo dabalataaf ykn mana barumsaa keenya daawwachuuf har'a nu qunnamaa.
      Hundeessitoota Mana Barumsaa Ziqwaalaa Abo
      Hundeesaafi Abbaa Warraa

      ውድ ወላጆች፣ ተማሪዎች እና የአዳማ ነዋሪዎች፣
      በዝቋላ አቦ ትምህርት ቤት ስም፣ እኔ የዝቋላ አቦ ትምህርት ቤት መስራቾች እንኳን ደህና መጣችሁ ማለት እፈልጋለሁ፡፡
      "የልጆቻችንን ነገ ለመገንባት፣ ዛሬ ምርጥ ዘር መትከል አለብን።"
      የላቀ የትምህርት ጉዞ ከ1998 ዓ.ም. ጀምሮ
      ዝቋላ አቦ ትምህርት ቤት የተመሠረተው በ1998 ዓ.ም. (2005/2006 G.C.) ሲሆን፣ ከዚያን ጊዜ ጀምሮ ለኢትዮጵያችን ብቁ፣ የተማረ እና ለሀገሩ የሚያስብ ዜጋ በማፍራት ላይ እንገኛለን። እያንዳንዱ ተማሪ የየራሱ ታሪክ ያለው ሲሆን፣ እኛም ያን ታሪክ በዕውቀት ብርሃን እና በብሩህ ተስፋ ለመሙላት ቆርጠናል!

      ባህልን እና ቋንቋን የጠበቀ ዘመናዊ ትምህርት
      የታሪክ ምዕራፍ ፈጣሪ: ዝቋላ አቦ ትምህርት ቤት በግል ትምህርት ቤቶች ታሪክ ለመጀመሪያ ጊዜ በአዳማ ከተማ በኦሮሚኛ ቋንቋ (አፋን ኦሮሞ) የትምህርት ክፍል በመክፈት ልጆች በአፍ መፍቻ ቋንቋቸው ጥልቅ ዕውቀት እንዲቀስሙና ባህላቸውን ጠንቅቀው እንዲያውቁ ትልቅ አስተዋፅዖ አድርጓል። ቋንቋ የባህል ድልድይ ነው!
      የሁለት ቋንቋ ጥምረት:
      በሁለቱም ቋንቋዎች፣ አማርኛ እና አፋን ኦሮሞ፣ የትምህርት ክፍሎች አሉን። ይህም ተማሪዎቻችን በሀገር ውስጥም ሆነ በዓለም አቀፍ ደረጃ ብቁ ሆነው እንዲወዳደሩ መሰረቱን ይጥላል።
      ዋና ትኩረታችን:
      ከዘመኑ ጋር የሚሄድ ብቃት ያለው ትምህርት ለመስጠት፣ በተለይም በሂሳብ እና በእንግሊዝኛ ቋንቋ ላይ ልዩ ትኩረት በመስጠት እየሠራን እንገኛለን። እነዚህ የትምህርት አይነቶች ለዓለም አቀፍ ዕድሎች በር ከፋች መሆናቸውን አምነን እንሰራለን።

      ዋና ትኩረታችን
      የዝቋላ አቦ ትምህርት ቤት ተልዕኮ ዘመናዊ ዕውቀትን ከብሔራዊ እሴቶች ጋር አዋህዶ ለትውልድ ማስተላለፍ ነው። ትምህርት ቤታችን ተማሪዎች የተሟላ የሕይወት ክህሎት እንዲያዳብሩ፣ በራስ መተማመን እንዲገነቡ እና ለሀገር ለውጥ ራሳቸውን እንዲያዘጋጁ ያስችላል።
      ልጅዎ ከምርጥ መምህራን ጋር በዘመናዊ የትምህርት ግብዓቶች ታግዞ የሚያድግበትን ብሩህ ተስፋ ያለው ትምህርት ቤት ይምረጡ።

      ዝቋላ አቦ ት/ቤት፡ ብቁ ትውልድን ለብሩህ ኢትዮጵያ!

      ለተጨማሪ መረጃ ወይም ትምህርት ቤታችንን ለመጎብኘት ዛሬውኑ ያግኙን።

      የዝቋላ አቦ ትምህርት ቤት መስራቾች
      መስራች እና ባለቤት`,
      image: "/school.png",
    },
    {
      id: 2,
      name: "Ms. ABERASH ESHETU",
      role: "Co-Founder",
      quote: "Welcome to Ziquala Abo School! | Gara Mana Barumsaa Ziqwaalaa Abo Baga Nagayaan Dhuftan! | እንኳን ደህና መጣችሁ፡፡",
      text: `As one of the founders, I share a deep belief that education has the power to transform lives and shape better communities In our country.
We founded this school to offer a strong foundation rooted in values, discipline, and creativity.
Our vision is to inspire each student to think boldly, act responsibly, and dream fearlessly. we thank every parent, teacher, and student who has joined us on this journey — together, we continue building a brighter future for our community.`,
      image: "/school.png",
    },
    {
      id: 3,
      name: "Ms. YODIT YOHANNES",
      role: "Director of Directors",
      quote: "Welcome to Ziquala Abo School! | Gara Mana Barumsaa Ziqwaalaa Abo Baga Nagayaan Dhuftan! | እንኳን ደህና መጣችሁ፡፡",
      text: `It is my pleasure to welcome you to abdi adama school, where every student is guided with care, respect, and high expectations. our mission is to create a safe and supportive learning atmosphere where each child can develop academically, socially, and emotionally. we work closely with families and our dedicated team of teachers to ensure that students receive the best opportunities to explore their potential. thank you for choosing to be part of our school community. together, we look forward to shaping strong minds, positive values, and bright futures.`,
      image: "/school.png",
    }
  ];

  const currentFounder = foundersData[activeIdx];

  // Creates a clean text summary preview ending at a word boundary
  const getPreviewText = (fullText: string, limit = 180) => {
    if (fullText.length <= limit) return fullText;
    const nextSpace = fullText.indexOf(" ", limit);
    const splitIndex = nextSpace !== -1 ? nextSpace : limit;
    return fullText.substring(0, splitIndex).trim() + "...";
  };

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "center center"],
  });

  const xLeft = useTransform(scrollYProgress, [0, 1], [-100, 0]);
  const opacityLeft = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const yRight = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const opacityRight = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % foundersData.length);
  };

  const handlePrev = () => {
    setActiveIdx((prev) => (prev - 1 + foundersData.length) % foundersData.length);
  };

  // Autoplay functionality - pauses when reading in modal
  useEffect(() => {
    if (isModalOpen) return;

    const timer = setInterval(() => {
      handleNext();
    }, 8000);

    return () => clearInterval(timer);
  }, [activeIdx, isModalOpen]);

  // Lock body scroll when Modal is active
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  return (
    <section ref={ref} className="py-24 md:py-36 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center overflow-hidden border-t border-zinc-200 dark:border-zinc-900 transition-colors duration-300">
      <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 max-w-7xl px-6 md:px-12 w-full items-center">

        {/* LEFT BLOCK: FOUNDER QUOTE & TEXT DESCRIPTION */}
        <motion.div style={{ x: xLeft, opacity: opacityLeft }} className="text-zinc-900 dark:text-white order-2 lg:order-1">
          <h2 className="text-xs font-mono tracking-[0.25em] text-blue-600 dark:text-blue-400 uppercase mb-4">
            {translations?.founder?.badge || "Founders' Message"}
          </h2>

          <h3 className="text-4xl md:text-5xl font-serif font-medium tracking-tight mb-8 leading-tight text-zinc-900 dark:text-white">
            {translations?.founder?.titleLine1 || "Words From"}{" "}
            <span className="text-blue-600 dark:text-blue-400 block sm:inline">{translations?.founder?.titleLine2 || "Our Leadership"}</span>
          </h3>

          <div className="min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFounder.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <blockquote className="text-lg md:text-xl text-zinc-700 dark:text-zinc-100 leading-relaxed font-normal italic border-l-2 border-zinc-300 dark:border-zinc-800 pl-6 mb-6">
                  "{currentFounder.quote}"
                </blockquote>

                <p className="text-zinc-700 dark:text-zinc-100 text-sm md:text-base font-sans font-normal leading-relaxed">
                  {getPreviewText(currentFounder.text)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-8">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex items-center gap-3 px-8 py-4 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all duration-300 font-sans font-normal text-sm md:text-base"
            >
              {translations?.founder?.button || "Read More"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {foundersData.length > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  className="p-3 rounded-full border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all text-zinc-700 dark:text-zinc-100 hover:text-zinc-900 dark:hover:text-white"
                  aria-label="Previous profile"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 tracking-widest font-mono">
                  {String(activeIdx + 1).padStart(2, "0")} / {String(foundersData.length).padStart(2, "0")}
                </span>
                <button
                  onClick={handleNext}
                  className="p-3 rounded-full border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all text-zinc-700 dark:text-zinc-100 hover:text-zinc-900 dark:hover:text-white"
                  aria-label="Next profile"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT BLOCK: IMAGE PORTRAIT */}
        <motion.div style={{ y: yRight, opacity: opacityRight }} className="relative w-full max-w-md mx-auto order-1 lg:order-2">
          <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-3xl -z-10"></div>

          <div className="relative rounded-3xl shadow-2xl overflow-hidden aspect-[4/5] border border-zinc-200 dark:border-white/10 group">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentFounder.id}
                src={currentFounder.image}
                alt={`${currentFounder.name} - ${currentFounder.role}`}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="w-full h-full object-cover select-none transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </AnimatePresence>

            <div className="absolute bottom-6 left-6 right-6 bg-black/60 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <p className="text-white text-lg font-serif font-medium tracking-tight">{currentFounder.name}</p>
              <p className="text-zinc-100 text-sm font-sans font-normal mt-0.5">{currentFounder.role}</p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* OVERLAY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop Layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Card Structure */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl z-10"
            >
              {/* Close Button element */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white text-zinc-600 dark:text-zinc-100 transition-all z-20"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrollable Container Body */}
              <div className="overflow-y-auto p-8 md:p-12 space-y-8 custom-scrollbar">

                {/* Header Profile details */}
                <div className="flex items-center gap-5 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                  <img
                    src={currentFounder.image}
                    alt={currentFounder.name}
                    className="w-16 h-16 rounded-full object-cover border border-zinc-200 dark:border-white/10"
                  />
                  <div>
                    <h4 className="text-xl font-serif font-medium tracking-tight text-zinc-900 dark:text-white">{currentFounder.name}</h4>
                    <p className="text-zinc-500 dark:text-zinc-100 text-sm font-sans font-normal mt-0.5">{currentFounder.role}</p>
                  </div>
                </div>

                {/* Blockquote Segment */}
                <blockquote className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 italic border-l-2 border-blue-500 dark:border-blue-400 pl-5 py-1 font-normal leading-relaxed">
                  "{currentFounder.quote}"
                </blockquote>

                {/* Paragraph Content */}
                <div className="text-zinc-600 dark:text-zinc-300 text-base md:text-lg font-sans font-normal leading-relaxed whitespace-pre-line space-y-4">
                  {currentFounder.text}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}