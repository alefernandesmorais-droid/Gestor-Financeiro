/**
 * Dados de exemplo fictícios brasileiros para demonstração imediata do Sobra
 */

import { db } from './db';
import { gerarHashDedup, normalizarDescricao } from '../lib/calculations/dedup';
import type { Account, Transaction, Saving, Goal } from '../types';

export async function carregarDadosExemplo(): Promise<{ totalTransacoes: number }> {
  // Limpa transações anteriores para inserção limpa dos dados de exemplo
  await db.transaction('rw', [
    db.accounts,
    db.transactions,
    db.savings,
    db.goals,
    db.rules,
  ], async () => {
    await db.accounts.clear();
    await db.transactions.clear();
    await db.savings.clear();
    await db.goals.clear();
    await db.rules.clear();
  });

  // Cria Contas
  const contaNubankId = await db.accounts.add({
    nome: 'Conta Corrente Nubank',
    banco: 'Nubank',
    tipo: 'conta',
    cor: '#8A05BE',
  });

  const cartaoInterId = await db.accounts.add({
    nome: 'Cartão de Crédito Inter',
    banco: 'Banco Inter',
    tipo: 'cartao',
    cor: '#FF7A00',
  });

  // Reserva / Poupança
  await db.savings.bulkAdd([
    {
      nome: 'Reserva de Emergência (CDB 100% CDI)',
      valor: 1450000, // R$ 14.500,00
      atualizadoEm: new Date().toISOString().slice(0, 10),
    },
    {
      nome: 'Poupança Caixa',
      valor: 320000, // R$ 3.200,00
      atualizadoEm: new Date().toISOString().slice(0, 10),
    },
  ]);

  // Metas
  await db.goals.bulkAdd([
    {
      nome: 'Viagem de Férias',
      valorAlvo: 600000, // R$ 6.000,00
      prazo: '2027-01-15',
    },
    {
      nome: 'Troca de Computador',
      valorAlvo: 420000, // R$ 4.200,00
      prazo: '2026-12-20',
    },
  ]);

  // Busca mapa de categorias
  const categorias = await db.categories.toArray();
  const catMap = new Map<string, number>();
  for (const c of categorias) {
    if (c.id) catMap.set(c.nome, c.id);
  }

  // Gera transações dos últimos 3 meses
  const hoje = new Date();
  const transacoesRaw: Array<{
    diasAtras: number;
    accountId: number;
    desc: string;
    valorCentavos: number;
    tipo: 'entrada' | 'saida';
    categoria: string;
    recorrente?: boolean;
    ignorado?: boolean;
  }> = [
    // Mês Atual
    { diasAtras: 2, accountId: contaNubankId, desc: 'PAGAMENTO SALARIO EMPRESA TECH', valorCentavos: 520000, tipo: 'entrada', categoria: 'Renda (salário)', recorrente: true },
    { diasAtras: 3, accountId: contaNubankId, desc: 'TRANSFERENCIA PIX RECEBIDA FREELA', valorCentavos: 95000, tipo: 'entrada', categoria: 'Renda extra' },
    { diasAtras: 4, accountId: contaNubankId, desc: 'PAGAMENTO ALUGUEL APTO', valorCentavos: 160000, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 4, accountId: contaNubankId, desc: 'CONDOMINIO EDIFICIO SOLAR', valorCentavos: 42000, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 5, accountId: cartaoInterId, desc: 'SUPERMERCADO CARREFOUR', valorCentavos: 54060, tipo: 'saida', categoria: 'Mercado' },
    { diasAtras: 6, accountId: cartaoInterId, desc: 'IFOOD *RESTAURANTE MINEIRO', valorCentavos: 6890, tipo: 'saida', categoria: 'Alimentação fora' },
    { diasAtras: 7, accountId: cartaoInterId, desc: 'UBER *TRIP RIDE', valorCentavos: 3450, tipo: 'saida', categoria: 'Transporte' },
    { diasAtras: 8, accountId: cartaoInterId, desc: 'NETFLIX.COM MENSAIS', valorCentavos: 5990, tipo: 'saida', categoria: 'Assinaturas', recorrente: true },
    { diasAtras: 9, accountId: cartaoInterId, desc: 'SPOTIFY BRASIL PREMIUM', valorCentavos: 2190, tipo: 'saida', categoria: 'Assinaturas', recorrente: true },
    { diasAtras: 10, accountId: cartaoInterId, desc: 'DROGASIL FARMACIA', valorCentavos: 11240, tipo: 'saida', categoria: 'Saúde' },
    { diasAtras: 11, accountId: cartaoInterId, desc: 'SMART FIT ACADEMIA MENSAL', valorCentavos: 12990, tipo: 'saida', categoria: 'Saúde', recorrente: true },
    { diasAtras: 12, accountId: cartaoInterId, desc: 'MERCADO LIVRE BRASIL COMPRA', valorCentavos: 18990, tipo: 'saida', categoria: 'Compras' },
    { diasAtras: 14, accountId: contaNubankId, desc: 'ENEL DISTRIBUICAO ENERGIA', valorCentavos: 14520, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 15, accountId: contaNubankId, desc: 'SABESP AGUA E ESGOTO', valorCentavos: 7850, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 16, accountId: cartaoInterId, desc: 'CINEMARK INGRESSOS LAZER', valorCentavos: 8500, tipo: 'saida', categoria: 'Lazer' },
    { diasAtras: 18, accountId: cartaoInterId, desc: 'IFOOD *BURGER DELIVERY', valorCentavos: 5400, tipo: 'saida', categoria: 'Alimentação fora' },
    { diasAtras: 19, accountId: contaNubankId, desc: 'PAGAMENTO DE FATURA INTER', valorCentavos: 125000, tipo: 'saida', categoria: 'Dívidas/Cartão', ignorado: true },

    // Mês Anterior (-30 dias)
    { diasAtras: 32, accountId: contaNubankId, desc: 'PAGAMENTO SALARIO EMPRESA TECH', valorCentavos: 520000, tipo: 'entrada', categoria: 'Renda (salário)', recorrente: true },
    { diasAtras: 34, accountId: contaNubankId, desc: 'PAGAMENTO ALUGUEL APTO', valorCentavos: 160000, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 34, accountId: contaNubankId, desc: 'CONDOMINIO EDIFICIO SOLAR', valorCentavos: 42000, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 35, accountId: cartaoInterId, desc: 'SUPERMERCADO PAO DE ACUCAR', valorCentavos: 62040, tipo: 'saida', categoria: 'Mercado' },
    { diasAtras: 36, accountId: cartaoInterId, desc: 'IFOOD *PIZZARIA BELLA', valorCentavos: 8900, tipo: 'saida', categoria: 'Alimentação fora' },
    { diasAtras: 37, accountId: cartaoInterId, desc: 'UBER *TRIP RIDE', valorCentavos: 4280, tipo: 'saida', categoria: 'Transporte' },
    { diasAtras: 38, accountId: cartaoInterId, desc: 'NETFLIX.COM MENSAIS', valorCentavos: 5990, tipo: 'saida', categoria: 'Assinaturas', recorrente: true },
    { diasAtras: 39, accountId: cartaoInterId, desc: 'SPOTIFY BRASIL PREMIUM', valorCentavos: 2190, tipo: 'saida', categoria: 'Assinaturas', recorrente: true },
    { diasAtras: 40, accountId: cartaoInterId, desc: 'SMART FIT ACADEMIA MENSAL', valorCentavos: 12990, tipo: 'saida', categoria: 'Saúde', recorrente: true },
    { diasAtras: 42, accountId: contaNubankId, desc: 'ENEL DISTRIBUICAO ENERGIA', valorCentavos: 13890, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 43, accountId: contaNubankId, desc: 'CLARO FIBRA INTERNET', valorCentavos: 11990, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 44, accountId: cartaoInterId, desc: 'RESTAURANTE OUTBACK', valorCentavos: 21000, tipo: 'saida', categoria: 'Alimentação fora' },
    { diasAtras: 45, accountId: cartaoInterId, desc: 'ZARA BRASIL ROUPAS', valorCentavos: 29900, tipo: 'saida', categoria: 'Compras' },

    // 2 Meses Atrás (-60 dias)
    { diasAtras: 62, accountId: contaNubankId, desc: 'PAGAMENTO SALARIO EMPRESA TECH', valorCentavos: 520000, tipo: 'entrada', categoria: 'Renda (salário)', recorrente: true },
    { diasAtras: 63, accountId: contaNubankId, desc: 'FREELANCE DESIGN GRAFICO', valorCentavos: 60000, tipo: 'entrada', categoria: 'Renda extra' },
    { diasAtras: 64, accountId: contaNubankId, desc: 'PAGAMENTO ALUGUEL APTO', valorCentavos: 160000, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 64, accountId: contaNubankId, desc: 'CONDOMINIO EDIFICIO SOLAR', valorCentavos: 42000, tipo: 'saida', categoria: 'Moradia', recorrente: true },
    { diasAtras: 65, accountId: cartaoInterId, desc: 'SUPERMERCADO DIA', valorCentavos: 49000, tipo: 'saida', categoria: 'Mercado' },
    { diasAtras: 67, accountId: cartaoInterId, desc: 'POSTO IPIRANGA COMBUSTIVEL', valorCentavos: 22000, tipo: 'saida', categoria: 'Transporte' },
    { diasAtras: 68, accountId: cartaoInterId, desc: 'NETFLIX.COM MENSAIS', valorCentavos: 5990, tipo: 'saida', categoria: 'Assinaturas', recorrente: true },
    { diasAtras: 69, accountId: cartaoInterId, desc: 'SPOTIFY BRASIL PREMIUM', valorCentavos: 2190, tipo: 'saida', categoria: 'Assinaturas', recorrente: true },
    { diasAtras: 70, accountId: cartaoInterId, desc: 'SMART FIT ACADEMIA MENSAL', valorCentavos: 12990, tipo: 'saida', categoria: 'Saúde', recorrente: true },
  ];

  const transacoesFinal: Transaction[] = [];

  for (const item of transacoesRaw) {
    const dataCalculada = new Date(hoje.getTime() - item.diasAtras * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const descLimpa = normalizarDescricao(item.desc);
    const hash = gerarHashDedup(dataCalculada, item.valorCentavos, item.tipo, descLimpa);
    const catId = catMap.get(item.categoria) || catMap.get('Outros');

    transacoesFinal.push({
      accountId: item.accountId,
      data: dataCalculada,
      descricao: item.desc,
      descricaoLimpa: descLimpa,
      valor: item.valorCentavos,
      tipo: item.tipo,
      categoriaId: catId,
      recorrente: item.recorrente ?? false,
      hashDedup: hash,
      origemArquivo: 'exemplo_ficticio.csv',
      ignorado: item.ignorado ?? false,
    });
  }

  await db.transactions.bulkAdd(transacoesFinal);

  return { totalTransacoes: transacoesFinal.length };
}
