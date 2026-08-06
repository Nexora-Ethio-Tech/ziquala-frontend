import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import ApplyButtonSection from "./ApplyButton";

export default function FinalCTA() {
  const ref = useRef(null);
  const { translations } = useLanguage();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0.5, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  return (
    <section 
      ref={ref} 
      className="h-screen w-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 md:p-8 transition-colors duration-300"
    >
      <motion.div
        style={{ opacity, scale }}
        className="w-[95%] md:w-[85%] h-[85vh] min-h-[480px] max-h-[600px] max-w-5xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-2xl relative"
      >
        {/* LEFT IMAGE SIDE */}
        <div className="relative h-full w-full hidden md:block">
          <img
            src="/school.png"
            alt="Graduation"
            className="w-full h-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-zinc-900/40 mix-blend-multiply" />
        </div>

        {/* RIGHT CTA SIDE */}
        <div className="h-full w-full flex flex-col justify-center p-6 sm:p-10 md:p-12 lg:p-16 bg-zinc-800 dark:bg-zinc-900 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] rounded-full bg-zinc-700/30 dark:bg-zinc-800/30 blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-xs font-semibold tracking-[0.25em] text-zinc-300 dark:text-zinc-400 uppercase mb-2">
              {translations.cta.badge}
            </h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4">
              {translations.cta.titleLine1} <br/> {translations.cta.titleLine2}
            </h3>
            <p className="text-zinc-300 dark:text-zinc-400 text-sm sm:text-base font-light mb-6 max-w-sm leading-relaxed">
              {translations.cta.desc}
            </p>
            <ApplyButtonSection className="px-4 py-2 text-xs md:text-sm" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}