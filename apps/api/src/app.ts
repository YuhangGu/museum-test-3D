import Fastify from "fastify";
import cors from "@fastify/cors";
import { routes } from "./routes/api.js";
import type { MuseumRepository } from "./repositories/museum.js";
export async function createApp(
  repo: MuseumRepository,
  storage: string,
  demo = false,
) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  if (process.env.FRONTEND_ORIGIN)
    await app.register(cors, {
      origin: process.env.FRONTEND_ORIGIN.split(","),
    });
  routes(app, repo, storage, demo);
  app.setErrorHandler((error, req, reply) => {
    req.log.error(error);
    const status =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    reply
      .code(status)
      .send({
        error: {
          code: status === 400 ? "BAD_REQUEST" : "SERVER_ERROR",
          message:
            status === 400
              ? "Invalid request parameters"
              : "Service unavailable. Please try again.",
        },
      });
  });
  app.addHook("onClose", async () => repo.close());
  return app;
}
