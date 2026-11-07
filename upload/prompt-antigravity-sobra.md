# PROMPT PARA O ANTIGRAVITY — "Sobra": controle financeiro com IA a partir de extratos

> Cole tudo abaixo no Antigravity. Peça para ele começar pelo PLANO (Planning mode) e só codar depois que você aprovar.

---

## 0. COMO QUERO QUE VOCÊ TRABALHE

1. Primeiro gere um **plano de implementação** (arquitetura, estrutura de pastas, fases) e espere minha aprovação.
2. Depois implemente **por fases** (listadas na seção 10). Ao fim de cada fase: rode o app, rode os testes, me mostre o resultado e só então siga.
3. Escreva todo texto da interface em **português do Brasil**. Comentários de código e README também em português.
4. Priorize simplicidade: o app precisa ser fácil para alguém que **não entende de finanças**.

## 1. VISÃO DO PRODUTO

**Nome provisório:** Sobra ("quanto sobra no fim do mês?").

**O que é:** um assistente financeiro pessoal em que a pessoa **envia os extratos do banco/cartão (arquivos)** e o app monta sozinho um controle financeiro: para onde o dinheiro vai, quanto entra, quanto sai, quanto sobra. Depois ela **conversa com a IA** para tirar dúvidas do dia a dia, por exemplo:

- "Quero comprar um celular de R$ 3.000. Quanto sobra por mês e por ano? Consigo parcelar em 10x?"
- "Tenho R$ 8.000 na poupança. Se eu tirar R$ 2.000 agora, quanto tempo leva pra repor?"
- "Quanto eu gastei com iFood nos últimos 3 meses?"
- "Se eu cortar 20% de lazer, quanto eu junto em um ano?"

**Princípio de segurança (inegociável):** o app **nunca** conecta na conta bancária, **nunca** pede senha/login de banco, **nunca** faz movimentação. Só lê arquivos que a pessoa escolhe enviar. É um app de **leitura e análise**.

**Público:** brasileiros comuns, sem conhecimento financeiro, usando celular e computador.

## 2. ARQUITETURA (decisões já tomadas, siga elas)

Objetivo: **custo zero de hospedagem, privacidade máxima, e publicável no GitHub.**

- **100% front-end (sem backend próprio no MVP).** App web estático (PWA instalável no celular).
- **Dados ficam só no navegador do usuário** (IndexedDB via Dexie). Nada é enviado para servidor meu.
- **Stack:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui + Recharts (gráficos) + Dexie (banco local) + React Router + Zustand (estado).
- **Leitura de arquivos no navegador:**
  - **OFX** (formato padrão dos bancos brasileiros) → parser próprio/lib leve.
  - **CSV** (Nubank, Inter, C6, Itaú, Bradesco, Santander, BB, Mercado Pago etc.) → PapaParse, com **detecção automática de colunas** (data, descrição, valor, débito/crédito) e tela para o usuário confirmar o mapeamento quando a detecção for incerta.
  - **PDF** de extrato/fatura → pdfjs-dist para extrair texto + heurísticas de linhas (data + descrição + valor). Se o PDF vier escaneado/ilegível, avisar com clareza e sugerir OFX/CSV.
- **IA (Google Gemini) com chave do próprio usuário (BYOK):**
  - Na primeira vez, o app pede a chave gratuita da API do Gemini (com link e passo a passo curto de como criar no Google AI Studio). A chave fica **só no navegador** (IndexedDB), nunca em código nem em repositório.
  - Usar o SDK `@google/genai` com um modelo Flash (barato/gratuito). Deixar o nome do modelo em **uma constante configurável**.
  - Assim eu **não pago tokens** quando outras pessoas usarem: cada um usa a sua cota.
- **Deploy:** GitHub Pages (via GitHub Actions) ou Vercel. Gere o workflow pronto e as instruções no README.
- Deixe a camada de IA atrás de uma **interface (`AIProvider`)** para eu poder trocar depois por um backend/outro modelo e cobrar assinatura (fase futura).

## 3. REGRA DE OURO: CONTA É FEITA POR CÓDIGO, NÃO PELA IA

A IA **não calcula dinheiro**. Toda soma, média, projeção e simulação é feita por **funções determinísticas em TypeScript, com testes unitários**. A IA só:

1. **Categoriza** transações ambíguas (em lotes, com cache).
2. **Interpreta a pergunta** do usuário e **chama as funções de cálculo** (function calling / ferramentas).
3. **Explica o resultado** em linguagem simples, citando os números que o código devolveu.

Se o dado não existir (ex.: usuário não informou o saldo da poupança), a IA **pergunta** em vez de inventar.

### Privacidade ao falar com a IA
- Enviar à IA **resumos agregados** (totais por categoria, médias mensais, recorrências), **não o extrato bruto inteiro**.
- Antes de qualquer envio, **mascarar** CPF, CNPJ, número de conta/agência, chaves Pix, e-mails e telefones.
- Para categorizar, enviar só a **descrição limpa do estabelecimento** (sem dados pessoais).
- Mostrar na interface, de forma visível, um aviso de "o que é enviado para a IA" (transparência).

## 4. FUNCIONALIDADES

### 4.1 Importação de extratos
- Arrastar e soltar (e botão "escolher arquivos"), vários arquivos de uma vez, vários meses, várias contas/cartões.
- Detectar e **remover duplicatas** (mesmo dia + valor + descrição) caso o usuário envie períodos que se sobrepõem.
- Detectar **transferências entre contas próprias** e pagamento de fatura de cartão para **não contar em dobro** como gasto (tratar fatura do cartão como detalhamento, não como despesa duplicada).
- Tela de **revisão**: lista de transações importadas, com categoria sugerida, editável em lote. Regras "sempre que a descrição contiver X, categorize como Y" (aprendizado local).

### 4.2 Categorização
Categorias padrão (editáveis): Moradia, Mercado, Alimentação fora (delivery/restaurante), Transporte, Saúde, Educação, Lazer, Assinaturas, Compras, Impostos/Taxas, Dívidas/Cartão, Investimentos, Renda (salário), Renda extra, Transferências, Outros.
Ordem: 1) regras do usuário → 2) dicionário local de estabelecimentos brasileiros comuns (iFood, Uber, 99, Netflix, Spotify, Mercado Livre, Shopee, Pix etc.) → 3) IA, só para o que sobrou.

### 4.3 Painel (Dashboard)
- Cards: **Entrou**, **Saiu**, **Sobrou** no mês (com comparação ao mês anterior).
- **Gráfico de rosca** por categoria; **barras** entrada x saída dos últimos 6–12 meses; **linha** do saldo acumulado.
- **Gastos fixos x variáveis** (detectar recorrentes: assinaturas, aluguel, parcelas).
- **Maiores gastos do mês** e **assinaturas ativas** (com alerta de "você paga X assinaturas, total R$ Y/mês").
- Faixa de **insights automáticos** em linguagem simples (ex.: "Você gastou 32% a mais com delivery que no mês passado").

### 4.4 "Posso comprar?" (simulador — tela dedicada e também via chat)
Entradas: valor, à vista ou parcelado (nº de parcelas, juros opcional), data.
Saídas calculadas por código:
- Sobra mensal média **antes e depois** da compra.
- Sobra no **ano** antes e depois.
- Por quantos meses a compra compromete o orçamento.
- **Semáforo:** verde (cabe tranquilo), amarelo (cabe, mas aperta), vermelho (compromete o orçamento/reserva).
- Em quanto tempo juntaria o valor se guardasse a sobra atual (alternativa de comprar à vista depois).

### 4.5 Reserva e poupança
- Usuário informa quanto tem guardado (poupança, CDB, reserva) — campo manual.
- Simulador "e se eu tirar R$ X agora?": quanto sobra, quantos **meses de despesa** a reserva cobre antes/depois, e em quanto tempo repõe com a sobra mensal.
- Indicador de **reserva de emergência** (meta sugerida: 6 meses de despesas essenciais, editável).

### 4.6 Chat com a IA
- Tela de chat estilo mensageiro, com **perguntas sugeridas** clicáveis.
- Respostas curtas, em português simples, com os números em destaque e, quando útil, um mini-gráfico ou tabela.
- Sempre mostrar "como calculei" (premissas usadas: período, média, o que foi considerado).
- Se a pergunta for sobre algo que o app não consegue saber, dizer isso claramente.

### 4.7 Metas
- Criar metas (ex.: "viagem R$ 5.000 até dezembro"); o app calcula quanto guardar por mês e se cabe na sobra.

### 4.8 Dados e privacidade do usuário
- **Exportar backup** (JSON) e **importar backup**.
- Botão **"Apagar todos os meus dados"** (limpa IndexedDB e chave da API) com confirmação.
- Página "Privacidade": explica em linguagem simples que os dados ficam no aparelho, o que vai para a IA e que o app nunca acessa o banco.

## 5. TELAS E NAVEGAÇÃO

Mobile-first, responsivo. **Mobile:** barra de abas inferior. **Desktop:** menu lateral recolhível.

1. **Boas-vindas / Onboarding** (3 passos): o que é → como exportar extrato do seu banco (guias rápidos por banco, com passos curtos) → configurar chave da IA.
2. **Importar** (upload + revisão das transações).
3. **Painel**.
4. **Transações** (tabela com busca, filtros por mês/categoria/conta, edição).
5. **Posso comprar?**
6. **Reserva** (poupança e simulador de saque).
7. **Metas**.
8. **Chat com a IA**.
9. **Configurações** (chave da IA, categorias e regras, backup, apagar dados, privacidade).

Estados vazios amigáveis em toda tela (ex.: "Ainda não tem extratos. Que tal importar o primeiro?").

## 6. DESIGN (visual e layout)

**Sensação:** confiável, calma, moderna — nada de "cara de banco antigo" nem de app de apostas. Fácil de ler, números grandes.

**Paleta (modo claro):**
- Fundo: `#F7F8FA` · Superfície/cards: `#FFFFFF` · Borda: `#E6E8EC`
- Texto principal: `#12161C` · Texto secundário: `#5B6472`
- **Primária (verde-esmeralda, "sobra/ok"):** `#0E9F6E` · hover `#0B8A5F`
- **Acento (índigo, ações/IA):** `#4F46E5`
- Entrada: `#0E9F6E` · Saída: `#E5484D` · Alerta/atenção: `#F5A524`
- Semáforo: verde `#0E9F6E`, amarelo `#F5A524`, vermelho `#E5484D`

**Modo escuro (obrigatório, com alternância):** fundo `#0D1117`, cards `#161B22`, borda `#262C36`, texto `#E6EDF3`, secundário `#8B95A5`; mantenha as cores de marca levemente mais claras para contraste.

**Tipografia:** Inter (ou Geist) — títulos 600/700, números com `font-variant-numeric: tabular-nums`. Valores principais em tamanho grande (28–36px).

**Estilo:** cantos arredondados (12–16px), sombras suaves, muito espaço em branco, ícones Lucide, microanimações discretas (transições de 150–200 ms, contagem animada nos cards, rosca que "desenha"). Respeitar `prefers-reduced-motion`.

**Formatação brasileira:** moeda `R$ 1.234,56` (use `Intl.NumberFormat('pt-BR')`), datas `dd/mm/aaaa`, meses por extenso em pt-BR.

**Acessibilidade:** contraste AA, foco visível, rótulos em todos os campos, navegação por teclado, nunca depender só de cor (semáforo sempre com ícone + texto).

## 7. MODELO DE DADOS (IndexedDB / Dexie)

- `accounts` (id, nome, tipo: conta | cartão, banco)
- `transactions` (id, accountId, data, descricao, descricaoLimpa, valor [centavos, inteiro], tipo, categoriaId, recorrente, hashDedup, origemArquivo)
- `categories` (id, nome, cor, ícone, essencial: boolean)
- `rules` (id, padrao, categoriaId)
- `savings` (id, nome, valor, atualizadoEm)
- `goals` (id, nome, valorAlvo, prazo)
- `settings` (chave da API, modelo, tema, meta de reserva em meses)

**Dinheiro sempre em centavos (inteiros)** para evitar erro de ponto flutuante.

## 8. QUALIDADE E SEGURANÇA

- **Testes unitários** (Vitest) para: parsers (OFX/CSV/PDF com arquivos de exemplo fictícios), deduplicação, detecção de transferências/fatura, cálculos de sobra, projeção anual, simulador de compra e de saque da reserva.
- Gerar **dados de exemplo fictícios** e um botão "Experimentar com dados de exemplo" (para quem quer testar sem enviar extrato real).
- Nunca logar dados financeiros no console. Nunca commitar chaves. Incluir `.gitignore` e `.env.example`.
- Rodar lint + type-check no CI.
- **Aviso permanente e discreto:** "O Sobra ajuda a organizar e entender seus números. Não é consultoria financeira."
- Sem analytics de terceiros no MVP.

## 9. README E ENTREGA NO GITHUB

Gere um README em português com: o que é, prints, como rodar local (`npm install`, `npm run dev`), como obter a chave do Gemini, como publicar no GitHub Pages (workflow pronto em `.github/workflows/deploy.yml`), limitações conhecidas e roadmap. Inclua licença MIT.

## 10. FASES (implemente nesta ordem)

1. **Base:** projeto, design system (tema claro/escuro, componentes), navegação, banco local.
2. **Importação:** OFX e CSV + revisão + deduplicação + dados de exemplo.
3. **Categorização:** dicionário local + regras do usuário.
4. **Painel** com todos os gráficos e insights.
5. **Cálculos:** "Posso comprar?", Reserva, Metas (com testes).
6. **IA:** chave do usuário, categorização em lote, chat com function calling chamando os cálculos, mascaramento de dados.
7. **PDF** (extrato/fatura) com aviso quando não der para ler.
8. **Polimento:** onboarding com guias por banco, estados vazios, acessibilidade, PWA, backup/apagar dados.
9. **Deploy:** GitHub Actions + README.

## 11. ROADMAP FUTURO (NÃO implementar agora, só deixe a arquitetura pronta)

- Login e sincronização na nuvem (conta do usuário) + assinatura paga com IA incluída (backend + cobrança).
- Open Finance (somente leitura) como opção, se algum dia fizer sentido.
- Orçamentos por categoria com alertas, relatório mensal em PDF, compartilhar com cônjuge.

---

**Comece agora pelo PLANO DE IMPLEMENTAÇÃO (arquitetura, pastas, bibliotecas, fases) e aguarde minha aprovação antes de escrever código.**
