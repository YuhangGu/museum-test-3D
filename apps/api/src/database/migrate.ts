import "dotenv/config";
import pg from "pg";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { currentId, historicalId, fixtures, features } from "./fixtures.js";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(67342401)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz DEFAULT now())",
  );
  if (
    !(await client.query("SELECT 1 FROM schema_migrations WHERE version='001'"))
      .rowCount
  ) {
    await client.query(
      await readFile(
        resolve(dirname(fileURLToPath(import.meta.url)), "001_initial.sql"),
        "utf8",
      ),
    );
    await client.query("INSERT INTO schema_migrations(version) VALUES ('001')");
  }
  if (
    !(
      await client.query(
        "SELECT 1 FROM schema_migrations WHERE version='002_seed'",
      )
    ).rowCount
  ) {
    const storage =
      process.env.MODEL_STORAGE_PATH || resolve("../../storage/models");
    for (const [id, key, type] of [
      [currentId, "sample-building.glb", "sample"],
      [historicalId, "sample-building-historical.glb", "historical"],
    ]) {
      const size = (await stat(resolve(storage, key))).size;
      await client.query(
        "INSERT INTO models(id,storage_key,original_filename,model_type,file_size,mime_type) VALUES($1,$2,$2,$3,$4,$5)",
        [id, key, type, size, "model/gltf-binary"],
      );
    }
    for (const [i, b] of fixtures.entries()) {
      await client.query(
        "INSERT INTO buildings(id,name,description,location,current_model_id,historical_model_id,historical_year) VALUES($1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326),$6,$7,1800)",
        [
          b.id,
          b.name,
          b.description,
          b.longitude,
          b.latitude,
          currentId,
          historicalId,
        ],
      );
      for (const [j, a] of features.entries())
        await client.query(
          "INSERT INTO annotations(id,building_id,title,description,position_x,position_y,position_z,historical_period,source_reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            `30000000-0000-4000-8000-0000000000${i}${j}`,
            b.id,
            a.title,
            a.description,
            a.x,
            a.y,
            a.z,
            a.period,
            "Original procedural demonstration; not a historical source.",
          ],
        );
    }
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES ('002_seed')",
    );
  }
  await client.query("COMMIT");
  console.log("Migrations and seed complete.");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
