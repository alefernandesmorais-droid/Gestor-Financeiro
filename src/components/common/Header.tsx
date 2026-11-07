import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { MonthYearPicker } from './MonthYearPicker';

export const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
      {/* Lado Esquerdo: Mobile logo ou Seletor de Calendário */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-base shadow-sm">
            S
          </div>
          <span className="font-bold text-base text-content-main-light dark:text-content-main-dark">
            Sobra
          </span>
        </div>

        {/* Seletor de Período em Calendário de Mês e Ano */}
        <MonthYearPicker />
      </div>

      {/* Lado Direito: Aviso permanente e Tema */}
      <div className="flex items-center gap-3">
        <span className="hidden lg:inline-block text-[11px] text-content-secondary-light dark:text-content-secondary-dark italic bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
          💡 Ajuda a organizar e entender seus números. Não é consultoria financeira.
        </span>
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
