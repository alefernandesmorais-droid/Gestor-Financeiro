import { describe, it, expect } from 'vitest';
import { calcularMetricasReserva, simularSaqueReserva } from '../src/lib/calculations/emergencyFund';
import type { Category, Transaction, Saving } from '../src/types';

describe('Reserva de Emergência e Simulação de Saque', () => {
  const categoriasMock: Category[] = [
    { id: 1, nome: 'Moradia', cor: '#3B82F6', icone: 'Home', essencial: true, padrao: true },
    { id: 2, nome: 'Mercado', cor: '#10B981', icone: 'ShoppingCart', essencial: true, padrao: true },
    { id: 3, nome: 'Lazer', cor: '#14B8A6', icone: 'Smile', essencial: false, padrao: true },
  ];

  const transacoesMock: Transaction[] = [
    // Mês 1: Moradia (1500) + Mercado (500) = 2000 essencial. Lazer (300) = não essencial
    { accountId: 1, data: '2026-10-05', descricao: 'Aluguel', descricaoLimpa: 'ALUGUEL', valor: 150000, tipo: 'saida', categoriaId: 1, hashDedup: 'h1' },
    { accountId: 1, data: '2026-10-10', descricao: 'Supermercado', descricaoLimpa: 'SUPERMERCADO', valor: 50000, tipo: 'saida', categoriaId: 2, hashDedup: 'h2' },
    { accountId: 1, data: '2026-10-15', descricao: 'Cinema', descricaoLimpa: 'CINEMA', valor: 30000, tipo: 'saida', categoriaId: 3, hashDedup: 'h3' },
  ];

  const savingsMock: Saving[] = [
    { id: 1, nome: 'CDB 100% CDI', valor: 1200000, atualizadoEm: '2026-11-01' }, // R$ 12.000,00
  ];

  it('calcula cobertura em meses com base exclusivamente nas despesas essenciais', () => {
    // Despesa essencial média = R$ 2.000,00 (200000 centavos)
    // Reserva guardada = R$ 12.000,00 (1200000 centavos)
    // Cobertura esperada = 12.000 / 2.000 = 6.0 meses
    const metricas = calcularMetricasReserva(transacoesMock, categoriasMock, savingsMock, 100000, 6);

    expect(metricas.despesaEssencialMensalCentavos).toBe(200000);
    expect(metricas.reservaAtualCentavos).toBe(1200000);
    expect(metricas.mesesCobertosAtual).toBe(6.0);
    expect(metricas.percentualMetaAtingido).toBe(100);
  });

  it('simula saque de R$ 4.000 e calcula redução de meses e tempo de reposição', () => {
    const metricas = calcularMetricasReserva(transacoesMock, categoriasMock, savingsMock, 100000, 6);
    // Saque de R$ 4.000 (400000 centavos)
    // Reserva restante = 12.000 - 4.000 = 8.000 (800000 centavos)
    // Cobertura restante = 8.000 / 2.000 = 4.0 meses
    // Tempo de reposição com sobra de R$ 1.000/mês = 4 meses
    const simulacao = simularSaqueReserva(400000, metricas);

    expect(simulacao.reservaDepoisCentavos).toBe(800000);
    expect(simulacao.mesesCobertosDepois).toBe(4.0);
    expect(simulacao.tempoParaReporMeses).toBe(4);
    expect(simulacao.nivelImpacto).toBe('moderado');
  });
});
