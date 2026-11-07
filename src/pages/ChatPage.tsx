import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [mensagens, setMensagens] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        'Olá! Sou seu assistente financeiro do Sobra. Converso diretamente com os extratos e transações que você importou, com total privacidade no seu navegador.\n\nVocê pode me fazer perguntas do dia a dia sobre o seu dinheiro, como simulações de compras parceladas, quanto gastou com delivery, como sua reserva de emergência se comporta ou onde otimizar seus gastos.\n\nTodo cálculo é estritamente determinístico — sem alucinações matemáticas. O que gostaria de analisar hoje?',
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputTexto, setInputTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [comoCalculeiAberto, setComoCalculeiAberto] = useState<Record<string, boolean>>({});

  const fimMensagensRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimMensagensRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

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
      // Motor local avançado do Sobra (analisa extratos locais com vocabulário rico e determinístico)
      const respostaLocal = await processarChatLocal(msgLimpa);
      setMensagens((prev) => [...prev, respostaLocal]);
    } catch (e: any) {
      console.warn('Erro ao processar consulta local:', e);
      setMensagens((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: 'Tive uma oscilação momentânea ao analisar suas transações locais. Por favor, tente reformular a pergunta.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  const toggleComoCalculei = (msgId: string) => {
    setComoCalculeiAberto((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-7.5rem)] max-w-4xl mx-auto space-y-3">
      {/* Cabeçalho Limpo do Chat */}
      <div className="flex items-center justify-between gap-3 border-b border-border-light dark:border-border-dark pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-content-main-light dark:text-content-main-dark">
              Assistente Sobra
            </h1>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark flex items-center gap-1.5 mt-0.5">
              <span>Análise inteligente das suas movimentações financeiras.</span>
            </p>
          </div>
        </div>

        {/* Indicador Minimalista e Discreto de Privacidade */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-[11px] font-medium text-income dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Local & Privado</span>
        </div>
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
    </div>
  );
};
