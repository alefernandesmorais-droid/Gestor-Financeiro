/**
 * Detecção inteligente de transferências internas e pagamentos de fatura de cartão de crédito.
 * Evita contagem duplicada de gastos quando o usuário importa extrato de conta + extrato de cartão.
 */

import { normalizarDescricao } from './dedup';

const PADROES_FATURA = [
  'PAGAMENTO DE FATURA',
  'PAGTO FATURA',
  'PGTO FATURA',
  'PAGTO ELETRON COBRANCA',
  'PAGAMENTO CARTAO',
  'PGTO CARTAO',
  'LIQUIDACAO FATURA',
  'DEBITO FATURA',
  'FATURA CARTAO',
  'PAGAMENTO FATURA CARTAO',
  'PAGAMENTO NUBANK',
  'FATURA NUBANK',
  'PAGTO FATURA INTER',
  'PAGAMENTO FATURA C6',
  'PAGAMENTO CARTAO CREDITO',
];

const PADROES_TRANSF_PROPRIA = [
  'TRANSF ENTRE CONTAS',
  'TRANSFERENCIA ENTRE CONTAS',
  'TRANSF MESMA TITULARIDADE',
  'TRANSFERENCIA MESMA TITULARIDADE',
  'PIX MESMA TITULARIDADE',
  'APLICACAO AUTOMATICA',
  'RESGATE AUTOMATICO',
];

/**
 * Verifica se a descrição se refere a pagamento de fatura de cartão de crédito
 */
export function isPagamentoFatura(descricao: string): boolean {
  const norm = normalizarDescricao(descricao);
  return PADROES_FATURA.some((padrao) => norm.includes(padrao));
}

/**
 * Verifica se a descrição se refere a transferência entre contas da mesma titularidade
 */
export function isTransferenciaPropria(descricao: string): boolean {
  const norm = normalizarDescricao(descricao);
  return PADROES_TRANSF_PROPRIA.some((padrao) => norm.includes(padrao));
}

export interface AnaliseTransacaoTransf {
  ePagamentoFatura: boolean;
  eTransferenciaPropria: boolean;
  sugestaoIgnorar: boolean;
  motivo?: string;
}

/**
 * Analisa uma transação para identificar se deve ser ignorada no total de gastos para evitar duplicidade
 */
export function analisarTransfOuFatura(descricao: string): AnaliseTransacaoTransf {
  if (isPagamentoFatura(descricao)) {
    return {
      ePagamentoFatura: true,
      eTransferenciaPropria: false,
      sugestaoIgnorar: true,
      motivo: 'Pagamento de fatura (despesas já detalhadas no cartão)',
    };
  }

  if (isTransferenciaPropria(descricao)) {
    return {
      ePagamentoFatura: false,
      eTransferenciaPropria: true,
      sugestaoIgnorar: true,
      motivo: 'Transferência entre contas próprias',
    };
  }

  return {
    ePagamentoFatura: false,
    eTransferenciaPropria: false,
    sugestaoIgnorar: false,
  };
}
