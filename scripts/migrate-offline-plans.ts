import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Applying migration: athlete_plans offline support...");

  // 1. Add offline_athlete_id column (nullable) if not already present
  try {
    await client.execute(
      "ALTER TABLE athlete_plans ADD COLUMN offline_athlete_id INTEGER REFERENCES offline_athletes(id) ON DELETE CASCADE"
    );
    console.log("Added offline_athlete_id column to athlete_plans");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("duplicate column") || msg.toLowerCase().includes("already exists")) {
      console.log("offline_athlete_id already exists, skipping");
    } else {
      console.log("Column add result:", msg);
    }
  }

  // 2. Make athlete_id nullable via table recreation (SQLite doesn't support ALTER COLUMN)
  const tableInfo = await client.execute("PRAGMA table_info(athlete_plans)");
  const athleteIdCol = tableInfo.rows.find((r) => r[1] === "athlete_id");
  const isNotNull = athleteIdCol ? Number(athleteIdCol[3]) === 1 : false;

  if (isNotNull) {
    console.log("Making athlete_id nullable via table recreation (using batch)...");

    // Use batch for atomic execution
    await client.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS athlete_plans_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          athlete_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          offline_athlete_id INTEGER REFERENCES offline_athletes(id) ON DELETE CASCADE,
          plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
          assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          start_date INTEGER,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )`,
        args: [],
      },
      {
        sql: `INSERT INTO athlete_plans_new (id, athlete_id, plan_id, assigned_by, start_date, created_at)
              SELECT id, athlete_id, plan_id, assigned_by, start_date, created_at FROM athlete_plans`,
        args: [],
      },
      {
        sql: `DROP TABLE athlete_plans`,
        args: [],
      },
      {
        sql: `ALTER TABLE athlete_plans_new RENAME TO athlete_plans`,
        args: [],
      },
    ], "write");

    console.log("athlete_plans table recreated with nullable athlete_id");
  } else {
    console.log("athlete_id is already nullable, skipping recreation");
  }

  console.log("Migration complete.");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
