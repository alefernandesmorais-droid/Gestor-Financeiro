import type { ExecucaoFerramentaResultado } from './tools';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
