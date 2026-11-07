import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { db } from '../db/db';
import { analisarMeta } from '../lib/calculations/goals';
import { calcularEstatisticasPainel } from '../lib/calculations/sobra';
import { formatCurrency, formatDate, reaisToCentavos } from '../lib/formatters';
import type { Goal } from '../types';

export const GoalsPage: React.FC = () => {
  const transacoes = useLiveQuery(() => db.transactions.toArray()) || [];
  const categorias = useLiveQuery(() => db.categories.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];

  const stats = useMemo(() => {
    return calcularEstatisticasPainel(transacoes, categorias, 'todos');
  }, [transacoes, categorias]);

  // Modal para adicionar nova meta
  const [modalAberto, setModalAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoPrazo, setNovoPrazo] = useState('');

  const salvarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoValor.trim() || !novoPrazo) return;

    await db.goals.add({
      nome: novoNome.trim(),
      valorAlvo: reaisToCentavos(novoValor),
      prazo: novoPrazo,
    });

    setNovoNome('');
    setNovoValor('');
    setNovoPrazo('');
    setModalAberto(false);
  };

  const excluirMeta = async (id?: number) => {
    if (id && window.confirm('Deseja excluir esta meta?')) {
      await db.goals.delete(id);
    }
  };

  const metasAnalisadas = useMemo(() => {
    return goals.map((g) => analisarMeta(g, stats.sobrou));
  }, [goals, stats.sobrou]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-content-main-light dark:text-content-main-dark flex items-center gap-2">
            <Target className="w-7 h-7 text-primary" />
            <span>Metas Financeiras</span>
          </h1>
          <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
            Planeje seus sonhos e descubra se o aporte mensal necessário cabe na sua sobra real.
          </p>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Criar Nova Meta
        </button>
      </div>

      {/* Grid de Metas */}
      {metasAnalisadas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
            Nenhuma meta cadastrada ainda
          </h3>
          <p className="text-xs text-content-secondary-light max-w-sm mx-auto">
            Defina uma meta como uma viagem, troca de carro ou reserva para sabermos quanto guardar por mês.
          </p>
          <button
            onClick={() => setModalAberto(true)}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
          >
            Adicionar primeira meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metasAnalisadas.map((item) => {
            const configStatus = {
              tranquilo: {
                badge: 'bg-emerald-100 text-income dark:bg-emerald-950/60',
                icon: CheckCircle2,
                label: 'Cabe tranquilo',
              },
              apertado: {
                badge: 'bg-amber-100 text-warning dark:bg-amber-950/60',
                icon: AlertTriangle,
                label: 'Aperta o orçamento',
              },
              fora_do_alcance: {
                badge: 'bg-red-100 text-expense dark:bg-red-950/60',
                icon: XCircle,
                label: 'Excede a sobra',
              },
            }[item.status];

            const IconStatus = configStatus.icon;

            return (
              <div
                key={item.meta.id}
                className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-content-main-light dark:text-content-main-dark">
                      {item.meta.nome}
                    </h3>
                    <button
                      onClick={() => excluirMeta(item.meta.id)}
                      className="p-1 rounded-lg text-content-secondary-light hover:text-expense hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Excluir meta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-black tabular-nums text-primary">
                      {formatCurrency(item.meta.valorAlvo)}
                    </span>
                    <span className="text-xs text-content-secondary-light flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> até {formatDate(item.meta.prazo)}
                    </span>
                  </div>

                  {/* Detalhes do Aporte Necessário */}
                  <div className="p-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark space-y-1.5 text-xs tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-content-secondary-light">Aporte mensal necessário:</span>
                      <span className="font-bold text-content-main-light dark:text-content-main-dark">
                        {formatCurrency(item.aporteMensalCentavos)}/mês
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-secondary-light">Prazo restante:</span>
                      <span className="font-semibold text-content-main-light dark:text-content-main-dark">
                        {item.mesesRestantes} {item.mesesRestantes === 1 ? 'mês' : 'meses'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status e Viabilidade */}
                <div className="pt-2 border-t border-border-light dark:border-border-dark flex items-center justify-between text-xs">
                  <div className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 text-[11px] ${configStatus.badge}`}>
                    <IconStatus className="w-3.5 h-3.5" />
                    <span>{configStatus.label}</span>
                  </div>
                  <span className="text-content-secondary-light text-[11px]">
                    Sobra livre: {formatCurrency(stats.sobrou)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Meta */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Criar Nova Meta
            </h3>

            <form onSubmit={salvarMeta} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Qual é o objetivo?
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Viagem de Férias"
                  className="w-full px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Quanto você precisa juntar? (R$)
                </label>
                <input
                  type="text"
                  required
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  placeholder="5.000,00"
                  className="w-full px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs tabular-nums text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Até quando? (Prazo)
                </label>
                <input
                  type="date"
                  required
                  value={novoPrazo}
                  onChange={(e) => setNovoPrazo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary cursor-pointer"
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
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
