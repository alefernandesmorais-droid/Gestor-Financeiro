import React from 'react';
import { Lock, Shuffle } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

interface FixedVsVariableCardProps {
  gastosFixos: number;
  gastosVariaveis: number;
  percentualFixos: number;
  totalGasto: number;
}

export const FixedVsVariableCard: React.FC<FixedVsVariableCardProps> = ({
  gastosFixos,
  gastosVariaveis,
  percentualFixos,
  totalGasto,
}) => {
  const percentualVariaveis = 100 - percentualFixos;

  return (
    <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
          Gastos Fixos vs Variáveis
        </h3>
        <span className="text-[11px] font-semibold text-content-secondary-light">
          {percentualFixos}% comprometido
        </span>
      </div>

      {/* Barra de Progresso Bicolor */}
      <div className="w-full h-3 rounded-full bg-border-light dark:bg-border-dark overflow-hidden flex">
        <div
          className="bg-accent h-full transition-all duration-500 rounded-l-full"
          style={{ width: `${Math.min(100, Math.max(0, percentualFixos))}%` }}
          title={`Fixos: ${percentualFixos}%`}
        />
        <div
          className="bg-amber-400 h-full transition-all duration-500 rounded-r-full"
          style={{ width: `${Math.min(100, Math.max(0, percentualVariaveis))}%` }}
          title={`Variáveis: ${percentualVariaveis}%`}
        />
      </div>

      {/* Valores detalhados */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent/10 text-accent mt-0.5">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-content-secondary-light block">
              Fixos / Recorrentes
            </span>
            <span className="text-sm font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
              {formatCurrency(gastosFixos)}
            </span>
            <span className="text-[10px] text-content-secondary-light block">
              {percentualFixos}% das despesas
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-500 mt-0.5">
            <Shuffle className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-content-secondary-light block">
              Variáveis / Estilo de vida
            </span>
            <span className="text-sm font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
              {formatCurrency(gastosVariaveis)}
            </span>
            <span className="text-[10px] text-content-secondary-light block">
              {percentualVariaveis}% das despesas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
