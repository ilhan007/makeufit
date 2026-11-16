import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  const info = await db.execute("PRAGMA table_info(plan_sessions)");
  const hasCol = info.rows.some((r) => r[1] === "is_rest");
  if (hasCol) {
    console.log("is_rest column already exists, skipping.");
  } else {
    await db.execute("ALTER TABLE plan_sessions ADD COLUMN is_rest INTEGER DEFAULT 0");
    console.log("Added is_rest column to plan_sessions.");
  }
  db.close();
}

main().catch(console.error);
