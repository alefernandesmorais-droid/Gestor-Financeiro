export type AccountType = 'conta' | 'cartao';
export type TransactionType = 'entrada' | 'saida';
export type ThemeMode = 'claro' | 'escuro';

export interface Account {
  id?: number;
  nome: string;
  tipo: AccountType;
  banco: string;
  cor?: string;
}

export interface Transaction {
  id?: number;
  accountId: number;
  data: string; // formato YYYY-MM-DD
  descricao: string;
  descricaoLimpa: string;
  valor: number; // centavos (inteiro, positivo)
  tipo: TransactionType;
  categoriaId?: number;
  recorrente?: boolean;
  hashDedup: string;
  origemArquivo?: string;
  ignorado?: boolean; // ex: faturas ou transferências próprias marcadas para não duplicar
}

export interface Category {
  id?: number;
  nome: string;
  cor: string;
  icone: string;
  essencial: boolean; // se é despesa fixa/essencial para cálculo da reserva
  padrao: boolean;
}

export interface Rule {
  id?: number;
  padrao: string; // texto para correspondência (ex: "IFOOD", "UBER")
  categoriaId: number;
}

export interface Saving {
  id?: number;
  nome: string;
  valor: number; // centavos
  atualizadoEm: string;
}

export interface Goal {
  id?: number;
  nome: string;
  valorAlvo: number; // centavos
  prazo: string; // YYYY-MM-DD
}

export interface AppSetting {
  id: string; // sempre 'global'
  geminiApiKey?: string;
  modelo?: string;
  tema: ThemeMode;
  metaReservaMeses: number; // padrão: 6 meses
  onboardingConcluido?: boolean;
}
