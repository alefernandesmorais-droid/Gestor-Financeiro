/**
 * Ferramentas financeiras determinísticas para Function Calling da IA.
 * A IA apenas invoca essas funções: todas as contas são feitas aqui em TypeScript.
 */

import { db } from '../../db/db';
import { simularCompra } from '../calculations/buySimulator';
import { calcularMetricasReserva, simularSaqueReserva } from '../calculations/emergencyFund';
import { calcularEstatisticasPainel } from '../calculations/sobra';
import { reaisToCentavos, formatCurrency, centavosToReais } from '../formatters';
import { normalizarDescricao } from '../calculations/dedup';

export interface ExecucaoFerramentaResultado {
  nome: string;
  argumentos: Record<string, any>;
  resultado: Record<string, any>;
  comoCalculei: string;
}

/**
 * 1. Simulação "Posso Comprar?"
 */
export async function toolSimularCompra(args: {
  valor: number | string;
  parcelas?: number;
  juros?: number;
}): Promise<ExecucaoFerramentaResultado> {
  const transacoes = await db.transactions.toArray();
  const categorias = await db.categories.toArray();
  const savings = await db.savings.toArray();

  const stats = calcularEstatisticasPainel(transacoes, categorias, 'todos');
  const reservaAtual = savings.reduce((acc, s) => acc + s.valor, 0);

  const valorCentavos = reaisToCentavos(args.valor);
  const parcelas = Number(args.parcelas) || 1;
  const juros = Number(args.juros) || 0;
  const sobraMedia = stats.sobrou !== 0 ? stats.sobrou : 150000;

  const sim = simularCompra({
    valorCentavos,
    formaPagamento: parcelas > 1 ? 'parcelado' : 'a_vista',
    numeroParcelas: parcelas,
    taxaJurosMensalPercentual: juros,
    sobraMensalMediaCentavos: sobraMedia,
    reservaAtualCentavos: reservaAtual,
  });

  return {
    nome: 'simular_compra',
    argumentos: args,
    resultado: {
      valorTotal: formatCurrency(sim.valorTotalCentavos),
      valorParcela: formatCurrency(sim.valorParcelaCentavos),
      numeroParcelas: sim.numeroParcelas,
      sobraMensalAntes: formatCurrency(sim.sobraMensalAntesCentavos),
      sobraMensalDepois: formatCurrency(sim.sobraMensalDepoisCentavos),
      sobraAnualAntes: formatCurrency(sim.sobraAnualAntesCentavos),
      sobraAnualDepois: formatCurrency(sim.sobraAnualDepoisCentavos),
      semaforo: sim.semaforo,
      tituloSemaforo: sim.tituloSemaforo,
      motivoSemaforo: sim.motivoSemaforo,
      recomendacao: sim.recomendacao,
      tempoJuntarMeses: sim.tempoJuntarMeses,
    },
    comoCalculei: `Calculado com base na sua sobra mensal média de ${formatCurrency(sim.sobraMensalAntesCentavos)}. ${
      parcelas > 1
        ? `Parcelamento em ${parcelas}x de ${formatCurrency(sim.valorParcelaCentavos)}${juros > 0 ? ` com juros de ${juros}% a.m.` : ' sem juros'}.`
        : 'Pagamento integral à vista.'
    }`,
  };
}

/**
 * 2. Consulta de Reserva e Simulação de Saque
 */
export async function toolConsultarReservaESaque(args: {
  valor_saque?: number | string;
}): Promise<ExecucaoFerramentaResultado> {
  const transacoes = await db.transactions.toArray();
  const categorias = await db.categories.toArray();
  const savings = await db.savings.toArray();
  const settings = await db.settings.get('global');

  const stats = calcularEstatisticasPainel(transacoes, categorias, 'todos');
  const metricas = calcularMetricasReserva(
    transacoes,
    categorias,
    savings,
    stats.sobrou,
    settings?.metaReservaMeses || 6
  );

  const valorSaqueCentavos = args.valor_saque ? reaisToCentavos(args.valor_saque) : 0;
  const simSaque = simularSaqueReserva(valorSaqueCentavos, metricas);

  return {
    nome: 'consultar_reserva_e_saque',
    argumentos: args,
    resultado: {
      reservaAtual: formatCurrency(metricas.reservaAtualCentavos),
      despesaEssencialMensal: formatCurrency(metricas.despesaEssencialMensalCentavos),
      mesesCobertosAntes: metricas.mesesCobertosAtual,
      mesesCobertosDepois: simSaque.mesesCobertosDepois,
      tempoParaReporMeses: simSaque.tempoParaReporMeses,
      nivelImpacto: simSaque.nivelImpacto,
      mensagem: simSaque.mensagem,
    },
    comoCalculei: `Considerando sua reserva de ${formatCurrency(metricas.reservaAtualCentavos)} e um custo de vida essencial médio de ${formatCurrency(metricas.despesaEssencialMensalCentavos)}/mês. Sobra mensal de reposição: ${formatCurrency(stats.sobrou)}.`,
  };
}

/**
 * 3. Consulta de Gastos por Categoria ou Estabelecimento
 */
export async function toolConsultarGastosCategoria(args: {
  categoria_ou_termo: string;
  meses?: number;
}): Promise<ExecucaoFerramentaResultado> {
  const transacoes = await db.transactions.toArray();
  const categorias = await db.categories.toArray();

  const termo = normalizarDescricao(args.categoria_ou_termo || '');
  const nMeses = Math.max(1, Number(args.meses) || 3);

  // Determina corte de data (últimos N meses)
  const agora = new Date();
  const dataCorte = new Date(agora.getFullYear(), agora.getMonth() - nMeses + 1, 1)
    .toISOString()
    .slice(0, 10);

  // Busca ID da categoria se o termo corresponder ao nome de uma categoria
  const catMatch = categorias.find((c) =>
    normalizarDescricao(c.nome).includes(termo) || termo.includes(normalizarDescricao(c.nome))
  );

  let totalCentavos = 0;
  let contagem = 0;

  for (const t of transacoes) {
    if (t.tipo !== 'saida' || t.ignorado) continue;
    if (t.data < dataCorte) continue;

    const matchesCat = catMatch && t.categoriaId === catMatch.id;
    const matchesDesc = t.descricaoLimpa.includes(termo);

    if (matchesCat || matchesDesc) {
      totalCentavos += t.valor;
      contagem++;
    }
  }

  const mediaMensalCentavos = Math.round(totalCentavos / nMeses);

  return {
    nome: 'consultar_gastos_categoria',
    argumentos: args,
    resultado: {
      termoPesquisado: args.categoria_ou_termo,
      totalGasto: formatCurrency(totalCentavos),
      mediaMensal: formatCurrency(mediaMensalCentavos),
      totalTransacoes: contagem,
      mesesConsiderados: nMeses,
    },
    comoCalculei: `Soma de ${contagem} lançamentos nos últimos ${nMeses} meses (a partir de ${dataCorte}) correspondentes a "${args.categoria_ou_termo}". Média: ${formatCurrency(totalCentavos)} ÷ ${nMeses} meses.`,
  };
}

/**
 * 4. Simulação de Corte de Gastos
 */
export async function toolSimularCorteGastos(args: {
  categoria_nome: string;
  percentual_corte: number;
}): Promise<ExecucaoFerramentaResultado> {
  const transacoes = await db.transactions.toArray();
  const categorias = await db.categories.toArray();

  const termo = normalizarDescricao(args.categoria_nome || 'lazer');
  const pct = Math.max(1, Math.min(100, Number(args.percentual_corte) || 20));

  const catMatch = categorias.find((c) =>
    normalizarDescricao(c.nome).includes(termo) || termo.includes(normalizarDescricao(c.nome))
  );

  let totalGastoCentavos = 0;
  const mesesSet = new Set<string>();

  for (const t of transacoes) {
    if (t.tipo !== 'saida' || t.ignorado) continue;
    const matchesCat = catMatch && t.categoriaId === catMatch.id;
    const matchesDesc = t.descricaoLimpa.includes(termo);

    if (matchesCat || matchesDesc) {
      totalGastoCentavos += t.valor;
      mesesSet.add(t.data.slice(0, 7));
    }
  }

  const mesesContados = Math.max(1, mesesSet.size);
  const gastoMensalAtual = Math.round(totalGastoCentavos / mesesContados);
  const economiaMensal = Math.round(gastoMensalAtual * (pct / 100));
  const economiaAnual = economiaMensal * 12;
  const novoGastoMensal = gastoMensalAtual - economiaMensal;

  return {
    nome: 'simular_corte_gastos',
    argumentos: args,
    resultado: {
      categoria: args.categoria_nome,
      percentualCorte: `${pct}%`,
      gastoMensalAtual: formatCurrency(gastoMensalAtual),
      novoGastoMensal: formatCurrency(novoGastoMensal),
      economiaMensal: formatCurrency(economiaMensal),
      economiaAnual: formatCurrency(economiaAnual),
    },
    comoCalculei: `Gasto médio mensal histórico em ${args.categoria_nome}: ${formatCurrency(gastoMensalAtual)}. Cortando ${pct}%, poupa-se ${formatCurrency(economiaMensal)} por mês, totalizando ${formatCurrency(economiaAnual)} em 12 meses.`,
  };
}

/**
 * 5. Consulta de Sobra Geral
 */
export async function toolConsultarSobraGeral(): Promise<ExecucaoFerramentaResultado> {
  const transacoes = await db.transactions.toArray();
  const categorias = await db.categories.toArray();

  const stats = calcularEstatisticasPainel(transacoes, categorias, 'todos');

  return {
    nome: 'consultar_sobra_geral',
    argumentos: {},
    resultado: {
      entrouMensal: formatCurrency(stats.entrou),
      saiuMensal: formatCurrency(stats.saiu),
      sobrouMensal: formatCurrency(stats.sobrou),
      gastosFixos: formatCurrency(stats.gastosFixos),
      gastosVariaveis: formatCurrency(stats.gastosVariaveis),
      percentualFixos: `${stats.percentualFixos}%`,
    },
    comoCalculei: `Média recente consolidada das suas entradas (${formatCurrency(stats.entrou)}) e saídas (${formatCurrency(stats.saiu)}).`,
  };
}
