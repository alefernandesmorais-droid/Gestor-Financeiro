import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { ReservePage } from './pages/ReservePage';
import { GoalsPage } from './pages/GoalsPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { useAppStore } from './stores/appStore';

export const App: React.FC = () => {
  const { carregarTemaInicial } = useAppStore();

  useEffect(() => {
    carregarTemaInicial();
  }, [carregarTemaInicial]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="importar" element={<ImportPage />} />
          <Route path="transacoes" element={<TransactionsPage />} />
          <Route path="simulador" element={<SimulatorPage />} />
          <Route path="reserva" element={<ReservePage />} />
          <Route path="metas" element={<GoalsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
