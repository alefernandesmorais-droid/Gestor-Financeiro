/**
 * Implementação do AIProvider com Google Gemini Flash via @google/genai
 * Respeita estritamente:
 * 1. Chave BYOK salva apenas no navegador
 * 2. Mascaramento total de PII antes de qualquer requisição
 * 3. Regra de ouro: toda matemática é executada localmente pelas ferramentas de cálculo em tools.ts
 */

import { GoogleGenAI } from '@google/genai';
import type { AIProvider, ChatMessage } from './provider';
import { DEFAULT_GEMINI_MODEL } from './provider';
import { mascararDadosPessoais, higienizarDescricoesParaLote } from './piiMasker';
import {
  toolSimularCompra,
  toolConsultarReservaESaque,
  toolConsultarGastosCategoria,
  toolSimularCorteGastos,
  toolConsultarSobraGeral,
  type ExecucaoFerramentaResultado,
} from './tools';

const INSTRUCAO_SISTEMA = `
Você é o assistente inteligente do "Sobra", um aplicativo de controle financeiro pessoal brasileiro.
Seu objetivo é orientar o usuário com clareza, empatia e objetividade.

REGRAS INEGOCIÁVEIS:
1. VOCÊ NUNCA CALCULA DINHEIRO SOZINHO. Toda soma, média, divisão, projeção ou simulação DEVE ser obtida chamando as ferramentas (Function Calling) disponíveis.
2. Sempre cite os números exatos devolvidos pelas ferramentas.
3. Se o usuário perguntar algo sobre o que não temos dados suficientes (ex: saldo na poupança não informado), pergunte a ele de forma gentil em vez de inventar.
4. Responda em português do Brasil, em tom calmo, acolhedor e direto.
5. Sempre que usar uma ferramenta, mencione brevemente as premissas usadas (período considerado, média mensal, etc.).
6. Nunca dê garantias de investimentos ou promessas irreais. Não substitui consultoria financeira profissional.
`;

const DECLARACAO_FERRAMENTAS = [
  {
    name: 'simular_compra',
    description: 'Simula se o usuário pode comprar um item à vista ou parcelado, calculando impacto na sobra mensal e semáforo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        valor: { type: 'NUMBER', description: 'Valor da compra em reais (ex: 3000 ou 150.50)' },
        parcelas: { type: 'INTEGER', description: 'Número de parcelas (1 para à vista, até 24 para parcelado)' },
        juros: { type: 'NUMBER', description: 'Taxa de juros mensal opcional em porcentagem (ex: 1.5 para 1.5% a.m.)' },
      },
      required: ['valor'],
    },
  },
  {
    name: 'consultar_reserva_e_saque',
    description: 'Consulta a reserva de emergência guardada e simula o impacto de um saque em meses de cobertura e tempo para repor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        valor_saque: { type: 'NUMBER', description: 'Valor em reais que a pessoa quer retirar (opcional)' },
      },
    },
  },
  {
    name: 'consultar_gastos_categoria',
    description: 'Consulta o total e média de gastos em uma categoria ou estabelecimento específico (ex: iFood, Uber, Mercado, Lazer).',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoria_ou_termo: { type: 'STRING', description: 'Nome da categoria ou estabelecimento (ex: iFood, Lazer, Mercado, Uber)' },
        meses: { type: 'INTEGER', description: 'Quantidade de meses para trás a analisar (padrão 3)' },
      },
      required: ['categoria_ou_termo'],
    },
  },
  {
    name: 'simular_corte_gastos',
    description: 'Calcula quanto o usuário economizaria por mês e em um ano se cortar uma porcentagem de gastos em determinada categoria.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoria_nome: { type: 'STRING', description: 'Categoria a cortar (ex: Lazer, Alimentação fora, Assinaturas)' },
        percentual_corte: { type: 'NUMBER', description: 'Porcentagem de redução (ex: 20 para 20%)' },
      },
      required: ['categoria_nome', 'percentual_corte'],
    },
  },
  {
    name: 'consultar_sobra_geral',
    description: 'Retorna um resumo financeiro geral: quanto entrou, quanto saiu, quanto sobrou e divisão de fixos vs variáveis.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private modelo: string;

  constructor(apiKey: string, modelo: string = DEFAULT_GEMINI_MODEL) {
    this.apiKey = apiKey;
    this.modelo = modelo;
  }

  /**
   * Categoriza transações ambíguas em lote sem enviar dados sensíveis
   */
  async categorizarEmLote(
    descricoes: string[],
    categoriasDisponiveis: string[]
  ): Promise<Map<string, string>> {
    const mapa = new Map<string, string>();
    if (!this.apiKey || descricoes.length === 0) return mapa;

    const descricoesHigienizadas = higienizarDescricoesParaLote(descricoes);
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const prompt = `
Classifique cada estabelecimento brasileiro abaixo na categoria mais adequada dentre as seguintes:
Categorias permitidas: ${categoriasDisponiveis.join(', ')}.

Responda ESTRITAMENTE em formato JSON no formato:
{ "classificacoes": [ { "estabelecimento": "nome", "categoria": "categoria" } ] }

Lista de estabelecimentos:
${JSON.stringify(descricoesHigienizadas)}
`;

    try {
      const resp = await ai.models.generateContent({
        model: this.modelo,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const texto = resp.text || '';
      const parsed = JSON.parse(texto);
      if (parsed.classificacoes && Array.isArray(parsed.classificacoes)) {
        for (const item of parsed.classificacoes) {
          if (item.estabelecimento && item.categoria) {
            mapa.set(item.estabelecimento, item.categoria);
          }
        }
      }
    } catch (e) {
      console.warn('Falha na categorização em lote via Gemini:', e);
    }

    return mapa;
  }

  /**
   * Conversa interativa com Function Calling / Tools
   */
  async conversar(mensagens: ChatMessage[]): Promise<ChatMessage> {
    if (!this.apiKey) {
      throw new Error('Chave da API do Google Gemini não configurada.');
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const ultimaMensagem = mensagens[mensagens.length - 1];
    const textoMascarado = mascararDadosPessoais(ultimaMensagem.content);

    // Prepara histórico mascarado
    const historicoFormatado = mensagens.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: mascararDadosPessoais(m.content) }],
    }));

    // 1. Envia requisição para a IA avaliar se precisa de ferramenta
    const respostaInicial = await ai.models.generateContent({
      model: this.modelo,
      contents: [
        ...historicoFormatado,
        { role: 'user', parts: [{ text: textoMascarado }] },
      ],
      config: {
        systemInstruction: INSTRUCAO_SISTEMA,
        tools: [{ functionDeclarations: DECLARACAO_FERRAMENTAS as any }],
      },
    });

    const toolResults: ExecucaoFerramentaResultado[] = [];
    let comoCalculeiGeral = '';

    // Verifica se a IA solicitou chamadas de função (functionCalls)
    const functionCalls = respostaInicial.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const partesRespostaTool: any[] = [];

      for (const call of functionCalls) {
        let res: ExecucaoFerramentaResultado | null = null;
        const args = (call.args || {}) as Record<string, any>;

        if (call.name === 'simular_compra') {
          res = await toolSimularCompra(args as any);
        } else if (call.name === 'consultar_reserva_e_saque') {
          res = await toolConsultarReservaESaque(args as any);
        } else if (call.name === 'consultar_gastos_categoria') {
          res = await toolConsultarGastosCategoria(args as any);
        } else if (call.name === 'simular_corte_gastos') {
          res = await toolSimularCorteGastos(args as any);
        } else if (call.name === 'consultar_sobra_geral') {
          res = await toolConsultarSobraGeral();
        }

        if (res) {
          toolResults.push(res);
          comoCalculeiGeral += (comoCalculeiGeral ? ' ' : '') + res.comoCalculei;
          partesRespostaTool.push({
            functionResponse: {
              name: call.name,
              response: res.resultado,
            },
          });
        }
      }

      // 2. Envia os resultados matemáticos de volta para a IA formular a resposta final
      const respostaFinal = await ai.models.generateContent({
        model: this.modelo,
        contents: [
          ...historicoFormatado,
          { role: 'user', parts: [{ text: textoMascarado }] },
          { role: 'model', parts: respostaInicial.candidates?.[0]?.content?.parts || [] },
          { role: 'user', parts: partesRespostaTool },
        ],
        config: {
          systemInstruction: INSTRUCAO_SISTEMA,
        },
      });

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: respostaFinal.text || 'Aqui está a análise calculada para você.',
        timestamp: new Date().toISOString(),
        toolResults,
        comoCalculei: comoCalculeiGeral,
      };
    }

    // Caso a resposta não tenha exigido ferramentas
    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: respostaInicial.text || 'Entendi sua dúvida. Como posso ajudar a analisar seus números?',
      timestamp: new Date().toISOString(),
      toolResults,
    };
  }
}
