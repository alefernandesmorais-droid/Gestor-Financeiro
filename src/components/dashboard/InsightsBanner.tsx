import React from 'react';
import { Lightbulb, TrendingUp, AlertCircle, Wallet, Utensils, Tv, PieChart } from 'lucide-react';
import type { InsightFinanceiro } from '../../lib/calculations/sobra';

interface InsightsBannerProps {
  insights: InsightFinanceiro[];
}

const iconePorNome = (nome: string) => {
  switch (nome) {
    case 'TrendingUp':
      return <TrendingUp className="w-4 h-4 text-income" />;
    case 'AlertCircle':
      return <AlertCircle className="w-4 h-4 text-warning" />;
    case 'Wallet':
      return <Wallet className="w-4 h-4 text-primary" />;
    case 'Utensils':
      return <Utensils className="w-4 h-4 text-orange-500" />;
    case 'Tv':
      return <Tv className="w-4 h-4 text-accent" />;
    case 'PieChart':
      return <PieChart className="w-4 h-4 text-indigo-500" />;
    default:
      return <Lightbulb className="w-4 h-4 text-amber-500" />;
  }
};

export const InsightsBanner: React.FC<InsightsBannerProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-500">
          <Lightbulb className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-content-main-light dark:text-content-main-dark">
          Insights Automáticos do Seu Mês
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="p-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-start gap-2.5 text-xs text-content-main-light dark:text-content-main-dark leading-relaxed"
          >
            <div className="flex-shrink-0 mt-0.5">{iconePorNome(insight.icone)}</div>
            <span>{insight.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
