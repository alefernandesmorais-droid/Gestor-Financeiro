import React from 'react';
import {
  Zap,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { MonthYearPicker } from './MonthYearPicker';
import { SobraLogo } from './SobraLogo';
import { useAppStore } from '../../stores/appStore';

export const Header: React.FC = () => {
  const { modoExibicao, setModoExibicao, ocultarValores, toggleOcultarValores } = useAppStore();

  return (
    <header className="h-16 border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-20 px-3 md:px-6 flex items-center justify-between gap-2">
      {/* Lado Esquerdo: Mobile logo e Seletor de Calendário */}
      <div className="flex items-center gap-2.5">
        <div className="md:hidden flex items-center gap-1.5 flex-shrink-0">
          <SobraLogo size="sm" />
          <span className="font-extrabold text-base tracking-tight text-content-main-light dark:text-content-main-dark hidden xs:inline">
            Sobra
          </span>
        </div>

        {/* Seletor de Período em Calendário de Mês e Ano */}
        <MonthYearPicker />
      </div>

      {/* Centro / Direita: Switch dos Modos [ Visão Rápida | Raio-X ] */}
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-light dark:border-border-dark flex items-center shadow-2xs">
          <button
            type="button"
            onClick={() => setModoExibicao('rapida')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              modoExibicao === 'rapida'
                ? 'bg-primary text-white shadow-xs scale-100'
                : 'text-content-secondary-light dark:text-content-secondary-dark hover:text-content-main-light dark:hover:text-content-main-dark'
            }`}
            title="Modo Visão Rápida: Estimativas simples e sem burocracia"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Visão Rápida</span>
          </button>

          <button
            type="button"
            onClick={() => setModoExibicao('raiox')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              modoExibicao === 'raiox'
                ? 'bg-primary text-white shadow-xs scale-100'
                : 'text-content-secondary-light dark:text-content-secondary-dark hover:text-content-main-light dark:hover:text-content-main-dark'
            }`}
            title="Modo Raio-X: Extratos completos, faturas e auditoria precisa"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Raio-X</span>
          </button>
        </div>

        {/* Botão Olho Mágico (Ocultar/Exibir Valores em Público / Anti-Ansiedade) */}
        <button
          type="button"
          onClick={toggleOcultarValores}
          className={`p-2 rounded-xl border border-border-light dark:border-border-dark hover:border-primary/50 text-content-secondary-light dark:text-content-secondary-dark hover:text-content-main-light dark:hover:text-content-main-dark transition-all ${
            ocultarValores ? 'bg-primary/10 text-primary border-primary/40' : 'bg-surface-light dark:bg-surface-dark'
          }`}
          title={ocultarValores ? 'Mostrar valores monetários' : 'Ocultar valores monetários (modo discreto)'}
          aria-label={ocultarValores ? 'Mostrar valores monetários' : 'Ocultar valores monetários'}
        >
          {ocultarValores ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4" />}
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
};
