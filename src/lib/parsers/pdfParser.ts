/**
 * Parser de PDFs de extratos bancários e faturas de cartão de crédito.
 * Utiliza pdfjs-dist para extração de texto estruturado e heurísticas brasileiras.
 * Detecta se o PDF é digitalizado/escaneado (sem camada de texto) e orienta o usuário.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { normalizarDescricao, gerarHashDedup } from '../calculations/dedup';
import { analisarTransfOuFatura } from '../calculations/transfers';
import { reaisToCentavos } from '../formatters';

// Configuração do worker do PDF.js para navegadores
if (typeof window !== 'undefined' && 'Worker' in window) {
  // Utiliza worker compatível com a versão instalada
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface TransacaoPDF {
  data: string; // YYYY-MM-DD
  descricao: string;
  descricaoLimpa: string;
  valor: number; // centavos
  tipo: 'entrada' | 'saida';
  hashDedup: string;
  ignorado?: boolean;
  motivoIgnorado?: string;
}

export interface ResultadoParsePDF {
  bancoDetectado: string;
  isEscaneado: boolean;
  mensagemAviso?: string;
  totalPaginas: number;
  transacoes: TransacaoPDF[];
}

const MESES_ABREV: Record<string, string> = {
  JAN: '01',
  FEV: '02',
  MAR: '03',
  ABR: '04',
  MAI: '05',
  JUN: '06',
  JUL: '07',
  AGO: '08',
  SET: '09',
  OUT: '10',
  NOV: '11',
  DEZ: '12',
};

/**
 * Converte data textual brasileira para ISO YYYY-MM-DD
 * Suporta: DD/MM/AAAA, DD/MM (assume ano atual), DD MMM (ex: 05 NOV)
 */
export function converterDataTexto(textoData: string, anoReferencia: number = new Date().getFullYear()): string {
  const limpo = textoData.trim().toUpperCase();

  // Caso 1: DD/MM/AAAA ou DD-MM-AAAA
  const matchCompleto = limpo.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (matchCompleto) {
    const dia = matchCompleto[1].padStart(2, '0');
    const mes = matchCompleto[2].padStart(2, '0');
    const ano = matchCompleto[3];
    return `${ano}-${mes}-${dia}`;
  }

  // Caso 2: DD/MM (sem ano)
  const matchSemAno = limpo.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (matchSemAno) {
    const dia = matchSemAno[1].padStart(2, '0');
    const mes = matchSemAno[2].padStart(2, '0');
    return `${anoReferencia}-${mes}-${dia}`;
  }

  // Caso 3: DD MMM (ex: "05 NOV" ou "12 DEZ")
  const matchAbrev = limpo.match(/^(\d{1,2})\s+([A-Z]{3})$/);
  if (matchAbrev) {
    const dia = matchAbrev[1].padStart(2, '0');
    const mesAbrev = matchAbrev[2];
    const mes = MESES_ABREV[mesAbrev] || '01';
    return `${anoReferencia}-${mes}-${dia}`;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Parser de linhas de texto extraídas do PDF usando heurísticas bancárias
 */
export function parseLinhasTextoExtrato(linhas: string[], anoReferencia: number = new Date().getFullYear()): TransacaoPDF[] {
  const transacoes: TransacaoPDF[] = [];

  // Regex para identificar linhas financeiras:
  // 1. Data no início: (DD/MM/AAAA ou DD/MM ou DD MMM)
  // 2. Descrição no meio
  // 3. Valor monetário no final: R$ 1.234,56 ou 1.234,56 ou -120,00 ou com D/C
  const regexLinhaTransacao = /^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{4})?|\d{1,2}\s+[A-Za-z]{3})\s+(.+?)\s+(-?R?\$?\s*[\d.]+,\d{2}(?:\s*[-+DCdc])?)$/;

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    if (!linha || linha.length < 8) continue;

    const match = linha.match(regexLinhaTransacao);
    if (!match) continue;

    const rawData = match[1];
    const rawDesc = match[2].trim();
    const rawValor = match[3].trim();

    // Filtra cabeçalhos que possam ter coincidido
    if (rawDesc.toLowerCase().includes('saldo') && !rawDesc.toLowerCase().includes('pagamento')) {
      continue;
    }

    const data = converterDataTexto(rawData, anoReferencia);
    const descLimpa = normalizarDescricao(rawDesc);

    // Trata sinal e tipo (entrada vs saída)
    const upperValor = rawValor.toUpperCase();
    const isCredito = upperValor.includes('C') || upperValor.includes('+');
    const isDebito = upperValor.includes('D') || upperValor.includes('-');

    let tipo: 'entrada' | 'saida' = 'saida';
    if (isCredito && !isDebito) {
      tipo = 'entrada';
    } else if (descLimpa.includes('SALARIO') || descLimpa.includes('TED RECEBIDA') || descLimpa.includes('PIX RECEBIDO')) {
      tipo = 'entrada';
    }

    const valorCentavos = Math.abs(reaisToCentavos(rawValor));
    if (valorCentavos <= 0) continue;

    const hashDedup = gerarHashDedup(data, valorCentavos, tipo, descLimpa);
    const analise = analisarTransfOuFatura(rawDesc);

    transacoes.push({
      data,
      descricao: rawDesc,
      descricaoLimpa: descLimpa,
      valor: valorCentavos,
      tipo,
      hashDedup,
      ignorado: analise.sugestaoIgnorar,
      motivoIgnorado: analise.motivo,
    });
  }

  return transacoes;
}

/**
 * Lê arquivo PDF (ArrayBuffer), extrai camada de texto e processa transações
 */
export async function parsePDF(arquivoBuffer: ArrayBuffer, nomeArquivo: string = ''): Promise<ResultadoParsePDF> {
  let doc: pdfjsLib.PDFDocumentProxy | null = null;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arquivoBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    doc = await loadingTask.promise;
  } catch (err: any) {
    throw new Error(`Não foi possível carregar o arquivo PDF: ${err.message}`);
  }

  const totalPaginas = doc.numPages;
  const todasLinhas: string[] = [];
  let totalCaracteres = 0;
  let textoCompletoBruto = '';

  for (let num = 1; num <= totalPaginas; num++) {
    const page = await doc.getPage(num);
    const textContent = await page.getTextContent();

    // Agrupa itens de texto por coordenada vertical (Y) para reconstruir linhas
    const linhasPorY = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of textContent.items as any[]) {
      if (!('str' in item) || !item.str.trim()) continue;

      const y = Math.round(item.transform[5]); // Coordenada Y
      const x = Math.round(item.transform[4]); // Coordenada X
      const str = item.str;

      totalCaracteres += str.length;
      textoCompletoBruto += ` ${str}`;

      if (!linhasPorY.has(y)) {
        linhasPorY.set(y, []);
      }
      linhasPorY.get(y)!.push({ x, text: str });
    }

    // Ordena do topo para o fundo (Y decrescente)
    const coordenadasY = Array.from(linhasPorY.keys()).sort((a, b) => b - a);

    for (const y of coordenadasY) {
      const itensLinha = linhasPorY.get(y)!;
      // Ordena da esquerda para a direita (X crescente)
      itensLinha.sort((a, b) => a.x - b.x);
      const linhaMontada = itensLinha.map((i) => i.text).join(' ');
      todasLinhas.push(linhaMontada);
    }
  }

  // Verifica se o PDF é escaneado (sem camada de texto legível)
  if (totalCaracteres < 60) {
    return {
      bancoDetectado: 'Arquivo PDF',
      isEscaneado: true,
      mensagemAviso:
        'Este PDF parece ser uma imagem escaneada ou não possui camada de texto selecionável. Para garantir 100% de precisão nos seus cálculos, sugerimos exportar o extrato no formato OFX ou CSV diretamente pelo aplicativo do seu banco.',
      totalPaginas,
      transacoes: [],
    };
  }

  // Detecta banco
  let bancoDetectado = 'Extrato em PDF';
  const brutoUpper = (textoCompletoBruto + ' ' + nomeArquivo).toUpperCase();
  if (brutoUpper.includes('NUBANK') || brutoUpper.includes('NU PAGAMENTOS')) bancoDetectado = 'Nubank';
  else if (brutoUpper.includes('INTER')) bancoDetectado = 'Banco Inter';
  else if (brutoUpper.includes('ITAU') || brutoUpper.includes('ITAÚ')) bancoDetectado = 'Itaú';
  else if (brutoUpper.includes('BRADESCO')) bancoDetectado = 'Bradesco';
  else if (brutoUpper.includes('SANTANDER')) bancoDetectado = 'Santander';
  else if (brutoUpper.includes('BANCO DO BRASIL')) bancoDetectado = 'Banco do Brasil';
  else if (brutoUpper.includes('C6 BANK')) bancoDetectado = 'C6 Bank';

  // Processa as linhas extraídas
  const transacoes = parseLinhasTextoExtrato(todasLinhas);

  if (transacoes.length === 0) {
    return {
      bancoDetectado,
      isEscaneado: true,
      mensagemAviso:
        'Não conseguimos identificar linhas de extrato com data e valor legíveis neste PDF. Recomendamos exportar o extrato em formato OFX ou CSV para leitura automática imediata.',
      totalPaginas,
      transacoes: [],
    };
  }

  return {
    bancoDetectado,
    isEscaneado: false,
    totalPaginas,
    transacoes,
  };
}
