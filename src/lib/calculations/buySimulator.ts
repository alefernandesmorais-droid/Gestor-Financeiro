/**
 * Simulador determinístico "Posso Comprar?"
 * Avalia o impacto de uma compra (à vista ou parcelada) na sobra mensal e anual.
 * Calcula o Semáforo (Verde, Amarelo, Vermelho) e o tempo para juntar à vista.
 */

export type StatusSemaforo = 'verde' | 'amarelo' | 'vermelho';

export interface ParametrosSimulacaoCompra {
  valorCentavos: number;
  formaPagamento: 'a_vista' | 'parcelado';
  numeroParcelas: number; // 1 a 48
  taxaJurosMensalPercentual?: number; // ex: 1.5 para 1.5% ao mês (0 se sem juros)
  sobraMensalMediaCentavos: number;
  reservaAtualCentavos?: number;
}

export interface ResultadoSimulacaoCompra {
  valorTotalCentavos: number;
  valorParcelaCentavos: number;
  numeroParcelas: number;
  sobraMensalAntesCentavos: number;
  sobraMensalDepoisCentavos: number;
  sobraAnualAntesCentavos: number;
  sobraAnualDepoisCentavos: number;
  mesesComprometidos: number;
  tempoJuntarMeses: number | null;
  semaforo: StatusSemaforo;
  tituloSemaforo: string;
  motivoSemaforo: string;
  recomendacao: string;
}

/**
 * Executa a simulação completa de compra determinística
 */
export function simularCompra(params: ParametrosSimulacaoCompra): ResultadoSimulacaoCompra {
  const {
    valorCentavos,
    formaPagamento,
    numeroParcelas = 1,
    taxaJurosMensalPercentual = 0,
    sobraMensalMediaCentavos,
    reservaAtualCentavos = 0,
  } = params;

  const parcelas = formaPagamento === 'a_vista' ? 1 : Math.max(1, numeroParcelas);
  let valorParcela = 0;
  let valorTotal = valorCentavos;

  // Cálculo de parcelas com ou sem juros
  if (formaPagamento === 'a_vista' || parcelas === 1) {
    valorParcela = valorCentavos;
    valorTotal = valorCentavos;
  } else if (taxaJurosMensalPercentual > 0) {
    // Tabela Price: P = PV * (i * (1 + i)^n) / ((1 + i)^n - 1)
    const i = taxaJurosMensalPercentual / 100;
    const fator = Math.pow(1 + i, parcelas);
    const parcelaFloat = (valorCentavos * (i * fator)) / (fator - 1);
    valorParcela = Math.round(parcelaFloat);
    valorTotal = valorParcela * parcelas;
  } else {
    // Sem juros
    valorParcela = Math.round(valorCentavos / parcelas);
    valorTotal = valorCentavos;
  }

  const sobraMensalAntes = sobraMensalMediaCentavos;
  let sobraMensalDepois = 0;

  if (formaPagamento === 'a_vista') {
    sobraMensalDepois = sobraMensalAntes - valorTotal;
  } else {
    sobraMensalDepois = sobraMensalAntes - valorParcela;
  }

  const sobraAnualAntes = sobraMensalAntes * 12;
  const sobraAnualDepois = sobraAnualAntes - valorTotal;

  // Tempo para juntar o valor à vista guardando a sobra atual
  let tempoJuntarMeses: number | null = null;
  if (sobraMensalAntes > 0) {
    tempoJuntarMeses = Math.ceil(valorCentavos / sobraMensalAntes);
  }

  // --- Lógica do Semáforo ---
  let semaforo: StatusSemaforo = 'verde';
  let tituloSemaforo = 'Cabe tranquilo no orçamento';
  let motivoSemaforo = '';
  let recomendacao = '';

  if (sobraMensalAntes <= 0) {
    semaforo = 'vermelho';
    tituloSemaforo = 'Não cabe no momento';
    motivoSemaforo = 'Sua sobra mensal média atual já está no zero ou negativa.';
    recomendacao = 'Organize os gastos atuais para recuperar uma sobra positiva antes de assumir novos compromissos.';
  } else if (formaPagamento === 'parcelado') {
    if (valorParcela > sobraMensalAntes) {
      semaforo = 'vermelho';
      tituloSemaforo = 'Compromete o orçamento';
      motivoSemaforo = `A parcela de R$ ${(valorParcela / 100).toFixed(2)} é maior do que a sua sobra mensal média de R$ ${(sobraMensalAntes / 100).toFixed(2)}.`;
      recomendacao = tempoJuntarMeses
        ? `Se você guardar a sobra atual por ${tempoJuntarMeses} meses, consegue comprar à vista sem gerar dívida.`
        : 'Evite parcelar valores maiores do que sua margem livre mensal.';
    } else if (valorParcela > sobraMensalAntes * 0.4) {
      semaforo = 'amarelo';
      tituloSemaforo = 'Cabe, mas aperta o orçamento';
      const pct = Math.round((valorParcela / sobraMensalAntes) * 100);
      motivoSemaforo = `A parcela compromete ${pct}% da sua sobra mensal média pelos próximos ${parcelas} meses.`;
      recomendacao = 'Você consegue pagar, mas terá pouca margem para imprevistos durante o período das parcelas.';
    } else {
      semaforo = 'verde';
      tituloSemaforo = 'Cabe tranquilo no orçamento';
      const pct = Math.round((valorParcela / sobraMensalAntes) * 100);
      motivoSemaforo = `A parcela compromete apenas ${pct}% da sua sobra livre mensal.`;
      recomendacao = 'A compra cabe com folga no seu orçamento sem comprometer sua reserva.';
    }
  } else {
    // Compra À Vista
    if (valorTotal <= sobraMensalAntes) {
      semaforo = 'verde';
      tituloSemaforo = 'Cabe à vista este mês';
      motivoSemaforo = 'O valor total cabe inteiramente na sobra média de um único mês.';
      recomendacao = 'Você pode pagar à vista e ainda manterá seu fluxo de caixa positivo.';
    } else if (reservaAtualCentavos >= valorTotal * 3) {
      semaforo = 'verde';
      tituloSemaforo = 'Pode usar parte da reserva';
      motivoSemaforo = 'Você possui reserva financeira suficiente para cobrir a compra à vista com tranquilidade.';
      recomendacao = 'Comprar à vista pode garantir desconto e não compromete seus meses de segurança.';
    } else if (reservaAtualCentavos >= valorTotal) {
      semaforo = 'amarelo';
      tituloSemaforo = 'Cabe, mas reduzirá sua reserva';
      motivoSemaforo = 'A compra consumirá uma fatia relevante do seu dinheiro guardado.';
      recomendacao = tempoJuntarMeses
        ? `Considere esperar ${tempoJuntarMeses} meses para juntar sem esvaziar a reserva, ou parcele se for sem juros.`
        : 'Avalie se a compra é urgente antes de reduzir sua segurança financeira.';
    } else {
      semaforo = 'vermelho';
      tituloSemaforo = 'Sem reserva nem sobra suficiente';
      motivoSemaforo = 'O valor é maior do que a sua sobra mensal e supera o saldo que você tem guardado.';
      recomendacao = tempoJuntarMeses
        ? `Guardando sua sobra atual, você acumula o valor à vista em ${tempoJuntarMeses} meses.`
        : 'Aguarde um momento financeiro mais favorável.';
    }
  }

  return {
    valorTotalCentavos: valorTotal,
    valorParcelaCentavos: valorParcela,
    numeroParcelas: parcelas,
    sobraMensalAntesCentavos: sobraMensalAntes,
    sobraMensalDepoisCentavos: sobraMensalDepois,
    sobraAnualAntesCentavos: sobraAnualAntes,
    sobraAnualDepoisCentavos: sobraAnualDepois,
    mesesComprometidos: parcelas,
    tempoJuntarMeses,
    semaforo,
    tituloSemaforo,
    motivoSemaforo,
    recomendacao,
  };
}
