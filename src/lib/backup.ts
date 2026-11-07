/**
 * Utilitários de Backup e Restauração de dados locais (IndexedDB)
 * Permite exportar e importar todo o histórico em arquivo JSON seguro.
 */

import { db } from '../db/db';
import type { Account, Transaction, Category, Rule, Saving, Goal, AppSetting } from '../types';

export interface BackupSobra {
  versao: number;
  dataExportacao: string;
  app: 'Sobra';
  dados: {
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    rules: Rule[];
    savings: Saving[];
    goals: Goal[];
    settings: AppSetting[];
  };
}

/**
 * Gera o objeto de backup contendo todos os dados do banco local
 */
export async function gerarObjetoBackup(): Promise<BackupSobra> {
  const [accounts, transactions, categories, rules, savings, goals, settings] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.categories.toArray(),
    db.rules.toArray(),
    db.savings.toArray(),
    db.goals.toArray(),
    db.settings.toArray(),
  ]);

  return {
    versao: 1,
    dataExportacao: new Date().toISOString(),
    app: 'Sobra',
    dados: {
      accounts,
      transactions,
      categories,
      rules,
      savings,
      goals,
      settings,
    },
  };
}

/**
 * Dispara o download do arquivo de backup no navegador
 */
export async function baixarBackupJSON(): Promise<void> {
  const backup = await gerarObjetoBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `sobra-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Valida a estrutura de um arquivo de backup
 */
export function validarBackup(obj: any): obj is BackupSobra {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.app !== 'Sobra' || typeof obj.versao !== 'number') return false;
  if (!obj.dados || typeof obj.dados !== 'object') return false;
  if (!Array.isArray(obj.dados.transactions) || !Array.isArray(obj.dados.categories)) return false;
  return true;
}

/**
 * Restaura todos os dados a partir de um JSON de backup
 */
export async function restaurarBackup(jsonString: string): Promise<{ totalTransacoes: number }> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    throw new Error('O arquivo selecionado não é um JSON válido.');
  }

  if (!validarBackup(parsed)) {
    throw new Error('O arquivo não possui o formato de backup oficial do Sobra.');
  }

  const { accounts, transactions, categories, rules, savings, goals, settings } = parsed.dados;

  await db.transaction('rw', [
    db.accounts,
    db.transactions,
    db.categories,
    db.rules,
    db.savings,
    db.goals,
    db.settings,
  ], async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.categories.clear();
    await db.rules.clear();
    await db.savings.clear();
    await db.goals.clear();
    await db.settings.clear();

    if (accounts.length > 0) await db.accounts.bulkAdd(accounts);
    if (transactions.length > 0) await db.transactions.bulkAdd(transactions);
    if (categories.length > 0) await db.categories.bulkAdd(categories);
    if (rules.length > 0) await db.rules.bulkAdd(rules);
    if (savings.length > 0) await db.savings.bulkAdd(savings);
    if (goals.length > 0) await db.goals.bulkAdd(goals);
    if (settings.length > 0) await db.settings.bulkAdd(settings);
  });

  return { totalTransacoes: transactions.length };
}
