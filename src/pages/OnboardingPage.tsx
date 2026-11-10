import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  UploadCloud,
  ArrowRight,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SobraLogo } from '../components/common/SobraLogo';
import { useAppStore } from '../stores/appStore';
import { formatCurrency, reaisToCentavos } from '../lib/formatters';

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
  const { setEstimativasRapidas, setModoExibicao } = useAppStore();

  const [passoAtivo, setPassoAtivo] = useState<number>(1);
  const [rendaInput, setRendaInput] = useState('5000');
  const [fixosInput, setFixosInput] = useState('3200');
  const [reservaInput, setReservaInput] = useState('6000');
  const [bancoAberto, setBancoAberto] = useState<string | null>(null);

  const toggleBanco = (nome: string) => {
    setBancoAberto(bancoAberto === nome ? null : nome);
  };

  const concluirEstimativaRapida = () => {
    const renda = reaisToCentavos(rendaInput);
    const fixos = reaisToCentavos(fixosInput);
    const reserva = reaisToCentavos(reservaInput);

    setEstimativasRapidas({
      rendaMensal: renda > 0 ? renda : 500000,
      despesasFixas: fixos > 0 ? fixos : 320000,
      reservaAtual: reserva >= 0 ? reserva : 0,
      customizado: true,
    });

    setModoExibicao('rapida');
    navigate('/');
  };

  const sobraPrevista = Math.max(0, reaisToCentavos(rendaInput) - reaisToCentavos(fixosInput));

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <SobraLogo size="xl" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-content-main-light dark:text-content-main-dark">
          Descubra quanto sobra no fim do mês
        </h1>
        <p className="text-xs sm:text-sm text-content-secondary-light dark:text-content-secondary-dark max-w-md mx-auto">
          Sem formulários longos, sem julgamentos e com 100% de privacidade no seu navegador.
        </p>
      </div>

      {/* Card Conversacional Interativo (TDAH-friendly em 30 segundos) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
          <Zap className="w-4 h-4" />
          <span>Diagnóstico Rápido em 30 segundos</span>
        </div>

        {/* Pergunta 1: Renda */}
        {passoAtivo === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-base sm:text-lg font-bold text-content-main-light dark:text-content-main-dark">
              1. Mais ou menos quanto cai na sua conta por mês?
            </h2>
            <p className="text-xs text-content-secondary-light">
              Pode ser um chute aproximado. Você poderá refinar com extratos mais tarde se quiser.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {['3000', '5000', '8000', '12000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRendaInput(val)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    rendaInput === val
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50 text-content-main-light dark:text-content-main-dark'
                  }`}
                >
                  R$ {Number(val).toLocaleString('pt-BR')}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-content-secondary-light mb-1">
                Ou digite seu valor:
              </label>
              <input
                type="text"
                value={rendaInput}
                onChange={(e) => setRendaInput(e.target.value)}
                className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark font-bold text-sm outline-none focus:ring-2 focus:ring-primary tabular-nums"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setPassoAtivo(2)}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Pergunta 2: Despesas Fixas */}
        {passoAtivo === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-base sm:text-lg font-bold text-content-main-light dark:text-content-main-dark">
              2. Quanto vai embora todo mês com contas fixas?
            </h2>
            <p className="text-xs text-content-secondary-light">
              Aluguel, condomínio, luz, internet, mensalidades ou financiamentos.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {['1800', '2500', '3200', '4500'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFixosInput(val)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    fixosInput === val
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50 text-content-main-light dark:text-content-main-dark'
                  }`}
                >
                  R$ {Number(val).toLocaleString('pt-BR')}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-content-secondary-light mb-1">
                Ou digite o valor estimado:
              </label>
              <input
                type="text"
                value={fixosInput}
                onChange={(e) => setFixosInput(e.target.value)}
                className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark font-bold text-sm outline-none focus:ring-2 focus:ring-primary tabular-nums"
              />
            </div>

            <div className="flex justify-between items-center pt-3">
              <button
                type="button"
                onClick={() => setPassoAtivo(1)}
                className="text-xs font-semibold text-content-secondary-light hover:underline"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setPassoAtivo(3)}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <span>Próximo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Pergunta 3: Reserva Atual */}
        {passoAtivo === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-base sm:text-lg font-bold text-content-main-light dark:text-content-main-dark">
              3. Você já tem algum dinheiro guardado na reserva?
            </h2>
            <p className="text-xs text-content-secondary-light">
              Poupança, caixinhas ou tesouro direto. Se não tiver, tudo bem colocar zero!
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: 'Ainda não (R$ 0)', val: '0' },
                { label: 'R$ 2.000', val: '2000' },
                { label: 'R$ 6.000', val: '6000' },
                { label: 'R$ 15.000+', val: '15000' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setReservaInput(item.val)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    reservaInput === item.val
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50 text-content-main-light dark:text-content-main-dark'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Resultado do Veredito Imediato */}
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-content-main-light dark:text-content-main-dark space-y-1">
              <span className="text-[11px] uppercase font-bold text-primary tracking-wider">
                Resultado do Diagnóstico
              </span>
              <div className="text-xl sm:text-2xl font-black text-income dark:text-emerald-400">
                Sobra estimada: {formatCurrency(sobraPrevista)}/mês
              </div>
              <p className="text-xs text-content-secondary-light">
                Com base nisso, você acumularia cerca de {formatCurrency(sobraPrevista * 12)} em 12 meses.
              </p>
            </div>

            <div className="flex justify-between items-center pt-3">
              <button
                type="button"
                onClick={() => setPassoAtivo(2)}
                className="text-xs font-semibold text-content-secondary-light hover:underline"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={concluirEstimativaRapida}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ver Meu Painel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Opção Alternativa: Importar Arquivo Completo */}
      <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-light dark:border-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <UploadCloud className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <span className="font-bold block text-content-main-light dark:text-content-main-dark">
              Prefere pular as perguntas e carregar seus extratos?
            </span>
            <span className="text-content-secondary-light">
              Suporta Excel (.xlsx), CSV, OFX e faturas em PDF com senha.
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/importar')}
          className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark hover:border-primary/50 text-primary font-bold shadow-2xs transition-all whitespace-nowrap self-start sm:self-auto"
        >
          Importar Extratos
        </button>
      </div>

      {/* Guia dos Bancos (Sanfonado) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs uppercase font-bold text-content-secondary-light tracking-wider">
          Como baixar o extrato no seu banco
        </h3>
        <div className="space-y-2">
          {guiasBancos.map((g) => (
            <div
              key={g.banco}
              className="rounded-xl border border-border-light dark:border-border-dark overflow-hidden bg-surface-light dark:bg-surface-dark"
            >
              <button
                onClick={() => toggleBanco(g.banco)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-content-main-light dark:text-content-main-dark hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span>{g.banco}</span>
                {bancoAberto === g.banco ? (
                  <ChevronUp className="w-4 h-4 text-content-secondary-light" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-content-secondary-light" />
                )}
              </button>
              {bancoAberto === g.banco && (
                <div className="px-4 pb-3 text-xs text-content-secondary-light dark:text-content-secondary-dark leading-relaxed border-t border-border-light dark:border-border-dark pt-2 bg-background-light dark:bg-background-dark">
                  {g.passos}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
