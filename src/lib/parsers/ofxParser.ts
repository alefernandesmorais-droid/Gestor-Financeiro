/**
 * Parser determinístico de arquivos OFX (Open Financial Exchange 1.x e 2.x)
 * Compatível com extratos dos bancos brasileiros (Nubank, Itaú, Bradesco, Inter, Santander, BB, Caixa, etc.)
 */

import { normalizarDescricao, gerarHashDedup } from '../calculations/dedup';
import { analisarTransfOuFatura } from '../calculations/transfers';
import { reaisToCentavos } from '../formatters';

export interface TransacaoOFX {
  data: string; // YYYY-MM-DD
  descricao: string;
  descricaoLimpa: string;
  valor: number; // centavos inteiros (positivo)
  tipo: 'entrada' | 'saida';
  hashDedup: string;
  fitid?: string;
  ignorado?: boolean;
  motivoIgnorado?: string;
}

export interface ExtratoOFXProcessado {
  banco: string;
  conta?: string;
  tipoConta?: 'conta' | 'cartao';
  transacoes: TransacaoOFX[];
}

/**
 * Extrai o conteúdo entre tags SGML/XML do OFX
 */
function extrairTag(bloco: string, nomeTag: string): string | null {
  // Tenta formato com fechamento <TAG>valor</TAG>
  const regexFechado = new RegExp(`<${nomeTag}>([^<]+)<\\/${nomeTag}>`, 'i');
  const matchFechado = bloco.match(regexFechado);
  if (matchFechado) return matchFechado[1].trim();

  // Tenta formato SGML sem fechamento <TAG>valor\n
  const regexAberto = new RegExp(`<${nomeTag}>([^<\\r\\n]+)`, 'i');
  const matchAberto = bloco.match(regexAberto);
  if (matchAberto) return matchAberto[1].trim();

  return null;
}

/**
 * Converte data OFX (YYYYMMDD ou YYYYMMDDHHMMSS) para formato ISO YYYY-MM-DD
 */
export function converterDataOFX(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().slice(0, 10);
  const limpo = rawDate.replace(/[^0-9]/g, '');
  if (limpo.length >= 8) {
    const ano = limpo.substring(0, 4);
    const mes = limpo.substring(4, 6);
    const dia = limpo.substring(6, 8);
    return `${ano}-${mes}-${dia}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Faz o parse do texto completo de um arquivo OFX
 */
export function parseOFX(conteudo: string): ExtratoOFXProcessado {
  // Identifica o Banco / Organização
  const org = extrairTag(conteudo, 'ORG') || extrairTag(conteudo, 'BANKID') || 'Banco Desconhecido';
  const acctId = extrairTag(conteudo, 'ACCTID') || undefined;

  // Detecta se é conta corrente ou cartão de crédito
  const isCartao = /<CCSTMTTRNRS>/i.test(conteudo) || /<CREDITCARDMSGSRSV1>/i.test(conteudo);
  const tipoConta: 'conta' | 'cartao' = isCartao ? 'cartao' : 'conta';

  // Divide o arquivo pelas tags de transação <STMTTRN>
  const transacoes: TransacaoOFX[] = [];
  const blocosTrn = conteudo.split(/<STMTTRN>/i).slice(1);

  for (const bloco of blocosTrn) {
    const trnType = (extrairTag(bloco, 'TRNTYPE') || '').toUpperCase();
    const dtPosted = extrairTag(bloco, 'DTPOSTED') || '';
    const trnAmtStr = extrairTag(bloco, 'TRNAMT') || '0';
    const fitid = extrairTag(bloco, 'FITID') || undefined;
    const memo = extrairTag(bloco, 'MEMO') || extrairTag(bloco, 'NAME') || 'Transação';

    const data = converterDataOFX(dtPosted);
    const numAmt = parseFloat(trnAmtStr.replace(',', '.'));
    
    // Determina se é entrada ou saída
    // No padrão OFX: valores negativos são débitos/saídas, valores positivos são créditos/entradas
    // Se for fatura de cartão, às vezes compras vêm positivas com TRNTYPE=DEBIT
    let tipo: 'entrada' | 'saida' = 'saida';
    if (numAmt > 0 && trnType !== 'DEBIT') {
      tipo = 'entrada';
    } else if (numAmt < 0 || trnType === 'DEBIT') {
      tipo = 'saida';
    }

    const valorAbsoluto = Math.abs(numAmt);
    const valorCentavos = reaisToCentavos(valorAbsoluto);

    if (valorCentavos <= 0) continue;

    const descricaoLimpa = normalizarDescricao(memo);
    const hashDedup = gerarHashDedup(data, valorCentavos, tipo, descricaoLimpa);
    const analise = analisarTransfOuFatura(memo);

    transacoes.push({
      data,
      descricao: memo,
      descricaoLimpa,
      valor: valorCentavos,
      tipo,
      hashDedup,
      fitid,
      ignorado: analise.sugestaoIgnorar,
      motivoIgnorado: analise.motivo,
    });
  }

  return {
    banco: org,
    conta: acctId,
    tipoConta,
    transacoes,
  };
}
