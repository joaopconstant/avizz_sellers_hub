import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../src/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { startOfMonth } from "date-fns";

// Node.js precisa de WebSocket polyfill para o driver Neon
neonConfig.webSocketConstructor = ws;

// Seed usa DIRECT_URL (sem pooler) para evitar limitações de transação
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Company
  const company = await db.company.upsert({
    where: { id: "avizz" },
    update: {},
    create: {
      id: "avizz",
      name: "Avizz",
    },
  });
  console.log("✅ Company:", company.name);

  // Users
  const users = await Promise.all([
    db.user.upsert({
      where: { email: "admin@avizz.com.br" },
      update: {},
      create: {
        company_id: company.id,
        name: "Admin Avizz",
        email: "admin@avizz.com.br",
        role: "admin",
        is_active: true,
      },
    }),
    db.user.upsert({
      where: { email: "head@avizz.com.br" },
      update: {},
      create: {
        company_id: company.id,
        name: "Head Comercial",
        email: "head@avizz.com.br",
        role: "head",
        is_active: true,
      },
    }),
    db.user.upsert({
      where: { email: "closer@avizz.com.br" },
      update: {},
      create: {
        company_id: company.id,
        name: "Closer Silva",
        email: "closer@avizz.com.br",
        role: "closer",
        is_active: true,
      },
    }),
    db.user.upsert({
      where: { email: "sdr@avizz.com.br" },
      update: {},
      create: {
        company_id: company.id,
        name: "SDR Souza",
        email: "sdr@avizz.com.br",
        role: "sdr",
        is_active: true,
      },
    }),
    db.user.upsert({
      where: { email: "ops@avizz.com.br" },
      update: {},
      create: {
        company_id: company.id,
        name: "Operacional Lima",
        email: "ops@avizz.com.br",
        role: "operational",
        is_active: true,
      },
    }),
  ]);
  console.log("✅ Users:", users.map((u) => u.email).join(", "));

  // Products
  const assessoria = await db.product.upsert({
    where: { id: "prod-assessoria" },
    update: {},
    create: {
      id: "prod-assessoria",
      company_id: company.id,
      name: "Assessoria",
      counts_as_sale: true,
      is_active: true,
      is_primary: true,
      sort_order: 1,
    },
  });

  const aceleracaoPlus = await db.product.upsert({
    where: { id: "prod-aceleracao-plus" },
    update: {},
    create: {
      id: "prod-aceleracao-plus",
      company_id: company.id,
      name: "Aceleração Plus",
      counts_as_sale: false,
      is_active: true,
      sort_order: 2,
    },
  });
  console.log("✅ Products:", assessoria.name, aceleracaoPlus.name);

  // Gateway
  const gateway = await db.gateway.upsert({
    where: { id: "gw-pagarme" },
    update: {},
    create: {
      id: "gw-pagarme",
      company_id: company.id,
      name: "Pagarme",
      is_active: true,
    },
  });

  // GatewayRates
  const rates = [
    { installments: 1, rate_percent: 0.0199 },
    { installments: 2, rate_percent: 0.0318 },
    { installments: 3, rate_percent: 0.0437 },
    { installments: 4, rate_percent: 0.0556 },
    { installments: 5, rate_percent: 0.0675 },
    { installments: 6, rate_percent: 0.0794 },
  ];

  for (const rate of rates) {
    await db.gatewayRate.upsert({
      where: {
        gateway_id_installments: {
          gateway_id: gateway.id,
          installments: rate.installments,
        },
      },
      update: {},
      create: {
        gateway_id: gateway.id,
        installments: rate.installments,
        rate_percent: rate.rate_percent,
      },
    });
  }
  console.log("✅ Gateway:", gateway.name, "with", rates.length, "rates");

  // Goal for current month
  const adminUser = users[0]!;
  const currentMonth = startOfMonth(new Date());

  const goal = await db.goal.upsert({
    where: {
      company_id_month: {
        company_id: company.id,
        month: currentMonth,
      },
    },
    update: {},
    create: {
      company_id: company.id,
      month: currentMonth,
      cash_goal: 80000,
      sales_goal: 8,
      created_by: adminUser.id,
    },
  });
  console.log(
    "✅ Goal:",
    `R$ ${goal.cash_goal} / ${goal.sales_goal} vendas`,
    `(${currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })})`,
  );

  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
