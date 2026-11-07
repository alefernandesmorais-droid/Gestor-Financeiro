import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  Receipt,
  Calculator,
  ShieldCheck,
  Target,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { ThemeToggle } from './ThemeToggle';
import { SobraLogo } from './SobraLogo';

const navItems = [
  { path: '/', label: 'Painel', icon: LayoutDashboard },
  { path: '/importar', label: 'Importar', icon: UploadCloud },
  { path: '/transacoes', label: 'Transações', icon: Receipt },
  { path: '/simulador', label: 'Posso comprar?', icon: Calculator },
  { path: '/reserva', label: 'Reserva', icon: ShieldCheck },
  { path: '/metas', label: 'Metas', icon: Target },
  { path: '/chat', label: 'Assistente Sobra', icon: Sparkles },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { sidebarAberta, setSidebarAberta } = useAppStore();

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark transition-all duration-200 z-30 select-none relative ${
        sidebarAberta ? 'w-64' : 'w-20'
      }`}
    >
      {/* Botão de Toggle Flutuante na Borda (estilo Notion/Linear) */}
      <button
        onClick={() => setSidebarAberta(!sidebarAberta)}
        className="absolute -right-3 top-5 z-40 w-6 h-6 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-md flex items-center justify-center text-content-secondary-light dark:text-content-secondary-dark hover:text-primary hover:border-primary/50 hover:scale-110 active:scale-95 transition-all"
        title={sidebarAberta ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        aria-label={sidebarAberta ? 'Recolher menu lateral' : 'Expandir menu lateral'}
      >
        {sidebarAberta ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Topo / Logo */}
      <div
        className={`h-16 flex items-center border-b border-border-light dark:border-border-dark transition-all ${
          sidebarAberta ? 'px-4 justify-start' : 'justify-center px-0'
        }`}
      >
        <SobraLogo size="md" showText={sidebarAberta} />
      </div>

      {/* Links de navegação */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${
                  sidebarAberta ? 'px-3 py-2.5' : 'justify-center py-2.5 px-0'
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold shadow-xs'
                    : 'text-content-secondary-light dark:text-content-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 hover:text-content-main-light dark:hover:text-content-main-dark'
                }`
              }
              title={!sidebarAberta ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarAberta && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Rodapé da Sidebar */}
      <div
        className={`p-3 border-t border-border-light dark:border-border-dark flex items-center ${
          sidebarAberta ? 'justify-between' : 'justify-center flex-col gap-2'
        }`}
      >
        <NavLink
          to="/onboarding"
          className="flex items-center gap-2 p-2 rounded-xl text-xs text-content-secondary-light dark:text-content-secondary-dark hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Guia dos Bancos e Boas-vindas"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {sidebarAberta && <span>Como usar</span>}
        </NavLink>
        <ThemeToggle />
      </div>
    </aside>
  );
};
