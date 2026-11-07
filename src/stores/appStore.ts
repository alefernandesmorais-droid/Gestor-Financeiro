import { create } from 'zustand';
import type { ThemeMode } from '../types';
import { db } from '../db/db';

interface AppState {
  theme: ThemeMode;
  mesSelecionado: string; // formato 'YYYY-MM' ou 'todos'
  sidebarAberta: boolean;
  carregando: boolean;
  toggleTheme: () => Promise<void>;
  setTheme: (novoTema: ThemeMode) => Promise<void>;
  setMesSelecionado: (mes: string) => void;
  setSidebarAberta: (aberta: boolean) => void;
  carregarTemaInicial: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'claro',
  mesSelecionado: new Date().toISOString().slice(0, 7),
  sidebarAberta: true,
  carregando: false,

  setMesSelecionado: (mes) => set({ mesSelecionado: mes }),
  setSidebarAberta: (aberta) => set({ sidebarAberta: aberta }),

  setTheme: async (novoTema: ThemeMode) => {
    if (novoTema === 'escuro') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: novoTema });
    try {
      const config = await db.settings.get('global');
      if (config) {
        await db.settings.update('global', { tema: novoTema });
      }
    } catch (e) {
      console.warn('Erro ao salvar tema no banco local:', e);
    }
  },

  toggleTheme: async () => {
    const atual = get().theme;
    const proximo: ThemeMode = atual === 'claro' ? 'escuro' : 'claro';
    await get().setTheme(proximo);
  },

  carregarTemaInicial: async () => {
    try {
      await db.inicializarDadosPadrao();
      const config = await db.settings.get('global');
      const temaSalvo = config?.tema || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
      if (temaSalvo === 'escuro') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme: temaSalvo });
    } catch (e) {
      console.warn('Erro ao carregar tema inicial:', e);
    }
  },
}));
