# 🥖 PadariaTech — Sistema de Gerenciamento de Padaria

> Aplicação Full Stack moderna para gerenciamento artesanal de padarias com controle de catálogo, ponto de venda (PDV), abatimento atômico de estoque e dashboard de indicadores.

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://padariatech-antonio-6e17.vercel.app)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/Postgres-17-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Version](https://img.shields.io/badge/Version-v1.0.0-orange?style=flat)](https://github.com/euantoniov/padariatech)

---

## 📌 1. Links do Projeto Publicado

- **URL Pública da Aplicação (Vercel):** [https://padariatech-antonio-6e17.vercel.app](https://padariatech-antonio-6e17.vercel.app)
- **Repositório GitHub:** [https://github.com/euantoniov/padariatech](https://github.com/euantoniov/padariatech)

---

## 🎯 2. Objetivo Educacional

O **PadariaTech** foi desenvolvido como material didático e prático para estudantes do curso **Técnico em Desenvolvimento de Sistemas**. O projeto exemplifica:
1. Arquitetura de software moderna sem acoplamento a frameworks pesados (Vanilla JS + Vite).
2. Integração real com **BaaS (Backend as a Service)** utilizando Supabase.
3. Segurança em camadas: **Row Level Security (RLS)** e controle de concorrência com **PostgreSQL RPC** transacional (`FOR UPDATE`).
4. Desenvolvimento orientado a **Model Context Protocol (MCP)** para automação responsável de infraestrutura de banco (Supabase MCP), publicação em nuvem (Vercel MCP) e versionamento (GitHub).

---

## 🛠️ 3. Tecnologias Utilizadas

- **Frontend:**
  - HTML5 Semântico
  - CSS3 Moderno (Variáveis CSS, CSS Grid, Flexbox, Design Responsivo, Paleta artesanal: creme, marrom, caramelo e branco)
  - JavaScript ES6+ Modular
  - [Vite](https://vitejs.dev) para bundling e servidor de desenvolvimento
- **Backend & Dados:**
  - [Supabase](https://supabase.com) (PostgreSQL 17)
  - Supabase Auth (Autenticação baseada em JWT e sessões)
  - Supabase JavaScript Client SDK (`@supabase/supabase-js`)
  - Row Level Security (RLS) habilitado em 100% das tabelas públicas
  - Função PL/pgSQL com `SECURITY DEFINER` para transações de venda atômicas
- **Publicação & DevOps:**
  - [Vercel](https://vercel.com) (Deploy contínuo, Edge Network)
  - Git & GitHub para controle de versão

---

## 📐 4. Arquitetura do Sistema

```text
padariatech/
├── index.html                   # Interface principal (SPA)
├── package.json                 # Manifesto de dependências e scripts Vite
├── vite.config.js               # Configuração do Vite
├── .env.example                 # Modelo de variáveis de ambiente
├── .env                         # Variáveis locais (ignorado no git)
├── .gitignore                   # Exclusão de node_modules, dist e segredos
├── README.md                    # Documentação oficial
├── src/
│   ├── css/
│   │   └── style.css            # Folha de estilos artesanal
│   └── js/
│       ├── supabaseClient.js    # Inicialização do cliente Supabase
│       ├── auth.js              # Módulo de cadastro, login, logout e sessão
│       ├── produtos.js          # CRUD de produtos e carga de exemplos
│       ├── vendas.js            # Ponto de Venda e chamada à RPC
│       ├── dashboard.js         # Agregação de métricas e faturamento
│       └── app.js               # Orquestrador de interface, modais e eventos
└── supabase/
    └── migrations/
        └── 20261105000000_init_padariatech.sql # Migração DDL e RPC
```

---

## 🗄️ 5. Modelo de Dados (PostgreSQL)

O banco de dados possui 3 tabelas no schema `public`:

### `produtos`
Armazena o catálogo de itens de cada padaria.
- `id` (`BIGINT IDENTITY PRIMARY KEY`): Identificador único.
- `nome` (`VARCHAR(120) NOT NULL`): Nome comercial do item.
- `categoria` (`VARCHAR(60) NOT NULL`): Categoria (ex: Pães, Salgados, Doces, Bebidas).
- `preco` (`NUMERIC(10,2) NOT NULL CHECK (preco > 0)`): Preço de venda.
- `estoque` (`INTEGER NOT NULL CHECK (estoque >= 0)`): Quantidade física disponível.
- `usuario_id` (`UUID NOT NULL REFERENCES auth.users(id)`): Chave estrangeira para o operador.
- `criado_em` (`TIMESTAMPTZ DEFAULT now()`): Registro de auditoria temporal.

### `vendas`
Armazena o cabeçalho de cada pedido concluído.
- `id` (`BIGINT IDENTITY PRIMARY KEY`): Número da nota/venda.
- `data_venda` (`TIMESTAMPTZ DEFAULT now()`): Data e hora da transação.
- `valor_total` (`NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0)`): Valor total consolidado.
- `usuario_id` (`UUID NOT NULL REFERENCES auth.users(id)`): Operador responsável.

### `itens_venda`
Armazena o detalhamento dos produtos vendidos com congelamento histórico de preços.
- `id` (`BIGINT IDENTITY PRIMARY KEY`): Identificador do item.
- `venda_id` (`BIGINT NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE`): Venda mãe.
- `produto_id` (`BIGINT NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT`): **`ON DELETE RESTRICT`** garante que nenhum produto com histórico de vendas possa ser apagado acidentalmente, resguardando a integridade fiscal.
- `quantidade` (`INTEGER NOT NULL CHECK (quantidade > 0)`): Quantidade vendida.
- `preco_unitario` (`NUMERIC(10,2) NOT NULL CHECK (preco_unitario > 0)`): Preço unitário na hora da venda.
- `subtotal` (`NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)`): Subtotal do item.

---

## 🔒 6. Segurança e Regras de Negócio

1. **Autenticação Desacoplada:** Não há tabela de senhas customizada; utiliza-se o `auth.users` criptografado do Supabase com tokens JWT padrão indústria.
2. **Isolamento via RLS (Row Level Security):**
   - Usuários só têm permissão para ler, cadastrar, atualizar e deletar os **seus próprios produtos** (`auth.uid() = usuario_id`).
   - Usuários não conseguem ler ou manipular vendas de outros estabelecimentos.
3. **Transação Atômica Segura no Banco (`registrar_venda`):**
   - A criação de vendas é **bloqueada para inserção direta** via RLS do cliente.
   - Toda venda é processada exclusivamente pela função PostgreSQL RPC `public.registrar_venda(p_itens JSONB)`.
   - A função bloqueia as linhas dos produtos no banco usando `FOR UPDATE` para impedir concorrência em vendas simultâneas.
   - O preço total é calculado no PostgreSQL com base nos valores armazenados no banco, ignorando valores monetários arbitrários enviados pelo navegador.
   - Em caso de falha de estoque ou produto inexistente, toda a operação sofre `ROLLBACK` automático.

---

## 🚀 7. Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org) (v18 ou superior)
- npm ou pnpm

### Passo a Passo
1. Clone este repositório ou navegue até a pasta do projeto:
   ```bash
   git clone https://github.com/euantoniov/padariatech.git
   cd padariatech
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env` com base no `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Preencha suas credenciais públicas do Supabase:
   ```ini
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-anon-aqui
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

6. Para compilar o build de produção:
   ```bash
   npm run build
   ```

---

## 🌐 8. Publicação na Vercel

O projeto está configurado para deploy imediato no ambiente Vercel:
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Variáveis de Ambiente:** Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nas configurações de projeto na Vercel.

---

## 🤖 9. Sobre as Integrações MCP Utilizadas

Durante a construção do sistema, foram utilizadas ferramentas do **Model Context Protocol (MCP)**:
- **Supabase MCP:** Inspeção do schema, validação do banco Postgres 17, aplicação da migração DDL e verificação das tabelas e funções RPC.
- **Vercel MCP:** Provisionamento do projeto `padariatech`, injeção remota das variáveis de ambiente de produção, ajuste de políticas de proteção e disparo do deployment.
- **Git & GitHub:** Versionamento com commits semânticos e publicação do repositório oficial.

---

## 📦 10. Versão

- **v1.0.0** — Lançamento da primeira versão oficial funcional com autenticação, catálogo de produtos, controle de estoque atômico, frente de caixa (PDV), histórico e dashboard de indicadores.
