import { describe, it, expect } from 'vitest';
import { parseCSV, normalizarDataBrasileira } from '../src/lib/parsers/csvParser';

describe('Parser CSV de bancos brasileiros', () => {
  it('normaliza datas em formato brasileiro DD/MM/AAAA para YYYY-MM-DD', () => {
    expect(normalizarDataBrasileira('15/11/2026')).toBe('2026-11-15');
    expect(normalizarDataBrasileira('05-08-2026 14:30')).toBe('2026-08-05');
  });

  it('faz parse de CSV do Nubank (conta corrente)', async () => {
    const csvNubank = `Data,Valor,Identificador,Descrição
01/11/2026,4500.00,id_01,Transferência recebida
02/11/2026,-45.90,id_02,Supermercado Pão de Açúcar
03/11/2026,-1200.00,id_03,Pagamento de Fatura Inter
`;

    const res = await parseCSV(csvNubank, 'extrato_nubank.csv');
    expect(res.transacoes.length).toBe(3);

    expect(res.transacoes[0].tipo).toBe('entrada');
    expect(res.transacoes[0].valor).toBe(450000);

    expect(res.transacoes[1].tipo).toBe('saida');
    expect(res.transacoes[1].valor).toBe(4590);

    expect(res.transacoes[2].ignorado).toBe(true);
  });

  it('faz parse de CSV com colunas de débito e crédito separadas', async () => {
    const csvSeparado = `Data;Histórico;Débito;Crédito
05/11/2026;Aluguel Residencial;1500,00;0,00
06/11/2026;Salário Mensal;0,00;5200,00
`;

    const res = await parseCSV(csvSeparado, 'extrato_banco.csv');
    expect(res.transacoes.length).toBe(2);

    expect(res.transacoes[0].tipo).toBe('saida');
    expect(res.transacoes[0].valor).toBe(150000);

    expect(res.transacoes[1].tipo).toBe('entrada');
    expect(res.transacoes[1].valor).toBe(520000);
  });
});
