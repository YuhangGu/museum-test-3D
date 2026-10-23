import pg from "pg";
import {
  fixtures,
  features,
  currentId,
  historicalId,
} from "../database/fixtures.js";
export interface ModelRecord {
  id: string;
  storage_key: string;
  mime_type: string;
}
export interface MuseumRepository {
  health(): Promise<void>;
  buildings(): Promise<unknown[]>;
  building(id: string): Promise<unknown | null>;
  annotations(id: string): Promise<unknown[]>;
  model(id: string): Promise<ModelRecord | null>;
  close(): Promise<void>;
}
const asset = (id: string | null) =>
  id ? { id, url: `/api/models/${id}/file` } : null;
const select = `SELECT id,name,description,ST_X(location) AS longitude,ST_Y(location) AS latitude,thumbnail_url AS "thumbnailUrl",current_model_id,historical_model_id,historical_year AS "historicalYear" FROM buildings`;
function serialize(row: Record<string, unknown>) {
  const { current_model_id, historical_model_id, ...rest } = row;
  return {
    ...rest,
    currentModel: asset(current_model_id as string | null),
    historicalModel: asset(historical_model_id as string | null),
  };
}
export function postgresRepository(url: string): MuseumRepository {
  const pool = new pg.Pool({ connectionString: url });
  return {
    async health() {
      await pool.query("SELECT 1 FROM buildings LIMIT 1");
    },
    async buildings() {
      return (await pool.query(select + " ORDER BY name")).rows.map(serialize);
    },
    async building(id) {
      const row = (await pool.query(select + " WHERE id=$1", [id])).rows[0];
      return row ? serialize(row) : null;
    },
    async annotations(id) {
      return (
        await pool.query(
          'SELECT id, building_id AS "buildingId",title,description,position_x AS x,position_y AS y,position_z AS z,historical_period AS "historicalPeriod",image_url AS "imageUrl",source_reference AS "sourceReference" FROM annotations WHERE building_id=$1 ORDER BY id',
          [id],
        )
      ).rows;
    },
    async model(id) {
      return (
        (
          await pool.query(
            "SELECT id,storage_key,mime_type FROM models WHERE id=$1",
            [id],
          )
        ).rows[0] || null
      );
    },
    async close() {
      await pool.end();
    },
  };
}
export function demoRepository(): MuseumRepository {
  const buildings = fixtures.map((b) => ({
    ...b,
    thumbnailUrl: null,
    currentModel: asset(currentId),
    historicalModel: asset(historicalId),
    historicalYear: 1800,
  }));
  return {
    async health() {},
    async buildings() {
      return buildings;
    },
    async building(id) {
      return buildings.find((b) => b.id === id) || null;
    },
    async annotations(id) {
      return features.map((a, i) => ({
        ...a,
        id: `feature-${i}`,
        buildingId: id,
        historicalPeriod: a.period,
        imageUrl: null,
        sourceReference:
          "Original procedural demonstration; not a historical source.",
      }));
    },
    async model(id) {
      return id === currentId
        ? {
            id,
            storage_key: "sample-building.glb",
            mime_type: "model/gltf-binary",
          }
        : id === historicalId
          ? {
              id,
              storage_key: "sample-building-historical.glb",
              mime_type: "model/gltf-binary",
            }
          : null;
    },
    async close() {},
  };
}
