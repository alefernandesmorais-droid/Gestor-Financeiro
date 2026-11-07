import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Sparkles,
  Tag,
  Check,
  X,
  CreditCard,
  Building,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../db/db';
import { useAppStore } from '../stores/appStore';
import { formatCurrency, formatDate } from '../lib/formatters';
import { normalizarDescricao } from '../lib/calculations/dedup';
import { cadastrarRegraEAtualizarPassadas } from '../lib/calculations/categorizer';
import type { Transaction, Category, Account } from '../types';

export const TransactionsPage: React.FC = () => {
  const { mesSelecionado } = useAppStore();

  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [contaFiltro, setContaFiltro] = useState<string>('todas');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [ocultarIgnorados, setOcultarIgnorados] = useState<boolean>(false);

  // Estado do Modal de Nova Regra
  const [modalRegra, setModalRegra] = useState<{
    aberto: boolean;
    padrao: string;
    categoriaId: number;
    descExemplo: string;
  }>({
    aberto: false,
    padrao: '',
    categoriaId: 0,
    descExemplo: '',
  });

  const [notificacao, setNotificacao] = useState<string | null>(null);

  // Queries reativas do Dexie
  const transacoes = useLiveQuery(() => db.transactions.toArray()) || [];
  const categorias = useLiveQuery(() => db.categories.toArray()) || [];
  const contas = useLiveQuery(() => db.accounts.toArray()) || [];

  const mapaCategorias = useMemo(() => {
    const map = new Map<number, Category>();
    for (const c of categorias) {
      if (c.id) map.set(c.id, c);
    }
    return map;
  }, [categorias]);

  const mapaContas = useMemo(() => {
    const map = new Map<number, Account>();
    for (const a of contas) {
      if (a.id) map.set(a.id, a);
    }
    return map;
  }, [contas]);

  // Filtragem de transações
  const transacoesFiltradas = useMemo(() => {
    return transacoes
      .filter((t) => {
        // Filtro por Mês (se não for 'todos')
        if (mesSelecionado !== 'todos' && !t.data.startsWith(mesSelecionado)) {
          return false;
        }

        // Filtro por Tipo
        if (tipoFiltro !== 'todos' && t.tipo !== tipoFiltro) {
          return false;
        }

        // Filtro por Categoria
        if (categoriaFiltro === 'sem_categoria' && t.categoriaId) {
          return false;
        }
        if (categoriaFiltro !== 'todas' && categoriaFiltro !== 'sem_categoria') {
          if (t.categoriaId !== Number(categoriaFiltro)) return false;
        }

        // Filtro por Conta
        if (contaFiltro !== 'todas' && t.accountId !== Number(contaFiltro)) {
          return false;
        }

        // Filtro de Ignorados
        if (ocultarIgnorados && t.ignorado) {
          return false;
        }

        // Busca por texto
        if (busca.trim()) {
          const termo = normalizarDescricao(busca);
          const desc = t.descricaoLimpa || normalizarDescricao(t.descricao);
          if (!desc.includes(termo)) return false;
        }

        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [transacoes, mesSelecionado, tipoFiltro, categoriaFiltro, contaFiltro, ocultarIgnorados, busca]);

  // Totais do filtro atual
  const totais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;

    for (const t of transacoesFiltradas) {
      if (t.ignorado) continue; // transações ignoradas não contam nos totais financeiros
      if (t.tipo === 'entrada') {
        entradas += t.valor;
      } else {
        saidas += t.valor;
      }
    }

    return {
      entradas,
      saidas,
      sobra: entradas - saidas,
    };
  }, [transacoesFiltradas]);

  const alterarCategoria = async (transacaoId: number, novaCategoriaId: number) => {
    await db.transactions.update(transacaoId, {
      categoriaId: novaCategoriaId > 0 ? novaCategoriaId : undefined,
    });
  };

  const alternarIgnorado = async (transacaoId: number, valorAtual: boolean) => {
    await db.transactions.update(transacaoId, {
      ignorado: !valorAtual,
    });
  };

  const excluirTransacao = async (transacaoId: number) => {
    if (window.confirm('Deseja excluir permanentemente este lançamento?')) {
      await db.transactions.delete(transacaoId);
    }
  };

  const abrirModalRegra = (t: Transaction) => {
    const termoSugerido = t.descricaoLimpa.split(' ')[0] || t.descricaoLimpa;
    setModalRegra({
      aberto: true,
      padrao: termoSugerido,
      categoriaId: t.categoriaId || (categorias[0]?.id || 1),
      descExemplo: t.descricao,
    });
  };

  const salvarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await cadastrarRegraEAtualizarPassadas(modalRegra.padrao, modalRegra.categoriaId);
      setModalRegra((prev) => ({ ...prev, aberto: false }));
      setNotificacao(
        `Regra criada para "${modalRegra.padrao}". ${res.transacoesAtualizadas} transações foram atualizadas!`
      );
      setTimeout(() => setNotificacao(null), 4000);
    } catch (err: any) {
      alert(`Erro ao criar regra: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-main-light dark:text-content-main-dark">
            Extrato & Transações
          </h1>
          <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
            Consulte, categorize e filtre todos os lançamentos das suas contas e cartões.
          </p>
        </div>

        {/* Resumo da visualização filtrada */}
        <div className="flex items-center gap-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-2.5 rounded-2xl shadow-sm text-xs tabular-nums">
          <div className="px-2">
            <span className="text-[10px] text-content-secondary-light block">Entradas:</span>
            <span className="font-bold text-income">{formatCurrency(totais.entradas)}</span>
          </div>
          <div className="h-6 w-px bg-border-light dark:bg-border-dark" />
          <div className="px-2">
            <span className="text-[10px] text-content-secondary-light block">Saídas:</span>
            <span className="font-bold text-expense">{formatCurrency(totais.saidas)}</span>
          </div>
          <div className="h-6 w-px bg-border-light dark:bg-border-dark" />
          <div className="px-2">
            <span className="text-[10px] text-content-secondary-light block">Sobra filtrada:</span>
            <span className={`font-bold ${totais.sobra >= 0 ? 'text-primary' : 'text-expense'}`}>
              {formatCurrency(totais.sobra)}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de notificação de regra */}
      {notificacao && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-income text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notificacao}</span>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-content-secondary-light absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por descrição ou estabelecimento..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-secondary-light hover:text-content-main-light"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Categoria */}
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark cursor-pointer outline-none"
          >
            <option value="todas">Todas as categorias</option>
            <option value="sem_categoria">⚠️ Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          {/* Filtro por Conta */}
          <select
            value={contaFiltro}
            onChange={(e) => setContaFiltro(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark cursor-pointer outline-none"
          >
            <option value="todas">Todas as contas</option>
            {contas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>

          {/* Filtro por Tipo */}
          <div className="flex rounded-xl border border-border-light dark:border-border-dark p-0.5 bg-background-light dark:bg-background-dark text-xs">
            <button
              onClick={() => setTipoFiltro('todos')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tipoFiltro === 'todos'
                  ? 'bg-surface-light dark:bg-surface-dark text-content-main-light dark:text-content-main-dark font-bold shadow-sm'
                  : 'text-content-secondary-light'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTipoFiltro('entrada')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tipoFiltro === 'entrada'
                  ? 'bg-surface-light dark:bg-surface-dark text-income font-bold shadow-sm'
                  : 'text-content-secondary-light'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setTipoFiltro('saida')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tipoFiltro === 'saida'
                  ? 'bg-surface-light dark:bg-surface-dark text-expense font-bold shadow-sm'
                  : 'text-content-secondary-light'
              }`}
            >
              Saídas
            </button>
          </div>
        </div>

        {/* Toggle para ocultar ignoradas */}
        <div className="flex items-center justify-between text-xs text-content-secondary-light dark:text-content-secondary-dark pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ocultarIgnorados}
              onChange={(e) => setOcultarIgnorados(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-primary accent-primary cursor-pointer"
            />
            <span>Ocultar transferências e faturas marcadas como ignoradas</span>
          </label>
          <span>{transacoesFiltradas.length} transações encontradas</span>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
        {transacoesFiltradas.length === 0 ? (
          <div className="p-12 text-center text-sm text-content-secondary-light dark:text-content-secondary-dark">
            Nenhuma transação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background-light dark:bg-background-dark text-content-secondary-light dark:text-content-secondary-dark border-b border-border-light dark:border-border-dark font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Conta</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {transacoesFiltradas.map((t) => {
                  const conta = mapaContas.get(t.accountId);
                  const categoria = t.categoriaId ? mapaCategorias.get(t.categoriaId) : undefined;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${
                        t.ignorado ? 'opacity-50 line-through-text bg-black/[0.01]' : ''
                      }`}
                    >
                      {/* Data */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-content-secondary-light dark:text-content-secondary-dark">
                        {formatDate(t.data)}
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-content-main-light dark:text-content-main-dark truncate">
                          {t.descricao}
                        </div>
                        {t.ignorado && (
                          <div className="text-[10px] text-warning font-medium">
                            Ignorado (não computado no total de gastos)
                          </div>
                        )}
                      </td>

                      {/* Conta */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[11px] font-medium text-content-secondary-light dark:text-content-secondary-dark">
                          {conta?.tipo === 'cartao' ? (
                            <CreditCard className="w-3 h-3 text-orange-500" />
                          ) : (
                            <Building className="w-3 h-3 text-blue-500" />
                          )}
                          <span className="truncate max-w-[120px]">{conta?.nome || 'Conta'}</span>
                        </span>
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={t.categoriaId || 0}
                          onChange={(e) => t.id && alterarCategoria(t.id, Number(e.target.value))}
                          className="px-2.5 py-1 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark outline-none cursor-pointer"
                        >
                          <option value={0}>Sem categoria</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold tabular-nums">
                        <span className={t.tipo === 'entrada' ? 'text-income' : 'text-expense'}>
                          {t.tipo === 'entrada' ? '+' : '-'} {formatCurrency(t.valor)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Criar regra para lançamentos parecidos */}
                          <button
                            onClick={() => abrirModalRegra(t)}
                            className="p-1 rounded-lg text-content-secondary-light hover:text-accent hover:bg-accent/10"
                            title="Criar regra automática para este estabelecimento"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Alternar ignorado */}
                          <button
                            onClick={() => t.id && alternarIgnorado(t.id, Boolean(t.ignorado))}
                            className={`p-1 rounded-lg ${
                              t.ignorado
                                ? 'text-warning hover:bg-amber-100 dark:hover:bg-amber-950/40'
                                : 'text-content-secondary-light hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                            title={t.ignorado ? 'Desmarcar ignorado' : 'Marcar para não contar no orçamento'}
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => t.id && excluirTransacao(t.id)}
                            className="p-1 rounded-lg text-content-secondary-light hover:text-expense hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Excluir transação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação de Regra Automática */}
      {modalRegra.aberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Criar Regra de Categorização
              </h3>
              <button
                onClick={() => setModalRegra((prev) => ({ ...prev, aberto: false }))}
                className="text-content-secondary-light hover:text-content-main-light"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Sempre que uma transação contiver o termo abaixo, ela será classificada automaticamente, inclusive no histórico.
            </p>

            <form onSubmit={salvarRegra} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Termo / Padrão na descrição
                </label>
                <input
                  type="text"
                  value={modalRegra.padrao}
                  onChange={(e) => setModalRegra((prev) => ({ ...prev, padrao: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs font-mono font-bold text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-accent"
                />
                <span className="text-[10px] text-content-secondary-light block mt-1">
                  Exemplo encontrado: &quot;{modalRegra.descExemplo}&quot;
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Categoria associada
                </label>
                <select
                  value={modalRegra.categoriaId}
                  onChange={(e) =>
                    setModalRegra((prev) => ({ ...prev, categoriaId: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalRegra((prev) => ({ ...prev, aberto: false }))}
                  className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark text-xs font-semibold text-content-secondary-light"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm"
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
