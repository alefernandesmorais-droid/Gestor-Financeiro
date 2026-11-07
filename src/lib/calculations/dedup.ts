/**
 * Utilitários para deduplicação determinística de transações bancárias.
 */

/**
 * Limpa e normaliza a descrição da transação
 * Remove caracteres especiais extras, múltiplos espaços e põe em maiúsculas
 */
export function normalizarDescricao(desc: string): string {
  if (!desc) return '';
  return desc
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9\s]/g, ' ') // substitui pontuações por espaço
    .replace(/\s+/g, ' ') // condensa espaços
    .trim()
    .toUpperCase();
}

/**
 * Cria um hash identificador único baseado no dia, valor em centavos, tipo e descrição normalizada
 */
export function gerarHashDedup(data: string, valorCentavos: number, tipo: string, desc: string): string {
  const descNormalizada = normalizarDescricao(desc);
  // String determinística: YYYY-MM-DD|VALOR_CENTAVOS|TIPO|DESCRICAO
  const chave = `${data.trim()}|${valorCentavos}|${tipo.toLowerCase().trim()}|${descNormalizada}`;
  
  // Algoritmo simples de hash FNV-1a para browser (sem necessidade de crypto async)
  let hash = 2166136261;
  for (let i = 0; i < chave.length; i++) {
    hash ^= chave.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `tx_${(hash >>> 0).toString(16)}_${valorCentavos}_${data.replace(/-/g, '')}`;
}

export interface ItemComDedup {
  data: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  descricao: string;
  hashDedup?: string;
}

/**
 * Identifica e remove transações duplicadas em uma lista e contra um conjunto de hashes existentes
 */
export function filtrarDuplicatas<T extends ItemComDedup>(
  itensNovos: T[],
  hashesExistentes: Set<string>
): { unicos: T[]; duplicados: T[] } {
  const unicos: T[] = [];
  const duplicados: T[] = [];
  const hashesNoLote = new Set<string>();

  for (const item of itensNovos) {
    const hash = item.hashDedup || gerarHashDedup(item.data, item.valor, item.tipo, item.descricao);
    item.hashDedup = hash;

    if (hashesExistentes.has(hash) || hashesNoLote.has(hash)) {
      duplicados.push(item);
    } else {
      hashesNoLote.add(hash);
      unicos.push(item);
    }
  }

  return { unicos, duplicados };
}
