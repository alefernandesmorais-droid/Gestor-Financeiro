import type { ExecucaoFerramentaResultado } from './tools';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export interface ChatMetrica {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  variacao?: 'positivo' | 'neutro' | 'alerta';
}

export interface ChatCardData {
  tipo: 'compra' | 'gastos' | 'reserva' | 'corte' | 'panorama';
  semaforo?: 'verde' | 'amarelo' | 'vermelho';
  titulo: string;
  subtitulo?: string;
  metricas: ChatMetrica[];
  dicaOuRecomendacao?: string;
  detalhesExtras?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  cardData?: ChatCardData;
  toolResults?: ExecucaoFerramentaResultado[];
  comoCalculei?: string;
}

export interface AIProvider {
  categorizarEmLote(
    descricoes: string[],
    categoriasDisponiveis: string[]
  ): Promise<Map<string, string>>;

  conversar(mensagens: ChatMessage[]): Promise<ChatMessage>;
}
