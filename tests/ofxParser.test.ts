import { describe, it, expect } from 'vitest';
import { parseOFX, converterDataOFX } from '../src/lib/parsers/ofxParser';

describe('Parser OFX bancário', () => {
  it('converte datas no formato OFX para ISO YYYY-MM-DD', () => {
    expect(converterDataOFX('20261105120000[-03:EST]')).toBe('2026-11-05');
    expect(converterDataOFX('20261020')).toBe('2026-10-20');
  });

  it('faz parse correto de extrato bancário OFX padrão brasileiro', () => {
    const mockOFX = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20261107120000
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>260
<ACCTID>1234567-8
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261101
<DTEND>20261107
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261105
<TRNAMT>5000.00
<FITID>TX001
<MEMO>PAGTO SALARIO EMPRESA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261106
<TRNAMT>-120.50
<FITID>TX002
<MEMO>IFOOD *RESTAURANTE
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261107
<TRNAMT>-850.00
<FITID>TX003
<MEMO>PAGAMENTO DE FATURA NUBANK
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

    const resultado = parseOFX(mockOFX);

    expect(resultado.transacoes.length).toBe(3);

    // Transação 1: Salário
    const tx1 = resultado.transacoes[0];
    expect(tx1.tipo).toBe('entrada');
    expect(tx1.valor).toBe(500000); // 5000 * 100 centavos
    expect(tx1.data).toBe('2026-11-05');
    expect(tx1.ignorado).toBe(false);

    // Transação 2: iFood
    const tx2 = resultado.transacoes[1];
    expect(tx2.tipo).toBe('saida');
    expect(tx2.valor).toBe(12050); // 120.50 * 100 centavos
    expect(tx2.data).toBe('2026-11-06');
    expect(tx2.ignorado).toBe(false);

    // Transação 3: Pagamento de fatura (detectado como ignorado para evitar contagem dupla)
    const tx3 = resultado.transacoes[2];
    expect(tx3.tipo).toBe('saida');
    expect(tx3.valor).toBe(85000);
    expect(tx3.ignorado).toBe(true);
    expect(tx3.motivoIgnorado).toContain('fatura');
  });
});
