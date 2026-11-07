import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseExcel, parseCSVInteligente } from '../src/lib/parsers/spreadsheetParser';

describe('Parser Inteligente de Planilhas (Excel e CSV)', () => {
  it('lê e extrai transações de todas as abas do arquivo Expense.xlsx', async () => {
    const caminhoXlsx = path.resolve(process.cwd(), 'Expense.xlsx');
    const buffer = fs.readFileSync(caminhoXlsx);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const resultado = await parseExcel(arrayBuffer, 'Expense.xlsx');

    expect(resultado.totalTransacoes).toBeGreaterThan(50);
    expect(resultado.abasProcessadas.length).toBeGreaterThan(10);
    expect(resultado.transacoes.some(t => t.descricao.includes('Rent'))).toBe(true);
    expect(resultado.transacoes.some(t => t.descricao.includes('Fatura'))).toBe(true);
    
    // Verifica que categorizou e extraiu valor em centavos
    const rent = resultado.transacoes.find(t => t.descricao === 'Rent');
    expect(rent).toBeDefined();
    expect(rent?.valor).toBeGreaterThan(200000); // R$ 2.400+ em centavos
    expect(rent?.tipo).toBe('saida');
  });

  it('lê arquivo Expense_-_Nov_26.csv com títulos e resumos nas primeiras linhas', async () => {
    const caminhoCsv = path.resolve(process.cwd(), 'Expense_-_Nov_26.csv');
    const conteudoCsv = fs.readFileSync(caminhoCsv, 'utf-8');

    const resultado = await parseCSVInteligente(conteudoCsv, 'Expense_-_Nov_26.csv');

    expect(resultado.totalTransacoes).toBeGreaterThan(10);
    expect(resultado.transacoes.some(t => t.descricao.includes('Rent'))).toBe(true);
    expect(resultado.transacoes.some(t => t.descricao.includes('Fies Mo'))).toBe(true);
    expect(resultado.transacoes.some(t => t.categoriaSugerida?.includes('Moradia'))).toBe(true);
    
    // Verifica mês extraído (novembro de 2026)
    const rent = resultado.transacoes.find(t => t.descricao === 'Rent');
    expect(rent?.data.startsWith('2026-11')).toBe(true);
  });
});
