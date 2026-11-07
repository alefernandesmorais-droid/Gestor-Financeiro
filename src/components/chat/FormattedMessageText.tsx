import React from 'react';

interface FormattedMessageTextProps {
  content: string;
  isUser?: boolean;
}

/**
 * Renderizador de texto limpo para o chat:
 * - Converte **negrito** em tags <strong> sem caracteres asteriscos na tela
 * - Converte • tópicos em itens de lista elegantes
 * - Formata badges de semáforo (VERDE), (AMARELO), (VERMELHO) caso apareçam no texto
 */
export const FormattedMessageText: React.FC<FormattedMessageTextProps> = ({ content, isUser = false }) => {
  if (isUser) {
    return <span className="text-white">{content}</span>;
  }

  // Divide o texto em blocos ou linhas
  const linhas = content.split('\n');

  return (
    <div className="space-y-2 text-content-main-light dark:text-content-main-dark text-xs sm:text-sm leading-relaxed">
      {linhas.map((linha, lIdx) => {
        const linhaTrim = linha.trim();
        if (!linhaTrim) {
          return <div key={lIdx} className="h-1.5" />;
        }

        // Verifica se é item de lista (começa com • ou -)
        const isBullet = linhaTrim.startsWith('•') || linhaTrim.startsWith('-');
        const textoSemBullet = isBullet ? linhaTrim.replace(/^[•\-]\s*/, '') : linhaTrim;

        return (
          <div key={lIdx} className={isBullet ? 'flex items-start gap-2 pl-1' : ''}>
            {isBullet && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70 dark:bg-primary-light/70 mt-2 flex-shrink-0" />
            )}
            <div className="flex-1">{renderizarSegmentosInline(textoSemBullet)}</div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Faz parse de marcações inline como **negrito**, badges de cor e valores monetários
 */
function renderizarSegmentosInline(texto: string): React.ReactNode[] {
  // Regex para capturar **negrito** ou (VERDE)/(AMARELO)/(VERMELHO)
  const partes = texto.split(/(\*\*.*?\*\*|\(VERDE\)|\(AMARELO\)|\(VERMELHO\))/gi);

  return partes.map((parte, i) => {
    if (!parte) return null;

    // Negrito com **
    if (parte.startsWith('**') && parte.endsWith('**')) {
      const conteudoNegrito = parte.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-content-main-light dark:text-content-main-dark">
          {conteudoNegrito}
        </strong>
      );
    }

    // Badge de Semáforo inline
    if (parte.toUpperCase() === '(VERDE)') {
      return (
        <span
          key={i}
          className="inline-flex items-center ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
        >
          VERDE
        </span>
      );
    }
    if (parte.toUpperCase() === '(AMARELO)') {
      return (
        <span
          key={i}
          className="inline-flex items-center ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
        >
          AMARELO
        </span>
      );
    }
    if (parte.toUpperCase() === '(VERMELHO)') {
      return (
        <span
          key={i}
          className="inline-flex items-center ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
        >
          VERMELHO
        </span>
      );
    }

    return <span key={i}>{parte}</span>;
  });
}
