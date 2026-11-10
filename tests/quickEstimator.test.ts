import { describe, it, expect } from 'vitest';
import { calcularVisaoRapida, simularCompraRapida } from '../src/lib/calculations/quickEstimator';

describe('quickEstimator - Modo Visão Rápida', () => {
  it('calcula sobra mensal, anual e percentuais corretamente', () => {
    const res = calcularVisaoRapida({
      rendaMensalCentavos: 500000, // R$ 5.000,00
      despesasFixasCentavos: 350000, // R$ 3.500,00
      reservaAtualCentavos: 1050000, // R$ 10.500,00
    });

    expect(res.sobraMensalCentavos).toBe(150000); // R$ 1.500,00
    expect(res.sobraAnualCentavos).toBe(1800000); // R$ 18.000,00
    expect(res.percentualSobra).toBe(30);
    expect(res.percentualFixos).toBe(70);
    expect(res.mesesCoberturaReserva).toBe(3.0);
    expect(res.statusSobra).toBe('confortavel');
  });

  it('identifica situação de alerta quando os fixos superam a renda', () => {
    const res = calcularVisaoRapida({
      rendaMensalCentavos: 300000,
      despesasFixasCentavos: 320000,
      reservaAtualCentavos: 200000,
    });

    expect(res.sobraMensalCentavos).toBe(-20000);
    expect(res.statusSobra).toBe('alerta');
  });

  it('simula compra rápida com semáforo verde quando a parcela é baixa', () => {
    const sim = simularCompraRapida(
      100000, // R$ 1.000,00
      10, // 10x de R$ 100,00
      150000 // Sobra de R$ 1.500,00
    );

    expect(sim.valorParcelaCentavos).toBe(10000);
    expect(sim.sobraDepoisCentavos).toBe(140000);
    expect(sim.status).toBe('verde');
  });

  it('simula compra rápida com semáforo amarelo quando a parcela consome mais de 50% da sobra', () => {
    const sim = simularCompraRapida(
      800000, // R$ 8.000,00
      10, // 10x de R$ 800,00
      100000 // Sobra de R$ 1.000,00
    );

    expect(sim.valorParcelaCentavos).toBe(80000); // R$ 800
    expect(sim.sobraDepoisCentavos).toBe(20000); // R$ 200
    expect(sim.status).toBe('amarelo');
  });

  it('simula compra rápida com semáforo vermelho quando a parcela supera a sobra', () => {
    const sim = simularCompraRapida(
      300000, // R$ 3.000,00
      2, // 2x de R$ 1.500,00
      100000 // Sobra de R$ 1.000,00
    );

    expect(sim.status).toBe('vermelho');
    expect(sim.sobraDepoisCentavos).toBe(-50000);
  });
});
