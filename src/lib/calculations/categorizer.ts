/**
 * Motor determinístico de categorização hierárquica do Sobra:
 * Ordem obrigatória:
 * 1) Regras personalizadas do usuário (maior precedência)
 * 2) Dicionário local de estabelecimentos brasileiros
 * 3) Deixa pendente para IA / Outros
 */

import { normalizarDescricao } from './dedup';
import { DICIONARIO_ESTABELECIMENTOS_BR } from '../ai/localDictionary';
import type { Category, Rule } from '../../types';
import { db } from '../../db/db';

export interface ResultadoCategorizacao {
  categoriaId?: number;
  categoriaNome?: string;
  recorrente?: boolean;
  origem: 'regra' | 'dicionario' | 'nenhuma';
}

/**
 * Categoriza uma descrição de transação com base nas regras do usuário e no dicionário
 */
export function identificarCategoria(
  descricao: string,
  regras: Rule[],
  categorias: Category[]
): ResultadoCategorizacao {
  const normDesc = normalizarDescricao(descricao);
  if (!normDesc) return { origem: 'nenhuma' };

  // Mapa de categorias por ID e por Nome
  const mapaPorId = new Map<number, Category>();
  const mapaPorNome = new Map<string, Category>();
  for (const c of categorias) {
    if (c.id) mapaPorId.set(c.id, c);
    mapaPorNome.set(c.nome.toLowerCase(), c);
  }

  // 1. Regras do Usuário (maior prioridade)
  for (const regra of regras) {
    const normPadrao = normalizarDescricao(regra.padrao);
    if (normPadrao && normDesc.includes(normPadrao)) {
      const cat = mapaPorId.get(regra.categoriaId);
      if (cat?.id) {
        return {
          categoriaId: cat.id,
          categoriaNome: cat.nome,
          origem: 'regra',
        };
      }
    }
  }

  // 2. Dicionário Local Brasileiro
  for (const item of DICIONARIO_ESTABELECIMENTOS_BR) {
    if (normDesc.includes(item.termo)) {
      const cat = mapaPorNome.get(item.categoria.toLowerCase());
      if (cat?.id) {
        return {
          categoriaId: cat.id,
          categoriaNome: cat.nome,
          recorrente: item.recorrente,
          origem: 'dicionario',
        };
      }
    }
  }

  return { origem: 'nenhuma' };
}

/**
 * Cria uma nova regra do usuário e atualiza retroativamente transações correspondentes
 */
export async function cadastrarRegraEAtualizarPassadas(
  padrao: string,
  categoriaId: number
): Promise<{ regraId: number; transacoesAtualizadas: number }> {
  const normPadrao = normalizarDescricao(padrao);
  if (!normPadrao) throw new Error('O padrão da regra não pode ser vazio');

  // Adiciona a regra
  const regraId = await db.rules.add({
    padrao: normPadrao,
    categoriaId,
  });

  // Busca transações que combinam com o padrão
  const transacoes = await db.transactions.toArray();
  const paraAtualizar: number[] = [];

  for (const t of transacoes) {
    if (t.id && t.descricaoLimpa.includes(normPadrao)) {
      paraAtualizar.push(t.id);
    }
  }

  if (paraAtualizar.length > 0) {
    await db.transaction('rw', db.transactions, async () => {
      for (const id of paraAtualizar) {
        await db.transactions.update(id, { categoriaId });
      }
    });
  }

  return { regraId, transacoesAtualizadas: paraAtualizar.length };
}

/**
 * Varre transações pendentes e aplica regras + dicionário
 */
export async function autoClassificarTransacoesPendentes(): Promise<number> {
  const transacoes = await db.transactions.toArray();
  const regras = await db.rules.toArray();
  const categorias = await db.categories.toArray();

  let totalClassificadas = 0;

  for (const t of transacoes) {
    if (!t.categoriaId && t.id) {
      const res = identificarCategoria(t.descricao, regras, categorias);
      if (res.categoriaId) {
        await db.transactions.update(t.id, {
          categoriaId: res.categoriaId,
          recorrente: t.recorrente ?? res.recorrente ?? false,
        });
        totalClassificadas++;
      }
    }
  }

  return totalClassificadas;
}
