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
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react';
import { parseOFX } from '../lib/parsers/ofxParser';
import { parseCSV } from '../lib/parsers/csvParser';
import { parsePDF } from '../lib/parsers/pdfParser';
import { parseExcel, parseCSVInteligente, type TransacaoPlanilha } from '../lib/parsers/spreadsheetParser';
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

  // Estado para PDFs protegidos por senha
  const [modalSenhaAberta, setModalSenhaAberta] = useState(false);
  const [arquivoPendenteSenha, setArquivoPendenteSenha] = useState<{
    arquivo: File;
    buffer: ArrayBuffer;
  } | null>(null);
  const [senhaInput, setSenhaInput] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  const categorias = useLiveQuery(() => db.categories.toArray()) || [];
  const contasExistentes = useLiveQuery(() => db.accounts.toArray()) || [];
  const regras = useLiveQuery(() => db.rules.toArray()) || [];

  /**
   * Mapeia categoria sugerida da planilha ou regras conhecidas
   */
  const aplicarRegrasECategorias = (
    descLimpa: string,
    categoriaSugerida?: string
  ): number | undefined => {
    // 1. Se a planilha já trouxe uma categoria explícita (ex: "Moradia", "Educação", "Alimentação")
    if (categoriaSugerida) {
      const catLimpaNorm = normalizarDescricao(categoriaSugerida);
      const matchDireto = categorias.find((c) => {
        const cNomeNorm = normalizarDescricao(c.nome);
        return cNomeNorm.includes(catLimpaNorm) || catLimpaNorm.includes(cNomeNorm);
      });
      if (matchDireto?.id) return matchDireto.id;

      // Mapeamentos específicos comuns em planilhas brasileiras
      if (catLimpaNorm.includes('cartao') || catLimpaNorm.includes('credito')) {
        const catDividas = categorias.find((c) => normalizarDescricao(c.nome).includes('divida') || normalizarDescricao(c.nome).includes('cartao'));
        if (catDividas?.id) return catDividas.id;
      }
      if (catLimpaNorm.includes('investimento') || catLimpaNorm.includes('poupanca')) {
        const catInv = categorias.find((c) => normalizarDescricao(c.nome).includes('investimento'));
        if (catInv?.id) return catInv.id;
      }
      if (catLimpaNorm.includes('lazer') || catLimpaNorm.includes('compra')) {
        const catLazer = categorias.find((c) => normalizarDescricao(c.nome).includes('lazer') || normalizarDescricao(c.nome).includes('compra'));
        if (catLazer?.id) return catLazer.id;
      }
    }

    // 2. Regras cadastradas pelo usuário
    for (const regra of regras) {
      if (descLimpa.includes(normalizarDescricao(regra.padrao))) {
        return regra.categoriaId;
      }
    }

    // 3. Heurísticas comuns de estabelecimentos brasileiros
    const dicionario: Array<{ termo: string; categoriaNome: string }> = [
      { termo: 'RENT', categoriaNome: 'Moradia' },
      { termo: 'ALUGUEL', categoriaNome: 'Moradia' },
      { termo: 'CONDOMINIO', categoriaNome: 'Moradia' },
      { termo: 'LUZ', categoriaNome: 'Moradia' },
      { termo: 'ENEL', categoriaNome: 'Moradia' },
      { termo: 'CPFL', categoriaNome: 'Moradia' },
      { termo: 'LIGHT', categoriaNome: 'Moradia' },
      { termo: 'SABESP', categoriaNome: 'Moradia' },
      { termo: 'TELEFONE', categoriaNome: 'Moradia' },
      { termo: 'INTERNET', categoriaNome: 'Moradia' },
      { termo: 'CLARO', categoriaNome: 'Moradia' },
      { termo: 'VIVO', categoriaNome: 'Moradia' },
      { termo: 'TIM', categoriaNome: 'Moradia' },
      { termo: 'FIES', categoriaNome: 'Educação' },
      { termo: 'MBA', categoriaNome: 'Educação' },
      { termo: 'FACULDADE', categoriaNome: 'Educação' },
      { termo: 'CURSO', categoriaNome: 'Educação' },
      { termo: 'IFOOD', categoriaNome: 'Alimentação fora' },
      { termo: 'MERCADO', categoriaNome: 'Mercado' },
      { termo: 'SUPERMERCADO', categoriaNome: 'Mercado' },
      { termo: 'CARREFOUR', categoriaNome: 'Mercado' },
      { termo: 'PAO DE ACUCAR', categoriaNome: 'Mercado' },
      { termo: 'FARMACIA', categoriaNome: 'Saúde' },
      { termo: 'MEDICAMENTO', categoriaNome: 'Saúde' },
      { termo: 'DROGASIL', categoriaNome: 'Saúde' },
      { termo: 'DROGA RAIA', categoriaNome: 'Saúde' },
      { termo: 'UBER', categoriaNome: 'Transporte' },
      { termo: '99APP', categoriaNome: 'Transporte' },
      { termo: 'NETFLIX', categoriaNome: 'Assinaturas' },
      { termo: 'SPOTIFY', categoriaNome: 'Assinaturas' },
      { termo: 'SALARIO', categoriaNome: 'Renda (salário)' },
      { termo: 'POUPANCA', categoriaNome: 'Investimentos' },
      { termo: 'INVESTIMENTO', categoriaNome: 'Investimentos' },
      { termo: 'PETLOVE', categoriaNome: 'Outros' },
      { termo: 'PET', categoriaNome: 'Outros' },
    ];

    for (const item of dicionario) {
      if (descLimpa.includes(item.termo)) {
        const cat = categorias.find((c) => c.nome.toLowerCase() === item.categoriaNome.toLowerCase());
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
      const todasTransacoes = await db.transactions.toArray();
      const hashesExistentes = new Set(todasTransacoes.map((t) => t.hashDedup));

      const novosItensParaRevisao: ItemRevisao[] = [...itensRevisao];
      let totalDuplicadasDetectadas = totalDuplicados;

      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const nomeLower = arquivo.name.toLowerCase();

        // 1. Arquivos Excel (.xlsx, .xls)
        if (nomeLower.endsWith('.xlsx') || nomeLower.endsWith('.xls')) {
          const buffer = await arquivo.arrayBuffer();
          const res = await parseExcel(buffer, arquivo.name);

          if (!res.sucesso) {
            setErroMensagem(res.mensagemAviso || `Não foi possível extrair dados de ${arquivo.name}.`);
            continue;
          }

          const { unicos, duplicados } = filtrarDuplicatas(res.transacoes, hashesExistentes);
          totalDuplicadasDetectadas += duplicados.length;

          unicos.forEach((t, idx) => {
            const catSugerida = aplicarRegrasECategorias(t.descricaoLimpa, t.categoriaSugerida);
            novosItensParaRevisao.push({
              tempId: `excel_${i}_${idx}_${t.hashDedup}`,
              data: t.data,
              descricao: t.descricao,
              descricaoLimpa: t.descricaoLimpa,
              valor: t.valor,
              tipo: t.tipo,
              categoriaId: catSugerida,
              hashDedup: t.hashDedup,
              origemArquivo: t.abaOrigem ? `${arquivo.name} [${t.abaOrigem}]` : arquivo.name,
              banco: 'Planilha Pessoal',
              tipoConta: 'conta',
              ignorado: t.ignorado ?? false,
              motivoIgnorado: t.motivoIgnorado,
              criarRegra: false,
            });
          });

          setSucessoMensagem(`Planilha Excel lida com sucesso! ${res.transacoes.length} transações identificadas em ${res.abasProcessadas.length} abas.`);
        }
        // 2. Arquivos OFX bancários
        else if (nomeLower.endsWith('.ofx')) {
          const texto = await arquivo.text();
          const res = parseOFX(texto);
          const { unicos, duplicados } = filtrarDuplicatas(res.transacoes, hashesExistentes);
          totalDuplicadasDetectadas += duplicados.length;

          unicos.forEach((t, idx) => {
            const catSugerida = aplicarRegrasECategorias(t.descricaoLimpa);
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
        }
        // 3. Arquivos CSV (de bancos ou planilhas)
        else if (nomeLower.endsWith('.csv')) {
          const texto = await arquivo.text();
          // Tenta parser inteligente que suporta cabeçalhos em qualquer linha
          const resInteligente = await parseCSVInteligente(texto, arquivo.name);

          let listaTransacoes = resInteligente.transacoes;
          // Se o inteligente não encontrou, tenta o parser convencional de bancos
          if (listaTransacoes.length === 0) {
            const resConvencional = await parseCSV(texto, arquivo.name);
            listaTransacoes = resConvencional.transacoes;
          }

          if (listaTransacoes.length === 0) {
            setErroMensagem(`Não conseguimos ler transações no arquivo "${arquivo.name}". Verifique se ele contém colunas de descrição e valor.`);
            continue;
          }

          const { unicos, duplicados } = filtrarDuplicatas(listaTransacoes, hashesExistentes);
          totalDuplicadasDetectadas += duplicados.length;

          unicos.forEach((t: any, idx) => {
            const catSugerida = aplicarRegrasECategorias(t.descricaoLimpa, t.categoriaSugerida);
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
              banco: 'Arquivo CSV',
              tipoConta: nomeLower.includes('cartao') || nomeLower.includes('card') ? 'cartao' : 'conta',
              ignorado: t.ignorado ?? false,
              motivoIgnorado: t.motivoIgnorado,
              criarRegra: false,
            });
          });
        }
        // 4. Arquivos PDF
        else if (nomeLower.endsWith('.pdf')) {
          const buffer = await arquivo.arrayBuffer();
          const res = await parsePDF(buffer, arquivo.name);

          if (res.protegidoPorSenha) {
            // Abre modal para o usuário digitar a senha
            setArquivoPendenteSenha({ arquivo, buffer });
            setSenhaInput('');
            setErroSenha(null);
            setModalSenhaAberta(true);
            continue;
          }

          if (res.isEscaneado) {
            setErroMensagem(res.mensagemAviso || 'Este PDF não possui camada de texto legível.');
            if (res.transacoes.length === 0) continue;
          }

          const { unicos, duplicados } = filtrarDuplicatas(res.transacoes, hashesExistentes);
          totalDuplicadasDetectadas += duplicados.length;

          unicos.forEach((t, idx) => {
            const catSugerida = aplicarRegrasECategorias(t.descricaoLimpa);
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
          setErroMensagem(`O arquivo "${arquivo.name}" não é um formato suportado (aceitamos OFX, CSV, Excel .xlsx/.xls e PDF).`);
        }
      }

      setItensRevisao(novosItensParaRevisao);
      setTotalDuplicados(totalDuplicadasDetectadas);
    } catch (e: any) {
      console.error(e);
      setErroMensagem(`Erro ao processar arquivos: ${e.message || 'formato inválido'}`);
    } finally {
      setCarregando(false);
    }
  };

  /**
   * Desbloqueia PDF com a senha fornecida pelo usuário
   */
  const handleDesbloquearPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoPendenteSenha) return;

    setCarregando(true);
    setErroSenha(null);

    try {
      const res = await parsePDF(
        arquivoPendenteSenha.buffer,
        arquivoPendenteSenha.arquivo.name,
        senhaInput
      );

      if (res.protegidoPorSenha) {
        setErroSenha('Senha incorreta para abrir este PDF. Tente novamente.');
        setCarregando(false);
        return;
      }

      const todasTransacoes = await db.transactions.toArray();
      const hashesExistentes = new Set(todasTransacoes.map((t) => t.hashDedup));
      const { unicos, duplicados } = filtrarDuplicatas(res.transacoes, hashesExistentes);
      setTotalDuplicados((prev) => prev + duplicados.length);

      const novosItens: ItemRevisao[] = unicos.map((t, idx) => ({
        tempId: `pdf_pwd_${Date.now()}_${idx}_${t.hashDedup}`,
        data: t.data,
        descricao: t.descricao,
        descricaoLimpa: t.descricaoLimpa,
        valor: t.valor,
        tipo: t.tipo,
        categoriaId: aplicarRegrasECategorias(t.descricaoLimpa),
        hashDedup: t.hashDedup,
        origemArquivo: arquivoPendenteSenha.arquivo.name,
        banco: res.bancoDetectado || 'Banco PDF',
        tipoConta: arquivoPendenteSenha.arquivo.name.toLowerCase().includes('fatura') ? 'cartao' : 'conta',
        ignorado: t.ignorado ?? false,
        motivoIgnorado: t.motivoIgnorado,
        criarRegra: false,
      }));

      setItensRevisao((prev) => [...prev, ...novosItens]);
      setModalSenhaAberta(false);
      setArquivoPendenteSenha(null);
      setSenhaInput('');
      setSucessoMensagem(`PDF desbloqueado com sucesso! ${novosItens.length} transações prontas para revisão.`);
    } catch (err: any) {
      setErroSenha(`Erro ao processar PDF: ${err.message}`);
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

      for (const item of itensRevisao) {
        if (item.criarRegra && item.categoriaId && item.descricaoLimpa) {
          const termoPadrao = item.descricaoLimpa.split(' ')[0] || item.descricaoLimpa;
          await db.rules.add({
            padrao: termoPadrao,
            categoriaId: item.categoriaId,
          });
        }
      }

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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-main-light dark:text-content-main-dark">
            Importar Extratos & Planilhas
          </h1>
          <p className="text-sm text-content-secondary-light dark:text-content-secondary-dark mt-1">
            Envie arquivos <strong>Excel (.xlsx)</strong>, <strong>CSV</strong>, <strong>OFX</strong> ou <strong>PDF</strong> de faturas e bancos. Privacidade 100% no seu dispositivo.
          </p>
        </div>

        {/* Botão de Dados de Exemplo */}
        <button
          onClick={carregarExemplo}
          type="button"
          disabled={carregando}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-all self-start sm:self-auto border border-accent/20"
        >
          <Sparkles className="w-4 h-4" />
          Carregar dados de exemplo
        </button>
      </div>

      {/* Alertas de Erro ou Sucesso */}
      {erroMensagem && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-expense text-sm flex items-center gap-3 animate-in fade-in duration-150">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{erroMensagem}</span>
        </div>
      )}

      {sucessoMensagem && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-income text-sm flex items-center gap-3 animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{sucessoMensagem}</span>
        </div>
      )}

      {/* Zona de Drop / Upload */}
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
            accept=".ofx,.csv,.pdf,.xlsx,.xls"
            onChange={(e) => processarArquivos(e.target.files)}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
            Arraste seus extratos ou planilhas para cá
          </h3>
          <p className="text-xs text-content-secondary-light dark:text-content-secondary-dark mt-1 max-w-md">
            Compatível com <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV</strong>, <strong>OFX</strong> e faturas em <strong>PDF</strong> de bancos brasileiros (Nubank, Inter, Itaú, C6, Bradesco, Santander).
          </p>

          <button
            type="button"
            className="mt-5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all pointer-events-none"
          >
            Selecionar Arquivos no Aparelho
          </button>
        </div>
      )}

      {/* Tabela de Revisão e Confirmação */}
      {itensRevisao.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
            <div>
              <h2 className="text-base font-bold text-content-main-light dark:text-content-main-dark flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                <span>Revisão de Lançamentos ({itensRevisao.length})</span>
              </h2>
              <p className="text-xs text-content-secondary-light">
                Verifique as categorias antes de confirmar. Nenhuma transação duplica lançamentos já importados.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setItensRevisao([])}
                className="px-3 py-2 rounded-xl border border-border-light dark:border-border-dark text-xs font-semibold text-content-secondary-light hover:text-expense hover:border-expense/40 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarTransacoesConfirmadas}
                disabled={carregando}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Confirmar & Salvar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner de Duplicatas descartadas */}
          {totalDuplicados > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <CopyX className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{totalDuplicados} lançamentos duplicados</strong> foram descartados automaticamente para evitar repetição.
              </span>
            </div>
          )}

          {/* Lista de Itens para Revisar */}
          <div className="border border-border-light dark:border-border-dark rounded-2xl bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-background-light dark:bg-background-dark text-content-secondary-light font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Origem / Aba</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {itensRevisao.map((item) => (
                    <tr
                      key={item.tempId}
                      className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${
                        item.ignorado ? 'opacity-50 line-through bg-black/[0.01]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {formatDate(item.data)}
                      </td>
                      <td className="py-3 px-4 max-w-xs font-medium text-content-main-light dark:text-content-main-dark">
                        <div className="truncate" title={item.descricao}>
                          {item.descricao}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-content-secondary-light whitespace-nowrap max-w-[140px] truncate" title={item.origemArquivo}>
                        {item.origemArquivo}
                      </td>
                      <td
                        className={`py-3 px-4 whitespace-nowrap font-mono font-bold tabular-nums ${
                          item.tipo === 'entrada' ? 'text-income' : 'text-content-main-light dark:text-content-main-dark'
                        }`}
                      >
                        {item.tipo === 'entrada' ? '+' : '-'} {formatCurrency(item.valor)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={item.categoriaId || ''}
                          onChange={(e) => alterarCategoriaItem(item.tempId, Number(e.target.value))}
                          disabled={item.ignorado}
                          className="px-2.5 py-1 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-content-main-light dark:text-content-main-dark text-xs outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Não categorizado</option>
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => alternarIgnoradoItem(item.tempId)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                            item.ignorado
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {item.ignorado ? 'Ignorado' : 'Incluir'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => removerItem(item.tempId)}
                          className="p-1 rounded-lg text-content-secondary-light hover:text-expense hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                          title="Remover este lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Desbloquear PDF Protegido por Senha */}
      {modalSenhaAberta && arquivoPendenteSenha && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-content-main-light dark:text-content-main-dark">
                  PDF Protegido por Senha
                </h3>
                <p className="text-xs text-content-secondary-light line-clamp-1">
                  {arquivoPendenteSenha.arquivo.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-content-secondary-light leading-relaxed">
              Este extrato/fatura é protegido por senha pelo seu banco. Para abrir no navegador, digite a senha (geralmente são os <strong>primeiros dígitos do seu CPF</strong> ou sua <strong>data de nascimento</strong>).
            </p>

            {erroSenha && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-expense text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{erroSenha}</span>
              </div>
            )}

            <form onSubmit={handleDesbloquearPDF} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content-secondary-light mb-1">
                  Senha do PDF
                </label>
                <input
                  type="password"
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  placeholder="Digite a senha do banco..."
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-content-main-light dark:text-content-main-dark text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalSenhaAberta(false);
                    setArquivoPendenteSenha(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-border-light dark:border-border-dark text-xs font-semibold text-content-secondary-light hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!senhaInput.trim() || carregando}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all"
                >
                  {carregando ? 'Desbloqueando...' : 'Desbloquear Extrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
