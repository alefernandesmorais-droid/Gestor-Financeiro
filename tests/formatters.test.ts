import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  reaisToCentavos,
  centavosToReais,
  formatDate,
  formatMonthYear,
  formatShortMonthYear,
} from '../src/lib/formatters';

describe('Formatadores no padrão pt-BR', () => {
  it('converte centavos inteiros para formato de moeda brasileira', () => {
    // R$ 1.234,56
    const formatado = formatCurrency(123456);
    // Espera conter 1.234,56 e R$
    expect(formatado).toMatch(/1\.234,56/);
    expect(formatado).toMatch(/R\$/);
  });

  it('formata valores zero e negativos corretamente', () => {
    expect(formatCurrency(0)).toMatch(/0,00/);
    expect(formatCurrency(-5000)).toMatch(/50,00/);
  });

  it('converte reais para centavos inteiros sem perda de precisão', () => {
    expect(reaisToCentavos(12.34)).toBe(1234);
    expect(reaisToCentavos('1.250,90')).toBe(125090);
    expect(reaisToCentavos('0,50')).toBe(50);
    expect(reaisToCentavos(0)).toBe(0);
  });

  it('converte centavos para reais em ponto flutuante', () => {
    expect(centavosToReais(123456)).toBe(1234.56);
    expect(centavosToReais(50)).toBe(0.5);
  });

  it('formata datas ISO para dd/mm/aaaa', () => {
    expect(formatDate('2026-11-07')).toBe('07/11/2026');
    expect(formatDate('2026-01-05T12:00:00Z')).toBe('05/01/2026');
  });

  it('formata mês e ano por extenso e abreviado', () => {
    expect(formatMonthYear('2026-11')).toMatch(/novembro de 2026/i);
    expect(formatShortMonthYear('2026-11')).toBe('nov/26');
  });
});
