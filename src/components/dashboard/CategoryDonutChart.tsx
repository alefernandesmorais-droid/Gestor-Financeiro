import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { CategoriaGasto } from '../../lib/calculations/sobra';
import { formatCurrency } from '../../lib/formatters';

interface CategoryDonutChartProps {
  categorias: CategoriaGasto[];
  totalGasto: number;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categorias,
  totalGasto,
}) => {
  if (categorias.length === 0 || totalGasto === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-content-secondary-light dark:text-content-secondary-dark">
        Nenhum gasto registrado para exibir no gráfico.
      </div>
    );
  }

  // Prepara dados para o Recharts
  const data = categorias.map((c) => ({
    name: c.nome,
    value: c.totalCentavos / 100, // em reais para tooltip
    centavos: c.totalCentavos,
    percentual: c.percentual,
    color: c.cor,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark p-3 rounded-xl border border-border-light dark:border-border-dark shadow-lg text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-content-main-light dark:text-content-main-dark">
              {item.name}
            </span>
          </div>
          <div className="text-content-secondary-light dark:text-content-secondary-dark">
            <span className="font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
              {formatCurrency(item.centavos)}
            </span>{' '}
            ({item.percentual}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      {/* Gráfico Donut */}
      <div className="relative w-48 h-48 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Rótulo central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] text-content-secondary-light uppercase font-semibold">
            Total Saídas
          </span>
          <span className="text-sm font-bold tabular-nums text-expense">
            {formatCurrency(totalGasto)}
          </span>
        </div>
      </div>

      {/* Legenda com percentuais */}
      <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
        {categorias.slice(0, 6).map((c) => (
          <div key={c.categoriaId} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate max-w-[180px]">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.cor }}
              />
              <span className="text-content-main-light dark:text-content-main-dark truncate">
                {c.nome}
              </span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="font-semibold text-content-main-light dark:text-content-main-dark">
                {formatCurrency(c.totalCentavos)}
              </span>
              <span className="text-[10px] text-content-secondary-light w-8 text-right">
                {c.percentual}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
