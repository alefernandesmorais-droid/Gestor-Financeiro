import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Wallet,
  ArrowRight,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { db } from '../db/db';
import { simularCompra } from '../lib/calculations/buySimulator';
import { calcularEstatisticasPainel } from '../lib/calculations/sobra';
import { formatCurrency, reaisToCentavos } from '../lib/formatters';

export const SimulatorPage: React.FC = () => {
  const transacoes = useLiveQuery(() => db.transactions.toArray()) || [];
  const categorias = useLiveQuery(() => db.categories.toArray()) || [];
  const savings = useLiveQuery(() => db.savings.toArray()) || [];

  // Média de sobra mensal
  const stats = useMemo(() => {
    return calcularEstatisticasPainel(transacoes, categorias, 'todos');
  }, [transacoes, categorias]);

  const reservaAtual = useMemo(() => {
    return savings.reduce((acc, s) => acc + s.valor, 0);
  }, [savings]);

  // Inputs do Simulador
  const [valorInput, setValorInput] = useState<string>('3000,00');
  const [formaPagamento, setFormaPagamento] = useState<'a_vista' | 'parcelado'>('parcelado');
  const [numeroParcelas, setNumeroParcelas] = useState<number>(10);
  const [jurosInput, setJurosInput] = useState<string>('0');

  const resultado = useMemo(() => {
    const valorCentavos = reaisToCentavos(valorInput);
    const taxaJuros = parseFloat(jurosInput.replace(',', '.')) || 0;
    // Se não há dados, assume uma sobra base de exemplo para a simulação não quebrar
    const sobraMedia = stats.sobrou !== 0 ? stats.sobrou : 150000;

    return simularCompra({
      valorCentavos,
      formaPagamento,
      numeroParcelas,
      taxaJurosMensalPercentual: taxaJuros,
      sobraMensalMediaCentavos: sobraMedia,
      reservaAtualCentavos: reservaAtual,
    });
  }, [valorInput, formaPagamento, numeroParcelas, jurosInput, stats.sobrou, reservaAtual]);

  const configSemaforo = {
    verde: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
      text: 'text-income',
      badge: 'bg-emerald-100 text-income dark:bg-emerald-900/60',
      icon: CheckCircle2,
    },
    amarelo: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
      text: 'text-warning',
      badge: 'bg-amber-100 text-warning dark:bg-amber-900/60',
      icon: AlertTriangle,
    },
    vermelho: {
      bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60',
      text: 'text-expense',
      badge: 'bg-red-100 text-expense dark:bg-red-900/60',
      icon: XCircle,
    },
  }[resultado.semaforo];

  const IconSemaforo = configSemaforo.icon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-content-main-light dark:text-content-main-dark flex items-center gap-2">
          <Calculator className="w-7 h-7 text-primary" />
          <span>Posso Comprar?</span>
        </h1>
        <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
          Simule compras no cartão ou à vista. O código calcula o impacto exato na sua sobra mensal e anual sem enrolação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Coluna da Esquerda: Formulário de Entrada */}
        <div className="md:col-span-5 p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-content-main-light dark:text-content-main-dark uppercase tracking-wider text-xs">
            Dados da Compra
          </h2>

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary-light mb-1">
              Valor da compra (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-content-secondary-light">
                R$
              </span>
              <input
                type="text"
                value={valorInput}
                onChange={(e) => setValorInput(e.target.value)}
                placeholder="3.000,00"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark font-bold text-base tabular-nums text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary-light mb-1">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormaPagamento('a_vista')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  formaPagamento === 'a_vista'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-border-light dark:border-border-dark text-content-secondary-light hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                À vista
              </button>
              <button
                type="button"
                onClick={() => setFormaPagamento('parcelado')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  formaPagamento === 'parcelado'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-border-light dark:border-border-dark text-content-secondary-light hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Parcelado
              </button>
            </div>
          </div>

          {/* Se parcelado: Número de parcelas e Juros */}
          {formaPagamento === 'parcelado' && (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-content-secondary-light">Número de parcelas:</span>
                  <span className="font-bold text-primary tabular-nums">{numeroParcelas}x</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={numeroParcelas}
                  onChange={(e) => setNumeroParcelas(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-content-secondary-light">
                  <span>2x</span>
                  <span>6x</span>
                  <span>10x</span>
                  <span>12x</span>
                  <span>24x</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Juros mensal (% a.m., opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={jurosInput}
                    onChange={(e) => setJurosInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs tabular-nums text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-content-secondary-light">
                    %
                  </span>
                </div>
                <span className="text-[10px] text-content-secondary-light block mt-1">
                  Deixe 0 caso seja parcelamento sem juros.
                </span>
              </div>
            </div>
          )}

          {/* Contexto Atual */}
          <div className="pt-3 border-t border-border-light dark:border-border-dark space-y-1 text-xs">
            <div className="flex justify-between text-content-secondary-light">
              <span>Sobra média mensal atual:</span>
              <span className="font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
                {formatCurrency(resultado.sobraMensalAntesCentavos)}
              </span>
            </div>
            {reservaAtual > 0 && (
              <div className="flex justify-between text-content-secondary-light">
                <span>Reserva guardada:</span>
                <span className="font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
                  {formatCurrency(reservaAtual)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Card do Semáforo e Projeções */}
        <div className="md:col-span-7 space-y-4">
          {/* Card do Semáforo com Ícone e Exposta Direta */}
          <div
            className={`p-6 rounded-2xl border ${configSemaforo.bg} shadow-sm transition-all space-y-3`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${configSemaforo.badge}`}>
                <IconSemaforo className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                  Veredito da Simulação
                </span>
                <h3 className={`text-xl font-black ${configSemaforo.text}`}>
                  {resultado.tituloSemaforo}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-content-main-light dark:text-content-main-dark leading-relaxed font-medium">
              {resultado.motivoSemaforo}
            </p>

            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 text-xs text-content-secondary-light dark:text-content-secondary-dark leading-relaxed">
              💡 <strong>Dica do Sobra:</strong> {resultado.recomendacao}
            </div>
          </div>

          {/* Grid de Impacto Detalhado */}
          <div className="grid grid-cols-2 gap-3">
            {/* Parcela ou Total */}
            <div className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
              <span className="text-[10px] font-semibold text-content-secondary-light uppercase block">
                {formaPagamento === 'parcelado' ? `Parcela (${numeroParcelas}x)` : 'Valor Total'}
              </span>
              <span className="text-xl font-bold tabular-nums text-expense">
                {formatCurrency(resultado.valorParcelaCentavos)}
                {formaPagamento === 'parcelado' && <span className="text-xs font-normal">/mês</span>}
              </span>
              <span className="text-[10px] text-content-secondary-light block mt-1">
                Total:{' '}
                <strong className="text-content-main-light dark:text-content-main-dark">
                  {formatCurrency(resultado.valorTotalCentavos)}
                </strong>
              </span>
            </div>

            {/* Sobra Mensal Depois */}
            <div className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
              <span className="text-[10px] font-semibold text-content-secondary-light uppercase block">
                Sobra após a compra
              </span>
              <span
                className={`text-xl font-bold tabular-nums ${
                  resultado.sobraMensalDepoisCentavos >= 0 ? 'text-primary' : 'text-expense'
                }`}
              >
                {formatCurrency(resultado.sobraMensalDepoisCentavos)}
                <span className="text-xs font-normal">/mês</span>
              </span>
              <span className="text-[10px] text-content-secondary-light block mt-1">
                Antes era {formatCurrency(resultado.sobraMensalAntesCentavos)}
              </span>
            </div>

            {/* Sobra no Ano */}
            <div className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
              <span className="text-[10px] font-semibold text-content-secondary-light uppercase block">
                Sobra no Ano (12 meses)
              </span>
              <span className="text-lg font-bold tabular-nums text-content-main-light dark:text-content-main-dark">
                {formatCurrency(resultado.sobraAnualDepoisCentavos)}
              </span>
              <span className="text-[10px] text-content-secondary-light block mt-1">
                Redução de {formatCurrency(resultado.valorTotalCentavos)} no ano
              </span>
            </div>

            {/* Tempo para Juntar à Vista */}
            <div className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
              <span className="text-[10px] font-semibold text-content-secondary-light uppercase block">
                Tempo para juntar à vista
              </span>
              <span className="text-lg font-bold tabular-nums text-accent">
                {resultado.tempoJuntarMeses !== null
                  ? `${resultado.tempoJuntarMeses} ${resultado.tempoJuntarMeses === 1 ? 'mês' : 'meses'}`
                  : 'Indisponível'}
              </span>
              <span className="text-[10px] text-content-secondary-light block mt-1">
                Guardando a sobra atual
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
