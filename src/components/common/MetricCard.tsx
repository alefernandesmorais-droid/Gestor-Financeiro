import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { useAppStore } from '../../stores/appStore';

interface MetricCardProps {
  titulo: string;
  valorCentavos: number;
  subtexto?: string;
  comparativo?: {
    percentual: number;
    positivoBom: boolean; // se subir for bom (ex: entrou/sobrou) ou ruim (ex: saiu)
  };
  icone: LucideIcon;
  variante?: 'default' | 'entrada' | 'saida' | 'primaria';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  titulo,
  valorCentavos,
  subtexto,
  comparativo,
  icone: Icon,
  variante = 'default',
}) => {
  const { ocultarValores } = useAppStore();
  const cores = {
    default: {
      borda: 'border-border-light dark:border-border-dark',
      iconeBg: 'bg-black/5 dark:bg-white/10 text-content-main-light dark:text-content-main-dark',
      textoValor: 'text-content-main-light dark:text-content-main-dark',
    },
    primaria: {
      borda: 'border-primary/30 dark:border-primary/40',
      iconeBg: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light',
      textoValor: 'text-primary dark:text-primary-light',
    },
    entrada: {
      borda: 'border-income/30 dark:border-income/40',
      iconeBg: 'bg-income/10 text-income dark:bg-income/20',
      textoValor: 'text-income',
    },
    saida: {
      borda: 'border-expense/30 dark:border-expense/40',
      iconeBg: 'bg-expense/10 text-expense dark:bg-expense/20',
      textoValor: 'text-expense',
    },
  }[variante];

  return (
    <div
      className={`p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border ${cores.borda} shadow-sm transition-all hover:shadow-md flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-content-secondary-light dark:text-content-secondary-dark tracking-wide uppercase">
          {titulo}
        </span>
        <div className={`p-2 rounded-xl ${cores.iconeBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="my-1">
        <span className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${cores.textoValor}`}>
          {ocultarValores ? 'R$ ••••••' : formatCurrency(valorCentavos)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        {subtexto && (
          <span className="text-content-secondary-light dark:text-content-secondary-dark truncate">
            {subtexto}
          </span>
        )}
        {comparativo && (
          <span
            className={`font-semibold ml-auto flex items-center gap-0.5 ${
              (comparativo.percentual >= 0 && comparativo.positivoBom) ||
              (comparativo.percentual < 0 && !comparativo.positivoBom)
                ? 'text-income'
                : 'text-expense'
            }`}
          >
            {comparativo.percentual >= 0 ? '+' : ''}
            {comparativo.percentual.toFixed(1)}% vs mês ant.
          </span>
        )}
      </div>
    </div>
  );
};
