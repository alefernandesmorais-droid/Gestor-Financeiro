/**
 * Mecanismo de Inteligência Financeira Local do Sobra.
 * Analisa os extratos e transações salvas localmente no navegador (Dexie/IndexedDB)
 * com vocabulário rico, tom consultivo profissional e cálculos determinísticos em TypeScript.
 * Não depende de API externa ou chaves para fornecer diagnósticos financeiros precisos.
 */

import {
  toolSimularCompra,
  toolConsultarReservaESaque,
  toolConsultarGastosCategoria,
  toolSimularCorteGastos,
  toolConsultarSobraGeral,
} from './tools';
import type { ChatMessage, ChatCardData } from './provider';

/**
 * Normaliza e remove acentos para busca flexível de intenções
 */
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrai quantia monetária em reais de um texto
 */
function extrairValor(texto: string): string | null {
  // Procura padrões como R$ 3.000, R$3000, 3000 reais, 3.500,50
  const padrao = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{2})?(?:\s*(?:reais|mil))?/i;
  const match = texto.match(padrao);
  if (!match) return null;

  let valorLimpo = match[1].replace(/\./g, '');
  if (texto.toLowerCase().includes('mil') && !match[0].includes('.')) {
    const num = parseInt(valorLimpo, 10);
    if (!isNaN(num) && num < 1000) {
      valorLimpo = String(num * 1000);
    }
  }
  return valorLimpo;
}

/**
 * Extrai número de parcelas de um texto
 */
function extrairParcelas(texto: string): number {
  const matchX = texto.match(/(\d+)\s*x/i);
  if (matchX) return parseInt(matchX[1], 10);

  const matchVezes = texto.match(/(\d+)\s*vezes/i);
  if (matchVezes) return parseInt(matchVezes[1], 10);

  const matchParcelas = texto.match(/em\s*(\d+)\s*(?:parcelas|meses)/i);
  if (matchParcelas) return parseInt(matchParcelas[1], 10);

  if (texto.toLowerCase().includes('a vista') || texto.toLowerCase().includes('à vista')) {
    return 1;
  }

  return 10; // Padrão se for uma simulação de compra não especificada
}

/**
 * Processa a mensagem do usuário contra os dados locais do Sobra
 */
export async function processarChatLocal(textoUsuario: string): Promise<ChatMessage> {
  const norm = normalizarTexto(textoUsuario);

  // 1. INTENÇÃO: Simulação de Compra ("posso comprar", "comprar celular", "parcelar", "comprar tv")
  if (
    norm.includes('comprar') ||
    norm.includes('parcelar') ||
    norm.includes('cabe no bolso') ||
    norm.includes('posso gastar') ||
    norm.includes('adquirir') ||
    norm.includes('celular')
  ) {
    const valorEncontrado = extrairValor(norm) || '3000';
    const parcelas = extrairParcelas(norm);

    // Tenta identificar o item que o usuário quer comprar
    const matchItem = textoUsuario.match(/comprar(?:\s+um|\s+uma)?\s+([a-zA-ZÀ-ÿ0-9\s]+?)(?:\s+de\s+|\s+por\s+|\s+no\s+valor|\?|\.|$)/i);
    const nomeItem = matchItem ? matchItem[1].trim() : (norm.includes('celular') ? 'celular' : 'item');

    const exec = await toolSimularCompra({ valor: valorEncontrado, parcelas });
    const r = exec.resultado;

    const semaforoCor = r.semaforo as 'verde' | 'amarelo' | 'vermelho';

    const cardData: ChatCardData = {
      tipo: 'compra',
      semaforo: semaforoCor,
      titulo: r.tituloSemaforo,
      subtitulo: `Simulação de compra para "${nomeItem}" no valor de ${r.valorTotal}`,
      metricas: [
        { rotulo: 'Valor da Compra', valor: r.valorTotal, destaque: true },
        { rotulo: 'Parcelamento', valor: `${r.numeroParcelas}x de ${r.valorParcela}` },
        {
          rotulo: 'Sobra Mensal Estimada',
          valor: `${r.sobraMensalDepois}/mês`,
          variacao: semaforoCor === 'verde' ? 'positivo' : semaforoCor === 'amarelo' ? 'neutro' : 'alerta',
        },
        { rotulo: 'Sobra Acumulada em 1 Ano', valor: r.sobraAnualDepois },
      ],
      dicaOuRecomendacao: r.recomendacao,
    };

    let introTexto = '';
    if (semaforoCor === 'verde') {
      introTexto = `Examinando o fluxo de caixa dos seus extratos, verifiquei que a aquisição pretendida de ${nomeItem} de ${r.valorTotal} em ${r.numeroParcelas}x de ${r.valorParcela} possui total aderência ao seu padrão financeiro atual. Sua margem de segurança permanece preservada.`;
    } else if (semaforoCor === 'amarelo') {
      introTexto = `Analisei cuidadosamente a compra de ${nomeItem} de ${r.valorTotal}. Embora as parcelas de ${r.valorParcela} sejam absorvíveis, elas consumirão uma fatia considerável da sua sobra mensal média, exigindo moderação com gastos discricionários nos próximos meses.`;
    } else {
      introTexto = `Atenção aos números: a compra de ${nomeItem} de ${r.valorTotal} comprometeria severamente o equilíbrio das suas contas, pois a parcela de ${r.valorParcela} supera ou chega muito próximo de esgotar o valor que costuma sobrar no fim do mês.`;
    }

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: introTexto,
      cardData,
      timestamp: new Date().toISOString(),
      toolResults: [exec],
      comoCalculei: exec.comoCalculei,
    };
  }

  // 2. INTENÇÃO: Gastos Específicos (iFood, Uber, Mercado, Delivery, Restaurante, Lazer)
  if (
    norm.includes('ifood') ||
    norm.includes('delivery') ||
    norm.includes('mercado') ||
    norm.includes('supermercado') ||
    norm.includes('uber') ||
    norm.includes('transporte') ||
    norm.includes('restaurante') ||
    norm.includes('gastei com') ||
    norm.includes('gastos com') ||
    norm.includes('quanto gastei')
  ) {
    let termo = 'alimentação';
    if (norm.includes('ifood')) termo = 'ifood';
    else if (norm.includes('uber')) termo = 'uber';
    else if (norm.includes('mercado') || norm.includes('supermercado')) termo = 'mercado';
    else if (norm.includes('delivery')) termo = 'delivery';
    else if (norm.includes('restaurante')) termo = 'restaurante';
    else if (norm.includes('transporte')) termo = 'transporte';
    else if (norm.includes('lazer')) termo = 'lazer';

    const exec = await toolConsultarGastosCategoria({ categoria_ou_termo: termo, meses: 3 });
    const r = exec.resultado;

    const cardData: ChatCardData = {
      tipo: 'gastos',
      titulo: `Despesas com ${r.termoPesquisado}`,
      subtitulo: `Histórico consolidado dos últimos ${r.mesesConsiderados} meses`,
      metricas: [
        { rotulo: 'Total Desembolsado', valor: r.totalGasto, destaque: true },
        { rotulo: 'Média por Mês', valor: `${r.mediaMensal}/mês` },
        { rotulo: 'Transações Mapeadas', valor: `${r.totalTransacoes} lançamentos` },
      ],
      dicaOuRecomendacao:
        r.totalTransacoes > 0
          ? `Identifiquei uma média recorrente de ${r.mediaMensal}/mês em ${r.termoPesquisado}. Se você optar por estipular um teto de gastos 15% menor para essa finalidade, poderá transferir a diferença diretamente para sua reserva de liquidez.`
          : `Não identifiquei lançamentos recentes com a descrição "${r.termoPesquisado}" nos extratos importados.`,
    };

    const textoResposta = `Realizei um levantamento detalhado nas suas movimentações bancárias para mapear os registros associados a "${r.termoPesquisado}". No período analisado de ${r.mesesConsiderados} meses, foram contabilizados ${r.totalTransacoes} lançamentos, totalizando ${r.totalGasto}.`;

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: textoResposta,
      cardData,
      timestamp: new Date().toISOString(),
      toolResults: [exec],
      comoCalculei: exec.comoCalculei,
    };
  }

  // 3. INTENÇÃO: Reserva de Emergência / Saque / Reposição de Poupança
  if (
    norm.includes('reserva') ||
    norm.includes('poupanca') ||
    norm.includes('guardado') ||
    norm.includes('tirar') ||
    norm.includes('repor') ||
    norm.includes('sacar') ||
    norm.includes('emergencia')
  ) {
    const valorSaque = extrairValor(norm) || '2000';
    const exec = await toolConsultarReservaESaque({ valor_saque: valorSaque });
    const r = exec.resultado;

    const nivelAlerta = r.nivelImpacto === 'seguro' ? 'verde' : r.nivelImpacto === 'moderado' ? 'amarelo' : 'vermelho';

    const cardData: ChatCardData = {
      tipo: 'reserva',
      semaforo: nivelAlerta,
      titulo: `Simulação de Saque de R$ ${valorSaque}`,
      subtitulo: 'Impacto no seu colchão de segurança e despesas essenciais',
      metricas: [
        { rotulo: 'Reserva Atual', valor: r.reservaAtual },
        { rotulo: 'Custo Fixo Essencial', valor: `${r.despesaEssencialMensal}/mês` },
        {
          rotulo: 'Cobertura de Vida',
          valor: `${r.mesesCobertosAntes}m → ${r.mesesCobertosDepois}m`,
          variacao: nivelAlerta === 'verde' ? 'positivo' : 'alerta',
        },
        {
          rotulo: 'Tempo Estimado de Reposição',
          valor: r.tempoParaReporMeses !== null ? `${r.tempoParaReporMeses} meses` : 'Indeterminado',
          destaque: true,
        },
      ],
      dicaOuRecomendacao: r.mensagem,
    };

    const textoResposta = `Projetei o impacto de uma retirada de R$ ${valorSaque} sobre o seu patrimônio de proteção. Sua reserva atual de ${r.reservaAtual} sustenta cerca de ${r.mesesCobertosAntes} meses de custo de vida essencial. Com essa saída eventual, sua cobertura passará para ${r.mesesCobertosDepois} meses.`;

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: textoResposta,
      cardData,
      timestamp: new Date().toISOString(),
      toolResults: [exec],
      comoCalculei: exec.comoCalculei,
    };
  }

  // 4. INTENÇÃO: Corte de Gastos / Otimização / Poupar em Lazer ou Outros
  if (
    norm.includes('cortar') ||
    norm.includes('reduzir') ||
    norm.includes('economizar') ||
    norm.includes('juntar') ||
    norm.includes('poupar')
  ) {
    const matchPct = norm.match(/(\d+)\s*%/);
    const pct = matchPct ? parseInt(matchPct[1], 10) : 20;

    let categoriaAlvo = 'Lazer';
    if (norm.includes('alimentacao') || norm.includes('refeicao')) categoriaAlvo = 'Alimentação';
    if (norm.includes('transporte')) categoriaAlvo = 'Transporte';
    if (norm.includes('assinatura') || norm.includes('streaming')) categoriaAlvo = 'Assinaturas';

    const exec = await toolSimularCorteGastos({ categoria_nome: categoriaAlvo, percentual_corte: pct });
    const r = exec.resultado;

    const cardData: ChatCardData = {
      tipo: 'corte',
      semaforo: 'verde',
      titulo: `Plano de Economia: -${r.percentualCorte} em ${r.categoria}`,
      subtitulo: 'Projeção de enriquecimento com ajuste discricionário',
      metricas: [
        { rotulo: 'Gasto Mensal Atual', valor: `${r.gastoMensalAtual}/mês` },
        { rotulo: 'Novo Teto Proposto', valor: `${r.novoGastoMensal}/mês` },
        { rotulo: 'Economia Mensal Líquida', valor: `${r.economiaMensal}/mês`, variacao: 'positivo' },
        { rotulo: 'Economia Anual Projetada', valor: r.economiaAnual, destaque: true, variacao: 'positivo' },
      ],
      dicaOuRecomendacao: `Ao reajustar ${r.percentualCorte} nessa categoria, você desbloqueia ${r.economiaMensal} a mais na sua sobra mensal. Ao longo de 1 ano, são ${r.economiaAnual} extras acumulados sem exigir sacrifícios extremos.`,
    };

    const textoResposta = `Simulei o potencial de otimização orçamentária aplicando uma redução de ${r.percentualCorte} sobre os gastos com ${r.categoria}. Pequenos ajustes em despesas variáveis produzem um efeito multiplicador impressionante ao longo dos meses.`;

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: textoResposta,
      cardData,
      timestamp: new Date().toISOString(),
      toolResults: [exec],
      comoCalculei: exec.comoCalculei,
    };
  }

  // 5. INTENÇÃO: Panorama Geral / Quanto sobrou / Balanço / Resumo do Mês
  const exec = await toolConsultarSobraGeral();
  const r = exec.resultado;

  const cardData: ChatCardData = {
    tipo: 'panorama',
    titulo: 'Diagnóstico Geral do Seu Fluxo Financeiro',
    subtitulo: 'Consolidação das entradas e saídas recentes registradas',
    metricas: [
      { rotulo: 'Receitas Médias', valor: `${r.entrouMensal}/mês`, variacao: 'positivo' },
      { rotulo: 'Despesas Totais', valor: `${r.saiuMensal}/mês` },
      { rotulo: 'Sobra Líquida', valor: `${r.sobrouMensal}/mês`, destaque: true, variacao: 'positivo' },
      { rotulo: 'Comprometimento Fixo', valor: `${r.percentualFixos} da renda` },
    ],
    dicaOuRecomendacao: `Suas despesas fixas representam ${r.percentualFixos} da sua receita. Mantenha os custos estruturais abaixo de 50% para garantir flexibilidade em momentos de oscilação econômica.`,
  };

  const textoResposta = `Analisei seu extrato consolidado. Atualmente, suas entradas somam em média ${r.entrouMensal}/mês contra ${r.saiuMensal}/mês em despesas totais, resultando em uma sobra líquida estimada de ${r.sobrouMensal}/mês. Você pode me perguntar se cabe uma nova compra, simular cortes ou pedir uma análise de gastos com delivery, mercado ou transporte!`;

  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: textoResposta,
    cardData,
    timestamp: new Date().toISOString(),
    toolResults: [exec],
    comoCalculei: exec.comoCalculei,
  };
}
