/**
 * Parser de CSV com detecção automática inteligente de colunas para bancos brasileiros
 * Utiliza PapaParse e heurísticas para Nubank, Inter, Itaú, Bradesco, BB, C6, Santander, etc.
 */

import Papa from 'papaparse';
import { normalizarDescricao, gerarHashDedup } from '../calculations/dedup';
import { analisarTransfOuFatura } from '../calculations/transfers';
import { reaisToCentavos } from '../formatters';

export interface MapeamentoColunasCSV {
  colunaData: string;
  colunaDescricao: string;
  colunaValor?: string;
  colunaDebito?: string;
  colunaCredito?: string;
  colunaCategoria?: string;
}

export interface TransacaoCSV {
  data: string; // YYYY-MM-DD
  descricao: string;
  descricaoLimpa: string;
  valor: number; // centavos inteiros (positivo)
  tipo: 'entrada' | 'saida';
  hashDedup: string;
  categoriaOriginal?: string;
  ignorado?: boolean;
  motivoIgnorado?: string;
}

export interface ResultadoParseCSV {
  bancoDetectado: string;
  mapeamento: MapeamentoColunasCSV;
  confiancaAlta: boolean;
  colunasDisponiveis: string[];
  linhasBrutas: Record<string, string>[];
  transacoes: TransacaoCSV[];
}

/**
 * Normaliza datas brasileiras DD/MM/AAAA ou AAAA-MM-DD para ISO YYYY-MM-DD
 */
export function normalizarDataBrasileira(dataStr: string): string {
  if (!dataStr) return new Date().toISOString().slice(0, 10);
  const limpo = dataStr.trim().split(' ')[0];

  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const regexBR = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
  const matchBR = limpo.match(regexBR);
  if (matchBR) {
    const dia = matchBR[1].padStart(2, '0');
    const mes = matchBR[2].padStart(2, '0');
    const ano = matchBR[3];
    return `${ano}-${mes}-${dia}`;
  }

  // Formato YYYY-MM-DD
  const regexISO = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
  const matchISO = limpo.match(regexISO);
  if (matchISO) {
    const ano = matchISO[1];
    const mes = matchISO[2].padStart(2, '0');
    const dia = matchISO[3].padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Identifica o mapeamento provável das colunas do CSV
 */
export function detectarMapeamentoColunas(colunas: string[]): {
  mapeamento: MapeamentoColunasCSV;
  confiancaAlta: boolean;
} {
  const normColunas = colunas.map((c) => ({
    original: c,
    norm: c.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  }));

  // Detecção de Data respeitando ordem de prioridade
  const candidatosData = ['data lancamento', 'data transacao', 'data movimento', 'data', 'date', 'dt'];
  let matchData = null;
  for (const cand of candidatosData) {
    const f = normColunas.find((c) => c.norm === cand || c.norm.startsWith(cand));
    if (f) { matchData = f; break; }
  }

  // Detecção de Descrição respeitando prioridade (ex: descricao tem prioridade sobre identificador)
  const candidatosDesc = [
    'descricao',
    'description',
    'historico',
    'title',
    'titulo',
    'memo',
    'lancamento',
    'estabelecimento',
    'detalhe',
    'detalhes',
    'identificador',
  ];
  let matchDesc = null;
  for (const cand of candidatosDesc) {
    const f = normColunas.find((c) => c.norm === cand || c.norm.startsWith(cand));
    if (f) { matchDesc = f; break; }
  }

  // Detecção de Débito / Crédito separados (ex: Bradesco, Santander)
  const matchDebito = normColunas.find((c) => c.norm.includes('debito') || c.norm === 'saida');
  const matchCredito = normColunas.find((c) => c.norm.includes('credito') || c.norm === 'entrada');

  // Detecção de Valor único
  const candidatosValor = ['valor (r$)', 'valor', 'amount', 'val', 'r$', 'quantia'];
  let matchValor = null;
  for (const cand of candidatosValor) {
    const f = normColunas.find((c) => c.norm === cand || c.norm.startsWith(cand));
    if (f) { matchValor = f; break; }
  }

  // Detecção de Categoria
  const matchCat = normColunas.find((c) => c.norm === 'categoria' || c.norm === 'category');

  const colunaData = matchData?.original || colunas[0] || '';
  const colunaDescricao = matchDesc?.original || colunas[1] || '';
  const colunaValor = matchValor?.original;

  const confiancaAlta = Boolean(matchData && (matchValor || (matchDebito && matchCredito)));

  return {
    mapeamento: {
      colunaData,
      colunaDescricao,
      colunaValor,
      colunaDebito: matchDebito?.original,
      colunaCredito: matchCredito?.original,
      colunaCategoria: matchCat?.original,
    },
    confiancaAlta,
  };
}

/**
 * Converte linhas brutas mapeadas em lista de transações limpas
 */
export function processarLinhasCSV(
  linhas: Record<string, string>[],
  mapeamento: MapeamentoColunasCSV,
  nomeArquivo: string = ''
): TransacaoCSV[] {
  const transacoes: TransacaoCSV[] = [];
  const isCartaoNubank = nomeArquivo.toLowerCase().includes('nubank') && 'title' in (linhas[0] || {});

  for (const linha of linhas) {
    const rawData = linha[mapeamento.colunaData];
    const rawDesc = linha[mapeamento.colunaDescricao] || 'Transação';
    const rawCategoria = mapeamento.colunaCategoria ? linha[mapeamento.colunaCategoria] : undefined;

    if (!rawData || !rawDesc) continue;

    let valorCentavos = 0;
    let tipo: 'entrada' | 'saida' = 'saida';

    // Caso 1: Colunas separadas de Débito e Crédito
    if (mapeamento.colunaDebito && mapeamento.colunaCredito) {
      const valDeb = linha[mapeamento.colunaDebito];
      const valCred = linha[mapeamento.colunaCredito];

      if (valDeb && valDeb.trim() !== '' && valDeb.trim() !== '0,00' && valDeb.trim() !== '0') {
        valorCentavos = Math.abs(reaisToCentavos(valDeb));
        tipo = 'saida';
      } else if (valCred && valCred.trim() !== '' && valCred.trim() !== '0,00' && valCred.trim() !== '0') {
        valorCentavos = Math.abs(reaisToCentavos(valCred));
        tipo = 'entrada';
      }
    } else if (mapeamento.colunaValor) {
      // Caso 2: Coluna única de valor
      const rawValor = (linha[mapeamento.colunaValor] || '').trim();
      if (!rawValor) continue;

      // Trata sinal negativo no início ou no fim (ex: 50,00-)
      const isNegativo = rawValor.startsWith('-') || rawValor.endsWith('-');
      const valorLimpo = rawValor.replace('-', '');
      const centavos = Math.abs(reaisToCentavos(valorLimpo));

      if (isCartaoNubank) {
        // No CSV de cartão do Nubank, compras são positivas e pagamentos/estornos são negativos
        tipo = isNegativo ? 'entrada' : 'saida';
      } else {
        // No padrão de conta corrente geral: negativos são saídas, positivos são entradas
        tipo = isNegativo ? 'saida' : 'entrada';
      }

      valorCentavos = centavos;
    }

    if (valorCentavos <= 0) continue;

    const data = normalizarDataBrasileira(rawData);
    const descricaoLimpa = normalizarDescricao(rawDesc);
    const hashDedup = gerarHashDedup(data, valorCentavos, tipo, descricaoLimpa);
    const analise = analisarTransfOuFatura(rawDesc);

    transacoes.push({
      data,
      descricao: rawDesc.trim(),
      descricaoLimpa,
      valor: valorCentavos,
      tipo,
      hashDedup,
      categoriaOriginal: rawCategoria?.trim(),
      ignorado: analise.sugestaoIgnorar,
      motivoIgnorado: analise.motivo,
    });
  }

  return transacoes;
}

/**
 * Faz o parse assíncrono de um arquivo CSV
 */
export function parseCSV(conteudoArquivo: string, nomeArquivo: string = ''): Promise<ResultadoParseCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(conteudoArquivo, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        const colunasDisponiveis = results.meta.fields || [];
        const { mapeamento, confiancaAlta } = detectarMapeamentoColunas(colunasDisponiveis);
        const transacoes = processarLinhasCSV(results.data, mapeamento, nomeArquivo);

        // Detecta banco pelo nome do arquivo ou conteúdo
        let bancoDetectado = 'Banco';
        const nomeLower = nomeArquivo.toLowerCase();
        if (nomeLower.includes('nubank')) bancoDetectado = 'Nubank';
        else if (nomeLower.includes('inter')) bancoDetectado = 'Banco Inter';
        else if (nomeLower.includes('itau')) bancoDetectado = 'Itaú';
        else if (nomeLower.includes('bradesco')) bancoDetectado = 'Bradesco';
        else if (nomeLower.includes('santander')) bancoDetectado = 'Santander';
        else if (nomeLower.includes('bb') || nomeLower.includes('brasil')) bancoDetectado = 'Banco do Brasil';
        else if (nomeLower.includes('c6')) bancoDetectado = 'C6 Bank';
        else if (nomeLower.includes('mercado')) bancoDetectado = 'Mercado Pago';

        resolve({
          bancoDetectado,
          mapeamento,
          confiancaAlta,
          colunasDisponiveis,
          linhasBrutas: results.data,
          transacoes,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}
