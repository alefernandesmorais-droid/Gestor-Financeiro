import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  TrendingDown,
  Sparkles,
  PieChart,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import type { ChatCardData } from '../../lib/ai/provider';

interface ChatCardProps {
  data: ChatCardData;
}

export const ChatCard: React.FC<ChatCardProps> = ({ data }) => {
  const getIconeSemaforo = () => {
    switch (data.semaforo) {
      case 'verde':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'amarelo':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'vermelho':
        return <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-accent" />;
    }
  };

  const getSemaforoClasses = () => {
    switch (data.semaforo) {
      case 'verde':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      case 'amarelo':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
      case 'vermelho':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';
      default:
        return 'bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-light border-primary/20';
    }
  };

  const getHeaderIcon = () => {
    switch (data.tipo) {
      case 'compra':
        return <ShoppingBag className="w-4 h-4 text-primary" />;
      case 'reserva':
        return <ShieldCheck className="w-4 h-4 text-income" />;
      case 'corte':
        return <TrendingDown className="w-4 h-4 text-accent" />;
      case 'gastos':
      case 'panorama':
      default:
        return <PieChart className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3.5">
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-light dark:border-border-dark pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 flex-shrink-0">
            {getHeaderIcon()}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-content-main-light dark:text-content-main-dark leading-tight">
              {data.titulo}
            </h4>
            {data.subtitulo && (
              <p className="text-[11px] text-content-secondary-light dark:text-content-secondary-dark">
                {data.subtitulo}
              </p>
            )}
          </div>
        </div>

        {/* Badge de Veredito / Status */}
        {data.semaforo && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border self-start sm:self-auto ${getSemaforoClasses()}`}
          >
            {getIconeSemaforo()}
            <span className="uppercase tracking-wider">
              {data.semaforo === 'verde'
                ? 'Aprovado'
                : data.semaforo === 'amarelo'
                ? 'Atenção'
                : 'Alerta'}
            </span>
          </div>
        )}
      </div>

      {/* Grade de Métricas Visuais */}
      {data.metricas && data.metricas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
          {data.metricas.map((m, idx) => {
            const isDestaque = m.destaque;
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isDestaque
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-border-light dark:border-border-dark'
                }`}
              >
                <span className="text-[10px] uppercase font-semibold text-content-secondary-light dark:text-content-secondary-dark tracking-wide line-clamp-1">
                  {m.rotulo}
                </span>
                <span
                  className={`text-xs sm:text-sm font-bold font-mono tabular-nums mt-1 leading-tight ${
                    m.variacao === 'positivo'
                      ? 'text-income dark:text-emerald-400'
                      : m.variacao === 'alerta'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-content-main-light dark:text-content-main-dark'
                  }`}
                >
                  {m.valor}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Caixa de Dica ou Recomendação Consultiva */}
      {data.dicaOuRecomendacao && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 text-[11px] sm:text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block text-[11px] uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-0.5">
              Recomendação Estratégica
            </strong>
            <span>{data.dicaOuRecomendacao}</span>
          </div>
        </div>
      )}
    </div>
  );
};
