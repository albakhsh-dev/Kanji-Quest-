import React, { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, User } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useUserStore } from '../../store/userStore';
import { TerminalRain } from '../ui/terminal-rain';

export const Layout: React.FC = () => {
  const { progress } = useUserStore();

  const themeRainConfig = useMemo(() => {
    switch (progress.theme) {
      case 'dark':
        return {
          colors: ['#fc8181', '#fed7d7'] as [string, string],
          backgroundColor: '#1a202c',
          mode: 'glow' as const,
          density: 0.38,
          trail: 18,
          glow: 0.35,
          speed: 0.85,
        };
      case 'sakura':
        return {
          colors: ['#ff6b95', '#9f1239'] as [string, string],
          backgroundColor: '#fff0f5',
          mode: 'ink' as const,
          density: 0.32,
          trail: 16,
          glow: 0.2,
          speed: 0.75,
        };
      case 'tatami':
        return {
          colors: ['#5e7a53', '#1b4332'] as [string, string],
          backgroundColor: '#f3f4eb',
          mode: 'ink' as const,
          density: 0.32,
          trail: 16,
          glow: 0.2,
          speed: 0.75,
        };
      case 'light':
      default:
        return {
          colors: ['#c52828', '#7f1d1d'] as [string, string],
          backgroundColor: '#fcfaf5',
          mode: 'ink' as const,
          density: 0.32,
          trail: 16,
          glow: 0.2,
          speed: 0.75,
        };
    }
  }, [progress.theme]);

  // Authentic Kanji + Katakana characters from JLPT curriculum
  const kanjiGlyphs = "学日空道夢知力水火木金土日月年人本大中小上下左右見言行食飲生話読聞書買雨電校語友時間東西南北京山川田海森林花草ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className={twMerge(
      "min-h-screen bg-theme-bg text-theme-text transition-colors duration-300 font-sans pb-20 md:pb-0 md:pl-24 relative overflow-x-hidden"
    )}>
      {/* Background UI: React Bits Pro Terminal Rain Streams */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-65 transition-opacity duration-700 overflow-hidden">
        <TerminalRain
          colors={themeRainConfig.colors}
          backgroundColor={themeRainConfig.backgroundColor}
          mode={themeRainConfig.mode}
          glyphs={kanjiGlyphs}
          glyphSize={18}
          spacing={1.15}
          density={themeRainConfig.density}
          trail={themeRainConfig.trail}
          speed={themeRainConfig.speed}
          glow={themeRainConfig.glow}
          variance={0.55}
          depth={0.65}
          quality={0.9}
          interactive={true}
          bulletTime={true}
          clickBurst={true}
          className="w-full h-full"
        />
      </div>
      {/* Side Nav for Desktop / Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-24 bg-theme-panel border-t md:border-t-0 md:border-r border-theme-border z-50 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.05)] md:shadow-[4px_0_20px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex md:flex-col justify-around md:justify-start items-center h-16 md:h-full md:py-8">
          {/* Logo only on desktop */}
          <div className="hidden md:flex flex-col items-center mb-8 text-theme-accent">
            <span className="font-japanese text-3xl font-bold">学</span>
          </div>

          <div className="flex md:flex-col w-full justify-around md:gap-4 md:px-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx(
                  "flex flex-col items-center p-2 md:p-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-theme-accent bg-theme-accent-bg" 
                    : "text-theme-muted hover:text-theme-text hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                )}
              >
                <item.icon className="w-6 h-6 md:w-7 md:h-7 mb-1 md:mb-2" />
                <span className="text-[10px] md:text-xs font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};
