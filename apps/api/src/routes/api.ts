import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import type { MuseumRepository } from "../repositories/museum.js";
import { resolveModel, parseRange } from "../storage/files.js";
const idSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      pattern:
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
    },
  },
  required: ["id"],
  additionalProperties: false,
};
export function routes(
  app: FastifyInstance,
  repo: MuseumRepository,
  storage: string,
  demo: boolean,
) {
  app.get("/api/health", async () => {
    await repo.health();
    return { status: "ok", mode: demo ? "demo-memory" : "postgres" };
  });
  app.get("/api/buildings", async () => ({ data: await repo.buildings() }));
  app.get<{ Params: { id: string } }>(
    "/api/buildings/:id",
    { schema: { params: idSchema } },
    async (req, reply) => {
      const data = await repo.building(req.params.id);
      return data
        ? { data }
        : reply
            .code(404)
            .send({
              error: { code: "NOT_FOUND", message: "Building not found" },
            });
    },
  );
  app.get<{ Params: { id: string } }>(
    "/api/buildings/:id/annotations",
    { schema: { params: idSchema } },
    async (req, reply) => {
      if (!(await repo.building(req.params.id)))
        return reply
          .code(404)
          .send({
            error: { code: "NOT_FOUND", message: "Building not found" },
          });
      return { data: await repo.annotations(req.params.id) };
    },
  );
  app.get<{ Params: { id: string } }>(
    "/api/models/:id/file",
    { schema: { params: idSchema } },
    async (req, reply) => {
      const model = await repo.model(req.params.id);
      if (!model)
        return reply
          .code(404)
          .send({ error: { code: "NOT_FOUND", message: "Model not found" } });
      let file;
      try {
        file = await resolveModel(storage, model.storage_key);
      } catch {
        return reply
          .code(404)
          .send({
            error: { code: "NOT_FOUND", message: "Model file unavailable" },
          });
      }
      const etag = `W/"${file.size}-${file.mtime}"`;
      reply
        .header("ETag", etag)
        .header("Cache-Control", "public, max-age=3600")
        .header("Accept-Ranges", "bytes")
        .header("X-Content-Type-Options", "nosniff")
        .type(model.mime_type);
      if (req.headers["if-none-match"] === etag) return reply.code(304).send();
      if (req.headers.range) {
        const range = parseRange(req.headers.range, file.size);
        if (!range)
          return reply
            .code(416)
            .header("Content-Range", `bytes */${file.size}`)
            .send();
        reply
          .code(206)
          .header(
            "Content-Range",
            `bytes ${range.start}-${range.end}/${file.size}`,
          )
          .header("Content-Length", range.end - range.start + 1);
        return reply.send(createReadStream(file.path, range));
      }
      return reply
        .header("Content-Length", file.size)
        .send(createReadStream(file.path));
    },
  );
}
