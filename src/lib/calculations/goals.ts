/**
 * Cálculos determinísticos para Metas Financeiras
 * Determina o aporte mensal necessário e a viabilidade frente à sobra financeira.
 */

import type { Goal } from '../../types';

export interface AnaliseMeta {
  meta: Goal;
  mesesRestantes: number;
  aporteMensalCentavos: number;
  cabeNaSobra: boolean;
  percentualSobraComprometida: number;
  status: 'tranquilo' | 'apertado' | 'fora_do_alcance';
  textoStatus: string;
}

/**
 * Calcula a diferença em meses entre a data atual e a data alvo
 */
export function calcularMesesAtePrazo(prazoISO: string): number {
  if (!prazoISO) return 1;
  const hoje = new Date();
  const partes = prazoISO.split('T')[0].split('-');
  const anoAlvo = parseInt(partes[0], 10);
  const mesAlvo = parseInt(partes[1], 10) - 1;

  const dataAlvo = new Date(anoAlvo, mesAlvo, 1);
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const diffMeses = (dataAlvo.getFullYear() - dataHoje.getFullYear()) * 12 + (dataAlvo.getMonth() - dataHoje.getMonth());
  return Math.max(1, diffMeses);
}

/**
 * Analisa a meta frente à sobra média mensal
 */
export function analisarMeta(meta: Goal, sobraMensalMediaCentavos: number): AnaliseMeta {
  const mesesRestantes = calcularMesesAtePrazo(meta.prazo);
  const aporteMensalCentavos = Math.ceil(meta.valorAlvo / mesesRestantes);

  let cabeNaSobra = false;
  let percentualSobraComprometida = 100;
  let status: 'tranquilo' | 'apertado' | 'fora_do_alcance' = 'fora_do_alcance';
  let textoStatus = '';

  if (sobraMensalMediaCentavos <= 0) {
    cabeNaSobra = false;
    percentualSobraComprometida = 100;
    status = 'fora_do_alcance';
    textoStatus = 'Sua sobra atual não permite novos aportes sem readequar despesas.';
  } else {
    cabeNaSobra = aporteMensalCentavos <= sobraMensalMediaCentavos;
    percentualSobraComprometida = Math.round((aporteMensalCentavos / sobraMensalMediaCentavos) * 100);

    if (percentualSobraComprometida <= 50) {
      status = 'tranquilo';
      textoStatus = `Cabe com folga (${percentualSobraComprometida}% da sua sobra mensal).`;
    } else if (percentualSobraComprometida <= 100) {
      status = 'apertado';
      textoStatus = `Cabe no limite (${percentualSobraComprometida}% da sua sobra mensal).`;
    } else {
      status = 'fora_do_alcance';
      textoStatus = `O aporte exigido de R$ ${(aporteMensalCentavos / 100).toFixed(2)}/mês excede sua sobra média atual.`;
    }
  }

  return {
    meta,
    mesesRestantes,
    aporteMensalCentavos,
    cabeNaSobra,
    percentualSobraComprometida,
    status,
    textoStatus,
  };
}
