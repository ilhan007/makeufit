import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Fix body_metrics: make user_id nullable
  {
    const info = await client.execute("PRAGMA table_info(body_metrics)");
    const col = info.rows.find((r) => r[1] === "user_id");
    const isNotNull = col ? Number(col[3]) === 1 : false;

    if (isNotNull) {
      console.log("Recreating body_metrics with nullable user_id...");
      await client.batch([
        {
          sql: `CREATE TABLE IF NOT EXISTS body_metrics_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            offline_athlete_id INTEGER REFERENCES offline_athletes(id) ON DELETE CASCADE,
            date INTEGER NOT NULL,
            weight_kg REAL,
            body_fat_pct REAL,
            waist_cm REAL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
          )`,
          args: [],
        },
        {
          sql: `INSERT INTO body_metrics_new (id, user_id, date, weight_kg, body_fat_pct, waist_cm, created_at)
                SELECT id, user_id, date, weight_kg, body_fat_pct, waist_cm, created_at FROM body_metrics`,
          args: [],
        },
        { sql: `DROP TABLE body_metrics`, args: [] },
        { sql: `ALTER TABLE body_metrics_new RENAME TO body_metrics`, args: [] },
      ], "write");
      console.log("body_metrics done.");
    } else {
      console.log("body_metrics.user_id already nullable, skipping.");
    }
  }

  // Fix workouts: make user_id nullable
  {
    const info = await client.execute("PRAGMA table_info(workouts)");
    const col = info.rows.find((r) => r[1] === "user_id");
    const isNotNull = col ? Number(col[3]) === 1 : false;

    if (isNotNull) {
      console.log("Recreating workouts with nullable user_id...");
      await client.batch([
        {
          sql: `CREATE TABLE IF NOT EXISTS workouts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            offline_athlete_id INTEGER REFERENCES offline_athletes(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            date INTEGER NOT NULL,
            notes TEXT,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
          )`,
          args: [],
        },
        {
          sql: `INSERT INTO workouts_new (id, user_id, name, date, notes, created_at)
                SELECT id, user_id, name, date, notes, created_at FROM workouts`,
          args: [],
        },
        { sql: `DROP TABLE workouts`, args: [] },
        { sql: `ALTER TABLE workouts_new RENAME TO workouts`, args: [] },
      ], "write");
      console.log("workouts done.");
    } else {
      console.log("workouts.user_id already nullable, skipping.");
    }
  }

  console.log("Migration complete.");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
