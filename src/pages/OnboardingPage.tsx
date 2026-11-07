import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, UploadCloud, ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const guiasBancos = [
  {
    banco: 'Nubank',
    passos: 'No app do Nubank, toque na conta > deslize até o fim e toque em "Pedir extrato" > escolha o mês > selecione o formato CSV ou OFX > o arquivo é enviado para o seu e-mail.',
  },
  {
    banco: 'Banco Inter',
    passos: 'No app Inter, acesse "Extrato" > toque no ícone de exportar/compartilhar no topo direito > selecione o período desejado e o formato OFX ou CSV.',
  },
  {
    banco: 'Itaú',
    passos: 'No Internet Banking ou app, vá em Conta Corrente > Extrato > clique em "Salvar em outros formatos" > escolha OFX ou CSV.',
  },
  {
    banco: 'Bradesco',
    passos: 'No Internet Banking, acesse Saldo e Extrato > Extrato Mensal > clique em "Salvar como arquivo" (formato OFX/Money).',
  },
  {
    banco: 'Santander',
    passos: 'No Internet Banking, vá em Conta Corrente > Consultar Extrato > exportar no formato OFX/CSV.',
  },
  {
    banco: 'Banco do Brasil',
    passos: 'No App ou Autoatendimento BB na web, acesse Extrato > selecione o mês > clique no botão de exportação e selecione OFX ou CSV.',
  },
  {
    banco: 'C6 Bank',
    passos: 'No app C6, vá em Extrato da Conta > Exportar extrato > selecione o período e o formato CSV.',
  },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [bancoAberto, setBancoAberto] = useState<string | null>(null);

  const toggleBanco = (nome: string) => {
    setBancoAberto(bancoAberto === nome ? null : nome);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Cabeçalho */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-2xl font-black mb-2 shadow-sm">
          S
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-content-main-light dark:text-content-main-dark">
          Bem-vindo ao Sobra
        </h1>
        <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark max-w-md mx-auto">
          Descubra quanto sobra de verdade no fim do mês sem complicação e com total privacidade.
        </p>
      </div>

      {/* 3 Passos */}
      <div className="space-y-4">
        {/* Passo 1 */}
        <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm">
            1
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
              Privacidade em primeiro lugar
            </h3>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark leading-relaxed">
              O Sobra <strong>nunca</strong> pede sua senha de banco nem conecta na sua conta. Você apenas faz upload dos arquivos de extrato (OFX, CSV ou PDF) que quiser analisar. Tudo fica salvo apenas no seu aparelho.
            </p>
          </div>
        </div>

        {/* Passo 2 */}
        <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm">
            2
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
              Como exportar o extrato no seu banco
            </h3>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark leading-relaxed">
              A maioria dos bancos permite baixar o extrato em segundos. Clique no seu banco para ver o passo a passo:
            </p>

            <div className="space-y-2 mt-3">
              {guiasBancos.map((g) => (
                <div
                  key={g.banco}
                  className="rounded-xl border border-border-light dark:border-border-dark overflow-hidden bg-background-light dark:bg-background-dark"
                >
                  <button
                    onClick={() => toggleBanco(g.banco)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-content-main-light dark:text-content-main-dark"
                  >
                    <span>{g.banco}</span>
                    {bancoAberto === g.banco ? (
                      <ChevronUp className="w-4 h-4 text-content-secondary-light" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-content-secondary-light" />
                    )}
                  </button>
                  {bancoAberto === g.banco && (
                    <div className="px-3.5 pb-3 text-xs text-content-secondary-light dark:text-content-secondary-dark leading-relaxed border-t border-border-light dark:border-border-dark pt-2 bg-surface-light dark:bg-surface-dark">
                      {g.passos}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Passo 3 */}
        <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm">
            3
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <span>IA opcional para tirar dúvidas</span>
              <span className="text-[10px] bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full">
                BYOK
              </span>
            </h3>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark leading-relaxed">
              Você pode adicionar sua chave gratuita do Google Gemini para conversar sobre seu dinheiro (&quot;Posso comprar um celular?&quot;). A IA nunca calcula valores sozinha: ela só consulta os dados calculados pelo código do aplicativo.
            </p>
          </div>
        </div>
      </div>

      {/* Botão de Ação */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={() => navigate('/importar')}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <span>Ir para a importação</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border-light dark:border-border-dark text-content-main-light dark:text-content-main-dark text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          Ir direto ao Painel
        </button>
      </div>
    </div>
  );
};
