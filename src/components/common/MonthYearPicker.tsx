import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { formatMonthYear } from '../../lib/formatters';

const NOMES_MESES = [
  { num: '01', sigla: 'Jan', nome: 'Janeiro' },
  { num: '02', sigla: 'Fev', nome: 'Fevereiro' },
  { num: '03', sigla: 'Mar', nome: 'Março' },
  { num: '04', sigla: 'Abr', nome: 'Abril' },
  { num: '05', sigla: 'Mai', nome: 'Maio' },
  { num: '06', sigla: 'Jun', nome: 'Junho' },
  { num: '07', sigla: 'Jul', nome: 'Julho' },
  { num: '08', sigla: 'Ago', nome: 'Agosto' },
  { num: '09', sigla: 'Set', nome: 'Setembro' },
  { num: '10', sigla: 'Out', nome: 'Outubro' },
  { num: '11', sigla: 'Nov', nome: 'Novembro' },
  { num: '12', sigla: 'Dez', nome: 'Dezembro' },
];

export const MonthYearPicker: React.FC = () => {
  const { mesSelecionado, setMesSelecionado } = useAppStore();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ano atual de navegação no calendário
  const hoje = new Date();
  const anoAtualReal = hoje.getFullYear();
  const mesAtualReal = String(hoje.getMonth() + 1).padStart(2, '0');

  const anoInicial = mesSelecionado !== 'todos' ? parseInt(mesSelecionado.split('-')[0], 10) : anoAtualReal;
  const [anoNavegacao, setAnoNavegacao] = useState(anoInicial);

  // Fecha se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selecionarMes = (mesNum: string) => {
    setMesSelecionado(`${anoNavegacao}-${mesNum}`);
    setAberto(false);
  };

  const selecionarTodos = () => {
    setMesSelecionado('todos');
    setAberto(false);
  };

  const irParaMesAtual = () => {
    setAnoNavegacao(anoAtualReal);
    setMesSelecionado(`${anoAtualReal}-${mesAtualReal}`);
    setAberto(false);
  };

  // Texto do botão principal
  const textoBotao = mesSelecionado === 'todos' ? 'Todos os meses' : formatMonthYear(mesSelecionado);

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão de Disparo do Calendário */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50 text-xs font-semibold text-content-main-light dark:text-content-main-dark transition-all shadow-sm active:scale-[0.98]"
        aria-label="Selecionar mês e ano"
      >
        <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="capitalize truncate max-w-[140px] sm:max-w-none">{textoBotao}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-content-secondary-light transition-transform duration-200 ${
            aberto ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Popover do Calendário de Mês/Ano */}
      {aberto && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Navegador de Ano */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={() => setAnoNavegacao(anoNavegacao - 1)}
              className="p-1.5 rounded-lg text-content-secondary-light hover:text-content-main-light hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="Ano anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-content-main-light dark:text-content-main-dark">
              {anoNavegacao}
            </span>

            <button
              type="button"
              onClick={() => setAnoNavegacao(anoNavegacao + 1)}
              className="p-1.5 rounded-lg text-content-secondary-light hover:text-content-main-light hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="Próximo ano"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grade de 12 Meses */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {NOMES_MESES.map((m) => {
              const valorCompleto = `${anoNavegacao}-${m.num}`;
              const isSelecionado = mesSelecionado === valorCompleto;
              const isMesAtual = anoNavegacao === anoAtualReal && m.num === mesAtualReal;

              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => selecionarMes(m.num)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center relative ${
                    isSelecionado
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'text-content-main-light dark:text-content-main-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20'
                  } ${isMesAtual && !isSelecionado ? 'border border-primary/40 font-bold' : ''}`}
                >
                  <span>{m.sigla}</span>
                  {isMesAtual && !isSelecionado && (
                    <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Ações Rápidas no Rodapé */}
          <div className="pt-3 mt-3 border-t border-border-light dark:border-border-dark flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={irParaMesAtual}
              className="text-primary hover:underline font-semibold"
            >
              Mês Atual
            </button>

            <button
              type="button"
              onClick={selecionarTodos}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                mesSelecionado === 'todos'
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 font-bold'
                  : 'text-content-secondary-light hover:text-content-main-light'
              }`}
            >
              Ver Todos os Meses
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
