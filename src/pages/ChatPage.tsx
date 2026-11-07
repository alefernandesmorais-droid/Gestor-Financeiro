import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Sparkles,
  Send,
  Key,
  Shield,
  HelpCircle,
  Bot,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { db } from '../db/db';
import { GeminiProvider } from '../lib/ai/geminiProvider';
import type { ChatMessage } from '../lib/ai/provider';
import {
  toolSimularCompra,
  toolConsultarReservaESaque,
  toolConsultarGastosCategoria,
  toolSimularCorteGastos,
  toolConsultarSobraGeral,
} from '../lib/ai/tools';

const PERGUNTAS_SUGERIDAS = [
  'Quero comprar um celular de R$ 3.000. Quanto sobra por mês e por ano? Consigo parcelar em 10x?',
  'Tenho R$ 8.000 na poupança. Se eu tirar R$ 2.000 agora, quanto tempo leva pra repor?',
  'Quanto eu gastei com iFood nos últimos 3 meses?',
  'Se eu cortar 20% de lazer, quanto eu junto em um ano?',
];

export const ChatPage: React.FC = () => {
  const settings = useLiveQuery(() => db.settings.get('global'));
  const apiKey = settings?.geminiApiKey || '';

  const [mensagens, setMensagens] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        'Olá! Sou seu assistente do Sobra. Você pode me fazer perguntas do dia a dia sobre o seu dinheiro, como "Posso comprar um item?", simulações de parcelas, quanto gastou com delivery ou como sua reserva se comporta.\n\nToda conta é feita por código determinístico — eu não invento números. Como posso ajudar?',
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

  /**
   * Resposta offline determinística quando o usuário ainda não adicionou a chave do Gemini
   */
  const processarMensagemOffline = async (texto: string): Promise<ChatMessage> => {
    const lower = texto.toLowerCase();

    // 1. Pergunta sobre compra / celular / posso comprar
    if (lower.includes('comprar') || lower.includes('celular') || lower.includes('parcelar')) {
      const matchValor = lower.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{2})?/i);
      const valorStr = matchValor ? matchValor[0].replace('r$', '').trim() : '3000';
      const matchParcelas = lower.match(/(\d+)\s*x/i);
      const parcelas = matchParcelas ? parseInt(matchParcelas[1], 10) : 10;

      const resTool = await toolSimularCompra({ valor: valorStr, parcelas });
      const r = resTool.resultado;

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Analisei a compra pretendida de **${r.valorTotal}** parcelada em **${r.numeroParcelas}x de ${r.valorParcela}**:\n\n• **Veredito:** ${r.tituloSemaforo} (${r.semaforo.toUpperCase()})\n• **Impacto mensal:** Sua sobra passaria de **${r.sobraMensalAntes}** para **${r.sobraMensalDepois}/mês**.\n• **Sobra anual:** Ficaria em **${r.sobraAnualDepois}** no acumulado de 12 meses.\n• **Dica:** ${r.recomendacao}`,
        timestamp: new Date().toISOString(),
        toolResults: [resTool],
        comoCalculei: resTool.comoCalculei,
      };
    }

    // 2. Pergunta sobre poupança / tirar dinheiro / reserva
    if (lower.includes('poupança') || lower.includes('reserva') || lower.includes('tirar') || lower.includes('repor')) {
      const matchValor = lower.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{2})?/i);
      const saqueStr = matchValor ? matchValor[0].replace('r$', '').trim() : '2000';

      const resTool = await toolConsultarReservaESaque({ valor_saque: saqueStr });
      const r = resTool.resultado;

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Simulação de saque de **R$ ${saqueStr}** da sua reserva:\n\n• **Reserva guardada atual:** ${r.reservaAtual}\n• **Cobertura:** Passaria de **${r.mesesCobertosAntes} meses** para **${r.mesesCobertosDepois} meses** de despesas essenciais.\n• **Tempo para repor:** Guardando sua sobra mensal média, você levaria **${r.tempoParaReporMeses !== null ? `${r.tempoParaReporMeses} meses` : 'tempo indeterminado'}** para restabelecer o valor.\n• **Avaliação:** ${r.mensagem}`,
        timestamp: new Date().toISOString(),
        toolResults: [resTool],
        comoCalculei: resTool.comoCalculei,
      };
    }

    // 3. Pergunta sobre iFood / delivery / categoria
    if (lower.includes('ifood') || lower.includes('delivery') || lower.includes('mercado') || lower.includes('gastei')) {
      const termo = lower.includes('ifood') ? 'ifood' : lower.includes('mercado') ? 'mercado' : 'alimentação fora';
      const resTool = await toolConsultarGastosCategoria({ categoria_ou_termo: termo, meses: 3 });
      const r = resTool.resultado;

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Consultando seus extratos para **"${r.termoPesquisado}"** nos últimos ${r.mesesConsiderados} meses:\n\n• **Total gasto no período:** ${r.totalGasto}\n• **Média mensal:** ${r.mediaMensal}/mês\n• **Total de lançamentos encontrados:** ${r.totalTransacoes}`,
        timestamp: new Date().toISOString(),
        toolResults: [resTool],
        comoCalculei: resTool.comoCalculei,
      };
    }

    // 4. Pergunta sobre corte de gastos
    if (lower.includes('cortar') || lower.includes('junto') || lower.includes('lazer')) {
      const resTool = await toolSimularCorteGastos({ categoria_nome: 'Lazer', percentual_corte: 20 });
      const r = resTool.resultado;

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Se você reduzir **${r.percentualCorte}** dos gastos com **${r.categoria}**:\n\n• **Gasto atual:** ${r.gastoMensalAtual}/mês\n• **Novo gasto estimado:** ${r.novoGastoMensal}/mês\n• **Economia mensal:** Você poupa **${r.economiaMensal}** todo mês\n• **Economia em 1 ano:** Você junta **${r.economiaAnual}** livres!`,
        timestamp: new Date().toISOString(),
        toolResults: [resTool],
        comoCalculei: resTool.comoCalculei,
      };
    }

    // Padrão geral
    const resTool = await toolConsultarSobraGeral();
    const r = resTool.resultado;
    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `Com base nos seus números atuais:\n\n• **Entradas médias:** ${r.entrouMensal}/mês\n• **Saídas médias:** ${r.saiuMensal}/mês\n• **Sobra média:** **${r.sobrouMensal}/mês**\n• **Gastos fixos:** ${r.gastosFixos} (${r.percentualFixos} do orçamento).\n\nPara perguntas personalizadas com IA conversacional, adicione sua chave gratuita do Gemini no botão acima!`,
      timestamp: new Date().toISOString(),
      toolResults: [resTool],
      comoCalculei: resTool.comoCalculei,
    };
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
        // Usa provedor Gemini com Function Calling
        const provider = new GeminiProvider(apiKey);
        const respostaIA = await provider.conversar(historicoAtualizado);
        setMensagens((prev) => [...prev, respostaIA]);
      } else {
        // Modo offline determinístico
        const respostaOffline = await processarMensagemOffline(msgLimpa);
        setMensagens((prev) => [...prev, respostaOffline]);
      }
    } catch (e: any) {
      console.error(e);
      setMensagens((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Tive um problema ao consultar a IA (${e.message}). Executei a simulação determinística localmente para não deixar você sem resposta:`,
          timestamp: new Date().toISOString(),
        },
      ]);
      const fallback = await processarMensagemOffline(msgLimpa);
      setMensagens((prev) => [...prev, fallback]);
    } finally {
      setCarregando(false);
    }
  };

  const toggleComoCalculei = (msgId: string) => {
    setComoCalculeiAberto((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto space-y-4">
      {/* Cabeçalho do Chat */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-light dark:border-border-dark pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-content-main-light dark:text-content-main-dark flex items-center gap-2">
              <span>Assistente Financeiro Sobra</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-accent text-white">
                IA + TypeScript
              </span>
            </h1>
            <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark">
              Respostas baseadas em cálculos determinísticos com total privacidade.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!apiKey ? (
            <button
              onClick={() => setChaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold shadow-sm hover:bg-accent-hover transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              Adicionar Chave Gemini (Grátis)
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-income dark:bg-emerald-950/60 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gemini Conectado
            </span>
          )}
        </div>
      </div>

      {/* Aviso de Transparência de Dados */}
      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Privacidade ativa:</strong> Nenhum extrato bruto é enviado à IA. CPFs, CNPJs, contas bancárias e Pix são mascarados localmente.
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
                    ? 'bg-primary text-white'
                    : 'bg-accent/10 text-accent dark:bg-accent/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Balão de Mensagem */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-primary text-white rounded-tr-none'
                    : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-content-main-light dark:text-content-main-dark rounded-tl-none shadow-sm'
                }`}
              >
                {msg.content}

                {/* Exibição Transparente "Como calculei" */}
                {msg.comoCalculei && (
                  <div className="mt-3 pt-2 border-t border-border-light dark:border-border-dark">
                    <button
                      onClick={() => toggleComoCalculei(msg.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-content-secondary-light hover:text-content-main-light"
                    >
                      <Info className="w-3.5 h-3.5 text-accent" />
                      <span>Como calculei</span>
                      {comoCalculeiAberto[msg.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {comoCalculeiAberto[msg.id] && (
                      <div className="mt-1 p-2 rounded-lg bg-background-light dark:bg-background-dark text-[11px] text-content-secondary-light leading-normal font-sans">
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
            <Sparkles className="w-4 h-4 text-accent animate-spin" />
            <span>Consultando dados e executando cálculos determinísticos...</span>
          </div>
        )}

        <div ref={fimMensagensRef} />
      </div>

      {/* Chips de Perguntas Sugeridas */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] uppercase font-bold text-content-secondary-light tracking-wider">
          Perguntas Frequentes
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {PERGUNTAS_SUGERIDAS.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => enviarMensagem(sug)}
              disabled={carregando}
              className="px-3 py-1.5 rounded-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-content-secondary-light dark:text-content-secondary-dark hover:border-primary/60 hover:text-primary whitespace-nowrap text-xs transition-all flex-shrink-0 shadow-sm"
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
        className="flex items-center gap-2 pt-1"
      >
        <input
          type="text"
          value={inputTexto}
          onChange={(e) => setInputTexto(e.target.value)}
          placeholder="Tire dúvidas sobre seus gastos, compras ou simulações..."
          disabled={carregando}
          className="flex-1 px-4 py-3 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-xs sm:text-sm text-content-main-light dark:text-content-main-dark outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
        <button
          type="submit"
          disabled={!inputTexto.trim() || carregando}
          className="p-3 rounded-2xl bg-primary hover:bg-primary-hover text-white disabled:opacity-40 transition-all shadow-sm"
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
              Chave da API do Google Gemini
            </h3>

            <p className="text-xs text-content-secondary-light leading-relaxed">
              O Sobra adota a filosofia <strong>BYOK (Traga sua própria chave)</strong>. Ela é 100% gratuita no Google AI Studio e fica gravada apenas no navegador do seu aparelho.
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
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm"
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
