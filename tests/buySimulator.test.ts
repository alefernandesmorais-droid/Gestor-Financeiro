import { describe, it, expect } from 'vitest';
import { simularCompra } from '../src/lib/calculations/buySimulator';

describe('Simulador de Compra (Posso comprar?)', () => {
  it('classifica como verde compra parcelada que compromete menos de 40% da sobra', () => {
    // Compra de R$ 1.000 em 10x de R$ 100, sobra média de R$ 1.500
    const res = simularCompra({
      valorCentavos: 100000,
      formaPagamento: 'parcelado',
      numeroParcelas: 10,
      sobraMensalMediaCentavos: 150000,
      reservaAtualCentavos: 500000,
    });

    expect(res.semaforo).toBe('verde');
    expect(res.valorParcelaCentavos).toBe(10000); // R$ 100,00
    expect(res.sobraMensalDepoisCentavos).toBe(140000); // R$ 1.400,00
    expect(res.mesesComprometidos).toBe(10);
    expect(res.tempoJuntarMeses).toBe(1); // Em 1 mês junta R$ 1.000 com sobra de R$ 1.500
  });

  it('classifica como amarelo compra parcelada que compromete entre 40% e 100% da sobra', () => {
    // Compra de R$ 6.000 em 10x de R$ 600, sobra média de R$ 1.000 (compromete 60%)
    const res = simularCompra({
      valorCentavos: 600000,
      formaPagamento: 'parcelado',
      numeroParcelas: 10,
      sobraMensalMediaCentavos: 100000,
      reservaAtualCentavos: 200000,
    });

    expect(res.semaforo).toBe('amarelo');
    expect(res.valorParcelaCentavos).toBe(60000);
    expect(res.sobraMensalDepoisCentavos).toBe(40000);
  });

  it('classifica como vermelho compra cuja parcela é maior que a sobra', () => {
    // Parcela de R$ 800 para sobra de R$ 500
    const res = simularCompra({
      valorCentavos: 400000,
      formaPagamento: 'parcelado',
      numeroParcelas: 5, // 800/mês
      sobraMensalMediaCentavos: 50000,
      reservaAtualCentavos: 50000,
    });

    expect(res.semaforo).toBe('vermelho');
    expect(res.sobraMensalDepoisCentavos).toBeLessThan(0);
  });

  it('calcula juros de parcelamento quando informado', () => {
    // R$ 1.000 em 10x com 2% de juros ao mês
    const res = simularCompra({
      valorCentavos: 100000,
      formaPagamento: 'parcelado',
      numeroParcelas: 10,
      taxaJurosMensalPercentual: 2,
      sobraMensalMediaCentavos: 200000,
    });

    // Parcela deve ser maior que R$ 100,00
    expect(res.valorParcelaCentavos).toBeGreaterThan(10000);
    expect(res.valorTotalCentavos).toBeGreaterThan(100000);
  });
});
