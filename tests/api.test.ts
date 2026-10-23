import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  mkdtemp,
  writeFile,
  mkdir,
  symlink,
  rm,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApp } from "../apps/api/src/app.js";
import { demoRepository } from "../apps/api/src/repositories/museum.js";
import { resolveModel, parseRange } from "../apps/api/src/storage/files.js";
import {
  currentId,
  historicalId,
  fixtures,
} from "../apps/api/src/database/fixtures.js";
process.env.NODE_ENV = "test";
const storage = resolve("storage/models");
test("API metadata, shared assets, annotations and structured failures", async () => {
  const app = await createApp(demoRepository(), storage, true);
  try {
    const health = await app.inject("/api/health");
    assert.equal(health.json().mode, "demo-memory");
    const list = (await app.inject("/api/buildings")).json().data;
    assert.equal(list.length, 3);
    assert.equal(
      new Set(
        list.map((b: { currentModel: { id: string } }) => b.currentModel.id),
      ).size,
      1,
    );
    assert.equal(
      new Set(list.map((b: { longitude: number }) => b.longitude)).size,
      3,
    );
    assert.equal(
      (await app.inject(`/api/buildings/${fixtures[0].id}`)).statusCode,
      200,
    );
    const annotations = (
      await app.inject(`/api/buildings/${fixtures[0].id}/annotations`)
    ).json().data;
    assert.equal(annotations.length, 3);
    assert.equal(typeof annotations[0].x, "number");
    assert.equal(
      (await app.inject("/api/buildings/not-a-uuid")).statusCode,
      400,
    );
    assert.equal(
      (await app.inject("/api/buildings/99999999-9999-4999-8999-999999999999"))
        .statusCode,
      404,
    );
    assert.equal(
      (
        await app.inject(
          "/api/buildings/99999999-9999-4999-8999-999999999999/annotations",
        )
      ).statusCode,
      404,
    );
  } finally {
    await app.close();
  }
});
test("Server model delivery supports ranges, suffixes, HEAD, cache and missing records", async () => {
  const app = await createApp(demoRepository(), storage, true);
  try {
    const url = `/api/models/${currentId}/file`;
    const full = await app.inject(url);
    assert.equal(full.statusCode, 200);
    assert.equal(full.headers["content-type"], "model/gltf-binary");
    assert.equal(full.rawPayload.subarray(0, 4).toString(), "glTF");
    assert.equal(
      full.rawPayload.length,
      Number(full.headers["content-length"]),
    );
    const part = await app.inject({ url, headers: { range: "bytes=0-11" } });
    assert.equal(part.statusCode, 206);
    assert.equal(part.rawPayload.length, 12);
    assert.deepEqual(part.rawPayload, full.rawPayload.subarray(0, 12));
    const suffix = await app.inject({ url, headers: { range: "bytes=-10" } });
    assert.deepEqual(suffix.rawPayload, full.rawPayload.subarray(-10));
    assert.equal(
      (await app.inject({ url, method: "HEAD" })).rawPayload.length,
      0,
    );
    assert.equal(
      (
        await app.inject({
          url,
          headers: { "if-none-match": String(full.headers.etag) },
        })
      ).statusCode,
      304,
    );
    assert.equal(
      (await app.inject({ url, headers: { range: "bytes=999999999-" } }))
        .statusCode,
      416,
    );
    assert.equal(
      (await app.inject({ url, headers: { range: "bytes=0-1,4-5" } }))
        .statusCode,
      416,
    );
    assert.equal(
      (
        await app.inject(
          "/api/models/99999999-9999-4999-8999-999999999999/file",
        )
      ).statusCode,
      404,
    );
    assert.equal(
      (await app.inject(`/api/models/${historicalId}/file`)).statusCode,
      200,
    );
  } finally {
    await app.close();
  }
});
test("Storage rejects traversal, forbidden formats and symlink escapes", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "museum-"));
  try {
    const root = resolve(dir, "models");
    await mkdir(root);
    await writeFile(resolve(root, "safe.glb"), "glTF");
    await writeFile(resolve(dir, "outside.glb"), "secret");
    await writeFile(resolve(root, "bad.txt"), "bad");
    await symlink(resolve(dir, "outside.glb"), resolve(root, "escape.glb"));
    assert.equal((await resolveModel(root, "safe.glb")).size, 4);
    for (const key of [
      "../outside.glb",
      "bad.txt",
      "escape.glb",
      resolve(dir, "outside.glb"),
      "..\\outside.glb",
    ])
      await assert.rejects(resolveModel(root, key));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("Range boundaries are clamped safely", () => {
  assert.deepEqual(parseRange("bytes=2-999", 10), { start: 2, end: 9 });
  assert.deepEqual(parseRange("bytes=-999", 10), { start: 0, end: 9 });
  for (const range of ["bytes=-0", "bytes=11-", "bytes=3-1", "bytes=-", "bad"])
    assert.equal(parseRange(range, 10), null);
});
test("Original GLBs are valid containers with identical foundation coordinates and distinct roofs", async () => {
  const docs = [];
  for (const name of [
    "sample-building.glb",
    "sample-building-historical.glb",
  ]) {
    const data = await readFile(resolve(storage, name));
    assert.equal(data.readUInt32LE(0), 0x46546c67);
    assert.equal(data.readUInt32LE(4), 2);
    assert.equal(data.readUInt32LE(8), data.length);
    const length = data.readUInt32LE(12);
    const doc = JSON.parse(data.subarray(20, 20 + length).toString());
    assert.equal(doc.asset.version, "2.0");
    assert.ok(doc.meshes.length > 20);
    assert.equal(doc.buffers[0].uri, undefined);
    docs.push(doc);
  }
  assert.deepEqual(docs[0].accessors[0], docs[1].accessors[0]);
  assert.ok(
    docs[0].nodes.some((n: { name: string }) => n.name === "Lantern tower"),
  );
  assert.ok(
    docs[1].nodes.some((n: { name: string }) => n.name === "Early chimney"),
  );
});
