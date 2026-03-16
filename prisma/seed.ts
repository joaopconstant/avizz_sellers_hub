import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../src/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const company = await db.company.upsert({
    where: { id: "avizz" },
    update: {},
    create: {
      id: "avizz",
      name: "Avizz",
    },
  });
  console.log("✅ Company:", company.name);

  const admin = await db.user.upsert({
    where: { email: "mateus@avizz.com.br" },
    update: {},
    create: {
      company_id: company.id,
      name: "Mateus",
      email: "mateus@avizz.com.br",
      role: "admin",
      is_active: true,
    },
  });
  console.log("✅ Admin:", admin.email);

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
