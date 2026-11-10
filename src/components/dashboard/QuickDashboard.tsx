import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Sparkles,
  Calculator,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UploadCloud,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { formatCurrency, reaisToCentavos } from '../../lib/formatters';
import { calcularVisaoRapida, simularCompraRapida } from '../../lib/calculations/quickEstimator';
import type { EstatisticasPainel } from '../../lib/calculations/sobra';

interface QuickDashboardProps {
  statsRaioX?: EstatisticasPainel;
  temTransacoesReais: boolean;
}

export const QuickDashboard: React.FC<QuickDashboardProps> = ({
  statsRaioX,
  temTransacoesReais,
}) => {
  const navigate = useNavigate();
  const {
    estimativasRapidas,
    setEstimativasRapidas,
    setModoExibicao,
    ocultarValores,
  } = useAppStore();

  const [periodoHero, setPeriodoHero] = useState<'mes' | 'ano'>('mes');

  // Mini Simulador State
  const [valorSimulacaoInput, setValorSimulacaoInput] = useState('1500');
  const [parcelasSimulacao, setParcelasSimulacao] = useState(10);

  // Se o usuário tem extratos reais no Modo Raio-X e ainda não customizou os sliders manualmente,
  // pré-popula automaticamente com as médias reais dos extratos!
  const rendaEfetiva = useMemo(() => {
    if (temTransacoesReais && statsRaioX && !estimativasRapidas.customizado) {
      return statsRaioX.entrou > 0 ? statsRaioX.entrou : estimativasRapidas.rendaMensal;
    }
    return estimativasRapidas.rendaMensal;
  }, [temTransacoesReais, statsRaioX, estimativasRapidas]);

  const fixosEfetivos = useMemo(() => {
    if (temTransacoesReais && statsRaioX && !estimativasRapidas.customizado) {
      return statsRaioX.saiu > 0 ? statsRaioX.saiu : estimativasRapidas.despesasFixas;
    }
    return estimativasRapidas.despesasFixas;
  }, [temTransacoesReais, statsRaioX, estimativasRapidas]);

  const reservaEfetiva = estimativasRapidas.reservaAtual;

  // Cálculos reativos
  const resultado = useMemo(() => {
    return calcularVisaoRapida({
      rendaMensalCentavos: rendaEfetiva,
      despesasFixasCentavos: fixosEfetivos,
      reservaAtualCentavos: reservaEfetiva,
    });
  }, [rendaEfetiva, fixosEfetivos, reservaEfetiva]);

  // Mini simulação de compra
  const simulacao = useMemo(() => {
    const valorCentavos = reaisToCentavos(valorSimulacaoInput);
    return simularCompraRapida(valorCentavos, parcelasSimulacao, resultado.sobraMensalCentavos);
  }, [valorSimulacaoInput, parcelasSimulacao, resultado.sobraMensalCentavos]);

  const formatarValor = (centavos: number) => {
    if (ocultarValores) return 'R$ ••••••';
    return formatCurrency(centavos);
  };

  const handleRestaurarMediasReais = () => {
    if (statsRaioX && temTransacoesReais) {
      setEstimativasRapidas({
        rendaMensal: statsRaioX.entrou,
        despesasFixas: statsRaioX.saiu,
        customizado: false,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Banner de Contexto do Modo Simples */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs text-content-main-light dark:text-content-main-dark">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-primary text-white flex-shrink-0 shadow-xs">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block sm:inline">Modo Visão Rápida: </span>
            <span className="text-content-secondary-light dark:text-content-secondary-dark">
              Estimativas instantâneas sem preenchimento burocrático de formulários.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {temTransacoesReais && (
            <button
              onClick={handleRestaurarMediasReais}
              type="button"
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              title="Recarregar médias dos extratos importados"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Usar médias reais</span>
            </button>
          )}

          <button
            onClick={() => setModoExibicao('raiox')}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/50 text-[11px] font-bold text-primary shadow-xs transition-all flex items-center gap-1"
          >
            <span>Ir para o Raio-X</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hero Card: Quanto Sobra */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase font-bold text-content-secondary-light tracking-wider flex items-center gap-1.5">
              <span>Sua Sobra Estimada</span>
              <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[10px] font-semibold text-content-secondary-light">
                ~ Aproximado
              </span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-income dark:text-emerald-400 tabular-nums tracking-tight mt-1">
              {formatarValor(
                periodoHero === 'mes'
                  ? resultado.sobraMensalCentavos
                  : resultado.sobraAnualCentavos
              )}
            </h2>
          </div>

          {/* Toggle Mês / Ano */}
          <div className="p-1 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-center gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPeriodoHero('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodoHero === 'mes'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-content-secondary-light hover:text-content-main-light'
              }`}
            >
              Por Mês
            </button>
            <button
              type="button"
              onClick={() => setPeriodoHero('ano')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodoHero === 'ano'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-content-secondary-light hover:text-content-main-light'
              }`}
            >
              Em 12 Meses
            </button>
          </div>
        </div>

        {/* Diagnóstico Acolhedor */}
        <p className="text-xs sm:text-sm text-content-main-light dark:text-content-main-dark leading-relaxed font-medium">
          {resultado.diagnostico}
        </p>

        {/* Barra de Proporção Visual */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[11px] font-semibold text-content-secondary-light">
            <span>Fixos: {resultado.percentualFixos}%</span>
            <span>Sobra Livre: {resultado.percentualSobra}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex">
            <div
              className="bg-primary/70 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, resultado.percentualFixos))}%` }}
              title="Despesas Fixas"
            />
            <div
              className="bg-income transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, resultado.percentualSobra))}%` }}
              title="Sobra Líquida"
            />
          </div>
        </div>
      </div>

      {/* 3 Controles Rápidos: Sliders Interativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Renda Mensal */}
        <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary-light">
              Renda Mensal
            </span>
            <span className="text-xs font-bold text-income tabular-nums">
              {formatarValor(rendaEfetiva)}
            </span>
          </div>

          <input
            type="range"
            min={100000}
            max={3000000}
            step={50000}
            value={rendaEfetiva}
            onChange={(e) =>
              setEstimativasRapidas({ rendaMensal: Number(e.target.value) })
            }
            className="w-full accent-primary cursor-pointer"
          />

          <span className="text-[10px] text-content-secondary-light block">
            Salário, rendimentos ou faturamento aproximado.
          </span>
        </div>

        {/* 2. Despesas Fixas */}
        <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary-light">
              Despesas Fixas
            </span>
            <span className="text-xs font-bold text-expense tabular-nums">
              {formatarValor(fixosEfetivos)}
            </span>
          </div>

          <input
            type="range"
            min={50000}
            max={2500000}
            step={50000}
            value={fixosEfetivos}
            onChange={(e) =>
              setEstimativasRapidas({ despesasFixas: Number(e.target.value) })
            }
            className="w-full accent-expense cursor-pointer"
          />

          <span className="text-[10px] text-content-secondary-light block">
            Aluguel, contas, financiamentos e condomínio.
          </span>
        </div>

        {/* 3. Reserva Guardada */}
        <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-secondary-light">
              Reserva Guardada
            </span>
            <span className="text-xs font-bold text-primary tabular-nums">
              {formatarValor(reservaEfetiva)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={10000000}
            step={100000}
            value={reservaEfetiva}
            onChange={(e) =>
              setEstimativasRapidas({ reservaAtual: Number(e.target.value) })
            }
            className="w-full accent-primary cursor-pointer"
          />

          <span className="text-[10px] text-content-secondary-light block flex items-center justify-between">
            <span>Cobre {resultado.mesesCoberturaReserva} meses de custo</span>
            <ShieldCheck className="w-3.5 h-3.5 text-income" />
          </span>
        </div>
      </div>

      {/* Mini Simulador "Posso Comprar?" Instantâneo */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
              Simulador Relâmpago: Cabe no Bolso?
            </h3>
            <p className="text-xs text-content-secondary-light">
              Teste compras parceladas sem comprometer sua sobra antes de fechar negócio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-content-secondary-light mb-1">
              Valor Total da Compra (R$)
            </label>
            <input
              type="text"
              value={valorSimulacaoInput}
              onChange={(e) => setValorSimulacaoInput(e.target.value)}
              placeholder="1.500,00"
              className="w-full px-3.5 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs sm:text-sm font-bold text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-content-secondary-light mb-1">
              Parcelas: {parcelasSimulacao}x de{' '}
              {formatarValor(simulacao.valorParcelaCentavos)}
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={parcelasSimulacao}
              onChange={(e) => setParcelasSimulacao(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer mt-2"
            />
          </div>
        </div>

        {/* Resposta do Semáforo Relâmpago */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
            simulacao.status === 'verde'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
              : simulacao.status === 'amarelo'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
          }`}
        >
          {simulacao.status === 'verde' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : simulacao.status === 'amarelo' ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}

          <div className="flex-1 text-xs">
            <span className="font-bold block">
              {simulacao.status === 'verde'
                ? 'Cabe tranquilo no orçamento'
                : simulacao.status === 'amarelo'
                ? 'Exige atenção e controle'
                : 'Não cabe na sua sobra atual'}
            </span>
            <span className="opacity-90">{simulacao.mensagem}</span>
          </div>

          <div className="text-right text-[11px] font-mono font-bold hidden sm:block">
            <span>Nova sobra:</span>
            <div className="text-sm">{formatarValor(simulacao.sobraDepoisCentavos)}/mês</div>
          </div>
        </div>
      </div>

      {/* Convite Descomplicado para Importar ou Ir ao Raio-X */}
      <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-light dark:border-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-primary" />
          <span className="text-content-secondary-light">
            Quer ver centavo por centavo para onde foi seu dinheiro com faturas e extratos?
          </span>
        </div>

        <button
          onClick={() => navigate('/importar')}
          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-all"
        >
          <span>Subir extrato (OFX/CSV/PDF)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
