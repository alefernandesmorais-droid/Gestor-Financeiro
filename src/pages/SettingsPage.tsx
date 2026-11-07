import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Settings,
  Key,
  Shield,
  Database,
  Trash2,
  CheckCircle2,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
  Tag,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { db } from '../db/db';
import { useAppStore } from '../stores/appStore';
import { baixarBackupJSON, restaurarBackup } from '../lib/backup';
import type { Rule, Category } from '../types';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useAppStore();
  const fileBackupRef = useRef<HTMLInputElement>(null);

  const [apiKey, setApiKey] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [metaMeses, setMetaMeses] = useState(6);
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false);

  const rules = useLiveQuery(() => db.rules.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const mapaCategorias = new Map<number, Category>();
  for (const c of categories) {
    if (c.id) mapaCategorias.set(c.id, c);
  }

  useEffect(() => {
    async function carregarConfig() {
      const config = await db.settings.get('global');
      if (config) {
        if (config.geminiApiKey) setApiKey(config.geminiApiKey);
        if (config.metaReservaMeses) setMetaMeses(config.metaReservaMeses);
      }
    }
    carregarConfig();
  }, []);

  const salvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.update('global', {
      geminiApiKey: apiKey.trim(),
      metaReservaMeses: metaMeses,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const handleExportarBackup = async () => {
    try {
      await baixarBackupJSON();
      setMensagemStatus({
        tipo: 'sucesso',
        texto: 'Arquivo de backup exportado com sucesso!',
      });
      setTimeout(() => setMensagemStatus(null), 4000);
    } catch (e: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: `Erro ao exportar backup: ${e.message}`,
      });
    }
  };

  const handleImportarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      const texto = await arquivo.text();
      const res = await restaurarBackup(texto);
      setMensagemStatus({
        tipo: 'sucesso',
        texto: `Backup restaurado com sucesso! ${res.totalTransacoes} transações recuperadas.`,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: `Erro ao restaurar backup: ${err.message}`,
      });
    }
  };

  const excluirRegra = async (id?: number) => {
    if (id) {
      await db.rules.delete(id);
    }
  };

  const confirmarApagarTudo = async () => {
    await db.limparTodosDados();
    setApiKey('');
    setModalConfirmarExclusao(false);
    alert('Todos os dados locais foram apagados com sucesso.');
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-content-main-light dark:text-content-main-dark flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" />
          <span>Configurações & Privacidade</span>
        </h1>
        <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
          Gerencie sua chave de inteligência artificial, regras automáticas, backups e dados locais.
        </p>
      </div>

      {/* Alerta de Status */}
      {mensagemStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            mensagemStatus.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-income'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-expense'
          }`}
        >
          {mensagemStatus.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{mensagemStatus.texto}</span>
        </div>
      )}

      {/* Card da Chave Gemini (BYOK) */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <span>Chave da API do Google Gemini (BYOK)</span>
              <span className="text-[10px] bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full uppercase">
                Gratuita
              </span>
            </h2>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              A chave fica gravada <strong>apenas no navegador do seu dispositivo</strong> (IndexedDB). Nunca é enviada a nenhum servidor nosso.
            </p>
          </div>
        </div>

        <form onSubmit={salvarConfig} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-content-secondary-light mb-1">
              Chave da API do Gemini (AI Studio)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-content-main-light dark:text-content-main-dark text-xs sm:text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[11px]">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Como obter chave gratuita no Google AI Studio &rarr;
              </a>
              <span className="text-content-secondary-light">
                Modelo em uso: <strong>gemini-2.5-flash</strong>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-content-secondary-light mb-1">
              Meta de Reserva de Emergência (em meses de gastos essenciais)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={metaMeses}
              onChange={(e) => setMetaMeses(Number(e.target.value))}
              className="w-32 px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs font-bold text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary tabular-nums"
            />
            <span className="text-[10px] text-content-secondary-light block mt-1">
              Padrão recomendado: 6 meses de despesas fixas/essenciais.
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all"
            >
              Salvar Preferências
            </button>
            {salvo && (
              <span className="inline-flex items-center gap-1 text-xs text-income font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Configurações salvas no seu aparelho!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Card de Regras Automáticas Locais */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
              Suas Regras de Categorização
            </h2>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Regras locais aprendidas para classificar estabelecimentos automaticamente.
            </p>
          </div>
        </div>

        {rules.length === 0 ? (
          <p className="text-xs text-content-secondary-light py-2 text-center">
            Nenhuma regra personalizada criada ainda. Você pode criá-las diretamente na tela de Transações ou Importação.
          </p>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark max-h-48 overflow-y-auto">
            {rules.map((r) => {
              const cat = mapaCategorias.get(r.categoriaId);
              return (
                <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-content-main-light dark:text-content-main-dark bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                      &quot;{r.padrao}&quot;
                    </span>
                    <span className="text-content-secondary-light">&rarr;</span>
                    <span
                      className="font-semibold px-2 py-0.5 rounded-md text-white text-[11px]"
                      style={{ backgroundColor: cat?.cor || '#6366F1' }}
                    >
                      {cat?.nome || 'Categoria'}
                    </span>
                  </div>
                  <button
                    onClick={() => excluirRegra(r.id)}
                    className="p-1 rounded-lg text-content-secondary-light hover:text-expense hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Excluir regra"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card de Backup & Restauração JSON */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
              Backup e Restauração de Dados
            </h2>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Exporte todos os seus extratos, contas, regras e metas em um arquivo JSON para transferir de aparelho.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleExportarBackup}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs font-bold text-content-main-light dark:text-content-main-dark hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>Exportar Backup (JSON)</span>
          </button>

          <input
            ref={fileBackupRef}
            type="file"
            accept=".json"
            onChange={handleImportarBackup}
            className="hidden"
          />

          <button
            onClick={() => fileBackupRef.current?.click()}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs font-bold text-content-main-light dark:text-content-main-dark hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4 text-accent" />
            <span>Restaurar Backup</span>
          </button>
        </div>
      </div>

      {/* Card de Privacidade Inegociável */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-primary dark:bg-emerald-950/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
              Compromisso de Privacidade
            </h2>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Seus dados financeiros pertencem apenas a você
            </p>
          </div>
        </div>

        <ul className="text-xs text-content-secondary-light dark:text-content-secondary-dark space-y-2 pt-1 list-disc list-inside leading-relaxed">
          <li><strong>Nunca solicitamos senha nem login bancário:</strong> O app é de leitura estática de arquivos que você escolhe enviar.</li>
          <li><strong>100% no seu navegador:</strong> Todo o banco de dados é salvo via IndexedDB localmente.</li>
          <li><strong>Zero envio de extratos brutos à IA:</strong> Apenas totais agregados e ferramentas locais em TypeScript realizam as contas.</li>
          <li><strong>Mascaramento ativo:</strong> CPFs, CNPJs, dados de agência/conta e chaves Pix são higienizados antes de qualquer consulta.</li>
        </ul>
      </div>

      {/* Card de Zona de Perigo: Apagar Dados */}
      <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-red-200 dark:border-red-900/60 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-100 text-expense dark:bg-red-950/40">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-expense">
              Zona de Perigo
            </h2>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Apagar permanentemente todas as transações, contas, regras e configurações locais.
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalConfirmarExclusao(true)}
          type="button"
          className="px-4 py-2 rounded-xl bg-expense hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all"
        >
          Apagar todos os meus dados
        </button>
      </div>

      {/* Modal de Confirmação de Exclusão Total */}
      {modalConfirmarExclusao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-expense flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-content-main-light dark:text-content-main-dark">
                Tem certeza absoluta?
              </h3>
              <p className="text-xs text-content-secondary-light leading-relaxed">
                Esta ação apagará permanentemente todas as contas, transações, regras e chaves salvas no seu navegador. Não há como desfazer sem um arquivo de backup.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmarExclusao(false)}
                className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark text-xs font-semibold text-content-secondary-light"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarApagarTudo}
                className="w-full px-4 py-2 rounded-xl bg-expense hover:bg-red-700 text-white text-xs font-bold shadow-sm"
              >
                Sim, apagar tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
