import React from 'react';

interface SobraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

/**
 * Logotipo oficial do Sobra.
 * Design premium inspirado em fintechs modernas:
 * - Ícone squircle com gradiente esmeralda e menta luminoso
 * - Traço vetorial curvo estilizado formando um "S" dinâmico com vetor de crescimento financeiro
 * - Reflexo sutil de profundidade
 */
export const SobraLogo: React.FC<SobraLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  const iconDimension = {
    sm: 28,
    md: 36,
    lg: 44,
    xl: 56,
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Símbolo Vetorial */}
      <div
        className={`${sizeMap[size]} relative flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 hover:scale-105`}
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)',
          boxShadow: '0 4px 14px -2px rgba(16, 185, 129, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
        }}
      >
        <svg
          width={iconDimension * 0.62}
          height={iconDimension * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white drop-shadow-sm"
        >
          {/* Curva superior do S com seta sutil de crescimento */}
          <path
            d="M17.5 7.5C17.5 5.5 15.5 4 12.5 4C9 4 7 5.5 7 8C7 11.5 17 10.5 17 15C17 18 14.5 20 11.5 20C8 20 6.5 18 6.5 16.5"
            stroke="white"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ponto luminoso superior representando a sobra poupada */}
          <circle cx="18" cy="6" r="1.5" fill="white" />
        </svg>
      </div>

      {/* Tipografia da Marca (Opcional) */}
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-tight text-content-main-light dark:text-content-main-dark leading-none">
            Sobra
          </span>
          <span className="text-[10px] font-medium text-content-secondary-light dark:text-content-secondary-dark tracking-normal mt-0.5">
            Gestão Financeira
          </span>
        </div>
      )}
    </div>
  );
};
