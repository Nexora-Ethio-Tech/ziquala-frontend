import { motion } from 'framer-motion';
import {
  ShieldCheck, Users, Zap, Globe, BookOpen, Heart, Target, Eye,
  GraduationCap, Bus, Shirt, TreePine, Trophy, Circle,
  Lightbulb, Handshake, Star, CheckCircle2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

import type { Easing } from 'framer-motion';

const ease: Easing = 'easeOut';
const fadeUp = { initial: { opacity: 0, y: 60 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.7, ease } };
const stagger = (i: number) => ({ ...fadeUp, transition: { ...fadeUp.transition, delay: i * 0.12 } });

import { branchService } from '../services/branchService';
import { userService } from '../services/userService';

/* ═══════════════════════════════════════════════════════════════
   1. WHAT SETS US APART — 4 Pillars
   ═══════════════════════════════════════════════════════════════ */
export const PillarsSection = () => {
  const { t } = useTranslation();
  const pillars = [
    { icon: ShieldCheck, title: t('landing.sections.pillars.items.0.title'), color: 'from-blue-500 to-indigo-600', desc: t('landing.sections.pillars.items.0.desc') },
    { icon: Users, title: t('landing.sections.pillars.items.1.title'), color: 'from-emerald-500 to-teal-600', desc: t('landing.sections.pillars.items.1.desc') },
    { icon: Target, title: t('landing.sections.pillars.items.2.title'), color: 'from-amber-500 to-orange-600', desc: t('landing.sections.pillars.items.2.desc') },
    { icon: Lightbulb, title: t('landing.sections.pillars.items.3.title'), color: 'from-purple-500 to-pink-600', desc: t('landing.sections.pillars.items.3.desc') },
  ];

  return (
    <section className="py-32 bg-white dark:bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-purple-500" />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="section-header">
          <span className="section-subtitle">{t('landing.sections.pillars.subtitle')}</span>
          <h2 className="section-title">{t('landing.sections.pillars.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mt-4">{t('landing.sections.pillars.desc')}</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((p, i) => (
            <motion.div key={i} {...stagger(i)} whileHover={{ y: -12, scale: 1.02 }} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${p.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <p.icon size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{p.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   2. VISION & MISSION
   ═══════════════════════════════════════════════════════════════ */
export const VisionMissionSection = () => {
  const { t } = useTranslation();
  return (
    <section className="py-32 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div {...fadeUp} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600"><Eye size={24} /></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">{t('landing.sections.vision.subtitle')}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{t('landing.sections.vision.desc')}</p>
            </div>
          </motion.div>
          <motion.div {...stagger(1)} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600"><Target size={24} /></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">{t('landing.sections.vision.missionSubtitle')}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{t('landing.sections.vision.missionDesc')}</p>
            </div>
          </motion.div>
        </div>
        <motion.div {...stagger(2)} className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: GraduationCap, label: t('landing.sections.vision.features.0.label'), desc: t('landing.sections.vision.features.0.desc') },
            { icon: Globe, label: t('landing.sections.vision.features.1.label'), desc: t('landing.sections.vision.features.1.desc') },
            { icon: Zap, label: t('landing.sections.vision.features.2.label'), desc: t('landing.sections.vision.features.2.desc') },
            { icon: ShieldCheck, label: t('landing.sections.vision.features.3.label'), desc: t('landing.sections.vision.features.3.desc') },
          ].map((f, i) => (
            <motion.div key={i} {...stagger(i + 2)} className="flex items-start gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 bg-school-primary/10 rounded-xl flex items-center justify-center text-school-primary shrink-0"><f.icon size={20} /></div>
              <div><h4 className="text-sm font-black text-slate-900 dark:text-white">{f.label}</h4><p className="text-xs text-slate-500 mt-1">{f.desc}</p></div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   3. COMMUNITY VALUES — Students / Parents / Teachers
   ═══════════════════════════════════════════════════════════════ */
export const CommunitySection = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'students' | 'parents' | 'teachers'>('students');

  const communityData = {
    students: { emoji: '🌟', tabName: t('landing.sections.community.tabs.students.tab'), title: t('landing.sections.community.tabs.students.title'), subtitle: t('landing.sections.community.tabs.students.subtitle'), traits: t('landing.sections.community.tabs.students.traits', { returnObjects: true }) as string[] },
    parents: { emoji: '🤝', tabName: t('landing.sections.community.tabs.parents.tab'), title: t('landing.sections.community.tabs.parents.title'), subtitle: t('landing.sections.community.tabs.parents.subtitle'), traits: t('landing.sections.community.tabs.parents.traits', { returnObjects: true }) as string[] },
    teachers: { emoji: '🎓', tabName: t('landing.sections.community.tabs.teachers.tab'), title: t('landing.sections.community.tabs.teachers.title'), subtitle: t('landing.sections.community.tabs.teachers.subtitle'), traits: t('landing.sections.community.tabs.teachers.traits', { returnObjects: true }) as string[] },
  };

  const d = communityData[tab];

  return (
    <section className="py-32 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="section-header">
          <span className="section-subtitle">{t('landing.sections.community.subtitle')}</span>
          <h2 className="section-title">{t('landing.sections.community.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mt-4">{t('landing.sections.community.desc')}</p>
        </motion.div>
        <div className="flex justify-center gap-3 mb-12">
          {(Object.keys(communityData) as Array<keyof typeof communityData>).map(k => (
            <button key={k} onClick={() => setTab(k)} className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${tab === k ? 'bg-school-primary text-white shadow-lg shadow-school-primary/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-700'}`}>
              {communityData[k].emoji} {communityData[k].tabName}
            </button>
          ))}
        </div>
        <motion.div key={tab} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl p-10">
          <div className="text-center mb-8">
            <span className="text-5xl">{d.emoji}</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-4">{d.title}</h3>
            <p className="text-sm text-slate-500 mt-1 italic">{d.subtitle}</p>
          </div>
          <div className="space-y-4">
            {d.traits && d.traits.length > 0 && d.traits.map((trait, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex justify-center items-center w-full gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <>
                  <CheckCircle2 size={18} className="text-school-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium text-center">{trait}</span>
                </>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <motion.p {...stagger(3)} className="text-center mt-10 text-sm font-bold text-slate-500 dark:text-slate-400 italic max-w-xl mx-auto">
          {t('landing.sections.community.quote')}
        </motion.p>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   4. PROMISE TO PARENTS
   ═══════════════════════════════════════════════════════════════ */
export const PromiseSection = () => {
  const { t } = useTranslation();
  const promises = [
    { icon: ShieldCheck, title: t('landing.sections.promise.items.0.title'), desc: t('landing.sections.promise.items.0.desc') },
    { icon: BookOpen, title: t('landing.sections.promise.items.1.title'), desc: t('landing.sections.promise.items.1.desc') },
    { icon: Heart, title: t('landing.sections.promise.items.2.title'), desc: t('landing.sections.promise.items.2.desc') },
    { icon: Handshake, title: t('landing.sections.promise.items.3.title'), desc: t('landing.sections.promise.items.3.desc') },
    { icon: Star, title: t('landing.sections.promise.items.4.title'), desc: t('landing.sections.promise.items.4.desc') },
    { icon: Trophy, title: t('landing.sections.promise.items.5.title'), desc: t('landing.sections.promise.items.5.desc') },
  ];

  return (
    <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" style={{ opacity: 0.08 }} />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div {...fadeUp} className="section-header">
          <span className="section-subtitle !text-school-accent">{t('landing.sections.promise.subtitle')}</span>
          <h2 className="section-title !text-white">{t('landing.sections.promise.title')}</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mt-4">{t('landing.sections.promise.desc')}</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {promises.map((p, i) => (
            <motion.div key={i} {...stagger(i)} whileHover={{ y: -8 }} className="p-8 bg-white/5 backdrop-blur-sm rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all duration-500">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-school-accent mb-5"><p.icon size={26} /></div>
              <h3 className="text-lg font-black mb-2">{p.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   5. UNIFORM, TRANSPORT, FACILITIES
   ═══════════════════════════════════════════════════════════════ */
export const SchoolLifeSection = ({ id }: { id?: string }) => {
  const { t } = useTranslation();
  return (
    <section id={id} className="py-32 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="section-header">
          <span className="section-subtitle">{t('landing.sections.schoolLife.subtitle')}</span>
          <h2 className="section-title">{t('landing.sections.schoolLife.title')}</h2>
        </motion.div>
        <div className="space-y-16">
          {/* Uniform */}
          <motion.div {...fadeUp} className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto p-4">
              {/* Image 1 */}
              <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 h-[500px] group">
                <img
                  src="/school.png"
                  alt="School Uniform - Option 1"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>

              {/* Image 2 */}
              <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 h-[450px] group">
                <img
                  src="/school.png"
                  alt="School Uniform - Option 2"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3"><Shirt size={28} className="text-school-primary" /><h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('landing.sections.schoolLife.uniform.title')}</h3></div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('landing.sections.schoolLife.uniform.desc')}</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🤝', label: t('landing.sections.schoolLife.uniform.items.0.label'), desc: t('landing.sections.schoolLife.uniform.items.0.desc') },
                  { icon: '🎯', label: t('landing.sections.schoolLife.uniform.items.1.label'), desc: t('landing.sections.schoolLife.uniform.items.1.desc') },
                  { icon: '💼', label: t('landing.sections.schoolLife.uniform.items.2.label'), desc: t('landing.sections.schoolLife.uniform.items.2.desc') },
                  { icon: '🌍', label: t('landing.sections.schoolLife.uniform.items.3.label'), desc: t('landing.sections.schoolLife.uniform.items.3.desc') },
                ].map((u, i) => (
                  <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xl">{u.icon}</span>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white mt-2">{u.label}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{u.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Transport */}
          <motion.div {...stagger(1)} className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1 space-y-6">
              <div className="flex items-center gap-3"><Bus size={28} className="text-school-primary" /><h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('landing.sections.schoolLife.transport.title')}</h3></div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('landing.sections.schoolLife.transport.desc')}</p>
              <div className="space-y-3">
                {[
                  { icon: '🛡', text: t('landing.sections.schoolLife.transport.items.0') },
                  { icon: '🕒', text: t('landing.sections.schoolLife.transport.items.1') },
                  { icon: '📍', text: t('landing.sections.schoolLife.transport.items.2') },
                  { icon: '🌱', text: t('landing.sections.schoolLife.transport.items.3') },
                ].map((tt, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-lg">{tt.icon}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{tt.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 aspect-[4/3]">
              <img src="https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=800&auto=format&fit=crop" alt="School Transport" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          </motion.div>

          {/* Facilities */}
          <motion.div {...stagger(2)}>
            <div className="flex items-center gap-3 mb-8"><TreePine size={28} className="text-school-primary" /><h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('landing.sections.schoolLife.facilities.title')}</h3></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { img: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&auto=format&fit=crop', icon: Circle, title: t('landing.sections.schoolLife.facilities.items.0.title'), desc: t('landing.sections.schoolLife.facilities.items.0.desc') },
                { img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop', icon: Trophy, title: t('landing.sections.schoolLife.facilities.items.1.title'), desc: t('landing.sections.schoolLife.facilities.items.1.desc') },
                { img: 'https://images.unsplash.com/photo-1416169607655-0c2b3ce2e1cc?w=600&auto=format&fit=crop', icon: TreePine, title: t('landing.sections.schoolLife.facilities.items.2.title'), desc: t('landing.sections.schoolLife.facilities.items.2.desc') },
              ].map((f, i) => (
                <motion.div key={i} {...stagger(i)} whileHover={{ y: -8 }} className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
                  <div className="aspect-[4/3] overflow-hidden"><img src={f.img} alt={f.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /></div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2"><f.icon size={18} className="text-school-primary" /><h4 className="font-black text-slate-900 dark:text-white">{f.title}</h4></div>
                    <p className="text-sm text-slate-500">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   6. OUR TEAM — Leadership Placeholders
   ═══════════════════════════════════════════════════════════════ */
type TeamMember = {
  name: string;
  role: string;
  img: string;
  branch?: string;
};

const fetchUsers = async () => {
  try {
    // Run all requests in parallel safely
    const results = await Promise.allSettled([
      userService.getAllUsersGuest({ role: "school-admin", status: "", branchId: "" }),
      userService.getAllUsersGuest({ role: "vice-principal", status: "", branchId: "" }),
      userService.getAllUsersGuest({ role: "auditor", status: "", branchId: "" })
    ]);

    // Extract data only from successful promises, defaulting to an empty array if failed
    const school_admins = results[0].status === 'fulfilled' ? (results[0].value as any)?.data || [] : [];

    const combinedData = [...school_admins];

    // Check if we got absolutely nothing back (entire server down)
    const completelyFailed = results.every(r => r.status === 'rejected');

    return {
      success: !completelyFailed,
      data: combinedData,
      error: completelyFailed ? "Server is unreachable" : null
    };

  } catch (err) {
    console.error('❌ Unexpected error fetching users:', err);
    return { success: false, data: [], error: err };
  }
};

export const TeamSection = () => {
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Added loading state

  useEffect(() => {
    console.log('🚀 Fetching branches and users for TeamSection...');
    let isMounted = true;

    const init = async () => {
      setIsLoading(true);
      const result = await fetchUsers();

      if (isMounted) {
        // Safely default to an empty array if result or result.data is nullish
        const rawUsers = result?.data || [];

        const usersFormatted = rawUsers.map((u: any) => ({
          name: u?.name || 'Unknown',
          role: u?.role || 'Staff',
          branch: u?.branch_name || 'N/A',
          img: u?.profile_image || 'https://static.vecteezy.com/system/resources/thumbnails/022/014/184/small/user-icon-member-login-isolated-vector.jpg'
        }));

        setTeam(usersFormatted);
        setIsLoading(false);
        console.log('✅ Users processed successfully:', usersFormatted);

        if (result && !result.success) {
          console.warn("⚠️ Could not reach user directory server.");
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="py-32 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="section-header">
          <span className="section-subtitle">{t('landing.sections.team.subtitle')}</span>
          <h2 className="section-title">{t('landing.sections.team.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto mt-4">{t('landing.sections.team.desc')}</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {isLoading ? (
            // Skeleton Loading State
            Array.from({ length: 5 }).map((_, i) => (
              <div key={`team-skeleton-${i}`} className="text-center animate-pulse">
                {/* Profile Circle Skeleton */}
                <div className="w-32 h-32 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-800 mb-4" />

                {/* Name Skeleton */}
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto w-3/4 mb-2" />

                {/* Role & Branch Skeletons */}
                <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded mx-auto w-1/2 mb-1" />
                <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded mx-auto w-2/3" />
              </div>
            ))
          ) : (
            // Real Data State
            team.map((tt, i) => (
              <motion.div key={i} {...stagger(i)} whileHover={{ y: -10 }} className="text-center group">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 group-hover:border-school-primary transition-colors duration-500 mb-4">
                  <img src={tt.img} alt={tt.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm">{tt.name}</h4>
                <p className="text-[10px] font-black text-school-primary uppercase tracking-widest mt-1">{tt.role}</p>
                <p className="text-[10px] font-black text-school-primary uppercase tracking-widest mt-1">{t('landing.sections.team.branch', 'Branch')}: {tt.branch}</p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};