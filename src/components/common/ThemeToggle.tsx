import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useAppStore();

  return (
    <button
      onClick={() => toggleTheme()}
      type="button"
      className={`p-2 rounded-xl transition-colors duration-150 flex items-center justify-center text-content-secondary-light dark:text-content-secondary-dark hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      title={theme === 'claro' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
      aria-label="Alternar tema"
    >
      {theme === 'claro' ? (
        <Moon className="w-5 h-5 text-gray-700 hover:text-indigo-600" />
      ) : (
        <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300" />
      )}
    </button>
  );
};
