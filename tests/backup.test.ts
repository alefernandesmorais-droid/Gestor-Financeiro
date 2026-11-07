import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { validarBackup, restaurarBackup, gerarObjetoBackup } from '../src/lib/backup';
import { db } from '../src/db/db';

describe('Backup e Restauração JSON', () => {
  it('valida corretamente a estrutura oficial de um backup do Sobra', () => {
    const backupValido = {
      versao: 1,
      dataExportacao: new Date().toISOString(),
      app: 'Sobra',
      dados: {
        accounts: [],
        transactions: [],
        categories: [],
        rules: [],
        savings: [],
        goals: [],
        settings: [],
      },
    };

    expect(validarBackup(backupValido)).toBe(true);

    // Estrutura inválida
    expect(validarBackup({ app: 'OutroApp' })).toBe(false);
    expect(validarBackup(null)).toBe(false);
    expect(validarBackup({ app: 'Sobra', versao: 1, dados: {} })).toBe(false);
  });

  it('restaura backup JSON e insere transações no banco local', async () => {
    await db.inicializarDadosPadrao();

    const payload = JSON.stringify({
      versao: 1,
      dataExportacao: new Date().toISOString(),
      app: 'Sobra',
      dados: {
        accounts: [{ id: 1, nome: 'Conta Teste', banco: 'Nubank', tipo: 'conta' }],
        transactions: [
          {
            id: 1,
            accountId: 1,
            data: '2026-11-01',
            descricao: 'Salário',
            descricaoLimpa: 'SALARIO',
            valor: 500000,
            tipo: 'entrada',
            hashDedup: 'h_test_1',
          },
        ],
        categories: [],
        rules: [],
        savings: [],
        goals: [],
        settings: [],
      },
    });

    const res = await restaurarBackup(payload);
    expect(res.totalTransacoes).toBe(1);

    const transacoesNoBanco = await db.transactions.toArray();
    expect(transacoesNoBanco.length).toBe(1);
    expect(transacoesNoBanco[0].descricao).toBe('Salário');
  });
});
