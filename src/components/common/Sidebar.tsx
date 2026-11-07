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

const navItems = [
  { path: '/', label: 'Painel', icon: LayoutDashboard },
  { path: '/importar', label: 'Importar', icon: UploadCloud },
  { path: '/transacoes', label: 'Transações', icon: Receipt },
  { path: '/simulador', label: 'Posso comprar?', icon: Calculator },
  { path: '/reserva', label: 'Reserva', icon: ShieldCheck },
  { path: '/metas', label: 'Metas', icon: Target },
  { path: '/chat', label: 'Chat com IA', icon: Sparkles, badge: 'IA' },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { sidebarAberta, setSidebarAberta } = useAppStore();

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark transition-all duration-200 z-30 select-none ${
        sidebarAberta ? 'w-64' : 'w-20'
      }`}
    >
      {/* Topo / Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-sm">
            S
          </div>
          {sidebarAberta && (
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight text-content-main-light dark:text-content-main-dark">
                Sobra
              </span>
              <span className="text-[11px] text-content-secondary-light dark:text-content-secondary-dark">
                Controle financeiro pessoal
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          className="p-1.5 rounded-lg text-content-secondary-light dark:text-content-secondary-dark hover:bg-black/5 dark:hover:bg-white/10"
          title={sidebarAberta ? 'Recolher menu' : 'Expandir menu'}
        >
          {sidebarAberta ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
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
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-semibold'
                    : 'text-content-secondary-light dark:text-content-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 hover:text-content-main-light dark:hover:text-content-main-dark'
                }`
              }
              title={!sidebarAberta ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarAberta && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {sidebarAberta && item.badge && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-accent text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Rodapé da Sidebar */}
      <div className="p-3 border-t border-border-light dark:border-border-dark flex items-center justify-between">
        <NavLink
          to="/onboarding"
          className="flex items-center gap-2 p-2 rounded-xl text-xs text-content-secondary-light dark:text-content-secondary-dark hover:bg-black/5 dark:hover:bg-white/10"
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
