import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Award, Compass, ArrowUpRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function BranchesPage() {
  const { translations } = useLanguage();
  const t = translations.branchesPage;

  const branchData = [
    {
      title:  "Branch 1 — Adama Kebele 10",
      desc: "Our foundational campus, known for pioneering Abdi Adama School's commitment to core academic excellence, serves as a central learning hub for the wider Adama community.",
      addr: "Kebele 10, Adama, Ethiopia",
      contact: "+251 22 111 2233",
      email: "campus@ziqualaabo.edu.et",
      director: "Ato Girma Lemi",
      img: "/school.png",
      isAnchor: true,
    },
    {
      title:  "Branch 2 — Mogoro Hete Haroreti",
      desc: "Strategically positioned to serve the growing educational needs of the community, this modern campus emphasizes an integrated curriculum and practical skills development.",
      addr: "Mogoro Hete Haroreti, Oromia",
      contact:"+251 22 111 4455",
      email: "campus@ziqualaabo.edu.et",
      director: "Ms. Yodit Yohannes",
      img: "/school.png",
      isAnchor: false,
    },
    {
      title:  "Branch 3 — 180 Village",
      desc: "A modern, accessible campus dedicated to providing high-quality education and fostering strong community ties within this dynamic local area.",
      addr: "180 Village District, Adama",
      contact: "+251 22 111 6677",
      email: "campus@ziqualaabo.edu.et",
      director: "Ms. Aberash Eshetu",
      img: "/school.png",
      isAnchor: false,
    },
    {
      title:  "Branch 4 — Awash",
      desc: "Our distinct campus provides a serene and focused learning environment, encouraging both intellectual curiosity and a commitment to environmental stewardship among our students.",
      addr: "Awash Region, Route 4",
      contact: "+251 22 111 8899",
      email: "campus@ziqualaabo.edu.et",
      director: "Ato Girma Lemi",
      img: "/school.png",
      isAnchor: true,
    },
  ];

  return (
    <article className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 pt-32 pb-32 selection:bg-amber-500/30 overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-amber-500/[0.02] to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-6">
        {/* HEADER */}
        <header className="max-w-3xl mb-32 relative">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 mb-6"
          >
            <span className="text-amber-600 dark:text-amber-500 font-mono text-xs uppercase tracking-widest">
              Regional Footprint
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl font-serif font-medium tracking-tight text-zinc-900 dark:text-white mb-8"
          >
            {t.title || "Our Campuses"}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-zinc-500 dark:text-zinc-400 text-lg font-light leading-relaxed max-w-2xl"
          >
            {t.desc || "Across multiple custom facilities, we maintain a unified focus on high academic parameters and safe, immersive environments for local communities."}
          </motion.p>
        </header>

        {/* CAMPUSES ASYMMETRICAL DIRECTORY GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-24 items-start">
          {branchData.map((branch, idx) => {
            const gridSpan = branch.isAnchor ? "lg:col-span-7" : "lg:col-span-5";
            const imageAspect = branch.isAnchor ? "aspect-[16/10]" : "aspect-[4/3]";

            return (
              <motion.div
                key={branch.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: (idx % 2) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`${gridSpan} group space-y-6 relative`}
              >
                {/* Visual Canvas Block */}
                <div className={`relative ${imageAspect} w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-900/40`}>
                  <img
                    src={branch.img}
                    alt={branch.title}
                    className="w-full h-full object-cover transition duration-1000 ease-[0.16, 1, 0.3, 1] group-hover:scale-102"
                  />
                  
                </div>

                {/* Text Block */}
                <div className="space-y-4">
                  <h3 className="text-xl md:text-2xl font-serif tracking-tight text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                    {branch.title}
                  </h3>

                  <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base font-light leading-relaxed">
                    {branch.desc}
                  </p>
                </div>

                {/* Metadata Details Grid */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-zinc-500 dark:text-zinc-400">
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 mt-0.5 shrink-0" />
                      <span className="leading-normal">{branch.addr}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
                      <a href={`tel:${branch.contact.replace(/\s+/g, '')}`} className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
                        {branch.contact}
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-900/60 pt-2.5 sm:pt-0 sm:pl-4">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
                      <a href={`mailto:${branch.email}`} className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors truncate">
                        {branch.email}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-500/50 shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono block leading-none">
                          {t.directorLabel || "CAMPUS LEADERSHIP"}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide mt-0.5 block">
                          {branch.director}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Micro Action Link */}
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono tracking-wider text-zinc-400 dark:text-zinc-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300 uppercase cursor-pointer">
                    View Route Details
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-0.5 -translate-x-0.5 group-hover:translate-y-0 group-hover:translate-x-0" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </section>
      </div>
    </article>
  );
}
