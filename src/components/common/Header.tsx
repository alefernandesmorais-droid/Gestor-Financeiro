import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { ThemeToggle } from './ThemeToggle';
import { Calendar } from 'lucide-react';

export const Header: React.FC = () => {
  const { mesSelecionado, setMesSelecionado } = useAppStore();

  // Gera opções dos últimos 12 meses + próximos 2 meses
  const gerarOpcoesMeses = () => {
    const opcoes = [];
    const agora = new Date();
    for (let i = -12; i <= 2; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
      const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rotulo = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      opcoes.push({ valor, rotulo });
    }
    return opcoes.reverse();
  };

  const opcoesMeses = gerarOpcoesMeses();

  return (
    <header className="h-16 border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
      {/* Lado Esquerdo: Mobile logo ou Seletor de Mês */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-base shadow-sm">
            S
          </div>
          <span className="font-bold text-base text-content-main-light dark:text-content-main-dark">
            Sobra
          </span>
        </div>

        {/* Seletor de Período/Mês */}
        <div className="flex items-center gap-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-2.5 py-1.5 text-xs text-content-main-light dark:text-content-main-dark shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-content-secondary-light dark:text-content-secondary-dark" />
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="bg-transparent border-none outline-none font-medium text-xs cursor-pointer capitalize"
          >
            <option value="todos" className="bg-surface-light dark:bg-surface-dark">
              Todos os meses
            </option>
            {opcoesMeses.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor} className="bg-surface-light dark:bg-surface-dark">
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lado Direito: Aviso permanente e Tema */}
      <div className="flex items-center gap-3">
        <span className="hidden lg:inline-block text-[11px] text-content-secondary-light dark:text-content-secondary-dark italic bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
          💡 Ajuda a organizar e entender seus números. Não é consultoria financeira.
        </span>
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
