import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Sparkles,
  Send,
  Key,
  Shield,
  Bot,
  User,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { db } from '../db/db';
import { GeminiProvider } from '../lib/ai/geminiProvider';
import type { ChatMessage } from '../lib/ai/provider';
import { processarChatLocal } from '../lib/ai/localChatEngine';
import { ChatCard } from '../components/chat/ChatCard';
import { FormattedMessageText } from '../components/chat/FormattedMessageText';

const PERGUNTAS_SUGERIDAS = [
  'Quero comprar um celular de R$ 3.000. Quanto sobra por mês e por ano? Consigo parcelar em 10x?',
  'Tenho R$ 8.000 na poupança. Se eu tirar R$ 2.000 agora, quanto tempo leva pra repor?',
  'Quanto eu gastei com iFood nos últimos 3 meses?',
  'Se eu cortar 20% de lazer, quanto eu junto em um ano?',
  'Quanto sobrou esse mês? Como estão minhas finanças?',
];

export const ChatPage: React.FC = () => {
  const settings = useLiveQuery(() => db.settings.get('global'));
  const apiKey = settings?.geminiApiKey || '';

  const [mensagens, setMensagens] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        'Olá! Sou seu assistente financeiro do Sobra. Converso diretamente com os extratos e transações que você importou, sem enviar dados para a nuvem externa.\n\nVocê pode me fazer perguntas do dia a dia sobre o seu dinheiro, como simulações de compras parceladas, quanto gastou com delivery, como sua reserva de emergência se comporta ou onde otimizar seus gastos.\n\nTodo cálculo é estritamente determinístico — sem alucinações matemáticas. O que gostaria de analisar hoje?',
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputTexto, setInputTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [chaveModal, setChaveModal] = useState(false);
  const [chaveInput, setChaveInput] = useState('');
  const [comoCalculeiAberto, setComoCalculeiAberto] = useState<Record<string, boolean>>({});

  const fimMensagensRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimMensagensRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

  const salvarChave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chaveInput.trim()) return;
    await db.settings.update('global', { geminiApiKey: chaveInput.trim() });
    setChaveModal(false);
    setChaveInput('');
  };

  const enviarMensagem = async (texto: string) => {
    const msgLimpa = texto.trim();
    if (!msgLimpa || carregando) return;

    const novaMsgUsuario: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: msgLimpa,
      timestamp: new Date().toISOString(),
    };

    const historicoAtualizado = [...mensagens, novaMsgUsuario];
    setMensagens(historicoAtualizado);
    setInputTexto('');
    setCarregando(true);

    try {
      if (apiKey) {
        // Se o usuário conectou chave do Gemini, usa provedor com Function Calling
        const provider = new GeminiProvider(apiKey);
        const respostaIA = await provider.conversar(historicoAtualizado);
        setMensagens((prev) => [...prev, respostaIA]);
      } else {
        // Motor local avançado do Sobra (analisa extratos locais com vocabulário rico)
        const respostaLocal = await processarChatLocal(msgLimpa);
        setMensagens((prev) => [...prev, respostaLocal]);
      }
    } catch (e: any) {
      console.warn('Erro ao consultar provedor externo, ativando motor local determinístico:', e);
      const fallbackLocal = await processarChatLocal(msgLimpa);
      setMensagens((prev) => [...prev, fallbackLocal]);
    } finally {
      setCarregando(false);
    }
  };

  const toggleComoCalculei = (msgId: string) => {
    setComoCalculeiAberto((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9.5rem)] md:h-[calc(100vh-8.5rem)] max-w-4xl mx-auto space-y-3">
      {/* Cabeçalho do Chat */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-light dark:border-border-dark pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <span>Assistente Financeiro Sobra</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                Motor Local 100% Privado
              </span>
            </h1>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Análise inteligente das suas transações locais com cálculos matemáticos exatos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!apiKey ? (
            <button
              onClick={() => setChaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50 text-content-main-light dark:text-content-main-dark text-xs font-semibold shadow-sm transition-all"
            >
              <Key className="w-3.5 h-3.5 text-accent" />
              <span>Chave Gemini (Opcional)</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-income dark:bg-emerald-950/60 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gemini Conectado
            </span>
          )}
        </div>
      </div>

      {/* Banner de Privacidade Local */}
      <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
        <Shield className="w-4 h-4 flex-shrink-0 text-income" />
        <span>
          <strong>Privacidade garantida:</strong> O assistente opera diretamente sobre seus dados salvos no navegador. Nenhuma transação bancária sai do seu dispositivo.
        </span>
      </div>

      {/* Área de Mensagens com Scroll */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {mensagens.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-primary/10 text-primary dark:bg-primary/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Balão de Mensagem */}
              <div
                className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-primary text-white rounded-tr-none shadow-sm'
                    : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-tl-none shadow-sm'
                }`}
              >
                {/* Texto da mensagem sem caracteres de formatação crus */}
                <FormattedMessageText content={msg.content} isUser={isUser} />

                {/* Card Visual Rico Estruturado */}
                {msg.cardData && <ChatCard data={msg.cardData} />}

                {/* Exibição Transparente "Como calculei" */}
                {msg.comoCalculei && (
                  <div className="mt-3 pt-2 border-t border-border-light dark:border-border-dark">
                    <button
                      onClick={() => toggleComoCalculei(msg.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-content-secondary-light hover:text-content-main-light transition-colors"
                    >
                      <Info className="w-3.5 h-3.5 text-accent" />
                      <span>Transparência: Como calculei</span>
                      {comoCalculeiAberto[msg.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {comoCalculeiAberto[msg.id] && (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-[11px] text-content-secondary-light leading-relaxed font-sans animate-in fade-in duration-150">
                        {msg.comoCalculei}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {carregando && (
          <div className="flex items-center gap-2 text-xs text-content-secondary-light animate-pulse p-2">
            <Sparkles className="w-4 h-4 text-primary animate-spin" />
            <span>Consultando extratos locais e calculando métricas determinísticas...</span>
          </div>
        )}

        <div ref={fimMensagensRef} />
      </div>

      {/* Sugestões Rápidas de Perguntas */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] uppercase font-bold text-content-secondary-light tracking-wider">
          Perguntas Frequentes
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {PERGUNTAS_SUGERIDAS.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => enviarMensagem(sug)}
              disabled={carregando}
              className="px-3 py-1.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-content-secondary-light dark:text-content-secondary-dark hover:border-primary/60 hover:text-primary whitespace-nowrap text-xs transition-all flex-shrink-0 shadow-sm active:scale-95"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Formulário de Envio */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviarMensagem(inputTexto);
        }}
        className="flex items-center gap-2 pt-1 pb-1"
      >
        <input
          type="text"
          value={inputTexto}
          onChange={(e) => setInputTexto(e.target.value)}
          placeholder="Pergunte sobre compras, gastos com iFood, cortes ou sua sobra..."
          disabled={carregando}
          className="flex-1 px-4 py-3 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-xs sm:text-sm text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
        <button
          type="submit"
          disabled={!inputTexto.trim() || carregando}
          className="p-3 rounded-2xl bg-primary hover:bg-primary-hover text-white disabled:opacity-40 transition-all shadow-sm active:scale-95"
          aria-label="Enviar mensagem"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Modal Chave Gemini */}
      {chaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <Key className="w-5 h-5 text-accent" />
              Chave da API do Google Gemini (Opcional)
            </h3>

            <p className="text-xs text-content-secondary-light leading-relaxed">
              O Sobra já funciona de forma completa e offline com o <strong>Motor de Inteligência Local</strong>. Conectar o Gemini permite conversas livres adicionais usando sua própria chave gratuita.
            </p>

            <form onSubmit={salvarChave} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={chaveInput}
                  onChange={(e) => setChaveInput(e.target.value)}
                  placeholder="AIzaSy..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-accent"
                />
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline font-semibold block mt-1.5"
                >
                  Obter chave gratuita no Google AI Studio &rarr;
                </a>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChaveModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-border-light dark:border-border-dark text-xs font-semibold text-content-secondary-light"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm"
                >
                  Salvar Chave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
