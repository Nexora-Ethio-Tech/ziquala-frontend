import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "../context/LanguageContext";



export default function Hero() {
  
  const ref = useRef(null);
  const { translations } = useLanguage();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Subtle parallax effect for the image as you scroll down
  const yImage = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Entrance animations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section ref={ref} className="relative min-h-screen bg-white dark:bg-zinc-950 overflow-hidden flex items-center pt-24 pb-12 lg:py-0 transition-colors duration-300">
      
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div 
        style={{ opacity }}
        className="relative z-10 max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
      >
        
        {/* LEFT COLUMN: TEXT CONTENT (100% Legible on solid background) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="lg:col-span-7 flex flex-col justify-center order-2 lg:order-1 text-left"
        >
          {/* Welcome Tag */}
          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-6 md:mb-8">
            <span className="text-xs md:text-sm font-mono font-bold tracking-[0.25em] text-amber-600 dark:text-amber-500 uppercase">
              {translations.hero.welcome || "Welcome to"}
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-serif font-medium text-zinc-900 dark:text-white leading-[1.05] tracking-tight pr-4"
          >
            {translations.hero.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-zinc-600 dark:text-zinc-300 mt-6 md:mt-10 text-lg sm:text-xl md:text-2xl font-sans max-w-xl leading-relaxed"
          >
            {translations.hero.subtitlePrefix}
            <span className="text-zinc-900 dark:text-white font-semibold"> {translations.hero.subtitleExcellence} </span>
            {translations.hero.subtitleSuffix}
          </motion.p>

          {/* Scroll Indicator (Moved to flow with text) */}
          <motion.div variants={itemVariants} className="mt-16 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
              <motion.div 
                animate={{ y: [0, 4, 0] }} 
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-3 rounded-full bg-amber-500"
              />
            </div>
            <span className="text-xs font-mono font-semibold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">
              {translations.hero.scroll || "Explore"}
            </span>
          </motion.div>
        </motion.div>


        {/* RIGHT COLUMN: PARALLAX IMAGE */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 relative w-full h-[50vh] sm:h-[60vh] lg:h-[80vh] order-1 lg:order-2"
        >
          {/* Framed Image Container */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-2xl">
            <motion.img
              style={{ y: yImage, scale: 1.1 }} // Scale 1.1 allows room for parallax movement without showing edges
              src="/school.png"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out hover:scale-105"
              alt="High School Campus"
            />
            {/* Soft inner shadow/overlay to make the image look integrated */}
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/40 via-transparent to-transparent pointer-events-none" />
          </div>
          
          {/* Decorative Accent Box */}
          <div className="absolute -bottom-6 -left-6 w-24 h-24 border-b-2 border-l-2 border-amber-500 rounded-bl-3xl hidden lg:block" />
        </motion.div>

      </motion.div>
    </section>
  );
}