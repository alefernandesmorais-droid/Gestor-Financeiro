# Sobra — Controle Financeiro com IA a partir de Extratos

> **"Quanto sobra de verdade no fim do mês?"**  
> Um assistente financeiro pessoal, privado e inteligente, em que você apenas envia seus extratos bancários (OFX, CSV ou PDF) e o aplicativo organiza tudo localmente sem nunca pedir suas senhas bancárias.

---

## 🌟 Visão Geral & Princípios

O **Sobra** foi projetado para pessoas comuns que não entendem de termos contábeis complexos, mas querem saber para onde o dinheiro está indo e se podem realizar compras sem comprometer o futuro.

### 🛡️ Privacidade Inegociável
- **100% Front-end (Sem backend intermediário):** Todos os extratos e transações ficam gravados exclusivamente no navegador do seu dispositivo via **IndexedDB (Dexie.js)**.
- **Nunca pede senha de banco:** O app não conecta a contas bancárias e não faz movimentações. É uma ferramenta estática de leitura e análise de arquivos que você escolhe importar.
- **Mascaramento Rigoroso de PII:** Antes de qualquer interação com a IA, CPFs, CNPJs, dados de agência/conta, telefones, e-mails e chaves Pix são higienizados no seu aparelho.

### 📐 Regra de Ouro: Contas Feitas por Código
A IA **nunca calcula dinheiro de cabeça**. Toda soma, média, projeção, semáforo de compra e cobertura de reserva é calculada por **funções determinísticas em TypeScript** cobertas por testes unitários. A IA apenas interpreta a sua dúvida, aciona a ferramenta de cálculo exata (*Function Calling*) e explica o resultado em linguagem simples.

---

## 🚀 Funcionalidades

1. **Importação Universal de Extratos:**
   - Suporte a múltiplos arquivos simultâneos em **OFX**, **CSV** e **PDF** dos principais bancos brasileiros (Nubank, Inter, Itaú, Bradesco, Santander, Banco do Brasil, C6 Bank e Mercado Pago).
   - **Deduplicação Determinística:** Reconhece e ignora transações repetidas em extratos com períodos sobrepostos.
   - **Detecção de Faturas e Transferências:** Identifica pagamentos de cartão e transferências entre contas próprias para não contar o mesmo gasto em dobro.
2. **Categorização Inteligente em 3 Níveis:**
   - 1º: Regras personalizadas aprendidas com o usuário.
   - 2º: Dicionário local estático com dezenas de estabelecimentos brasileiros frequentes (iFood, Uber, Netflix, Carrefour, Smart Fit, etc.).
   - 3º: IA opcional para itens ambíguos.
3. **Painel Geral (Dashboard):**
   - Cards com **Entrou**, **Saiu** e **Sobrou** com comparativo percentual frente ao mês anterior.
   - Gráfico de **Rosca** de distribuição por categoria.
   - Gráfico de **Barras** de evolução mensal de entradas vs saídas.
   - Gráfico de **Área** da sobra acumulada no tempo.
   - Separação de **Gastos Fixos vs Variáveis**.
   - Radar de **Assinaturas Ativas** e Maiores Gastos do Mês.
   - Faixa de **Insights Automáticos** acolhedores em português do Brasil.
4. **Simulador "Posso Comprar?":**
   - Simule compras à vista ou parceladas (com ou sem juros).
   - **Semáforo Visual:** Verde (cabe tranquilo), Amarelo (aperta o orçamento) e Vermelho (compromete a renda).
   - Demonstra a sobra mensal e anual antes e depois da compra e o tempo para juntar o valor à vista.
5. **Reserva de Emergência & Simulador de Saques:**
   - Cálculo automático da média de gastos essenciais e cobertura em meses garantida.
   - Simulador interativo: *"E se eu tirar R$ X agora?"* demonstrando a nova cobertura e o tempo de reposição.
6. **Metas Financeiras:**
   - Defina objetivos com prazo e saiba o aporte mensal necessário e se ele cabe na sua sobra real.
7. **Assistente IA com Google Gemini (BYOK):**
   - Traga sua chave gratuita do Google AI Studio (*Bring Your Own Key*).
   - Perguntas sugeridas do dia a dia e transparência total com botão *"Como calculei"*.
8. **Backup, Restauração e PWA:**
   - Exportação e importação de backup completo em JSON.
   - Botão para apagar todos os dados com dupla confirmação.
   - PWA instalável como app no celular e computador.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** React 19 + TypeScript + Vite
- **Estilização:** Tailwind CSS + Radix UI Primitives / Lucide Icons
- **Gráficos:** Recharts
- **Banco de Dados Local:** IndexedDB gerenciado via Dexie.js
- **Parsers:** Parser OFX nativo em TS, PapaParse (CSV) e pdfjs-dist (PDF)
- **IA SDK:** `@google/genai` (Google Gen AI SDK oficial)
- **Testes Unitários:** Vitest (44 testes automatizados)

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- Node.js 20+ ou 22+
- npm, pnpm ou yarn

### Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sobra.git

# Acesse a pasta
cd sobra

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### Rodando os Testes Unitários
```bash
npm test
```

### Compilando para Produção
```bash
npm run build
```

---

## 🔑 Como Obter sua Chave Gratuita do Gemini (BYOK)

1. Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Faça login com sua conta Google.
3. Clique em **"Create API Key"** (Criar Chave de API).
4. Copie a chave gerada (iniciada em `AIzaSy...`).
5. No app **Sobra**, abra a aba **Chat com IA** ou **Configurações**, cole sua chave e clique em **Salvar**.
6. A chave é salva unicamente no seu navegador e utilizada diretamente pelo seu dispositivo.

---

## 🚀 Como Publicar no GitHub Pages

O projeto já inclui o workflow de CI/CD configurado em `.github/workflows/deploy.yml`.

1. Suba o código para o seu repositório no GitHub na branch `main`.
2. No repositório no GitHub, vá em **Settings** > **Pages**.
3. Na seção **Build and deployment**, em **Source**, selecione **GitHub Actions**.
4. A cada novo push para a branch `main`, o GitHub executará os testes unitários, compilará o build estático e publicará o site automaticamente.

---

## 🧭 Roadmap Futuro

- [ ] Sincronização em nuvem opcional com criptografia de ponta a ponta (E2EE).
- [ ] Relatório consolidado mensal em PDF para impressão.
- [ ] Orçamento com limite de teto por categoria e notificações no app.
- [ ] Integração com Open Finance (somente leitura) como alternativa opcional.

---

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).
