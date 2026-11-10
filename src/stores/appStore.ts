import { create } from 'zustand';
import type { ThemeMode } from '../types';
import { db } from '../db/db';

export type ModoExibicao = 'rapida' | 'raiox';

export interface EstimativasRapidas {
  rendaMensal: number; // centavos
  despesasFixas: number; // centavos
  reservaAtual: number; // centavos
  customizado: boolean; // se o usuário alterou manualmente os sliders
}

interface AppState {
  theme: ThemeMode;
  mesSelecionado: string; // formato 'YYYY-MM' ou 'todos'
  sidebarAberta: boolean;
  carregando: boolean;
  modoExibicao: ModoExibicao;
  ocultarValores: boolean;
  estimativasRapidas: EstimativasRapidas;

  toggleTheme: () => Promise<void>;
  setTheme: (novoTema: ThemeMode) => Promise<void>;
  setMesSelecionado: (mes: string) => void;
  setSidebarAberta: (aberta: boolean) => void;
  setModoExibicao: (modo: ModoExibicao) => void;
  toggleOcultarValores: () => void;
  setEstimativasRapidas: (novas: Partial<EstimativasRapidas>) => void;
  carregarTemaInicial: () => Promise<void>;
}

const STORAGE_KEY_MODO = 'sobra_modo_exibicao';
const STORAGE_KEY_OCULTAR = 'sobra_ocultar_valores';
const STORAGE_KEY_ESTIMATIVAS = 'sobra_estimativas_rapidas';

// Valores padrão iniciais acolhedores caso a pessoa nunca tenha cadastrado nada
const ESTIMATIVAS_PADRAO: EstimativasRapidas = {
  rendaMensal: 500000, // R$ 5.000,00
  despesasFixas: 320000, // R$ 3.200,00
  reservaAtual: 600000, // R$ 6.000,00
  customizado: false,
};

function carregarEstimativasSalvas(): EstimativasRapidas {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_ESTIMATIVAS);
    if (salvo) return JSON.parse(salvo);
  } catch (e) {
    console.warn('Erro ao carregar estimativas do storage:', e);
  }
  return ESTIMATIVAS_PADRAO;
}

function carregarModoInicial(): ModoExibicao {
  try {
    const modo = localStorage.getItem(STORAGE_KEY_MODO) as ModoExibicao;
    if (modo === 'rapida' || modo === 'raiox') return modo;
  } catch (e) {
    console.warn('Erro ao carregar modo inicial:', e);
  }
  return 'rapida'; // Padrão: Visão Rápida para acolher quem quer praticidade sem atrito
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'claro',
  mesSelecionado: new Date().toISOString().slice(0, 7),
  sidebarAberta: true,
  carregando: false,
  modoExibicao: carregarModoInicial(),
  ocultarValores: localStorage.getItem(STORAGE_KEY_OCULTAR) === 'true',
  estimativasRapidas: carregarEstimativasSalvas(),

  setMesSelecionado: (mes) => set({ mesSelecionado: mes }),
  setSidebarAberta: (aberta) => set({ sidebarAberta: aberta }),

  setModoExibicao: (modo) => {
    localStorage.setItem(STORAGE_KEY_MODO, modo);
    set({ modoExibicao: modo });
  },

  toggleOcultarValores: () => {
    const novo = !get().ocultarValores;
    localStorage.setItem(STORAGE_KEY_OCULTAR, String(novo));
    set({ ocultarValores: novo });
  },

  setEstimativasRapidas: (novas) => {
    const atualizadas = { ...get().estimativasRapidas, ...novas, customizado: true };
    localStorage.setItem(STORAGE_KEY_ESTIMATIVAS, JSON.stringify(atualizadas));
    set({ estimativasRapidas: atualizadas });
  },

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
