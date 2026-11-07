import { describe, it, expect } from 'vitest';
import { normalizarDescricao, gerarHashDedup, filtrarDuplicatas } from '../src/lib/calculations/dedup';
import { isPagamentoFatura, isTransferenciaPropria, analisarTransfOuFatura } from '../src/lib/calculations/transfers';

describe('Deduplicação determinística', () => {
  it('normaliza descrições removendo pontuações, acentos e espaços extras', () => {
    expect(normalizarDescricao('  iFood   *Restaurante  Água  ')).toBe('IFOOD RESTAURANTE AGUA');
    expect(normalizarDescricao('PAGAMENTO DE FATURA / CARTÃO')).toBe('PAGAMENTO DE FATURA CARTAO');
  });

  it('gera hashes idênticos para transações idênticas', () => {
    const h1 = gerarHashDedup('2026-11-05', 15000, 'saida', 'IFOOD RESTAURANTE');
    const h2 = gerarHashDedup('2026-11-05', 15000, 'saida', 'iFood *Restaurante');
    expect(h1).toBe(h2);
  });

  it('filtra duplicatas dentro do lote e contra hashes existentes', () => {
    const existentes = new Set(['hash_existente_1']);

    const lote = [
      { data: '2026-11-01', valor: 1000, tipo: 'saida' as const, descricao: 'Uber', hashDedup: 'hash_existente_1' },
      { data: '2026-11-02', valor: 2500, tipo: 'saida' as const, descricao: 'Mercado', hashDedup: 'hash_novo_1' },
      { data: '2026-11-02', valor: 2500, tipo: 'saida' as const, descricao: 'Mercado', hashDedup: 'hash_novo_1' }, // repetida no lote
    ];

    const { unicos, duplicados } = filtrarDuplicatas(lote, existentes);
    expect(unicos.length).toBe(1);
    expect(duplicados.length).toBe(2);
    expect(unicos[0].hashDedup).toBe('hash_novo_1');
  });
});

describe('Detecção de Faturas e Transferências Próprias', () => {
  it('identifica pagamentos de fatura de cartão', () => {
    expect(isPagamentoFatura('PAGAMENTO DE FATURA INTER')).toBe(true);
    expect(isPagamentoFatura('PAGTO ELETRON COBRANCA NUBANK')).toBe(true);
    expect(isPagamentoFatura('SUPERMERCADO CARREFOUR')).toBe(false);

    const analise = analisarTransfOuFatura('PAGAMENTO DE FATURA');
    expect(analise.ePagamentoFatura).toBe(true);
    expect(analise.sugestaoIgnorar).toBe(true);
  });

  it('identifica transferências entre contas próprias', () => {
    expect(isTransferenciaPropria('TRANSF ENTRE CONTAS MESMA TITULARIDADE')).toBe(true);
    expect(isTransferenciaPropria('PIX MESMA TITULARIDADE')).toBe(true);
    expect(isTransferenciaPropria('PIX ENVIADO MERCADINHO')).toBe(false);
  });
});
