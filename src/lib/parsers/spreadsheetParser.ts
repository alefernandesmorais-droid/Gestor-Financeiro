/**
 * Parser Inteligente de Planilhas (Excel .xlsx/.xls e CSV flexível).
 * Lê e analisa automaticamente extratos e planilhas pessoais de despesas,
 * encontrando cabeçalhos arbitrários, extraindo valores, datas e categorias existentes.
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { normalizarDescricao, gerarHashDedup } from '../calculations/dedup';
import { reaisToCentavos } from '../formatters';
import { analisarTransfOuFatura } from '../calculations/transfers';

export interface TransacaoPlanilha {
  data: string; // YYYY-MM-DD
  descricao: string;
  descricaoLimpa: string;
  valor: number; // centavos
  tipo: 'entrada' | 'saida';
  hashDedup: string;
  categoriaSugerida?: string;
  abaOrigem?: string;
  ignorado?: boolean;
  motivoIgnorado?: string;
}

export interface ResultadoParsePlanilha {
  sucesso: boolean;
  totalTransacoes: number;
  abasProcessadas: string[];
  transacoes: TransacaoPlanilha[];
  mensagemAviso?: string;
}

const MESES_MAPA: Record<string, string> = {
  jan: '01', janeiro: '01',
  fev: '02', fevereiro: '02',
  mar: '03', marco: '03', março: '03',
  abr: '04', abril: '04',
  mai: '05', maio: '05',
  jun: '06', junho: '06',
  jul: '07', julho: '07',
  ago: '08', agosto: '08',
  set: '09', setembro: '09',
  out: '10', outubro: '10',
  nov: '11', novembro: '11',
  dez: '12', dezembro: '12',
};

/**
 * Tenta extrair ano e mês de um texto (nome da aba, título ou nome do arquivo)
 * Ex: "Set 25" -> "2025-09", "Novembro 2026" -> "2026-11", "Nov 26" -> "2026-11"
 */
export function extrairMesAnoTexto(texto: string, anoPadrao: number = new Date().getFullYear()): string {
  const limpo = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  let mesEncontrado = '01';
  let achouMes = false;

  for (const [nomeMes, numMes] of Object.entries(MESES_MAPA)) {
    // Procura a palavra do mês isolada ou no início
    const regex = new RegExp(`\\b${nomeMes}\\b`, 'i');
    if (regex.test(limpo)) {
      mesEncontrado = numMes;
      achouMes = true;
      break;
    }
  }

  // Tenta achar ano com 4 dígitos (ex: 2025, 2026)
  const matchAno4 = limpo.match(/\b(20\d{2})\b/);
  if (matchAno4) {
    return `${matchAno4[1]}-${mesEncontrado}`;
  }

  // Tenta achar ano com 2 dígitos (ex: "Set 25" -> 2025, "Nov 26" -> 2026)
  const matchAno2 = limpo.match(/\b(\d{2})\b/);
  if (matchAno2) {
    const digitos = parseInt(matchAno2[1], 10);
    if (digitos >= 20 && digitos <= 35) {
      return `20${digitos}-${mesEncontrado}`;
    }
  }

  if (achouMes) {
    return `${anoPadrao}-${mesEncontrado}`;
  }

  return `${anoPadrao}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Converte valor de célula (número, string R$, etc.) para centavos inteiros
 */
function converterValorParaCentavos(val: any): { centavos: number; isNegativo: boolean } {
  if (typeof val === 'number') {
    const isNegativo = val < 0;
    const centavos = Math.round(Math.abs(val) * 100);
    return { centavos, isNegativo };
  }

  const str = String(val || '').trim();
  const isNegativo = str.includes('-') || str.startsWith('(');
  const centavos = Math.abs(reaisToCentavos(str));
  return { centavos, isNegativo };
}

/**
 * Converte número serial de data do Excel para string ISO YYYY-MM-DD
 */
function converterDataExcel(val: any, dataReferencia: string): string {
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    // Serial de data do Excel
    const dataObj = XLSX.SSF.parse_date_code(val);
    if (dataObj) {
      const y = String(dataObj.y);
      const m = String(dataObj.m).padStart(2, '0');
      const d = String(dataObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (typeof val === 'string') {
    const s = val.trim();
    const matchDDMM = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
    if (matchDDMM) {
      const d = matchDDMM[1].padStart(2, '0');
      const m = matchDDMM[2].padStart(2, '0');
      const y = matchDDMM[3]
        ? matchDDMM[3].length === 2
          ? `20${matchDDMM[3]}`
          : matchDDMM[3]
        : dataReferencia.slice(0, 4);
      return `${y}-${m}-${d}`;
    }
  }

  return dataReferencia;
}

/**
 * Limpa nome de categoria removendo emojis e pontuações
 */
function limparCategoriaNome(catStr: string): string {
  return catStr
    .replace(/[^\p{L}\p{N}\s&/+\-]/gu, '')
    .trim();
}

interface ColunasMapeadas {
  idxDescricao: number;
  idxValor: number;
  idxCategoria: number;
  idxData: number;
  idxTipo: number;
}

/**
 * Analisa a matriz de linhas para encontrar o cabeçalho verdadeiro da tabela
 */
function encontrarCabecalhoEColunas(linhas: any[][]): { linhaInicio: number; colunas: ColunasMapeadas } | null {
  for (let l = 0; l < Math.min(25, linhas.length); l++) {
    const row = linhas[l];
    if (!row || !Array.isArray(row)) continue;

    let idxDescricao = -1;
    let idxValor = -1;
    let idxCategoria = -1;
    let idxData = -1;
    let idxTipo = -1;

    row.forEach((col, cIdx) => {
      const texto = String(col || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      if (!texto) return;

      // Descrição / Despesa / Bill
      if (
        (texto === 'despesa' || texto === 'bill' || texto === 'item' || texto.includes('descricao') || texto.includes('historico')) &&
        idxDescricao === -1
      ) {
        idxDescricao = cIdx;
      }
      // Valor / Amount / Value
      else if (
        (texto.includes('valor') || texto === 'value' || texto === 'amount' || texto === 'total') &&
        !texto.includes('total rendimentos') &&
        !texto.includes('gastos total') &&
        idxValor === -1
      ) {
        idxValor = cIdx;
      }
      // Categoria / Classificação
      else if ((texto.includes('categoria') || texto === 'category' || texto.includes('classificacao')) && idxCategoria === -1) {
        idxCategoria = cIdx;
      }
      // Data
      else if ((texto === 'data' || texto === 'date' || texto === 'dt' || texto === 'vencimento') && idxData === -1) {
        idxData = cIdx;
      }
      // Tipo (Entrada/Saída)
      else if ((texto === 'tipo' || texto === 'type' || texto === 'natureza') && idxTipo === -1) {
        idxTipo = cIdx;
      }
    });

    // Se encontrou pelo menos descrição e valor
    if (idxDescricao !== -1 && idxValor !== -1) {
      return {
        linhaInicio: l + 1,
        colunas: {
          idxDescricao,
          idxValor,
          idxCategoria,
          idxData,
          idxTipo,
        },
      };
    }
  }

  return null;
}

/**
 * Processa matriz de linhas de uma planilha
 */
export function processarGradeLinhas(
  linhas: any[][],
  contextoAbaOuArquivo: string
): TransacaoPlanilha[] {
  const transacoes: TransacaoPlanilha[] = [];
  const cabecalho = encontrarCabecalhoEColunas(linhas);
  if (!cabecalho) return [];

  // Data base extraída do contexto (ex: "2026-11")
  const mesAnoReferencia = extrairMesAnoTexto(contextoAbaOuArquivo);
  const { colunas, linhaInicio } = cabecalho;

  let contadorDia = 1;

  for (let i = linhaInicio; i < linhas.length; i++) {
    const row = linhas[i];
    if (!row || !Array.isArray(row)) continue;

    const rawDesc = String(row[colunas.idxDescricao] || '').trim();
    if (!rawDesc || rawDesc.length < 2) continue;

    // Ignora linhas de totalizadores ou cabeçalhos duplicados
    const lowerDesc = rawDesc.toLowerCase();
    if (
      lowerDesc === 'total' ||
      lowerDesc.includes('total geral') ||
      lowerDesc.includes('subtotal') ||
      lowerDesc === 'despesa' ||
      lowerDesc === 'bill'
    ) {
      continue;
    }

    const rawValor = row[colunas.idxValor];
    if (rawValor === undefined || rawValor === null || rawValor === '') continue;

    const { centavos, isNegativo } = converterValorParaCentavos(rawValor);
    if (centavos <= 0) continue;

    // Determina a data do lançamento
    let dataFormatada = '';
    if (colunas.idxData !== -1 && row[colunas.idxData] !== undefined) {
      dataFormatada = converterDataExcel(row[colunas.idxData], `${mesAnoReferencia}-01`);
    } else {
      // Distribui suavemente ao longo do mês para evitar conflitos de ordenação
      const diaStr = String(Math.min(28, contadorDia++)).padStart(2, '0');
      dataFormatada = `${mesAnoReferencia}-${diaStr}`;
    }

    // Determina o tipo (entrada ou saída)
    let tipo: 'entrada' | 'saida' = 'saida';
    if (colunas.idxTipo !== -1) {
      const tipoStr = String(row[colunas.idxTipo] || '').toLowerCase();
      if (tipoStr.includes('entrada') || tipoStr.includes('receita') || tipoStr.includes('credito')) {
        tipo = 'entrada';
      }
    } else if (isNegativo) {
      // Valor negativo em coluna de despesa representa estorno/reembolso
      tipo = 'entrada';
    }

    // Categoria sugerida
    let categoriaSugerida: string | undefined = undefined;
    if (colunas.idxCategoria !== -1 && row[colunas.idxCategoria]) {
      const catLimpa = limparCategoriaNome(String(row[colunas.idxCategoria]));
      if (catLimpa) categoriaSugerida = catLimpa;
    }

    const descLimpa = normalizarDescricao(rawDesc);
    const hashDedup = gerarHashDedup(dataFormatada, centavos, tipo, descLimpa);
    const analiseTransf = analisarTransfOuFatura(rawDesc);

    transacoes.push({
      data: dataFormatada,
      descricao: rawDesc,
      descricaoLimpa: descLimpa,
      valor: centavos,
      tipo,
      hashDedup,
      categoriaSugerida,
      abaOrigem: contextoAbaOuArquivo,
      ignorado: analiseTransf.sugestaoIgnorar,
      motivoIgnorado: analiseTransf.motivo,
    });
  }

  return transacoes;
}

/**
 * Lê arquivo Excel (.xlsx, .xls) a partir de um ArrayBuffer e extrai de todas as abas
 */
export async function parseExcel(arquivoBuffer: ArrayBuffer, nomeArquivo: string = ''): Promise<ResultadoParsePlanilha> {
  const wb = XLSX.read(new Uint8Array(arquivoBuffer), { type: 'array' });
  const todasTransacoes: TransacaoPlanilha[] = [];
  const abasProcessadas: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const grade = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
    if (!grade || grade.length < 2) continue;

    // Processa a aba usando o nome da aba para inferir o mês/ano
    const transacoesAba = processarGradeLinhas(grade, sheetName);
    if (transacoesAba.length > 0) {
      todasTransacoes.push(...transacoesAba);
      abasProcessadas.push(`${sheetName} (${transacoesAba.length})`);
    }
  }

  return {
    sucesso: todasTransacoes.length > 0,
    totalTransacoes: todasTransacoes.length,
    abasProcessadas,
    transacoes: todasTransacoes,
    mensagemAviso:
      todasTransacoes.length === 0
        ? 'Nenhuma coluna de despesa e valor foi identificada nas abas da planilha.'
        : undefined,
  };
}

/**
 * Lê arquivo CSV flexível mesmo com linhas de títulos e resumos no topo
 */
export async function parseCSVInteligente(conteudoCSV: string, nomeArquivo: string = ''): Promise<ResultadoParsePlanilha> {
  return new Promise((resolve) => {
    Papa.parse(conteudoCSV, {
      skipEmptyLines: false,
      complete: (results) => {
        const grade = results.data as any[][];
        if (!grade || grade.length === 0) {
          resolve({
            sucesso: false,
            totalTransacoes: 0,
            abasProcessadas: [],
            transacoes: [],
            mensagemAviso: 'O arquivo CSV está vazio.',
          });
          return;
        }

        // Tenta achar o título da planilha na linha 1
        let contexto = nomeArquivo;
        if (grade[0] && grade[0][0] && typeof grade[0][0] === 'string') {
          contexto = `${grade[0][0]} ${nomeArquivo}`;
        }

        const transacoes = processarGradeLinhas(grade, contexto);

        resolve({
          sucesso: transacoes.length > 0,
          totalTransacoes: transacoes.length,
          abasProcessadas: [nomeArquivo],
          transacoes,
          mensagemAviso:
            transacoes.length === 0
              ? 'Não foi possível encontrar colunas de despesa/valor no arquivo CSV.'
              : undefined,
        });
      },
      error: (err: any) => {
        resolve({
          sucesso: false,
          totalTransacoes: 0,
          abasProcessadas: [],
          transacoes: [],
          mensagemAviso: `Erro ao analisar CSV: ${err.message}`,
        });
      },
    });
  });
}
