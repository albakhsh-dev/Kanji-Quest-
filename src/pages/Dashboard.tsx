import { useUserStore } from '../store/userStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChromeOrbit } from '../components/ui/chrome-orbit';
import { Play, Sparkles, ArrowRight } from 'lucide-react';

interface LevelConfig {
  id: 'N5' | 'N4' | 'N3' | 'N2';
  title: string;
  kanji: string;
  kanjiMeaning: string;
  desc: string;
  badge: string;
  colors: [string, string];
  accentColor: string;
  count: string;
}

const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 'N5',
    title: 'JLPT N5',
    kanji: '日',
    kanjiMeaning: 'ひ • Sun / Day',
    desc: 'Beginner Foundations',
    badge: 'Tier 1',
    colors: ['#38BDF8', '#6366F1'],
    accentColor: 'text-sky-500 dark:text-sky-400',
    count: '100+ Kanji',
  },
  {
    id: 'N4',
    title: 'JLPT N4',
    kanji: '空',
    kanjiMeaning: 'そら • Sky / Air',
    desc: 'Essential Vocabulary',
    badge: 'Tier 2',
    colors: ['#34D399', '#059669'],
    accentColor: 'text-emerald-500 dark:text-emerald-400',
    count: '180+ Kanji',
  },
  {
    id: 'N3',
    title: 'JLPT N3',
    kanji: '道',
    kanjiMeaning: 'みち • Way / Journey',
    desc: 'Intermediate Fluency',
    badge: 'Tier 3',
    colors: ['#FBBF24', '#D97706'],
    accentColor: 'text-amber-500 dark:text-amber-400',
    count: '370+ Kanji',
  },
  {
    id: 'N2',
    title: 'JLPT N2',
    kanji: '夢',
    kanjiMeaning: 'ゆめ • Dream / Vision',
    desc: 'Advanced Mastery',
    badge: 'Tier 4',
    colors: ['#F43F5E', '#BE123C'],
    accentColor: 'text-rose-500 dark:text-rose-400',
    count: '410+ Kanji',
  },
];

export default function Dashboard() {
  const { profile, progress } = useUserStore();
  const navigate = useNavigate();

  // Dynamic gel reflections matching the active user theme
  const themeGelColors: Record<string, [string, string]> = {
    dark: ['#FC8181', '#A855F7'],
    sakura: ['#FF6B95', '#C084FC'],
    tatami: ['#5E7A53', '#F59E0B'],
    light: ['#C52828', '#F59E0B'],
  };

  const activeHeroColors = themeGelColors[progress.theme] || themeGelColors.light;
  const studioMode: 'dark' | 'light' = progress.theme === 'dark' ? 'dark' : 'light';

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Profile Section */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-text tracking-tight">
            こんにちは、{profile.username || 'Warrior'} 👋
          </h1>
          <p className="text-theme-muted mt-1 font-medium">
            Your Japanese mastery portal is ready. Choose a tier or begin your daily practice.
          </p>
        </div>
        <div className="w-14 h-14 bg-theme-panel border border-theme-border rounded-2xl flex items-center justify-center text-2xl shadow-sm">
          🥷
        </div>
      </section>

      {/* Hero Showcase: Atmospheric Kanji Nexus Portal */}
      <section className="relative overflow-hidden bg-theme-panel border border-theme-border rounded-3xl p-8 sm:p-12 shadow-soft flex flex-col items-center text-center">
        {/* Subtle decorative radial accent */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-theme-accent/5 via-transparent to-transparent opacity-80" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-theme-accent-bg text-theme-accent text-xs font-semibold tracking-wide mb-3 z-10">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nihongo Nexus • Interactive Gyroscope</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-theme-text max-w-xl leading-tight z-10">
          Precision Japanese Mastery
        </h2>

        <p className="text-theme-muted text-sm sm:text-base max-w-lg mt-2 leading-relaxed z-10">
          Nested chrome rings rotate in real-time 3D. Hover to shift perspective, and click to swing the gimbals into an aligned focus halo.
        </p>

        {/* Hero Chrome Orbit Gyroscope */}
        <div className="w-full max-w-md h-[280px] sm:h-[320px] my-3 relative flex items-center justify-center z-10">
          <ChromeOrbit
            colors={activeHeroColors}
            studio={studioMode}
            rings={4}
            size={0.88}
            spacing={0.08}
            bandWidth={0.075}
            bandThickness={0.018}
            roughness={0.16}
            iridescence={0.3}
            speed={1.0}
            tilt={18}
            haloTilt={42}
            interactive={true}
            parallax={1.2}
            clickAlign={true}
            alignHold={2.5}
            intro={true}
            className="w-full h-full"
          >
            <div className="pointer-events-none flex flex-col items-center justify-center w-28 h-28 rounded-full bg-theme-panel/90 dark:bg-theme-panel/75 backdrop-blur-md border border-theme-border/70 shadow-lg select-none">
              <span className="font-japanese text-5xl font-bold text-theme-accent drop-shadow-sm">
                学
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-theme-muted mt-0.5">
                Knowledge
              </span>
            </div>
          </ChromeOrbit>
        </div>

        {/* Clean Primary CTA */}
        <div className="z-10 mt-2">
          <button
            onClick={() => navigate(`/flashcards/${profile.targetLevel || 'N5'}`)}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-theme-accent text-white font-semibold text-sm hover:bg-theme-accent-hover transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Practice ({profile.targetLevel || 'N5'})</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </section>

      {/* JLPT Level Portals Section: N5, N4, N3, N2 */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-theme-text tracking-tight">JLPT Level Portals</h2>
            <p className="text-sm text-theme-muted mt-0.5">Explore each level with dedicated orbital gimbals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LEVEL_CONFIGS.map((lvl) => (
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              key={lvl.id}
              onClick={() => navigate(`/flashcards/${lvl.id}`)}
              className="relative overflow-hidden bg-theme-panel border border-theme-border hover:border-theme-accent/40 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
            >
              {/* Level Card Header */}
              <div className="flex items-start justify-between z-10">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className={`text-2xl font-bold font-japanese ${lvl.accentColor}`}>
                      {lvl.title}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-theme-bg border border-theme-border text-theme-muted">
                      {lvl.badge}
                    </span>
                  </div>
                  <p className="text-sm text-theme-muted">{lvl.desc}</p>
                </div>
                <span className="text-xs font-semibold text-theme-muted bg-theme-bg px-2.5 py-1 rounded-xl border border-theme-border">
                  {lvl.count}
                </span>
              </div>

              {/* Dedicated Chrome Orbit for this JLPT Level */}
              <div className="h-52 sm:h-56 w-full relative flex items-center justify-center my-2">
                <ChromeOrbit
                  colors={lvl.colors}
                  studio={studioMode}
                  rings={3}
                  size={0.86}
                  spacing={0.09}
                  bandWidth={0.08}
                  bandThickness={0.018}
                  roughness={0.16}
                  iridescence={0.3}
                  speed={0.9}
                  tilt={16}
                  haloTilt={40}
                  interactive={true}
                  parallax={1.0}
                  clickAlign={true}
                  alignHold={2.5}
                  className="w-full h-full"
                >
                  <div className="pointer-events-none flex flex-col items-center justify-center w-20 h-20 rounded-full bg-theme-panel/90 dark:bg-theme-panel/80 backdrop-blur-md border border-theme-border/80 shadow-md">
                    <span className={`font-japanese text-3xl font-bold ${lvl.accentColor}`}>
                      {lvl.kanji}
                    </span>
                    <span className="text-[9px] font-medium text-theme-muted mt-0.5">
                      {lvl.kanjiMeaning.split('•')[0].trim()}
                    </span>
                  </div>
                </ChromeOrbit>
              </div>

              {/* Bottom Level Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-theme-border/60 z-10 text-xs">
                <span className="text-theme-muted group-hover:text-theme-text transition-colors font-medium">
                  {lvl.kanjiMeaning}
                </span>
                <span className={`inline-flex items-center gap-1 font-semibold ${lvl.accentColor} group-hover:translate-x-1 transition-transform`}>
                  Enter Tier <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
