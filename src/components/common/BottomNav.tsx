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
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-50 pointer-events-none flex justify-center pb-safe">
      {/* Dock Flutuante Liquid Glass Estilo Apple */}
      <nav className="pointer-events-auto w-full max-w-md h-16 rounded-[28px] bg-gradient-to-b from-white/85 to-white/65 dark:from-[#1c232fe6] dark:to-[#0f141ce6] backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.12),inset_0_1px_1.5px_rgba(255,255,255,0.85)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-around px-2 transition-all">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-primary dark:text-primary-light font-bold scale-105'
                    : 'text-content-secondary-light dark:text-content-secondary-dark hover:text-content-main-light dark:hover:text-content-main-dark active:scale-95'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Pílula de seleção ativa com efeito vidro líquido */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 backdrop-blur-md -z-10 shadow-sm animate-in fade-in zoom-in-95 duration-150" />
                  )}
                  <Icon className="w-5 h-5 mb-0.5 transition-transform" />
                  <span className="text-[10px] tracking-tight">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
