import { describe, it, expect } from 'vitest';
import { identificarCategoria } from '../src/lib/calculations/categorizer';
import type { Category, Rule } from '../src/types';

describe('Motor de Categorização Hierárquica', () => {
  const categoriasMock: Category[] = [
    { id: 1, nome: 'Alimentação fora', cor: '#F59E0B', icone: 'Utensils', essencial: false, padrao: true },
    { id: 2, nome: 'Transporte', cor: '#6366F1', icone: 'Car', essencial: true, padrao: true },
    { id: 3, nome: 'Mercado', cor: '#10B981', icone: 'ShoppingCart', essencial: true, padrao: true },
    { id: 4, nome: 'Assinaturas', cor: '#A855F7', icone: 'Tv', essencial: false, padrao: true },
    { id: 5, nome: 'Saúde', cor: '#EC4899', icone: 'HeartPulse', essencial: true, padrao: true },
    { id: 6, nome: 'Renda (salário)', cor: '#0E9F6E', icone: 'Briefcase', essencial: false, padrao: true },
    { id: 7, nome: 'Lazer', cor: '#14B8A6', icone: 'Smile', essencial: false, padrao: true },
    { id: 8, nome: 'Moradia', cor: '#3B82F6', icone: 'Home', essencial: true, padrao: true },
  ];

  it('categoriza estabelecimentos conhecidos via Dicionário Local Brasileiro', () => {
    // iFood -> Alimentação fora
    const ifood = identificarCategoria('IFOOD *RESTAURANTE MINEIRO', [], categoriasMock);
    expect(ifood.categoriaNome).toBe('Alimentação fora');
    expect(ifood.origem).toBe('dicionario');

    // Uber -> Transporte
    const uber = identificarCategoria('UBER *TRIP RIDE SAO PAULO', [], categoriasMock);
    expect(uber.categoriaNome).toBe('Transporte');
    expect(uber.origem).toBe('dicionario');

    // Carrefour -> Mercado
    const carrefour = identificarCategoria('CARREFOUR HIPERMERCADO 12', [], categoriasMock);
    expect(carrefour.categoriaNome).toBe('Mercado');
    expect(carrefour.origem).toBe('dicionario');

    // Netflix -> Assinaturas
    const netflix = identificarCategoria('NETFLIX.COM MENSAIS', [], categoriasMock);
    expect(netflix.categoriaNome).toBe('Assinaturas');
    expect(netflix.origem).toBe('dicionario');
    expect(netflix.recorrente).toBe(true);

    // Salário -> Renda (salário)
    const sal = identificarCategoria('PAGTO SALARIO EMPRESA XYZ', [], categoriasMock);
    expect(sal.categoriaNome).toBe('Renda (salário)');
    expect(sal.origem).toBe('dicionario');
  });

  it('dá prioridade máxima às Regras Personalizadas do Usuário sobre o dicionário', () => {
    // Por padrão no dicionário, UBER seria Transporte (id: 2).
    // Mas o usuário criou uma regra para categorizar "UBER" como "Lazer" (id: 7)
    const regrasDoUsuario: Rule[] = [
      { id: 101, padrao: 'UBER', categoriaId: 7 },
    ];

    const res = identificarCategoria('UBER *TRIP VIAGEM LAZER', regrasDoUsuario, categoriasMock);
    expect(res.categoriaNome).toBe('Lazer');
    expect(res.categoriaId).toBe(7);
    expect(res.origem).toBe('regra');
  });

  it('retorna origem "nenhuma" quando a descrição não constar no dicionário nem em regras', () => {
    const res = identificarCategoria('ESTABELECIMENTO TOTALMENTE DESCONHECIDO 998877', [], categoriasMock);
    expect(res.categoriaId).toBeUndefined();
    expect(res.origem).toBe('nenhuma');
  });
});
