import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { MesHistorico } from '../../lib/calculations/sobra';
import { formatCurrency } from '../../lib/formatters';

interface AccumulatedBalanceLineChartProps {
  historico: MesHistorico[];
}

export const AccumulatedBalanceLineChart: React.FC<AccumulatedBalanceLineChartProps> = ({
  historico,
}) => {
  if (historico.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-content-secondary-light dark:text-content-secondary-dark">
        Histórico insuficiente para gerar o gráfico acumulado.
      </div>
    );
  }

  const data = historico.map((h) => ({
    mes: h.rotulo,
    saldo: h.saldoAcumulado / 100,
    saldoCentavos: h.saldoAcumulado,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark p-3 rounded-xl border border-border-light dark:border-border-dark shadow-lg text-xs tabular-nums">
          <div className="font-bold text-content-main-light dark:text-content-main-dark mb-1">
            {label}
          </div>
          <div className="text-primary font-bold">
            Sobra acumulada: {formatCurrency(item.saldoCentavos)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="corSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0E9F6E" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0E9F6E" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="saldo"
            stroke="#0E9F6E"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#corSaldo)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
