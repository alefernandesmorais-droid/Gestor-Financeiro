import { describe, it, expect } from 'vitest';
import { mascararDadosPessoais, higienizarDescricoesParaLote } from '../src/lib/ai/piiMasker';

describe('Mascaramento e Higienização de PII para IA', () => {
  it('mascara CPFs com e sem pontuação', () => {
    const texto1 = 'Pix enviado para 123.456.789-00 referente a freela';
    expect(mascararDadosPessoais(texto1)).toBe('Pix enviado para [CPF Ocultado] referente a freela');

    const texto2 = 'CPF 12345678900 transferido';
    expect(mascararDadosPessoais(texto2)).toBe('CPF [CPF Ocultado] transferido');
  });

  it('mascara CNPJs com e sem pontuação', () => {
    const texto = 'Pagamento para 12.345.678/0001-90 empresa ltda';
    expect(mascararDadosPessoais(texto)).toBe('Pagamento para [CNPJ Ocultado] empresa ltda');
  });

  it('mascara e-mails e telefones', () => {
    const texto = 'Contato cliente@empresa.com.br telefone 11 98765-4321';
    const mascarado = mascararDadosPessoais(texto);
    expect(mascarado).toContain('[E-mail Ocultado]');
    expect(mascarado).toContain('[Telefone Ocultado]');
    expect(mascarado).not.toContain('cliente@empresa.com.br');
    expect(mascarado).not.toContain('98765-4321');
  });

  it('mascara chaves Pix aleatórias no formato UUID', () => {
    const texto = 'Pix para chave 550e8400-e29b-41d4-a716-446655440000';
    expect(mascararDadosPessoais(texto)).toBe('Pix para chave [Chave Pix Ocultada]');
  });

  it('mascara dados de conta e agência', () => {
    const texto = 'TED para agencia 1234 conta 56789-0 titular';
    const res = mascararDadosPessoais(texto);
    expect(res).toContain('[Conta/Agência Ocultada]');
  });

  it('higieniza lotes de descrições para envio seguro à IA', () => {
    const lote = [
      'IFOOD *RESTAURANTE 123.456.789-00',
      'UBER *TRIP RIDE',
      'PIX PARA joao@email.com',
    ];
    const limpos = higienizarDescricoesParaLote(lote);

    expect(limpos[0]).toBe('IFOOD *RESTAURANTE [CPF Ocultado]');
    expect(limpos[1]).toBe('UBER *TRIP RIDE');
    expect(limpos[2]).toBe('PIX PARA [E-mail Ocultado]');
  });
});
