import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { ChromeOrbit } from '../components/ui/chrome-orbit';

export default function Onboarding() {
  const [username, setUsername] = useState('');
  const { updateProfile, progress } = useUserStore();
  const navigate = useNavigate();

  const handleComplete = () => {
    updateProfile({ username });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-theme-panel p-8 rounded-3xl shadow-soft"
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
