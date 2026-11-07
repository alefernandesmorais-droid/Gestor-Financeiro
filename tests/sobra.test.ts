import { describe, it, expect } from 'vitest';
import {
  calcularEstatisticasPainel,
  obterMesAnterior,
  calcularVariacaoPercentual,
} from '../src/lib/calculations/sobra';
import type { Transaction, Category } from '../src/types';

describe('Cálculos do Painel e Sobra', () => {
  it('retorna o mês anterior corretamente, inclusive na virada de ano', () => {
    expect(obterMesAnterior('2026-11')).toBe('2026-10');
    expect(obterMesAnterior('2027-01')).toBe('2026-12');
  });

  it('calcula variação percentual de forma determinística', () => {
    // Aumento de 50%
    const var1 = calcularVariacaoPercentual(1500, 1000, true);
    expect(var1.percentual).toBe(50);

    // Queda de 25%
    const var2 = calcularVariacaoPercentual(750, 1000, false);
    expect(var2.percentual).toBe(-25);
  });

  it('calcula métricas de Entrou, Saiu, Sobrou e Gastos Fixos x Variáveis', () => {
    const categoriasMock: Category[] = [
      { id: 1, nome: 'Moradia', cor: '#3B82F6', icone: 'Home', essencial: true, padrao: true },
      { id: 2, nome: 'Mercado', cor: '#10B981', icone: 'ShoppingCart', essencial: true, padrao: true },
      { id: 3, nome: 'Assinaturas', cor: '#A855F7', icone: 'Tv', essencial: false, padrao: true },
      { id: 4, nome: 'Renda (salário)', cor: '#0E9F6E', icone: 'Briefcase', essencial: false, padrao: true },
    ];

    const transacoesMock: Transaction[] = [
      // Mês Atual: 2026-11
      {
        accountId: 1,
        data: '2026-11-05',
        descricao: 'Salário Tech',
        descricaoLimpa: 'SALARIO TECH',
        valor: 500000, // R$ 5.000,00
        tipo: 'entrada',
        categoriaId: 4,
        hashDedup: 'h1',
      },
      {
        accountId: 1,
        data: '2026-11-06',
        descricao: 'Aluguel Apto',
        descricaoLimpa: 'ALUGUEL APTO',
        valor: 150000, // R$ 1.500,00 (Fixo)
        tipo: 'saida',
        categoriaId: 1,
        recorrente: true,
        hashDedup: 'h2',
      },
      {
        accountId: 1,
        data: '2026-11-08',
        descricao: 'Supermercado',
        descricaoLimpa: 'SUPERMERCADO',
        valor: 60000, // R$ 600,00 (Variável)
        tipo: 'saida',
        categoriaId: 2,
        hashDedup: 'h3',
      },
      {
        accountId: 1,
        data: '2026-11-10',
        descricao: 'Netflix Mensal',
        descricaoLimpa: 'NETFLIX MENSAL',
        valor: 5990, // R$ 59,90 (Fixo / Assinatura)
        tipo: 'saida',
        categoriaId: 3,
        recorrente: true,
        hashDedup: 'h4',
      },
      // Transação ignorada (ex: pagamento de fatura duplicada)
      {
        accountId: 1,
        data: '2026-11-12',
        descricao: 'Pagamento de Fatura',
        descricaoLimpa: 'PAGAMENTO DE FATURA',
        valor: 100000,
        tipo: 'saida',
        ignorado: true,
        hashDedup: 'h5',
      },
    ];

    const stats = calcularEstatisticasPainel(transacoesMock, categoriasMock, '2026-11');

    // Entrou: R$ 5.000,00 (500000 centavos)
    expect(stats.entrou).toBe(500000);

    // Saiu: 150000 + 60000 + 5990 = 215990 (transação ignorada de 100000 NÃO entra)
    expect(stats.saiu).toBe(215990);

    // Sobrou: 500000 - 215990 = 284010
    expect(stats.sobrou).toBe(284010);

    // Gastos Fixos: Aluguel (150000) + Netflix (5990) = 155990
    expect(stats.gastosFixos).toBe(155990);

    // Gastos Variáveis: Mercado (60000)
    expect(stats.gastosVariaveis).toBe(60000);

    // Assinaturas ativas: Netflix
    expect(stats.assinaturasAtivas.length).toBe(1);
    expect(stats.totalAssinaturas).toBe(5990);

    // Insights automáticos foram gerados
    expect(stats.insights.length).toBeGreaterThan(0);
  });
});
