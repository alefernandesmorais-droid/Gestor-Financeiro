/**
 * Utilitários de formatação no padrão brasileiro (pt-BR)
 * Todos os valores monetários internos são manipulados em centavos inteiros.
 */

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converte valor em centavos (inteiro) para string no formato R$ 1.234,56
 */
export function formatCurrency(centavos: number): string {
  const reais = (centavos || 0) / 100;
  return currencyFormatter.format(reais);
}

/**
 * Converte reais (float ou string) para centavos inteiros
 * Suporta formatos brasileiros (1.250,50 ou 1250,50) e internacionais (1250.50 ou 1,250.50)
 */
export function reaisToCentavos(valor: number | string): number {
  if (typeof valor === 'number') {
    return Math.round((valor || 0) * 100);
  }

  if (typeof valor === 'string') {
    let str = valor.trim();
    if (!str) return 0;

    // Detecta se há vírgula e ponto
    const temVirgula = str.includes(',');
    const temPonto = str.includes('.');

    if (temVirgula && temPonto) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        // Padrão brasileiro: 1.250,50 -> 1250.50
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // Padrão internacional: 1,250.50 -> 1250.50
        str = str.replace(/,/g, '');
      }
    } else if (temVirgula) {
      // Apenas vírgula: 1250,50 -> 1250.50
      str = str.replace(',', '.');
    } else if (temPonto) {
      // Apenas ponto: verifica se é milhar (ex: 1.000) ou decimal (ex: 4500.00 ou 45.9)
      const partes = str.split('.');
      if (partes.length === 2 && partes[1].length <= 2) {
        // É decimal (4500.00 ou 45.9) -> mantém
      } else if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
        // É milhar (1.000 ou 1.000.000) -> remove pontos
        str = str.replace(/\./g, '');
      }
    }

    const limpo = str.replace(/[^0-9.-]/g, '');
    const floatVal = parseFloat(limpo);
    return isNaN(floatVal) ? 0 : Math.round(floatVal * 100);
  }

  return 0;
}

/**
 * Converte centavos inteiros para float
 */
export function centavosToReais(centavos: number): number {
  return (centavos || 0) / 100;
}

/**
 * Formata data ISO (YYYY-MM-DD ou ISO string) para dd/mm/aaaa
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const [ano, mes, dia] = isoDate.split('T')[0].split('-');
  if (!ano || !mes || !dia) return isoDate;
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
}

/**
 * Formata data para mês e ano por extenso (ex: "novembro de 2026")
 */
export function formatMonthYear(anoMes: string): string {
  if (!anoMes) return '';
  const partes = anoMes.split('-');
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const data = new Date(ano, mes, 1);
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * Retorna o mês e ano abreviado (ex: "nov/26")
 */
export function formatShortMonthYear(anoMes: string): string {
  if (!anoMes) return '';
  const partes = anoMes.split('-');
  const ano = partes[0].slice(2);
  const mes = parseInt(partes[1], 10) - 1;
  const nomesMeses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomesMeses[mes]}/${ano}`;
}
