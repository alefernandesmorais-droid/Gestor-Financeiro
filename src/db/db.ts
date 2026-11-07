import Dexie, { type Table } from 'dexie';
import type { Account, Transaction, Category, Rule, Saving, Goal, AppSetting } from '../types';

export const CATEGORIAS_PADRAO: Omit<Category, 'id'>[] = [
  { nome: 'Moradia', cor: '#3B82F6', icone: 'Home', essencial: true, padrao: true },
  { nome: 'Mercado', cor: '#10B981', icone: 'ShoppingCart', essencial: true, padrao: true },
  { nome: 'Alimentação fora', cor: '#F59E0B', icone: 'Utensils', essencial: false, padrao: true },
  { nome: 'Transporte', cor: '#6366F1', icone: 'Car', essencial: true, padrao: true },
  { nome: 'Saúde', cor: '#EC4899', icone: 'HeartPulse', essencial: true, padrao: true },
  { nome: 'Educação', cor: '#8B5CF6', icone: 'GraduationCap', essencial: true, padrao: true },
  { nome: 'Lazer', cor: '#14B8A6', icone: 'Smile', essencial: false, padrao: true },
  { nome: 'Assinaturas', cor: '#A855F7', icone: 'Tv', essencial: false, padrao: true },
  { nome: 'Compras', cor: '#F97316', icone: 'ShoppingBag', essencial: false, padrao: true },
  { nome: 'Impostos/Taxas', cor: '#64748B', icone: 'Receipt', essencial: true, padrao: true },
  { nome: 'Dívidas/Cartão', cor: '#EF4444', icone: 'CreditCard', essencial: true, padrao: true },
  { nome: 'Investimentos', cor: '#059669', icone: 'TrendingUp', essencial: false, padrao: true },
  { nome: 'Renda (salário)', cor: '#0E9F6E', icone: 'Briefcase', essencial: false, padrao: true },
  { nome: 'Renda extra', cor: '#34D399', icone: 'Coins', essencial: false, padrao: true },
  { nome: 'Transferências', cor: '#94A3B8', icone: 'ArrowLeftRight', essencial: false, padrao: true },
  { nome: 'Outros', cor: '#9CA3AF', icone: 'MoreHorizontal', essencial: false, padrao: true },
];

export class SobraDatabase extends Dexie {
  accounts!: Table<Account, number>;
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, number>;
  rules!: Table<Rule, number>;
  savings!: Table<Saving, number>;
  goals!: Table<Goal, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('SobraDB');
    this.version(1).stores({
      accounts: '++id, nome, tipo, banco',
      transactions: '++id, accountId, data, valor, tipo, categoriaId, hashDedup, recorrente, ignorado',
      categories: '++id, nome, essencial, padrao',
      rules: '++id, padrao, categoriaId',
      savings: '++id, nome, atualizadoEm',
      goals: '++id, nome, prazo',
      settings: 'id',
    });
  }

  async inicializarDadosPadrao() {
    const totalCategorias = await this.categories.count();
    if (totalCategorias === 0) {
      await this.categories.bulkAdd(CATEGORIAS_PADRAO as Category[]);
    }

    const config = await this.settings.get('global');
    if (!config) {
      await this.settings.put({
        id: 'global',
        tema: 'claro',
        modelo: 'gemini-2.5-flash',
        metaReservaMeses: 6,
        onboardingConcluido: false,
      });
    }
  }

  async limparTodosDados() {
    await this.transaction('rw', [
      this.accounts,
      this.transactions,
      this.categories,
      this.rules,
      this.savings,
      this.goals,
      this.settings,
    ], async () => {
      await this.accounts.clear();
      await this.transactions.clear();
      await this.categories.clear();
      await this.rules.clear();
      await this.savings.clear();
      await this.goals.clear();
      await this.settings.clear();
    });
    await this.inicializarDadosPadrao();
  }
}

export const db = new SobraDatabase();
