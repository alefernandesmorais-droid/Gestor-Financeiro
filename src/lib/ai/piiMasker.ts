/**
 * Sanitizador e Mascarador rigoroso de Dados Pessoais Sensíveis (PII)
 * Garante que CPF, CNPJ, dados de conta, e-mails, telefones e chaves Pix
 * nunca sejam transmitidos a serviços de IA.
 */

// Regex para CPF (com ou sem formatação: 123.456.789-00 ou 12345678900)
const REGEX_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

// Regex para CNPJ (12.345.678/0001-90 ou 12345678000190)
const REGEX_CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;

// Regex para E-mails
const REGEX_EMAIL = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;

// Regex para Telefones brasileiros (com ou sem DDD)
const REGEX_TELEFONE = /\b(?:\+?55\s?)?(?:\(?0?[1-9]{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4})\b/g;

// Regex para chaves Pix aleatórias (UUID)
const REGEX_UUID_PIX = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;

// Regex para agência e conta bancária
const REGEX_CONTA_AGENCIA = /\b(?:ag[eê]ncia|ag|conta|c\/c|cc)\s*[:.-]?\s*\d{3,}[-\s]?\d*\b/gi;

/**
 * Remove e mascara qualquer dado pessoal de um texto antes de enviar para IA
 */
export function mascararDadosPessoais(texto: string): string {
  if (!texto) return '';

  return texto
    .replace(REGEX_CPF, '[CPF Ocultado]')
    .replace(REGEX_CNPJ, '[CNPJ Ocultado]')
    .replace(REGEX_EMAIL, '[E-mail Ocultado]')
    .replace(REGEX_UUID_PIX, '[Chave Pix Ocultada]')
    .replace(REGEX_CONTA_AGENCIA, '[Conta/Agência Ocultada]')
    .replace(REGEX_TELEFONE, '[Telefone Ocultado]')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Higieniza uma lista de descrições para categorização em lote pela IA
 */
export function higienizarDescricoesParaLote(descricoes: string[]): string[] {
  return descricoes.map((d) => mascararDadosPessoais(d));
}
