import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acaoTexto?: string;
  onAcao?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icone: Icon,
  titulo,
  descricao,
  acaoTexto,
  onAcao,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-8 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-content-main-light dark:text-content-main-dark mb-2">
        {titulo}
      </h3>
      <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark leading-relaxed mb-6">
        {descricao}
      </p>
      {acaoTexto && onAcao && (
        <button
          onClick={onAcao}
          type="button"
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          {acaoTexto}
        </button>
      )}
    </div>
  );
};
