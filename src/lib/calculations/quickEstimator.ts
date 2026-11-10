/**
 * Cálculos determinísticos para o Modo Visão Rápida (Estimativas).
 * Fornece diagnósticos reativos, cálculo de sobra mensal/anual,
 * cobertura da reserva de emergência e simulação rápida sem exigir extratos contábeis.
 */

export interface EstimativaRapidaInput {
  rendaMensalCentavos: number;
  despesasFixasCentavos: number;
  reservaAtualCentavos: number;
}

export interface ResultadoVisaoRapida {
  sobraMensalCentavos: number;
  sobraAnualCentavos: number;
  percentualSobra: number; // Ex: 25.5%
  percentualFixos: number; // Ex: 60.0%
  mesesCoberturaReserva: number; // Ex: 4.5 meses
  statusSobra: 'confortavel' | 'atencao' | 'alerta';
  diagnostico: string;
}

export interface MiniSimulacaoCompra {
  valorTotalCentavos: number;
  parcelas: number;
  valorParcelaCentavos: number;
  sobraDepoisCentavos: number;
  status: 'verde' | 'amarelo' | 'vermelho';
  mensagem: string;
}

/**
 * Calcula os indicadores da Visão Rápida
 */
export function calcularVisaoRapida(input: EstimativaRapidaInput): ResultadoVisaoRapida {
  const renda = Math.max(0, input.rendaMensalCentavos);
  const fixos = Math.max(0, input.despesasFixasCentavos);
  const reserva = Math.max(0, input.reservaAtualCentavos);

  const sobraMensal = renda - fixos;
  const sobraAnual = sobraMensal * 12;

  const percentualSobra = renda > 0 ? Math.round((sobraMensal / renda) * 100) : 0;
  const percentualFixos = renda > 0 ? Math.round((fixos / renda) * 100) : 0;
  const mesesCoberturaReserva = fixos > 0 ? parseFloat((reserva / fixos).toFixed(1)) : 0;

  let statusSobra: 'confortavel' | 'atencao' | 'alerta' = 'confortavel';
  let diagnostico = '';

  if (sobraMensal <= 0) {
    statusSobra = 'alerta';
    diagnostico = 'Seus custos fixos estão consumindo toda a sua renda informada. Qualquer imprevisto pode exigir o uso de reservas ou crédito.';
  } else if (percentualSobra < 15) {
    statusSobra = 'atencao';
    diagnostico = `Sobra cerca de ${percentualSobra}% da sua renda. Sua margem está justa, mas você tem controle. Pequenos ajustes em contas variáveis podem dobrar sua sobra.`;
  } else {
    statusSobra = 'confortavel';
    diagnostico = `Excelente margem de segurança: sobra cerca de ${percentualSobra}% da sua renda mensal. Você tem boa capacidade de poupança e compras planejadas.`;
  }

  return {
    sobraMensalCentavos: sobraMensal,
    sobraAnualCentavos: sobraAnual,
    percentualSobra,
    percentualFixos,
    mesesCoberturaReserva,
    statusSobra,
    diagnostico,
  };
}

/**
 * Simulação rápida de compra instantânea no Modo Visão Rápida
 */
export function simularCompraRapida(
  valorCompraCentavos: number,
  parcelas: number,
  sobraMensalAtualCentavos: number
): MiniSimulacaoCompra {
  const nParcelas = Math.max(1, parcelas);
  const valorParcela = Math.round(valorCompraCentavos / nParcelas);
  const sobraDepois = sobraMensalAtualCentavos - valorParcela;

  let status: 'verde' | 'amarelo' | 'vermelho' = 'verde';
  let mensagem = '';

  if (sobraDepois <= 0) {
    status = 'vermelho';
    mensagem = 'A parcela supera o que sobra no mês. Essa compra desequilibraria suas contas.';
  } else if (valorParcela > sobraMensalAtualCentavos * 0.5) {
    status = 'amarelo';
    mensagem = 'Cabe no orçamento, mas consome mais da metade da sua sobra mensal. Exigirá cautela com outros gastos.';
  } else {
    status = 'verde';
    mensagem = 'Cabe com folga tranquila! Consome apenas uma fatia confortável da sua sobra média.';
  }

  return {
    valorTotalCentavos: valorCompraCentavos,
    parcelas: nParcelas,
    valorParcelaCentavos: valorParcela,
    sobraDepoisCentavos: sobraDepois,
    status,
    mensagem,
  };
}
