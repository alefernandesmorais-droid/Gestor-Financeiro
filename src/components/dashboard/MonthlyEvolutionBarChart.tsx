import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { MesHistorico } from '../../lib/calculations/sobra';
import { formatCurrency } from '../../lib/formatters';

interface MonthlyEvolutionBarChartProps {
  historico: MesHistorico[];
}

export const MonthlyEvolutionBarChart: React.FC<MonthlyEvolutionBarChartProps> = ({
  historico,
}) => {
  if (historico.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-content-secondary-light dark:text-content-secondary-dark">
        Histórico insuficiente para gerar o gráfico mensal.
      </div>
    );
  }

  const data = historico.map((h) => ({
    mes: h.rotulo,
    Entrou: h.entrou / 100,
    Saiu: h.saiu / 100,
    entrouCentavos: h.entrou,
    saiuCentavos: h.saiu,
    sobrouCentavos: h.sobrou,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark p-3 rounded-xl border border-border-light dark:border-border-dark shadow-lg text-xs space-y-1.5 tabular-nums">
          <div className="font-bold text-content-main-light dark:text-content-main-dark mb-1">
            {label}
          </div>
          <div className="flex items-center justify-between gap-4 text-income">
            <span>Entrou:</span>
            <span className="font-bold">{formatCurrency(item.entrouCentavos)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-expense">
            <span>Saiu:</span>
            <span className="font-bold">{formatCurrency(item.saiuCentavos)}</span>
          </div>
          <div className="pt-1 border-t border-border-light dark:border-border-dark flex items-center justify-between gap-4 text-primary font-bold">
            <span>Sobrou:</span>
            <span>{formatCurrency(item.sobrouCentavos)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
          />
          <Bar dataKey="Entrou" fill="#0E9F6E" radius={[6, 6, 0, 0]} maxBarSize={32} />
          <Bar dataKey="Saiu" fill="#E5484D" radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
