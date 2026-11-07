import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ShieldCheck,
  Plus,
  Trash2,
  TrendingDown,
  Clock,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Wallet,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../db/db';
import { calcularMetricasReserva, simularSaqueReserva } from '../lib/calculations/emergencyFund';
import { calcularEstatisticasPainel } from '../lib/calculations/sobra';
import { formatCurrency, reaisToCentavos } from '../lib/formatters';
import type { Saving } from '../types';

export const ReservePage: React.FC = () => {
  const transacoes = useLiveQuery(() => db.transactions.toArray()) || [];
  const categorias = useLiveQuery(() => db.categories.toArray()) || [];
  const savings = useLiveQuery(() => db.savings.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get('global'));

  const metaMesesConfig = settings?.metaReservaMeses || 6;

  // Sobra média para saber a velocidade de reposição
  const stats = useMemo(() => {
    return calcularEstatisticasPainel(transacoes, categorias, 'todos');
  }, [transacoes, categorias]);

  const metricas = useMemo(() => {
    return calcularMetricasReserva(
      transacoes,
      categorias,
      savings,
      stats.sobrou,
      metaMesesConfig
    );
  }, [transacoes, categorias, savings, stats.sobrou, metaMesesConfig]);

  // Simulador de Saque "E se eu tirar R$ X agora?"
  const [saqueInput, setSaqueInput] = useState<string>('2000,00');

  const simulacaoSaque = useMemo(() => {
    const valorCentavos = reaisToCentavos(saqueInput);
    return simularSaqueReserva(valorCentavos, metricas);
  }, [saqueInput, metricas]);

  // Modal para adicionar nova reserva / conta
  const [modalAberto, setModalAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoValor, setNovoValor] = useState('');

  const salvarNovaReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoValor.trim()) return;

    await db.savings.add({
      nome: novoNome.trim(),
      valor: reaisToCentavos(novoValor),
      atualizadoEm: new Date().toISOString().slice(0, 10),
    });

    setNovoNome('');
    setNovoValor('');
    setModalAberto(false);
  };

  const excluirReserva = async (id?: number) => {
    if (id && window.confirm('Deseja excluir este registro de reserva?')) {
      await db.savings.delete(id);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-content-main-light dark:text-content-main-dark flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <span>Reserva & Poupança</span>
          </h1>
          <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
            Descubra quantos meses de segurança seu dinheiro guardado cobre e simule saques sem riscos.
          </p>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Adicionar Dinheiro Guardado
        </button>
      </div>

      {/* Card Principal: Cobertura da Reserva de Emergência */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-content-secondary-light">
              Sua Cobertura Atual
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold tabular-nums text-primary">
                {metricas.mesesCobertosAtual} {metricas.mesesCobertosAtual === 1 ? 'mês' : 'meses'}
              </span>
              <span className="text-xs text-content-secondary-light">
                de despesas essenciais cobertos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs tabular-nums">
            <div>
              <span className="text-[10px] text-content-secondary-light block">Guardado Total:</span>
              <span className="text-base font-bold text-content-main-light dark:text-content-main-dark">
                {formatCurrency(metricas.reservaAtualCentavos)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-content-secondary-light block">Gasto Essencial/Mês:</span>
              <span className="text-base font-bold text-content-main-light dark:text-content-main-dark">
                {formatCurrency(metricas.despesaEssencialMensalCentavos)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-content-secondary-light block">Meta ({metricas.metaMesesConfigurada} meses):</span>
              <span className="text-base font-bold text-primary">
                {formatCurrency(metricas.metaReservaCentavos)}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso da Meta */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-content-secondary-light">
              Progresso rumo aos {metricas.metaMesesConfigurada} meses ideais
            </span>
            <span className="text-primary tabular-nums">{metricas.percentualMetaAtingido}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-border-light dark:border-border-dark overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${metricas.percentualMetaAtingido}%` }}
            />
          </div>
        </div>
      </div>

      {/* Simulador Interativo: "E se eu tirar R$ X agora?" */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
              Simulador: E se eu tirar dinheiro agora?
            </h2>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Teste o impacto de um saque na sua segurança antes de mexer na reserva.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
          {/* Input de Saque */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-xs font-semibold text-content-secondary-light">
              Valor do saque pretendido (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-content-secondary-light">
                R$
              </span>
              <input
                type="text"
                value={saqueInput}
                onChange={(e) => setSaqueInput(e.target.value)}
                placeholder="2.000,00"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark font-bold text-sm tabular-nums text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <span className="text-[10px] text-content-secondary-light block">
              Sua sobra mensal média para repor é de {formatCurrency(stats.sobrou)}
            </span>
          </div>

          {/* Resultado do Saque */}
          <div className="md:col-span-7 p-4 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
              <div>
                <span className="text-[10px] text-content-secondary-light block">Cobertura após o saque:</span>
                <span className="text-lg font-bold text-content-main-light dark:text-content-main-dark">
                  {simulacaoSaque.mesesCobertosDepois} meses{' '}
                  <span className="text-xs font-normal text-content-secondary-light">
                    (era {simulacaoSaque.mesesCobertosAntes})
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-content-secondary-light block">Tempo para repor:</span>
                <span className="text-lg font-bold text-accent">
                  {simulacaoSaque.tempoParaReporMeses !== null
                    ? `${simulacaoSaque.tempoParaReporMeses} ${simulacaoSaque.tempoParaReporMeses === 1 ? 'mês' : 'meses'}`
                    : 'Sem sobra'}
                </span>
              </div>
            </div>

            <p className="text-xs text-content-main-light dark:text-content-main-dark leading-relaxed font-medium pt-1 border-t border-border-light dark:border-border-dark">
              💡 {simulacaoSaque.mensagem}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Reservas Cadastradas */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
          Onde seu dinheiro guardado está
        </h3>

        {savings.length === 0 ? (
          <p className="text-xs text-content-secondary-light py-4 text-center">
            Nenhuma reserva cadastrada. Clique em &quot;Adicionar Dinheiro Guardado&quot; para registrar sua poupança ou investimentos.
          </p>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {savings.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-content-main-light dark:text-content-main-dark block">
                      {s.nome}
                    </span>
                    <span className="text-[10px] text-content-secondary-light">
                      Atualizado em {s.atualizadoEm}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
                    {formatCurrency(s.valor)}
                  </span>
                  <button
                    onClick={() => excluirReserva(s.id)}
                    className="p-1.5 rounded-lg text-content-secondary-light hover:text-expense hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nova Reserva */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
              Adicionar Dinheiro Guardado
            </h3>

            <form onSubmit={salvarNovaReserva} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Onde está guardado? (Ex: Poupança, CDB 100% CDI)
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: CDB Nubank"
                  className="w-full px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Valor atual (R$)
                </label>
                <input
                  type="text"
                  required
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  placeholder="10.000,00"
                  className="w-full px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs tabular-nums text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-3 py-1.5 rounded-xl border border-border-light dark:border-border-dark text-xs font-semibold text-content-secondary-light"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
