# CLAUDE.md — Avizz Hub

Este arquivo contém tudo que você precisa saber para trabalhar neste projeto. Leia-o integralmente antes de escrever qualquer linha de código.

---

## O que é este projeto

**Avizz Hub** é uma plataforma interna de gestão comercial da Avizz, construída para substituir HubSpot e Moskit. É um sistema **mono-tenant** (apenas a Avizz usa) com preparação estrutural para multi-tenant futuro via coluna `company_id`.

O sistema permite que SDRs e Closers registrem relatórios diários, vendam contratos, acompanhem metas e visualizem performance em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 — App Router |
| Linguagem | TypeScript com `strict: true` — sem `any` explícito |
| API | tRPC v11 |
| ORM | Prisma |
| Banco | Neon (PostgreSQL serverless) |
| Auth | NextAuth.js v5 (Auth.js) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Validação | Zod (schemas compartilhados client/server via tRPC) |
| Formulários | React Hook Form + Zod |
| Datas | date-fns com locale pt-BR |
| Deploy | Vercel |

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── rankings/
│   │   ├── tools/
│   │   │   ├── roi/
│   │   │   └── commission/
│   │   ├── management/
│   │   │   ├── goals/
│   │   │   ├── products/
│   │   │   └── users/
│   │   └── clients/
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts
│   │   └── auth/[...nextauth]/route.ts
├── components/
│   ├── ui/                         # shadcn/ui — gerado automaticamente
│   ├── dashboard/
│   ├── reports/
│   ├── sales/
│   ├── advances/
│   └── shared/
├── server/
│   ├── auth.ts                     # NextAuth config
│   ├── trpc.ts                     # Context, procedures, middlewares
│   ├── db/
│   │   └── index.ts                # Prisma client singleton
│   └── routers/
│       ├── _app.ts                 # Router raiz
│       ├── reports.ts
│       ├── sales.ts
│       ├── advances.ts
│       ├── dashboard.ts
│       ├── goals.ts
│       ├── products.ts
│       └── users.ts
├── trpc/
│   ├── server.ts                   # createCallerFactory para RSC
│   └── react.tsx                   # createTRPCReact para Client Components
├── lib/
│   ├── workdays.ts                 # Cálculo de dias úteis + feriados BR
│   ├── financials.ts               # cash_value, net_value, future_revenue
│   └── rankings.ts                 # Agregações de ranking
└── middleware.ts                   # Proteção de rotas por role
prisma/
└── schema.prisma                   # Fonte da verdade do banco
```

---

## Autenticação

- Provider: **Google OAuth exclusivo**
- Restrição: bloquear qualquer e-mail fora de `@avizz.com.br` no callback `signIn`
- Fluxo: Admin cadastra o e-mail + role no banco **antes** do primeiro login. O sistema cruza o e-mail com a tabela `users`.
- Se o usuário não existir ou `is_active = false`: acesso negado
- A sessão deve conter `userId` e `role` para uso em middlewares

---

## Roles e permissões

Roles disponíveis: `admin` | `head` | `closer` | `sdr` | `operational`

### Middlewares tRPC obrigatórios

| Procedure | Roles permitidos |
|---|---|
| `protectedProcedure` | qualquer autenticado |
| `adminProcedure` | admin |
| `adminOrHeadProcedure` | admin, head |
| `salesProcedure` | admin, head, closer, sdr |
| `closerProcedure` | admin, head, closer |
| `sdrProcedure` | admin, head, sdr |
| `goalsViewProcedure` | admin, head (visualizar metas) |
| `goalsEditProcedure` | admin exclusivo (criar/editar metas) |
| `dashboardGlobalProcedure` | admin, head, operational (dashboard global + ranking) |

### Matriz resumida

| Módulo | admin | head | closer | sdr | operational |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard global | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard próprio | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ranking de Vendas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mini-painel de metas (sidebar) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Relatórios (preencher) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Relatórios (ver outros) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Registrar Venda | ✅ | ✅ | ✅ | ❌ | ❌ |
| Registrar Avanço | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ferramentas (ROI / Comissão) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestão de Metas (visualizar) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestão de Metas (editar) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestão de Produtos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestão de Usuários | ✅ | ❌ | ❌ | ❌ | ❌ |
| Clientes Ativos | ✅ | ✅ | ❌ | ❌ | ✅ |

A verificação acontece em **duas camadas independentes**: middleware do Next.js (rota) + procedure do tRPC (dados). Nunca confiar apenas na UI.

---

## Schema do banco (Prisma)

### Entidades e campos-chave

Todas as entidades possuem `company_id` (FK → `Company`). No MVP o filtro não é ativo, mas a coluna é preenchida em toda inserção.

**Company** — id, name, created_at

**User** — id, company_id, name, email (único), role (enum), avatar_url, is_active, timestamps

**Product** — id, company_id, name, description, is_active, `counts_as_sale` (Boolean crítico), is_primary, sort_order, created_at
- Alterações em `counts_as_sale`, `is_active` ou `is_primary` geram `ProductAuditLog`

**ProductAuditLog** — id, product_id, changed_by, previous_values (JSON), new_values (JSON), changed_at

**Gateway** — id, company_id, name, is_active, created_at
**GatewayRate** — id, gateway_id, installments (1-12), rate_percent (Decimal) | unique(gateway_id, installments)

**Goal** — id, company_id, month (sempre dia 01), cash_goal, `sales_goal` (Int), created_by, created_at
- Unique: (company_id, month)
- Alterações geram `GoalAuditLog`

**GoalAuditLog** — id, goal_id, changed_by, previous_cash, new_cash, previous_sales_goal, new_sales_goal, reason, changed_at

**IndividualGoal** — id, company_id, user_id, goal_id, cash_goal, `sales_goal` (null se SDR), rate_answer, rate_schedule, rate_noshow_max, rate_close, timestamps
- Unique: (user_id, goal_id)

**DailyReport** — id, company_id, user_id, report_date, work_location (enum: office/home/day_off)
- Campos SDR: calls_total, calls_answered, meetings_scheduled, meetings_held, crm_activities, bot_conversations, reschedulings
- Campos Closer: calls_done, closer_no_shows, disqualified, crm_updated (Boolean)
- Unique: (user_id, report_date)
- Não aceita fins de semana. Feriados são permitidos mas não obrigatórios.

**Sale** — id, company_id, closer_id, sdr_id?, product_id, report_id?, client_name, client_company, client_revenue_tier (enum), contract_value, contract_months, payment_method (enum: pix/card/boleto), gateway_id?, installments, down_payment, `cash_value` (calculado servidor), `net_value` (calculado servidor), `future_revenue` (calculado servidor), `counts_as_sale` (snapshot imutável), sale_origin (enum), is_recovered, sale_date, created_at

**Advance** — id, company_id, closer_id, sdr_id?, report_id?, lead_name, company_name, estimated_value, deadline?, lead_score (0-5), status_flags (String[]), is_converted (Boolean), converted_sale_id? (FK Sale), timestamps
- Após `is_converted = true`: somente leitura, nenhum campo pode ser editado

---

## Regras de negócio críticas

### RN-01 — O que conta como Venda (Meta de Vendas)
`sale.counts_as_sale = true` → incrementa a Meta de Vendas.
`sale.counts_as_sale = false` (upsell) → gera receita, mas **não** incrementa a meta.

### RN-02 — Cálculo de `cash_value`
| Pagamento | Condição | cash_value |
|---|---|---|
| PIX | sempre | = contract_value |
| Cartão | sem entrada | = 0 |
| Cartão | com entrada | = down_payment |
| Boleto | sempre | = down_payment |

### RN-03 — Cálculo de `net_value`
- PIX ou Boleto → `net_value = contract_value`
- Cartão → busca `GatewayRate(gateway_id, installments)` → `net_value = contract_value × (1 − rate_percent)`

### RN-04 — `future_revenue`
`future_revenue = contract_value − cash_value`

### RN-05 — Ranking do SDR
Caixa/Vendas do SDR no ranking = `sales WHERE sdr_id = [id]`. Apenas para ranking. Sem dupla contagem no financeiro global.

### RN-06 — Snapshot de `counts_as_sale`
No `createSale`: copiar `product.counts_as_sale` → `sale.counts_as_sale`. Imutável após criação.

### RN-07 — Pendência de relatório
Um dia é pendente **somente se**:
1. Não é sábado nem domingo
2. É anterior a hoje (hoje nunca é pendente — delay de 1 dia)
3. Usuário não preencheu relatório
4. `work_location ≠ day_off`

**Feriados nacionais NÃO geram pendência.** Preenchimento em feriados é voluntário.

### RN-08 — Dias úteis
Excluir sábados, domingos e feriados nacionais BR do ano vigente. Lista hardcoded no MVP em `src/lib/workdays.ts`.

### RN-09 — Autoridade do servidor nos cálculos
`cash_value`, `net_value` e `future_revenue` são SEMPRE calculados no servidor. Nunca aceitar esses valores como input do cliente.

### RN-10 — Auditoria de metas
Toda alteração em `Goal` existente gera `GoalAuditLog` **antes** de aplicar os novos valores.

### RN-11 — Conversão de Advance em Sale
Executada em transação única:
1. `advance.is_converted = true`
2. `advance.converted_sale_id = sale.id`
3. `advance.updated_at = now()`

Após conversão: somente leitura. Tentativas de edição são rejeitadas pelo servidor.

### RN-12 — Auditoria de produtos
Alterações em `counts_as_sale`, `is_active` ou `is_primary` geram `ProductAuditLog` antes de ser aplicadas.

---

## Padrões de código

### TypeScript
- `strict: true` sempre
- Sem `any` explícito
- Tipos inferidos via Zod schemas e Prisma client
- Compartilhar tipos entre client e server via tRPC

### tRPC
- Toda lógica de negócio fica nos routers, nunca em Server Actions ou Route Handlers diretos
- Usar `ctx.session.user.role` para autorização dentro de cada procedure
- Nunca confiar em dados calculados enviados pelo cliente (RN-09)

### Prisma
- Schema em `prisma/schema.prisma` é a fonte da verdade
- Usar `prisma.$transaction()` para operações que precisam de atomicidade (ex: RN-11)
- Índices obrigatórios: `user_id`, `report_date`, `sale_date`, `company_id`
- Usar Prisma Accelerate ou pgbouncer para connection pooling no ambiente serverless Vercel

### Formulários
- React Hook Form + Zod resolver em todos os formulários
- Schemas Zod definidos uma vez e reutilizados no tRPC input validation
- Validação no client é UX; validação no server é segurança — ambas são obrigatórias

### Datas
- Usar `date-fns` com `ptBR` locale para formatação
- Nunca usar `new Date()` diretamente para comparações de dia — usar utilitários de `src/lib/workdays.ts`
- Armazenar datas sempre em UTC no banco

### Componentes
- shadcn/ui como base — não recriar o que já existe
- Componentes de negócio em `src/components/[módulo]/`
- Componentes UI genéricos em `src/components/ui/` (gerenciados pelo shadcn CLI)

---

## Variáveis de ambiente

```bash
# Banco
DATABASE_URL="postgresql://..."          # Neon connection string com ?sslmode=require
DIRECT_URL="postgresql://..."            # Para migrations (sem pooler)

# Auth
AUTH_SECRET=""                           # openssl rand -base64 32
AUTH_URL="http://localhost:3000"         # Prod: https://hub.avizz.com.br
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

NODE_ENV="development"
```

---

## Fases de entrega

| Fase | Entrega | Status |
|---|---|---|
| 1 | Setup: Next.js, Prisma, Neon, Auth, tRPC, layout base | ✅ |
| 2 | Relatórios Diários + calendário | ✅ |
| 3 | Registro de Venda + Avanço | ✅ |
| 4 | Dashboard Comercial completo | ✅ |
| 5 | Gestão de Metas | ✅ |
| 6 | Gestão de Produtos e Usuários | 🔲 |
| 7 | Validação, responsividade e deploy | 🔲 |

---

## Restrições e decisões que não devem ser revertidas

1. **Sem senha.** Autenticação é 100% Google OAuth. Nunca adicionar campo de senha.
2. **Cálculos financeiros no servidor.** `cash_value`, `net_value`, `future_revenue` nunca vêm do cliente.
3. **`counts_as_sale` é snapshot imutável.** Nunca atualizar retroativamente sales históricas.
4. **Advances convertidos são somente leitura.** Bloquear edição no servidor, não apenas na UI.
5. **`company_id` em todas as entidades.** Mesmo sem uso ativo no MVP, sempre preencher.
6. **Feriados não geram pendência.** A lista de feriados serve apenas para exibição e cálculo de projeção, nunca para marcar dias como atrasados.
7. **Dois níveis de autorização.** Middleware de rota + procedure tRPC. Nunca depender de apenas um.
8. **Gestão de Metas — edição é admin exclusivo.** Head pode visualizar e acompanhar, mas os formulários de criação/edição de metas (globais, individuais e taxas) devem ser bloqueados no servidor para qualquer role que não seja `admin`.
9. **Gestão de Produtos — admin exclusivo.** Head não tem acesso a criar, editar ou reordenar produtos nem a configurar gateways.
10. **Mini-painel de metas na sidebar.** SDR vê Meta Caixa + Meta No-Show. Closer vê Meta Caixa + Conversão (%). Se não houver `IndividualGoal` definida para o mês corrente, exibir "Meta não definida" — nunca omitir o painel.
11. **Dashboard global visível para todos.** Qualquer role autenticado vê o consolidado da empresa. `closer` e `sdr` veem também seus dados pessoais. `operational` vê apenas o global, sem dados pessoais de outros.
12. **`operational` vê dashboard global e ranking em modo somente leitura.** Não tem acesso a dados pessoais de outros usuários, funil de análise individual nem filtros. Apenas a visão consolidada da empresa.
