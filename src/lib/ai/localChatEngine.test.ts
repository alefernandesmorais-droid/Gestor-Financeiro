import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db/db';
import { processarChatLocal } from './localChatEngine';

describe('localChatEngine - Assistente Financeiro Interno', () => {
  beforeEach(async () => {
    await db.inicializarDadosPadrao();

    // Insere transações de teste
    await db.transactions.bulkAdd([
      {
        accountId: 1,
        data: '2026-11-01',
        descricao: 'Salário Empresa XYZ',
        descricaoLimpa: 'salario empresa xyz',
        valor: 500000, // R$ 5.000,00
        tipo: 'entrada',
        categoriaId: 13, // Renda
        ignorado: false,
        recorrente: false,
        hashDedup: 'hash_test_1',
      },
      {
        accountId: 1,
        data: '2026-11-02',
        descricao: 'iFood Entrega Refeição',
        descricaoLimpa: 'ifood entrega refeicao',
        valor: 15000, // R$ 150,00
        tipo: 'saida',
        categoriaId: 3, // Alimentação fora
        ignorado: false,
        recorrente: false,
        hashDedup: 'hash_test_2',
      },
      {
        accountId: 1,
        data: '2026-11-05',
        descricao: 'Cinema e Pipoca',
        descricaoLimpa: 'cinema e pipoca lazer',
        valor: 12000, // R$ 120,00
        tipo: 'saida',
        categoriaId: 7, // Lazer
        ignorado: false,
        recorrente: false,
        hashDedup: 'hash_test_3',
      },
    ]);

    // Poupança/Reserva
    await db.savings.add({
      nome: 'Reserva de Emergência',
      valor: 800000, // R$ 8.000,00
      atualizadoEm: '2026-11-01',
    });
  });

  it('analisa pergunta de compra parcelada com semáforo e vocabulário rico', async () => {
    const resposta = await processarChatLocal(
      'Quero comprar um celular de R$ 3.000. Quanto sobra por mês e por ano? Consigo parcelar em 10x?'
    );

    expect(resposta.cardData).toBeDefined();
    expect(resposta.cardData?.tipo).toBe('compra');
    expect(resposta.cardData?.semaforo).toBe('verde');
    expect(resposta.cardData?.titulo).toContain('orçamento');
    expect(resposta.content).toContain('celular');
    expect(resposta.comoCalculei).toBeDefined();
  });

  it('analisa consulta de gastos com iFood e calcula média e totais', async () => {
    const resposta = await processarChatLocal('Quanto eu gastei com iFood nos últimos 3 meses?');

    expect(resposta.cardData).toBeDefined();
    expect(resposta.cardData?.tipo).toBe('gastos');
    expect(resposta.content.toLowerCase()).toContain('ifood');
    expect(resposta.cardData?.metricas.length).toBeGreaterThan(0);
  });

  it('analisa simulação de saque de reserva de emergência', async () => {
    const resposta = await processarChatLocal('Tenho R$ 8.000 na poupança. Se eu tirar R$ 2.000 agora, quanto tempo leva pra repor?');

    expect(resposta.cardData).toBeDefined();
    expect(resposta.cardData?.tipo).toBe('reserva');
    expect(resposta.content.toLowerCase()).toContain('reserva');
  });

  it('analisa simulação de corte de gastos', async () => {
    const resposta = await processarChatLocal('Se eu cortar 20% de lazer, quanto eu junto em um ano?');

    expect(resposta.cardData).toBeDefined();
    expect(resposta.cardData?.tipo).toBe('corte');
    expect(resposta.cardData?.metricas.some(m => m.rotulo.toLowerCase().includes('anual'))).toBe(true);
  });

  it('responde panorama geral quando perguntado sobre sobra do mês', async () => {
    const resposta = await processarChatLocal('Quanto sobrou esse mês? Como estão minhas finanças?');

    expect(resposta.cardData).toBeDefined();
    expect(resposta.cardData?.tipo).toBe('panorama');
    expect(resposta.content).toContain('sobra');
  });
});
