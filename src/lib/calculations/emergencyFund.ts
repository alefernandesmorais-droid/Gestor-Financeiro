/**
 * Cálculos determinísticos para Reserva de Emergência e Poupança
 * Avalia a cobertura em meses de despesas essenciais e simula o impacto de saques.
 */

import type { Transaction, Category, Saving } from '../../types';

export interface EstatisticasReserva {
  reservaAtualCentavos: number;
  despesaEssencialMensalCentavos: number;
  metaMesesConfigurada: number;
  metaReservaCentavos: number;
  mesesCobertosAtual: number;
  percentualMetaAtingido: number;
  sobraMensalMediaCentavos: number;
}

export interface ResultadoSimulacaoSaque {
  valorSaqueCentavos: number;
  reservaAntesCentavos: number;
  reservaDepoisCentavos: number;
  mesesCobertosAntes: number;
  mesesCobertosDepois: number;
  tempoParaReporMeses: number | null;
  nivelImpacto: 'baixo' | 'moderado' | 'alto';
  mensagem: string;
}

/**
 * Calcula a média de despesas essenciais mensais e métricas da reserva
 */
export function calcularMetricasReserva(
  transacoes: Transaction[],
  categorias: Category[],
  savings: Saving[],
  sobraMensalMediaCentavos: number,
  metaMesesConfigurada: number = 6
): EstatisticasReserva {
  const mapaCategorias = new Map<number, Category>();
  for (const c of categorias) {
    if (c.id) mapaCategorias.set(c.id, c);
  }

  // 1. Total guardado atualmente
  const reservaAtualCentavos = savings.reduce((acc, s) => acc + s.valor, 0);

  // 2. Calcula despesas essenciais agrupadas por mês
  const despesasPorMes = new Map<string, number>();

  for (const t of transacoes) {
    if (t.tipo !== 'saida' || t.ignorado) continue;

    const cat = t.categoriaId ? mapaCategorias.get(t.categoriaId) : undefined;
    const isEssencial = cat?.essencial || t.recorrente;

    if (isEssencial) {
      const mes = t.data.slice(0, 7);
      despesasPorMes.set(mes, (despesasPorMes.get(mes) || 0) + t.valor);
    }
  }

  // Média mensal das despesas essenciais
  const totalMeses = Math.max(1, despesasPorMes.size);
  let somaEssenciais = 0;
  for (const totalMes of despesasPorMes.values()) {
    somaEssenciais += totalMes;
  }

  const despesaEssencialMensalCentavos = Math.round(somaEssenciais / totalMeses);
  const metaReservaCentavos = despesaEssencialMensalCentavos * metaMesesConfigurada;

  const mesesCobertosAtual =
    despesaEssencialMensalCentavos > 0
      ? parseFloat((reservaAtualCentavos / despesaEssencialMensalCentavos).toFixed(1))
      : 0;

  const percentualMetaAtingido =
    metaReservaCentavos > 0
      ? Math.min(100, Math.round((reservaAtualCentavos / metaReservaCentavos) * 100))
      : 0;

  return {
    reservaAtualCentavos,
    despesaEssencialMensalCentavos,
    metaMesesConfigurada,
    metaReservaCentavos,
    mesesCobertosAtual,
    percentualMetaAtingido,
    sobraMensalMediaCentavos,
  };
}

/**
 * Simula o impacto de retirar R$ X da reserva agora
 */
export function simularSaqueReserva(
  valorSaqueCentavos: number,
  stats: EstatisticasReserva
): ResultadoSimulacaoSaque {
  const {
    reservaAtualCentavos,
    despesaEssencialMensalCentavos,
    sobraMensalMediaCentavos,
  } = stats;

  const reservaDepoisCentavos = Math.max(0, reservaAtualCentavos - valorSaqueCentavos);

  const mesesCobertosAntes = stats.mesesCobertosAtual;
  const mesesCobertosDepois =
    despesaEssencialMensalCentavos > 0
      ? parseFloat((reservaDepoisCentavos / despesaEssencialMensalCentavos).toFixed(1))
      : 0;

  let tempoParaReporMeses: number | null = null;
  if (sobraMensalMediaCentavos > 0) {
    tempoParaReporMeses = Math.ceil(valorSaqueCentavos / sobraMensalMediaCentavos);
  }

  // Avaliação do nível de impacto
  let nivelImpacto: 'baixo' | 'moderado' | 'alto' = 'baixo';
  let mensagem = '';

  if (reservaDepoisCentavos === 0) {
    nivelImpacto = 'alto';
    mensagem = 'Este saque esvaziaria completamente sua reserva de segurança.';
  } else if (mesesCobertosDepois < 3) {
    nivelImpacto = 'alto';
    mensagem = `A reserva cobrirá apenas ${mesesCobertosDepois} meses de despesas essenciais (abaixo do patamar seguro de 3 a 6 meses).`;
  } else if (mesesCobertosDepois < stats.metaMesesConfigurada) {
    nivelImpacto = 'moderado';
    mensagem = `A reserva cairá de ${mesesCobertosAntes} para ${mesesCobertosDepois} meses de cobertura.`;
  } else {
    nivelImpacto = 'baixo';
    mensagem = `Mesmo após o saque, você continuará com ${mesesCobertosDepois} meses de cobertura garantida.`;
  }

  return {
    valorSaqueCentavos,
    reservaAntesCentavos: reservaAtualCentavos,
    reservaDepoisCentavos,
    mesesCobertosAntes,
    mesesCobertosDepois,
    tempoParaReporMeses,
    nivelImpacto,
    mensagem,
  };
}
