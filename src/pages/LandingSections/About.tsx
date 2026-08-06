
import { useScroll, useTransform, useSpring, motion } from 'framer-motion';
import founderImg from '../../assets/founder.jpg';
import {
    Heart,
    Quote,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CommunitySection, PillarsSection, PromiseSection, SchoolLifeSection, TeamSection, VisionMissionSection } from '../../components/LandingSections';



export default function About() {
    const { t, i18n } = useTranslation();
    return (
        <>
            <section id="about" className="py-24 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -100, rotateY: 30 }}
                            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="order-2 lg:order-1 perspective-1000"
                        >
                            <div className="section-header !text-left">
                                <span className="section-subtitle">{t('landing.founder.subtitle')}</span>
                                <h2 className="section-title">{t('landing.founder.title')}</h2>
                            </div>

                            <div className="space-y-8">
                                <motion.div
                                    whileHover={{ rotateY: -5, rotateX: 5 }}
                                    className="relative p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl preserve-3d transition-all duration-500"
                                >
                                    <Quote className="absolute top-6 right-6 text-slate-100 dark:text-slate-800" size={80} />
                                    <div className="relative z-10 space-y-6">
                                        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">
                                            {t('landing.founder.quote')}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-school-primary/20 rounded-full flex items-center justify-center text-school-primary font-black">GL</div>
                                            <div>
                                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('landing.founder.name')}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('landing.founder.role')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <div className="p-8 bg-white/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {t('landing.founder.vision')}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
                            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="order-1 lg:order-2 grid grid-cols-2 gap-4 perspective-1000"
                        >
                            <div className="space-y-4 pt-12">
                                <div className="h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-white dark:border-slate-800 group">
                                    <img src={founderImg} alt="Ato Girma Lemi - Founder" className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <div className="bg-school-primary p-8 rounded-3xl text-white shadow-2xl transform hover:-translate-y-2 transition-all">
                                    <h4 className="font-black text-4xl">20+</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest mt-2">{t('landing.yearsLeadership')}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-school-secondary p-8 rounded-3xl text-white shadow-2xl transform hover:-translate-y-2 transition-all">
                                    <Heart className="mb-4 text-white/80" size={32} />
                                    <p className="text-lg font-bold leading-tight">{t('landing.nurturingMinds')}</p>
                                </div>
                                <div className="h-64 rounded-3xl overflow-hidden shadow-2xl border-none border-white dark:border-slate-800 group">
                                    <img src="/school.png" alt="Campus Life" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
            <PillarsSection />
            <VisionMissionSection />
            <CommunitySection />
            <PromiseSection />
            <TeamSection />
        </>
    )
}