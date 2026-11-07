import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  Receipt,
  Calculator,
  Sparkles,
  Settings,
} from 'lucide-react';

const mobileTabs = [
  { path: '/', label: 'Painel', icon: LayoutDashboard },
  { path: '/importar', label: 'Importar', icon: UploadCloud },
  { path: '/transacoes', label: 'Extrato', icon: Receipt },
  { path: '/simulador', label: 'Comprar?', icon: Calculator },
  { path: '/chat', label: 'Chat IA', icon: Sparkles },
  { path: '/configuracoes', label: 'Ajustes', icon: Settings },
];

export const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-around px-2 z-40 select-none pb-safe">
      {mobileTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary font-bold dark:text-primary-light'
                  : 'text-content-secondary-light dark:text-content-secondary-dark'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
