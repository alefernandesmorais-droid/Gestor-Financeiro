import { describe, it, expect } from 'vitest';
import { analisarMeta, calcularMesesAtePrazo } from '../src/lib/calculations/goals';
import type { Goal } from '../src/types';

describe('Metas Financeiras', () => {
  it('calcula o aporte mensal necessário e a viabilidade frente à sobra', () => {
    // Meta: R$ 6.000,00 daqui a 6 meses
    const meta: Goal = {
      id: 1,
      nome: 'Viagem Férias',
      valorAlvo: 600000,
      prazo: '2027-05-01',
    };

    // Sobra média de R$ 2.000,00
    // Aporte necessário aproximado
    const analise = analisarMeta(meta, 200000);

    expect(analise.aporteMensalCentavos).toBeGreaterThan(0);
    expect(analise.mesesRestantes).toBeGreaterThanOrEqual(1);
    expect(analise.cabeNaSobra).toBe(true);
    expect(analise.status).toBe('tranquilo');
  });

  it('identifica quando o aporte excede a sobra média mensal', () => {
    // Meta de R$ 10.000 em 2 meses (aporte de R$ 5.000/mês) para sobra de R$ 800
    const meta: Goal = {
      id: 2,
      nome: 'Carro',
      valorAlvo: 1000000,
      prazo: '2026-12-01',
    };

    const analise = analisarMeta(meta, 80000);
    expect(analise.cabeNaSobra).toBe(false);
    expect(analise.status).toBe('fora_do_alcance');
  });
});
