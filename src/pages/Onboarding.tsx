import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { ChromeOrbit } from '../components/ui/chrome-orbit';
import { TerminalRain } from '../components/ui/terminal-rain';

export default function Onboarding() {
  const [username, setUsername] = useState('');
  const { updateProfile, progress } = useUserStore();
  const navigate = useNavigate();

  const themeRainConfig = useMemo(() => {
    switch (progress.theme) {
      case 'dark':
        return {
          colors: ['#fc8181', '#fed7d7'] as [string, string],
          backgroundColor: '#1a202c',
          mode: 'glow' as const,
        };
      case 'sakura':
        return {
          colors: ['#ff6b95', '#9f1239'] as [string, string],
          backgroundColor: '#fff0f5',
          mode: 'ink' as const,
        };
      case 'tatami':
        return {
          colors: ['#5e7a53', '#1b4332'] as [string, string],
          backgroundColor: '#f3f4eb',
          mode: 'ink' as const,
        };
      case 'light':
      default:
        return {
          colors: ['#c52828', '#7f1d1d'] as [string, string],
          backgroundColor: '#fcfaf5',
          mode: 'ink' as const,
        };
    }
  }, [progress.theme]);

  const handleComplete = () => {
    updateProfile({ username });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background UI: React Bits Pro Terminal Rain */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-60 transition-opacity duration-700 overflow-hidden">
        <TerminalRain
          colors={themeRainConfig.colors}
          backgroundColor={themeRainConfig.backgroundColor}
          mode={themeRainConfig.mode}
          glyphs="学日空道夢知力水火木金土日月年人本大中小上下左右見言行食飲生話読聞書買雨電校語友時間東西南北京山川田海森林花草ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789"
          glyphSize={18}
          spacing={1.15}
          density={0.35}
          trail={18}
          speed={0.8}
          glow={0.3}
          variance={0.55}
          depth={0.65}
          quality={0.9}
          interactive={true}
          bulletTime={true}
          clickBurst={true}
          className="w-full h-full"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-theme-panel/95 backdrop-blur-md p-8 rounded-3xl shadow-soft relative z-10 border border-theme-border"
      >
        <div className="text-center mb-6">
          <div className="w-28 h-28 mx-auto relative flex items-center justify-center mb-3">
            <ChromeOrbit
              colors={['#C52828', '#F59E0B']}
              studio={progress.theme === 'dark' ? 'dark' : 'light'}
              rings={3}
              size={0.9}
              spacing={0.09}
              bandWidth={0.08}
              bandThickness={0.018}
              speed={0.8}
              tilt={18}
              haloTilt={42}
              interactive={true}
              parallax={1.0}
              className="w-full h-full"
            >
              <div className="w-14 h-14 rounded-full bg-theme-panel/90 flex items-center justify-center shadow-md border border-theme-border/60">
                <span className="text-3xl font-japanese text-theme-accent font-bold select-none">学</span>
              </div>
            </ChromeOrbit>
          </div>
          <h1 className="text-2xl font-bold text-theme-text">Welcome to KanjiQuest</h1>
          <p className="text-sm text-theme-muted mt-1">Master Japanese with interactive orbital practice</p>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-xl mb-4 font-medium text-theme-text">Create your player</h2>
          <input 
            type="text" 
            placeholder="Username" 
            className="w-full p-4 mb-6 rounded-xl border border-theme-border bg-theme-bg focus:outline-none focus:ring-2 focus:ring-theme-accent text-theme-text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && username.trim() && handleComplete()}
            autoFocus
          />
          <Button 
            className="w-full" 
            size="lg"
            disabled={!username.trim()}
            onClick={handleComplete}
          >
            Start Playing
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
