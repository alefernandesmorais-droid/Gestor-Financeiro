import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  CopyX,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowRight,
  Filter,
  CreditCard,
  Building,
} from 'lucide-react';
import { parseOFX } from '../lib/parsers/ofxParser';
import { parseCSV, type ResultadoParseCSV } from '../lib/parsers/csvParser';
import { parsePDF } from '../lib/parsers/pdfParser';
import { filtrarDuplicatas, normalizarDescricao } from '../lib/calculations/dedup';
import { formatCurrency, formatDate } from '../lib/formatters';
import { db } from '../db/db';
import { carregarDadosExemplo } from '../db/seed';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, Category, Transaction } from '../types';

interface ItemRevisao {
  tempId: string;
  data: string;
  descricao: string;
  descricaoLimpa: string;
  valor: number; // centavos
  tipo: 'entrada' | 'saida';
  categoriaId?: number;
  hashDedup: string;
  origemArquivo: string;
  banco: string;
  tipoConta: 'conta' | 'cartao';
  ignorado: boolean;
  motivoIgnorado?: string;
  criarRegra?: boolean;
}

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [carregando, setCarregando] = useState(false);
  const [itensRevisao, setItensRevisao] = useState<ItemRevisao[]>([]);
  const [totalDuplicados, setTotalDuplicados] = useState(0);
  const [sucessoMensagem, setSucessoMensagem] = useState<string | null>(null);
  const [erroMensagem, setErroMensagem] = useState<string | null>(null);

  const categorias = useLiveQuery(() => db.categories.toArray()) || [];
  const contasExistentes = useLiveQuery(() => db.accounts.toArray()) || [];

  // Mapeia regras existentes para auto-categorizar na importação
  const regras = useLiveQuery(() => db.rules.toArray()) || [];

  const aplicarRegras = (descLimpa: string, cats: Category[]): number | undefined => {
    // 1. Regras do usuário cadastradas no banco
    for (const regra of regras) {
      if (descLimpa.includes(normalizarDescricao(regra.padrao))) {
        return regra.categoriaId;
      }
    }

    // 2. Heurísticas comuns de estabelecimentos brasileiros
    const dicionario: Array<{ termo: string; categoriaNome: string }> = [
      { termo: 'IFOOD', categoriaNome: 'Alimentação fora' },
      { termo: 'UBER', categoriaNome: 'Transporte' },
      { termo: '99APP', categoriaNome: 'Transporte' },
      { termo: '99', categoriaNome: 'Transporte' },
      { termo: 'NETFLIX', categoriaNome: 'Assinaturas' },
      { termo: 'SPOTIFY', categoriaNome: 'Assinaturas' },
      { termo: 'SMART FIT', categoriaNome: 'Saúde' },
      { termo: 'FARMACIA', categoriaNome: 'Saúde' },
      { termo: 'DROGASIL', categoriaNome: 'Saúde' },
      { termo: 'DROGA RAIA', categoriaNome: 'Saúde' },
      { termo: 'PAGUE MENOS', categoriaNome: 'Saúde' },
      { termo: 'CARREFOUR', categoriaNome: 'Mercado' },
      { termo: 'PAO DE ACUCAR', categoriaNome: 'Mercado' },
      { termo: 'ASSAI', categoriaNome: 'Mercado' },
      { termo: 'ATACADAO', categoriaNome: 'Mercado' },
      { termo: 'SUPERMERCADO', categoriaNome: 'Mercado' },
      { termo: 'MERCADO LIVRE', categoriaNome: 'Compras' },
      { termo: 'AMAZON', categoriaNome: 'Compras' },
      { termo: 'SHOPEE', categoriaNome: 'Compras' },
      { termo: 'SHEIN', categoriaNome: 'Compras' },
      { termo: 'ALUGUEL', categoriaNome: 'Moradia' },
      { termo: 'CONDOMINIO', categoriaNome: 'Moradia' },
      { termo: 'ENEL', categoriaNome: 'Moradia' },
      { termo: 'CPFL', categoriaNome: 'Moradia' },
      { termo: 'LIGHT', categoriaNome: 'Moradia' },
      { termo: 'SABESP', categoriaNome: 'Moradia' },
      { termo: 'CLARO', categoriaNome: 'Moradia' },
      { termo: 'VIVO', categoriaNome: 'Moradia' },
      { termo: 'TIM', categoriaNome: 'Moradia' },
      { termo: 'SALARIO', categoriaNome: 'Renda (salário)' },
      { termo: 'PAGAMENTO SALARIO', categoriaNome: 'Renda (salário)' },
      { termo: 'TED RECEBIDA', categoriaNome: 'Renda extra' },
    ];

    for (const item of dicionario) {
      if (descLimpa.includes(item.termo)) {
        const cat = cats.find((c) => c.nome.toLowerCase() === item.categoriaNome.toLowerCase());
        if (cat?.id) return cat.id;
      }
    }

    return undefined;
  };

  const processarArquivos = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;

    setCarregando(true);
    setErroMensagem(null);
    setSucessoMensagem(null);

    try {
      // Carrega hashes existentes do banco local
      const todasTransacoes = await db.transactions.toArray();
      const hashesExistentes = new Set(todasTransacoes.map((t) => t.hashDedup));

      const novosItensParaRevisao: ItemRevisao[] = [];
      let totalDuplicadasDetectadas = 0;

      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const nomeLower = arquivo.name.toLowerCase();

        if (nomeLower.endsWith('.ofx')) {
          const texto = await arquivo.text();
          const res = parseOFX(texto);
          const { unicos, duplicados } = filtrarDuplicatas(res.transacoes, hashesExistentes);
          totalDuplicadasDetectadas += duplicados.length;

          unicos.forEach((t, idx) => {
            const catSugerida = aplicarRegras(t.descricaoLimpa, categorias);
            novosItensParaRevisao.push({
              tempId: `ofx_${i}_${idx}_${t.hashDedup}`,
              data: t.data,
              descricao: t.descricao,
              descricaoLimpa: t.descricaoLimpa,
              valor: t.valor,
              tipo: t.tipo,
              categoriaId: catSugerida,
              hashDedup: t.hashDedup,
              origemArquivo: arquivo.name,
              banco: res.banco || 'Banco OFX',
              tipoConta: res.tipoConta || 'conta',
              ignorado: t.ignorado ?? false,
              motivoIgnorado: t.motivoIgnorado,
              criarRegra: false,
            });
          });
        } else if (nomeLower.endsWith('.csv')) {
          const texto = await arquivo.text();
          const res = await parseCSV(texto, arquivo.name);
          const { unicos, duplicados } = filtrarDuplicatas(res.transacoes, hashesExistentes);
          totalDuplicadasDetectadas += duplicados.length;

          unicos.forEach((t, idx) => {
            const catSugerida = aplicarRegras(t.descricaoLimpa, categorias);
            novosItensParaRevisao.push({
              tempId: `csv_${i}_${idx}_${t.hashDedup}`,
              data: t.data,
              descricao: t.descricao,
              descricaoLimpa: t.descricaoLimpa,
              valor: t.valor,
              tipo: t.tipo,
              categoriaId: catSugerida,
              hashDedup: t.hashDedup,
              origemArquivo: arquivo.name,
              banco: res.bancoDetectado || 'Banco CSV',
              tipoConta: nomeLower.includes('cartao') || nomeLower.includes('card') ? 'cartao' : 'conta',
              ignorado: t.ignorado ?? false,
              motivoIgnorado: t.motivoIgnorado,
              criarRegra: false,
            });
          });
        } else if (nomeLower.endsWith('.pdf')) {
          const buffer = await arquivo.arrayBuffer();
          const res = await parsePDF(buffer, arquivo.name);

          if (res.isEscaneado) {
            setErroMensagem(res.mensagemAviso || 'Este PDF não possui camada de texto legível.');
            if (res.transacoes.length === 0) continue;
          }

          const { unicos, duplicados } = filtrarDuplicatas(res.transacoes, hashesExistentes);
          totalDuplicadasDetectadas += duplicados.length;

          unicos.forEach((t, idx) => {
            const catSugerida = aplicarRegras(t.descricaoLimpa, categorias);
            novosItensParaRevisao.push({
              tempId: `pdf_${i}_${idx}_${t.hashDedup}`,
              data: t.data,
              descricao: t.descricao,
              descricaoLimpa: t.descricaoLimpa,
              valor: t.valor,
              tipo: t.tipo,
              categoriaId: catSugerida,
              hashDedup: t.hashDedup,
              origemArquivo: arquivo.name,
              banco: res.bancoDetectado || 'Banco PDF',
              tipoConta: nomeLower.includes('fatura') || nomeLower.includes('cartao') ? 'cartao' : 'conta',
              ignorado: t.ignorado ?? false,
              motivoIgnorado: t.motivoIgnorado,
              criarRegra: false,
            });
          });
        } else {
          setErroMensagem(`O arquivo "${arquivo.name}" não é OFX, CSV nem PDF suportado.`);
        }
      }

      setItensRevisao(novosItensParaRevisao);
      setTotalDuplicados(totalDuplicadasDetectadas);
    } catch (e: any) {
      console.error(e);
      setErroMensagem(`Erro ao ler arquivos: ${e.message || 'formato inválido'}`);
    } finally {
      setCarregando(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processarArquivos(e.dataTransfer.files);
  };

  const alterarCategoriaItem = (tempId: string, categoriaId: number) => {
    setItensRevisao((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, categoriaId } : item))
    );
  };

  const alternarIgnoradoItem = (tempId: string) => {
    setItensRevisao((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              ignorado: !item.ignorado,
              motivoIgnorado: !item.ignorado ? 'Ignorado manualmente' : undefined,
            }
          : item
      )
    );
  };

  const alternarCriarRegra = (tempId: string) => {
    setItensRevisao((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, criarRegra: !item.criarRegra } : item))
    );
  };

  const removerItem = (tempId: string) => {
    setItensRevisao((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const salvarTransacoesConfirmadas = async () => {
    if (itensRevisao.length === 0) return;
    setCarregando(true);

    try {
      // 1. Garante que as contas existam no banco
      const bancosNoLote = Array.from(new Set(itensRevisao.map((i) => i.banco)));
      const mapaContas = new Map<string, number>();

      for (const bancoNome of bancosNoLote) {
        const contaExistente = contasExistentes.find((c) => c.banco === bancoNome);
        if (contaExistente?.id) {
          mapaContas.set(bancoNome, contaExistente.id);
        } else {
          const itemRef = itensRevisao.find((i) => i.banco === bancoNome);
          const novoId = await db.accounts.add({
            nome: `${bancoNome} (${itemRef?.tipoConta === 'cartao' ? 'Cartão' : 'Conta'})`,
            banco: bancoNome,
            tipo: itemRef?.tipoConta || 'conta',
          });
          mapaContas.set(bancoNome, novoId);
        }
      }

      // 2. Salva regras locais marcadas pelo usuário
      for (const item of itensRevisao) {
        if (item.criarRegra && item.categoriaId && item.descricaoLimpa) {
          const termoPadrao = item.descricaoLimpa.split(' ')[0] || item.descricaoLimpa;
          await db.rules.add({
            padrao: termoPadrao,
            categoriaId: item.categoriaId,
          });
        }
      }

      // 3. Salva transações no IndexedDB
      const transacoesParaSalvar: Transaction[] = itensRevisao.map((item) => ({
        accountId: mapaContas.get(item.banco) || 1,
        data: item.data,
        descricao: item.descricao,
        descricaoLimpa: item.descricaoLimpa,
        valor: item.valor,
        tipo: item.tipo,
        categoriaId: item.categoriaId,
        hashDedup: item.hashDedup,
        origemArquivo: item.origemArquivo,
        ignorado: item.ignorado,
      }));

      await db.transactions.bulkAdd(transacoesParaSalvar);

      setSucessoMensagem(`${transacoesParaSalvar.length} transações salvas com sucesso no seu dispositivo!`);
      setItensRevisao([]);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (e: any) {
      console.error(e);
      setErroMensagem(`Erro ao salvar transações: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const carregarExemplo = async () => {
    setCarregando(true);
    try {
      const res = await carregarDadosExemplo();
      setSucessoMensagem(`${res.totalTransacoes} transações de exemplo carregadas com sucesso!`);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (e: any) {
      setErroMensagem(`Erro ao carregar dados de exemplo: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-main-light dark:text-content-main-dark">
            Importar Extratos
          </h1>
          <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
            Envie arquivos <strong>OFX</strong> ou <strong>CSV</strong> de bancos brasileiros. Privacidade 100% no seu navegador.
          </p>
        </div>

        {/* Botão de Dados de Exemplo */}
        <button
          onClick={carregarExemplo}
          type="button"
          disabled={carregando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent dark:bg-accent/20 dark:hover:bg-accent/30 text-xs font-semibold transition-all self-start sm:self-auto border border-accent/20"
        >
          <Sparkles className="w-4 h-4" />
          Experimentar com dados de exemplo
        </button>
      </div>

      {/* Alertas de Erro ou Sucesso */}
      {erroMensagem && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-expense text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{erroMensagem}</span>
        </div>
      )}

      {sucessoMensagem && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-income text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{sucessoMensagem}</span>
        </div>
      )}

      {/* Zona de Drop / Upload (quando não há itens na revisão) */}
      {itensRevisao.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="p-10 border-2 border-dashed border-border-light dark:border-border-dark hover:border-primary/60 dark:hover:border-primary/60 rounded-3xl bg-surface-light dark:bg-surface-dark transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".ofx,.csv,.pdf"
            onChange={(e) => processarArquivos(e.target.files)}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center mb-4 transition-all group-hover:scale-105">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark mb-1">
            Arraste e solte seus extratos bancários aqui
          </h3>
          <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark mb-5 max-w-sm">
            Selecione um ou vários arquivos de uma vez. Reconhece <strong>OFX</strong>, <strong>CSV</strong> e <strong>PDF</strong> do Nubank, Inter, Itaú, Bradesco, Santander, BB, C6 e Mercado Pago.
          </p>

          <span className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all">
            Escolher arquivos no meu dispositivo
          </span>
        </div>
      )}

      {/* Tela de Revisão do Lote Importado */}
      {itensRevisao.length > 0 && (
        <div className="space-y-4">
          {/* Card Resumo da Importação */}
          <div className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-content-secondary-light dark:text-content-secondary-dark block">Novas transações:</span>
                <span className="text-base font-bold text-primary">{itensRevisao.length}</span>
              </div>
              {totalDuplicados > 0 && (
                <div>
                  <span className="text-content-secondary-light dark:text-content-secondary-dark block">Duplicatas removidas:</span>
                  <span className="text-base font-bold text-warning">{totalDuplicados}</span>
                </div>
              )}
              <div>
                <span className="text-content-secondary-light dark:text-content-secondary-dark block">Faturas/Transf. identificadas:</span>
                <span className="text-base font-bold text-content-main-light dark:text-content-main-dark">
                  {itensRevisao.filter((i) => i.ignorado).length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setItensRevisao([])}
                type="button"
                className="px-3.5 py-2 rounded-xl border border-border-light dark:border-border-dark text-xs font-semibold text-content-secondary-light dark:text-content-secondary-dark hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={salvarTransacoesConfirmadas}
                disabled={carregando}
                type="button"
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar {itensRevisao.length} transações</span>
              </button>
            </div>
          </div>

          {/* Tabela de Revisão */}
          <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-background-light dark:bg-background-dark text-content-secondary-light dark:text-content-secondary-dark sticky top-0 border-b border-border-light dark:border-border-dark z-10 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Ignorar duplo gasto?</th>
                    <th className="py-3 px-4 text-center">Criar Regra</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {itensRevisao.map((item) => (
                    <tr
                      key={item.tempId}
                      className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${
                        item.ignorado ? 'opacity-60 bg-black/[0.01]' : ''
                      }`}
                    >
                      {/* Data */}
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        {formatDate(item.data)}
                      </td>

                      {/* Descrição e Banco */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-content-main-light dark:text-content-main-dark truncate">
                          {item.descricao}
                        </div>
                        <div className="text-[10px] text-content-secondary-light dark:text-content-secondary-dark flex items-center gap-1 mt-0.5">
                          <span>{item.banco}</span>
                          <span>•</span>
                          <span className="truncate">{item.origemArquivo}</span>
                          {item.motivoIgnorado && (
                            <span className="text-warning font-medium">({item.motivoIgnorado})</span>
                          )}
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold tabular-nums">
                        <span
                          className={item.tipo === 'entrada' ? 'text-income' : 'text-expense'}
                        >
                          {item.tipo === 'entrada' ? '+' : '-'} {formatCurrency(item.valor)}
                        </span>
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-4">
                        <select
                          value={item.categoriaId || ''}
                          onChange={(e) => alterarCategoriaItem(item.tempId, Number(e.target.value))}
                          className="px-2.5 py-1.5 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-xs text-content-main-light dark:text-content-main-dark outline-none cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Ignorar duplo gasto */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.ignorado}
                          onChange={() => alternarIgnoradoItem(item.tempId)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                          title="Marque para não contar esta transação no cálculo de gastos (ex: pagamento de fatura já detalhada)"
                        />
                      </td>

                      {/* Criar Regra */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(item.criarRegra)}
                          onChange={() => alternarCriarRegra(item.tempId)}
                          disabled={!item.categoriaId}
                          className="w-4 h-4 rounded text-accent focus:ring-accent cursor-pointer accent-accent disabled:opacity-30"
                          title="Sempre categorizar lançamentos parecidos com esta categoria"
                        />
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removerItem(item.tempId)}
                          className="p-1 rounded-lg text-content-secondary-light hover:text-expense hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Remover este item do lote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
