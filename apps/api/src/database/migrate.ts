import "dotenv/config";
import pg from "pg";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  currentId,
  historicalId,
  houseModelId,
  mosqueModelId,
  fixtures,
  features,
} from "./fixtures.js";
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
            "Illustrative Salzburg-region farmhouse model; not historical evidence.",
          ],
        );
    }
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES ('002_seed')",
    );
  }
  if (
    !(
      await client.query(
        "SELECT 1 FROM schema_migrations WHERE version='003_grossgmain_locations'",
      )
    ).rowCount
  ) {
    for (const building of fixtures) {
      await client.query(
        "UPDATE buildings SET location=ST_SetSRID(ST_MakePoint($2,$3),4326) WHERE id=$1",
        [building.id, building.longitude, building.latitude],
      );
    }
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES ('003_grossgmain_locations')",
    );
  }
  if (
    !(
      await client.query(
        "SELECT 1 FROM schema_migrations WHERE version='004_model_collection_metadata'",
      )
    ).rowCount
  ) {
    const storage =
      process.env.MODEL_STORAGE_PATH || resolve("../../storage/models");
    for (const [id, key, originalFilename] of [
      [
        houseModelId,
        "realistic-house-with-interior.glb",
        "Realistic House (With Interior Structure).glb",
      ],
      [mosqueModelId, "devonaboy_web.glb", "Devonaboy Jome Masjidi.glb"],
    ]) {
      const fileSize = (await stat(resolve(storage, key))).size;
      await client.query(
        "INSERT INTO models(id,storage_key,original_filename,model_type,file_size,mime_type) VALUES($1,$2,$3,'current',$4,'model/gltf-binary') ON CONFLICT(id) DO UPDATE SET storage_key=EXCLUDED.storage_key,original_filename=EXCLUDED.original_filename,model_type=EXCLUDED.model_type,file_size=EXCLUDED.file_size,mime_type=EXCLUDED.mime_type",
        [id, key, originalFilename, fileSize],
      );
    }
    for (const [index, building] of fixtures.entries()) {
      const modelId = [currentId, houseModelId, mosqueModelId][index];
      const oldModelId = index === 0 ? historicalId : null;
      const year = index === 0 ? 1800 : null;
      await client.query(
        "UPDATE buildings SET name=$2,description=$3,location=ST_SetSRID(ST_MakePoint($4,$5),4326),current_model_id=$6,historical_model_id=$7,historical_year=$8,updated_at=now() WHERE id=$1",
        [
          building.id,
          building.name,
          building.description,
          building.longitude,
          building.latitude,
          modelId,
          oldModelId,
          year,
        ],
      );
      if (index > 0)
        await client.query("DELETE FROM annotations WHERE building_id=$1", [
          building.id,
        ]);
      else {
        for (const [featureIndex, feature] of features.entries()) {
          const annotationId = `30000000-0000-4000-8000-0000000000${index}${featureIndex}`;
          await client.query(
            "UPDATE annotations SET title=$2,description=$3,position_x=$4,position_y=$5,position_z=$6,historical_period=$7,source_reference=$8 WHERE id=$1",
            [
              annotationId,
              feature.title,
              feature.description,
              feature.x,
              feature.y,
              feature.z,
              feature.period,
              "Illustrative Salzburg-region farmhouse model; not historical evidence.",
            ],
          );
        }
      }
    }
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES ('004_model_collection_metadata')",
    );
  }
  if (
    !(
      await client.query(
        "SELECT 1 FROM schema_migrations WHERE version='005_restore_salzburg_mosque_demo_marker'",
      )
    ).rowCount
  ) {
    await client.query(
      "UPDATE buildings SET location=ST_SetSRID(ST_MakePoint($2,$3),4326),updated_at=now() WHERE id=$1",
      ["20000000-0000-4000-8000-000000000003", 12.9519, 47.7504],
    );
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES ('005_restore_salzburg_mosque_demo_marker')",
    );
  }
  if (
    !(
      await client.query(
        "SELECT 1 FROM schema_migrations WHERE version='006_shared_chapter_comparison'",
      )
    ).rowCount
  ) {
    await client.query(
      "UPDATE buildings SET historical_model_id=$1,historical_year=1800,updated_at=now() WHERE id=ANY($2::uuid[])",
      [historicalId, fixtures.map((building) => building.id)],
    );
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES ('006_shared_chapter_comparison')",
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
