import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background-light dark:bg-background-dark text-content-main-light dark:text-content-main-dark">
      {/* Sidebar para desktop */}
      <Sidebar />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Barra de abas para mobile */}
        <BottomNav />
      </div>
    </div>
  );
};
