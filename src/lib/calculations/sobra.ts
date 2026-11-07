/**
 * Cálculos determinísticos do Painel (Dashboard) do Sobra.
 * Toda a matemática é executada em centavos inteiros para precisão absoluta.
 */

import type { Transaction, Category } from '../../types';
import { formatShortMonthYear, formatCurrency } from '../formatters';

export interface ComparativoMes {
  percentual: number;
  positivoBom: boolean;
}

export interface CategoriaGasto {
  categoriaId: number;
  nome: string;
  cor: string;
  totalCentavos: number;
  percentual: number;
}

export interface MesHistorico {
  mes: string; // YYYY-MM
  rotulo: string; // nov/26
  entrou: number; // centavos
  saiu: number; // centavos
  sobrou: number; // centavos
  saldoAcumulado: number; // centavos
}

export interface AssinaturaDetectada {
  descricao: string;
  valorCentavos: number;
  categoriaNome: string;
}

export interface InsightFinanceiro {
  id: string;
  tipo: 'positivo' | 'alerta' | 'neutro';
  icone: string;
  texto: string;
}

export interface EstatisticasPainel {
  mesReferencia: string;
  entrou: number; // centavos
  saiu: number; // centavos
  sobrou: number; // centavos
  comparativoEntrou?: ComparativoMes;
  comparativoSaiu?: ComparativoMes;
  comparativoSobrou?: ComparativoMes;
  gastosFixos: number; // centavos
  gastosVariaveis: number; // centavos
  percentualFixos: number; // 0-100
  distribuicaoCategorias: CategoriaGasto[];
  historicoMensal: MesHistorico[];
  maioresGastos: Transaction[];
  assinaturasAtivas: AssinaturaDetectada[];
  totalAssinaturas: number; // centavos
  insights: InsightFinanceiro[];
}

/**
 * Retorna o mês anterior no formato YYYY-MM
 */
export function obterMesAnterior(mes: string): string {
  const partes = mes.split('-');
  const ano = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  const data = new Date(ano, m - 2, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calcula a variação percentual entre o valor atual e o anterior
 */
export function calcularVariacaoPercentual(atual: number, anterior: number, positivoBom: boolean): ComparativoMes {
  if (anterior === 0) {
    return {
      percentual: atual > 0 ? 100 : 0,
      positivoBom,
    };
  }
  const variacao = ((atual - anterior) / anterior) * 100;
  return {
    percentual: parseFloat(variacao.toFixed(1)),
    positivoBom,
  };
}

/**
 * Motor central de cálculo do Painel
 */
export function calcularEstatisticasPainel(
  transacoes: Transaction[],
  categorias: Category[],
  mesReferencia: string = 'todos'
): EstatisticasPainel {
  const mapaCategorias = new Map<number, Category>();
  for (const c of categorias) {
    if (c.id) mapaCategorias.set(c.id, c);
  }

  // Se 'todos' foi selecionado, define mesReferencia como o mês da transação mais recente
  let mesAlvo = mesReferencia;
  if (mesAlvo === 'todos') {
    const ordenadas = [...transacoes].sort((a, b) => b.data.localeCompare(a.data));
    mesAlvo = ordenadas[0]?.data.slice(0, 7) || new Date().toISOString().slice(0, 7);
  }

  const mesAnteriorAlvo = obterMesAnterior(mesAlvo);

  // Filtra transações do mês alvo e do mês anterior (desconsiderando ignoradas)
  const txMesAlvo: Transaction[] = [];
  const txMesAnterior: Transaction[] = [];

  for (const t of transacoes) {
    if (t.ignorado) continue;
    const mesTx = t.data.slice(0, 7);
    if (mesTx === mesAlvo) {
      txMesAlvo.push(t);
    } else if (mesTx === mesAnteriorAlvo) {
      txMesAnterior.push(t);
    }
  }

  // 1. Totais do mês alvo
  let entrou = 0;
  let saiu = 0;
  let gastosFixos = 0;

  const gastosPorCategoria = new Map<number, number>();

  for (const t of txMesAlvo) {
    if (t.tipo === 'entrada') {
      entrou += t.valor;
    } else {
      saiu += t.valor;

      const cat = t.categoriaId ? mapaCategorias.get(t.categoriaId) : undefined;
      const isFixo = t.recorrente || cat?.nome === 'Moradia' || cat?.nome === 'Assinaturas';
      if (isFixo) {
        gastosFixos += t.valor;
      }

      const catId = t.categoriaId || 0;
      gastosPorCategoria.set(catId, (gastosPorCategoria.get(catId) || 0) + t.valor);
    }
  }

  const sobrou = entrou - saiu;
  const gastosVariaveis = Math.max(0, saiu - gastosFixos);
  const percentualFixos = saiu > 0 ? Math.round((gastosFixos / saiu) * 100) : 0;

  // 2. Totais do mês anterior para comparativo
  let entrouAnt = 0;
  let saiuAnt = 0;
  for (const t of txMesAnterior) {
    if (t.tipo === 'entrada') {
      entrouAnt += t.valor;
    } else {
      saiuAnt += t.valor;
    }
  }
  const sobrouAnt = entrouAnt - saiuAnt;

  const comparativoEntrou = calcularVariacaoPercentual(entrou, entrouAnt, true);
  const comparativoSaiu = calcularVariacaoPercentual(saiu, saiuAnt, false);
  const comparativoSobrou = calcularVariacaoPercentual(sobrou, sobrouAnt, true);

  // 3. Distribuição por categorias (para gráfico de rosca)
  const distribuicaoCategorias: CategoriaGasto[] = [];
  for (const [catId, totalCentavos] of gastosPorCategoria.entries()) {
    const cat = catId > 0 ? mapaCategorias.get(catId) : undefined;
    const nome = cat?.nome || 'Sem categoria';
    const cor = cat?.cor || '#94A3B8';
    const percentual = saiu > 0 ? Math.round((totalCentavos / saiu) * 100) : 0;

    distribuicaoCategorias.push({
      categoriaId: catId,
      nome,
      cor,
      totalCentavos,
      percentual,
    });
  }
  distribuicaoCategorias.sort((a, b) => b.totalCentavos - a.totalCentavos);

  // 4. Maiores gastos do mês
  const maioresGastos = txMesAlvo
    .filter((t) => t.tipo === 'saida')
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // 5. Assinaturas e Recorrências digitais ativas (streaming, serviços, mensalidades)
  const assinaturasMap = new Map<string, AssinaturaDetectada>();
  for (const t of txMesAlvo) {
    const cat = t.categoriaId ? mapaCategorias.get(t.categoriaId) : undefined;
    const isAssinatura =
      cat?.nome === 'Assinaturas' ||
      t.descricaoLimpa.includes('NETFLIX') ||
      t.descricaoLimpa.includes('SPOTIFY') ||
      t.descricaoLimpa.includes('AMAZON PRIME') ||
      t.descricaoLimpa.includes('DISNEY') ||
      t.descricaoLimpa.includes('HBO') ||
      t.descricaoLimpa.includes('DEEZER') ||
      t.descricaoLimpa.includes('GLOBOPLAY');

    if (isAssinatura) {
      const desc = t.descricaoLimpa.split('*')[0].trim();
      if (!assinaturasMap.has(desc)) {
        assinaturasMap.set(desc, {
          descricao: t.descricao,
          valorCentavos: t.valor,
          categoriaNome: cat?.nome || 'Assinaturas',
        });
      }
    }
  }
  const assinaturasAtivas = Array.from(assinaturasMap.values());
  const totalAssinaturas = assinaturasAtivas.reduce((acc, curr) => acc + curr.valorCentavos, 0);

  // 6. Histórico Mensal (últimos 6 a 12 meses)
  const mesesSet = new Set<string>();
  for (const t of transacoes) {
    if (!t.ignorado) {
      mesesSet.add(t.data.slice(0, 7));
    }
  }
  const mesesOrdenados = Array.from(mesesSet).sort().slice(-12);

  let saldoAcumulado = 0;
  const historicoMensal: MesHistorico[] = [];

  for (const m of mesesOrdenados) {
    let mEntrou = 0;
    let mSaiu = 0;
    for (const t of transacoes) {
      if (t.ignorado || !t.data.startsWith(m)) continue;
      if (t.tipo === 'entrada') mEntrou += t.valor;
      else mSaiu += t.valor;
    }
    const mSobrou = mEntrou - mSaiu;
    saldoAcumulado += mSobrou;

    historicoMensal.push({
      mes: m,
      rotulo: formatShortMonthYear(m),
      entrou: mEntrou,
      saiu: mSaiu,
      sobrou: mSobrou,
      saldoAcumulado,
    });
  }

  // 7. Geração de Insights em português acolhedor
  const insights: InsightFinanceiro[] = [];

  // Insight da taxa de sobra / poupança
  if (entrou > 0) {
    const taxaSobra = Math.round((sobrou / entrou) * 100);
    if (taxaSobra >= 20) {
      insights.push({
        id: 'taxa_sobra_excelente',
        tipo: 'positivo',
        icone: 'TrendingUp',
        texto: `Parabéns! Você guardou ${taxaSobra}% de tudo o que entrou este mês (${formatCurrency(sobrou)} livres).`,
      });
    } else if (taxaSobra > 0) {
      insights.push({
        id: 'taxa_sobra_positiva',
        tipo: 'neutro',
        icone: 'Wallet',
        texto: `Você fechou com sobra positiva de ${taxaSobra}% da sua renda (${formatCurrency(sobrou)}).`,
      });
    } else {
      insights.push({
        id: 'taxa_sobra_negativa',
        tipo: 'alerta',
        icone: 'AlertCircle',
        texto: `Atenção: seus gastos superaram as entradas em ${formatCurrency(Math.abs(sobrou))} este mês.`,
      });
    }
  }

  // Insight comparativo com alimentação fora / delivery
  const deliveryCat = categorias.find((c) => c.nome.toLowerCase().includes('alimentação fora'));
  if (deliveryCat?.id) {
    const deliveryMes = gastosPorCategoria.get(deliveryCat.id) || 0;
    let deliveryAnt = 0;
    for (const t of txMesAnterior) {
      if (t.categoriaId === deliveryCat.id && t.tipo === 'saida') {
        deliveryAnt += t.valor;
      }
    }
    if (deliveryMes > 0 && deliveryAnt > 0) {
      const varDelivery = Math.round(((deliveryMes - deliveryAnt) / deliveryAnt) * 100);
      if (varDelivery > 20) {
        insights.push({
          id: 'delivery_aumento',
          tipo: 'alerta',
          icone: 'Utensils',
          texto: `Você gastou ${varDelivery}% a mais com delivery/restaurantes do que no mês passado.`,
        });
      } else if (varDelivery < -15) {
        insights.push({
          id: 'delivery_reducao',
          tipo: 'positivo',
          icone: 'Utensils',
          texto: `Ótimo! Você economizou ${Math.abs(varDelivery)}% com alimentação fora em relação ao mês anterior.`,
        });
      }
    }
  }

  // Insight de Assinaturas
  if (assinaturasAtivas.length > 0) {
    insights.push({
      id: 'assinaturas_alerta',
      tipo: 'neutro',
      icone: 'Tv',
      texto: `Você mantém ${assinaturasAtivas.length} assinaturas/recorrências ativas, totalizando ${formatCurrency(totalAssinaturas)} por mês.`,
    });
  }

  // Insight de Maior Centro de Custo
  if (distribuicaoCategorias.length > 0 && saiu > 0) {
    const maior = distribuicaoCategorias[0];
    insights.push({
      id: 'maior_categoria',
      tipo: 'neutro',
      icone: 'PieChart',
      texto: `Sua maior despesa foi "${maior.nome}", correspondendo a ${maior.percentual}% do total gasto (${formatCurrency(maior.totalCentavos)}).`,
    });
  }

  return {
    mesReferencia: mesAlvo,
    entrou,
    saiu,
    sobrou,
    comparativoEntrou,
    comparativoSaiu,
    comparativoSobrou,
    gastosFixos,
    gastosVariaveis,
    percentualFixos,
    distribuicaoCategorias,
    historicoMensal,
    maioresGastos,
    assinaturasAtivas,
    totalAssinaturas,
    insights,
  };
}
