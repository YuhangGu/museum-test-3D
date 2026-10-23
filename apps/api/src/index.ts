import "dotenv/config";
import { resolve } from "node:path";
import { createApp } from "./app.js";
import { demoRepository, postgresRepository } from "./repositories/museum.js";
const demo = process.env.MUSEUM_DEMO_MODE === "true";
if (!demo && !process.env.DATABASE_URL)
  throw new Error(
    "DATABASE_URL is required. Use MUSEUM_DEMO_MODE=true only for a non-persistent UI preview.",
  );
const app = await createApp(
  demo ? demoRepository() : postgresRepository(process.env.DATABASE_URL!),
  process.env.MODEL_STORAGE_PATH || resolve("../../storage/models"),
  demo,
);
await app.listen({
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "0.0.0.0",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
