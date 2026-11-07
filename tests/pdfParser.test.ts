import { describe, it, expect } from 'vitest';
import { converterDataTexto, parseLinhasTextoExtrato } from '../src/lib/parsers/pdfParser';

describe('Parser de PDF de Extratos e Faturas', () => {
  it('converte diferentes formatos de data textual de faturas brasileiras', () => {
    expect(converterDataTexto('15/11/2026')).toBe('2026-11-15');
    expect(converterDataTexto('05/11', 2026)).toBe('2026-11-05');
    expect(converterDataTexto('12 NOV', 2026)).toBe('2026-11-12');
    expect(converterDataTexto('28 DEZ', 2026)).toBe('2026-12-28');
  });

  it('faz parse de linhas de fatura de cartão no formato padrão brasileiro', () => {
    const linhasFatura = [
      '05/11/2026 IFOOD *RESTAURANTE MINEIRO R$ 68,90',
      '07/11/2026 UBER *TRIP RIDE 34,50',
      '08/11/2026 NETFLIX.COM MENSAIS R$ 59,90',
      '10/11/2026 DROGASIL FARMACIA 112,40 D',
      '15/11/2026 PAGAMENTO DE FATURA INTER -1.250,00',
    ];

    const transacoes = parseLinhasTextoExtrato(linhasFatura, 2026);

    expect(transacoes.length).toBe(5);

    // iFood
    expect(transacoes[0].data).toBe('2026-11-05');
    expect(transacoes[0].valor).toBe(6890); // R$ 68,90
    expect(transacoes[0].tipo).toBe('saida');
    expect(transacoes[0].ignorado).toBe(false);

    // Uber
    expect(transacoes[1].valor).toBe(3450);

    // Drogasil
    expect(transacoes[3].valor).toBe(11240);

    // Pagamento de fatura (detectado como ignorado para não duplicar despesa)
    expect(transacoes[4].ignorado).toBe(true);
    expect(transacoes[4].motivoIgnorado).toContain('fatura');
  });

  it('faz parse de extrato bancário com formato dia/mês abreviado e entradas', () => {
    const linhasExtrato = [
      '02 NOV PAGTO SALARIO EMPRESA TECH 5.200,00 C',
      '04 NOV ALUGUEL RESIDENCIAL 1.600,00 D',
      '06 NOV SUPERMERCADO CARREFOUR 450,00',
    ];

    const transacoes = parseLinhasTextoExtrato(linhasExtrato, 2026);

    expect(transacoes.length).toBe(3);

    // Salário (Entrada com C de Crédito)
    expect(transacoes[0].data).toBe('2026-11-02');
    expect(transacoes[0].valor).toBe(520000);
    expect(transacoes[0].tipo).toBe('entrada');

    // Aluguel (Saída com D de Débito)
    expect(transacoes[1].data).toBe('2026-11-04');
    expect(transacoes[1].valor).toBe(160000);
    expect(transacoes[1].tipo).toBe('saida');
  });
});
