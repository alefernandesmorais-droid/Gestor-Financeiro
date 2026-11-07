import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcel, parseCSVInteligente } from '../src/lib/parsers/spreadsheetParser';

describe('Parser Inteligente de Planilhas (Excel e CSV)', () => {
  it('lê e extrai transações de múltiplas abas geradas em Excel', async () => {
    // Cria um arquivo Excel em memória com estrutura idêntica à do usuário
    const wb = XLSX.utils.book_new();

    const dadosAba1 = [
      ['Novembro 2026 • Gestão Financeira'],
      ['💼 CARTEIRA', '', '📉 GASTOS TOTAL', '', '💰 SALDO LÍQUIDO'],
      [11800, '', 11538.36, '', 261.64],
      ['✅ Pago:', 15157.97, '⏳ Pendente:', -3619.61],
      ['Despesa', 'Categoria', 'Valor (R$)', 'Pago?', 'Parcela', 'Cartão / Detalhes', 'Observações'],
      ['Rent', '🏠 Moradia', 2545.2, true],
      ['Fatura Itau', '💳 Cartão de Crédito', 279, true],
      ['Condominio', '🏠 Moradia', 771.54, false],
      ['Fies Mo', '🎓 Educação', 308.47, true],
      ['Mae Gasto - itau (Celular Ana)', '💳 Cartão de Crédito', -279, '', 11, 'Parc 12x'],
    ];

    const dadosAba2 = [
      ['Outubro 2026 • Gestão Financeira'],
      ['', '', 'Gastos Total', 9692.42],
      ['', '', 'Carteira', 10067.56],
      ['', '', 'Saldo Liquido', 375.13],
      ['Bill', 'Value', 'Status', 'Installments'],
      ['Rent', 2443.45, 'Paid'],
      ['Fatura Itau', 2696.18, 'Paid'],
      ['Faculdade SLI', 359.46, 'Paid'],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(dadosAba1);
    const ws2 = XLSX.utils.aoa_to_sheet(dadosAba2);

    XLSX.utils.book_append_sheet(wb, ws1, 'Nov 26');
    XLSX.utils.book_append_sheet(wb, ws2, 'Out 26');

    const bufferExcel = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const resultado = await parseExcel(bufferExcel, 'Expense.xlsx');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.totalTransacoes).toBe(8); // 5 da primeira aba + 3 da segunda
    expect(resultado.abasProcessadas.length).toBe(2);
    expect(resultado.transacoes.some((t) => t.descricao === 'Rent')).toBe(true);
    expect(resultado.transacoes.some((t) => t.descricao === 'Fatura Itau')).toBe(true);

    const rent = resultado.transacoes.find((t) => t.descricao === 'Rent' && t.data.startsWith('2026-11'));
    expect(rent).toBeDefined();
    expect(rent?.valor).toBe(254520); // R$ 2.545,20 em centavos
    expect(rent?.tipo).toBe('saida');
  });

  it('lê conteúdo CSV com títulos e caixas de resumo nas primeiras linhas', async () => {
    const csvConteudo = `Novembro 2026 • Gestão Financeira,,,,,,,,,
💼 CARTEIRA,,📉 GASTOS TOTAL,,💰 SALDO LÍQUIDO,,🏦 Rendimento C6
"R$ 11.800,00",,"R$ 11.538,36",,"R$ 261,64",,"R$ 55.341,30"
✅ Pago:,"R$ 15.157,97",⏳ Pendente:,"-R$ 3.619,61",,
Despesa,Categoria,Valor (R$),Pago?,Parcela,Cartão / Detalhes,Observações
Rent,🏠 Moradia,"R$ 2.545,20",TRUE,,,
Fatura Itau,💳 Cartão de Crédito,"R$ 279,00",TRUE,,,
Condominio,🏠 Moradia,"R$ 771,54",FALSE,,,
Fatura - C6,💳 Cartão de Crédito,"R$ 10.183,89",TRUE,,,
Fies Mo,🎓 Educação,"R$ 308,47",TRUE,,,
Luz,🏠 Moradia,"R$ 231,78",TRUE,,,
Mae Gasto - itau (Celular Ana),💳 Cartão de Crédito,"-R$ 279,00",,11,Parc 12x,`;

    const resultado = await parseCSVInteligente(csvConteudo, 'Expense_-_Nov_26.csv');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.totalTransacoes).toBe(7);
    expect(resultado.transacoes.some((t) => t.descricao === 'Rent')).toBe(true);
    expect(resultado.transacoes.some((t) => t.categoriaSugerida?.includes('Moradia'))).toBe(true);

    const rent = resultado.transacoes.find((t) => t.descricao === 'Rent');
    expect(rent?.data.startsWith('2026-11')).toBe(true);
    expect(rent?.valor).toBe(254520);
  });
});
