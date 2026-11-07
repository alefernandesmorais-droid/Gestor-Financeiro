import React from 'react';
import { Tv, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../../types';
import type { AssinaturaDetectada } from '../../lib/calculations/sobra';
import { formatCurrency, formatDate } from '../../lib/formatters';

interface SubscriptionsAndTopExpensesProps {
  maioresGastos: Transaction[];
  assinaturasAtivas: AssinaturaDetectada[];
  totalAssinaturas: number;
}

export const SubscriptionsAndTopExpenses: React.FC<SubscriptionsAndTopExpensesProps> = ({
  maioresGastos,
  assinaturasAtivas,
  totalAssinaturas,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card Maiores Gastos */}
      <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-expense" />
              Maiores Gastos do Mês
            </h3>
            <Link
              to="/transacoes"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {maioresGastos.length === 0 ? (
            <p className="text-xs text-content-secondary-light py-4 text-center">
              Nenhuma despesa registrada neste período.
            </p>
          ) : (
            <div className="space-y-2.5">
              {maioresGastos.map((g, idx) => (
                <div key={g.id || idx} className="flex items-center justify-between text-xs py-1">
                  <div className="truncate max-w-[200px]">
                    <span className="font-semibold text-content-main-light dark:text-content-main-dark block truncate">
                      {g.descricao}
                    </span>
                    <span className="text-[10px] text-content-secondary-light">
                      {formatDate(g.data)}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-expense">
                    {formatCurrency(g.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Assinaturas Ativas */}
      <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <Tv className="w-4 h-4 text-accent" />
              Assinaturas & Recorrências
            </h3>
            <span className="text-xs font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
              {formatCurrency(totalAssinaturas)}/mês
            </span>
          </div>

          {/* Alerta de assinaturas */}
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-[11px] text-accent dark:text-purple-300 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Você possui <strong>{assinaturasAtivas.length} assinaturas ativas</strong>, totalizando{' '}
              <strong>{formatCurrency(totalAssinaturas)}</strong> todo mês.
            </span>
          </div>

          {assinaturasAtivas.length === 0 ? (
            <p className="text-xs text-content-secondary-light py-2 text-center">
              Nenhuma assinatura identificada automaticamente.
            </p>
          ) : (
            <div className="space-y-2">
              {assinaturasAtivas.slice(0, 4).map((a, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                  <span className="font-medium text-content-main-light dark:text-content-main-dark truncate max-w-[200px]">
                    {a.descricao}
                  </span>
                  <span className="font-semibold tabular-nums text-content-secondary-light dark:text-content-secondary-dark">
                    {formatCurrency(a.valorCentavos)}/mês
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
