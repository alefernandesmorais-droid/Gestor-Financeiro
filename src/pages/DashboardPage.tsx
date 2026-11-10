import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  UploadCloud,
  Sparkles,
  PieChart,
  BarChart3,
  LineChart,
} from 'lucide-react';
import { db } from '../db/db';
import { useAppStore } from '../stores/appStore';
import { carregarDadosExemplo } from '../db/seed';
import { calcularEstatisticasPainel } from '../lib/calculations/sobra';
import { formatMonthYear } from '../lib/formatters';
import { MetricCard } from '../components/common/MetricCard';
import { EmptyState } from '../components/common/EmptyState';
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart';
import { MonthlyEvolutionBarChart } from '../components/dashboard/MonthlyEvolutionBarChart';
import { AccumulatedBalanceLineChart } from '../components/dashboard/AccumulatedBalanceLineChart';
import { FixedVsVariableCard } from '../components/dashboard/FixedVsVariableCard';
import { InsightsBanner } from '../components/dashboard/InsightsBanner';
import { SubscriptionsAndTopExpenses } from '../components/dashboard/SubscriptionsAndTopExpenses';
import { QuickDashboard } from '../components/dashboard/QuickDashboard';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { mesSelecionado, modoExibicao } = useAppStore();

  const transacoes = useLiveQuery(() => db.transactions.toArray()) || [];
  const categorias = useLiveQuery(() => db.categories.toArray()) || [];

  const stats = useMemo(() => {
    return calcularEstatisticasPainel(transacoes, categorias, mesSelecionado);
  }, [transacoes, categorias, mesSelecionado]);

  const temTransacoes = transacoes.length > 0;

  const handleCarregarExemplo = async () => {
    await carregarDadosExemplo();
  };

  // Se o usuário selecionou o Modo Visão Rápida, renderiza o painel simplificado acolhedor
  if (modoExibicao === 'rapida') {
    return (
      <QuickDashboard
        statsRaioX={stats}
        temTransacoesReais={temTransacoes}
      />
    );
  }

  // Modo Raio-X (Completo, com gráficos detalhados e conciliação)
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Topo do Dashboard Raio-X */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-content-main-light dark:text-content-main-dark">
              Painel Raio-X
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">
              {mesSelecionado === 'todos' ? 'Visão Consolidada' : formatMonthYear(stats.mesReferencia)}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
            Auditoria detalhada com extratos bancários, faturas e métricas precisas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!temTransacoes && (
            <button
              onClick={handleCarregarExemplo}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold border border-accent/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Testar com dados de exemplo
            </button>
          )}

          <button
            onClick={() => navigate('/importar')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Importar Extrato
          </button>
        </div>
      </div>

      {/* Se não houver dados no Raio-X, exibe EmptyState com atalho para a Visão Rápida */}
      {!temTransacoes ? (
        <EmptyState
          icone={UploadCloud}
          titulo="Ainda não há extratos importados para o Raio-X"
          descricao="Envie o extrato em OFX, CSV, Excel (.xlsx) ou PDF do seu banco. Ou se preferir, use o Modo Visão Rápida para estimar suas sobras agora mesmo sem nenhum arquivo."
          acaoTexto="Importar meu primeiro extrato"
          onAcao={() => navigate('/importar')}
        />
      ) : (
        <>
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              titulo="Entrou"
              valorCentavos={stats.entrou}
              subtexto="Total de rendas e receitas"
              comparativo={stats.comparativoEntrou}
              icone={TrendingUp}
              variante="entrada"
            />
            <MetricCard
              titulo="Saiu"
              valorCentavos={stats.saiu}
              subtexto="Total de despesas pagas"
              comparativo={stats.comparativoSaiu}
              icone={TrendingDown}
              variante="saida"
            />
            <MetricCard
              titulo="Sobrou"
              valorCentavos={stats.sobrou}
              subtexto="Livre no período"
              comparativo={stats.comparativoSobrou}
              icone={Wallet}
              variante="primaria"
            />
          </div>

          {/* Faixa de Insights Automáticos */}
          <InsightsBanner insights={stats.insights} />

          {/* Seção 1: Rosca de Categorias & Gastos Fixos x Variáveis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
                    Despesas por Categoria
                  </h3>
                </div>
                <span className="text-xs text-content-secondary-light">
                  {stats.distribuicaoCategorias.length} categorias com gastos
                </span>
              </div>
              <CategoryDonutChart categorias={stats.distribuicaoCategorias} totalGasto={stats.saiu} />
            </div>

            <div className="lg:col-span-1">
              <FixedVsVariableCard
                gastosFixos={stats.gastosFixos}
                gastosVariaveis={stats.gastosVariaveis}
                percentualFixos={stats.percentualFixos}
                totalGasto={stats.saiu}
              />
            </div>
          </div>

          {/* Seção 2: Evolução Mensal & Saldo Acumulado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
                  Evolução Mensal (Entrou vs Saiu vs Sobrou)
                </h3>
              </div>
              <MonthlyEvolutionBarChart historico={stats.historicoMensal} />
            </div>

            <div className="p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
                  Saldo Acumulado no Tempo
                </h3>
              </div>
              <AccumulatedBalanceLineChart historico={stats.historicoMensal} />
            </div>
          </div>

          {/* Seção 3: Assinaturas Recorrentes & Maiores Gastos */}
          <SubscriptionsAndTopExpenses
            maioresGastos={stats.maioresGastos}
            assinaturasAtivas={stats.assinaturasAtivas}
            totalAssinaturas={stats.totalAssinaturas}
          />
        </>
      )}
    </div>
  );
};
