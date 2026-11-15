import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const info = await client.execute("PRAGMA table_info(plan_sessions)");
  const hasRounds = info.rows.some((r) => r[1] === "rounds");
  if (hasRounds) {
    console.log("plan_sessions.rounds already exists, skipping.");
  } else {
    await client.execute("ALTER TABLE plan_sessions ADD COLUMN rounds INTEGER");
    console.log("Added rounds column to plan_sessions.");
  }
  process.exit(0);
}
migrate().catch((e) => { console.error(e); process.exit(1); });
