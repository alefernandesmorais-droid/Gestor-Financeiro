import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  toolSimularCompra,
  toolSimularCorteGastos,
  toolConsultarSobraGeral,
} from '../src/lib/ai/tools';
import { db } from '../src/db/db';

describe('Ferramentas Determinísticas de Function Calling da IA', () => {
  beforeEach(async () => {
    await db.inicializarDadosPadrao();
  });

  it('executa toolSimularCompra e devolve resultado estruturado com premissas', async () => {
    const res = await toolSimularCompra({ valor: 3000, parcelas: 10 });
    expect(res.nome).toBe('simular_compra');
    expect(res.resultado.numeroParcelas).toBe(10);
    expect(res.resultado.semaforo).toBeDefined();
    expect(res.comoCalculei).toContain('Parcelamento em 10x');
  });

  it('executa toolSimularCorteGastos calculando economia mensal e anual', async () => {
    const res = await toolSimularCorteGastos({ categoria_nome: 'Lazer', percentual_corte: 20 });
    expect(res.nome).toBe('simular_corte_gastos');
    expect(res.resultado.percentualCorte).toBe('20%');
    expect(res.resultado.economiaAnual).toBeDefined();
    expect(res.comoCalculei).toContain('Cortando 20%');
  });

  it('executa toolConsultarSobraGeral devolvendo números agregados', async () => {
    const res = await toolConsultarSobraGeral();
    expect(res.nome).toBe('consultar_sobra_geral');
    expect(res.resultado.entrouMensal).toBeDefined();
    expect(res.resultado.saiuMensal).toBeDefined();
    expect(res.resultado.sobrouMensal).toBeDefined();
  });
});
