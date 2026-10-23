import { mkdir, writeFile } from "node:fs/promises";
const dir = new URL("../storage/models/", import.meta.url);
await mkdir(dir, { recursive: true });
function generate(historical) {
  const materials = [
    ["Limestone", [0.73, 0.65, 0.49, 1]],
    ["Copper", [0.19, 0.36, 0.32, 1]],
    ["Recessed glass", [0.13, 0.21, 0.23, 1]],
    ["Sandstone trim", [0.89, 0.82, 0.66, 1]],
    ["Oak", [0.27, 0.17, 0.1, 1]],
    ["Old terracotta", [0.46, 0.23, 0.15, 1]],
  ].map(([name, color]) => ({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: color,
      metallicFactor: 0,
      roughnessFactor: 0.85,
    },
  }));
  const meshes = [],
    nodes = [],
    accessors = [],
    bufferViews = [],
    buffers = [];
  let offset = 0;
  function mesh(name, triangles, material) {
    const pos = [],
      normal = [];
    for (const [a, b, c] of triangles) {
      const u = b.map((v, i) => v - a[i]),
        v = c.map((v, i) => v - a[i]);
      const n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const l = Math.hypot(...n) || 1;
      for (const p of [a, b, c]) {
        pos.push(...p);
        normal.push(...n.map((x) => x / l));
      }
    }
    const attrs = {};
    for (const [key, data] of [
      ["POSITION", pos],
      ["NORMAL", normal],
    ]) {
      const buf = Buffer.from(new Float32Array(data).buffer);
      const view = bufferViews.length;
      bufferViews.push({
        buffer: 0,
        byteOffset: offset,
        byteLength: buf.length,
        target: 34962,
      });
      offset += buf.length;
      buffers.push(buf);
      const acc = {
        bufferView: view,
        componentType: 5126,
        count: data.length / 3,
        type: "VEC3",
      };
      if (key === "POSITION") {
        acc.min = [0, 1, 2].map((i) =>
          Math.min(...data.filter((_, j) => j % 3 === i)),
        );
        acc.max = [0, 1, 2].map((i) =>
          Math.max(...data.filter((_, j) => j % 3 === i)),
        );
      }
      attrs[key] = accessors.length;
      accessors.push(acc);
    }
    nodes.push({ name, mesh: meshes.length });
    meshes.push({ primitives: [{ attributes: attrs, material }] });
  }
  function box(name, x, y, z, w, h, d, mat) {
    const p = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ].map(([a, b, c]) => [x + (a * w) / 2, y + (b * h) / 2, z + (c * d) / 2]);
    const faces = [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 4, 7, 3],
      [1, 2, 6, 5],
      [3, 7, 6, 2],
      [0, 1, 5, 4],
    ];
    mesh(
      name,
      faces.flatMap(([a, b, c, d]) => [
        [p[a], p[b], p[c]],
        [p[a], p[c], p[d]],
      ]),
      mat,
    );
  }
  function roof(name, x, y, z, w, h, d, mat) {
    const p = [
      [x - w / 2, y, z - d / 2],
      [x + w / 2, y, z - d / 2],
      [x + w / 2, y, z + d / 2],
      [x - w / 2, y, z + d / 2],
      [x, y + h, z - d / 2],
      [x, y + h, z + d / 2],
    ];
    mesh(
      name,
      [
        [0, 4, 1],
        [3, 2, 5],
        [0, 3, 5],
        [0, 5, 4],
        [1, 4, 5],
        [1, 5, 2],
      ].map((t) => t.map((i) => p[i])),
      mat,
    );
  }
  box("Foundation", 0, 0.12, 0, 4.55, 0.24, 3.55, 3);
  box("Main facade", 0, 1.65, 0, 4, 3, 3, 0);
  box("Lower cornice", 0, 0.42, 0, 4.15, 0.16, 3.15, 3);
  box("Eaves", 0, 3.16, 0, 4.22, 0.18, 3.22, 3);
  box("Middle stringcourse", 0, 1.75, 0, 4.1, 0.1, 3.1, 3);
  roof(
    "Pitched roof",
    0,
    3.25,
    0,
    4.5,
    historical ? 0.9 : 1.45,
    3.5,
    historical ? 5 : 1,
  );
  for (const x of [-1.4, -0.7, 0.7, 1.4])
    for (const y of [0.95, 2.45])
      for (const z of [-1.52, 1.52]) {
        box("Window frame", x, y, z, 0.48, 0.83, 0.09, 3);
        box(
          "Window glass",
          x,
          y,
          z + (z > 0 ? 0.05 : -0.05),
          0.34,
          0.66,
          0.04,
          2,
        );
        box("Mullion", x, y, z + (z > 0 ? 0.08 : -0.08), 0.035, 0.67, 0.02, 3);
        box("Window sill", x, y - 0.43, z, 0.57, 0.09, 0.19, 3);
      }
  for (const x of [-2.02, 2.02])
    for (const z of [-0.9, 0, 0.9])
      for (const y of [1, 2.45]) {
        box("Side frame", x, y, z, 0.08, 0.8, 0.46, 3);
        box(
          "Side glass",
          x + (x > 0 ? 0.05 : -0.05),
          y,
          z,
          0.04,
          0.64,
          0.32,
          2,
        );
      }
  box("Door surround", 0, 0.88, 1.55, 0.79, 1.48, 0.18, 3);
  box("Oak door", 0, 0.8, 1.66, 0.58, 1.3, 0.05, 4);
  box("Entrance step", 0, 0.25, 1.8, 1, 0.16, 0.55, 3);
  for (const x of [-1.97, 1.97])
    for (const z of [-1.49, 1.49])
      box("Corner pilaster", x, 1.7, z, 0.19, 2.9, 0.19, 3);
  if (!historical) {
    box("Lantern tower", 0, 4.22, 0, 0.88, 1.08, 0.88, 0);
    for (const z of [-0.45, 0.45])
      box("Tower window", 0, 4.3, z, 0.35, 0.59, 0.04, 2);
    box("Tower cornice", 0, 4.79, 0, 1.06, 0.14, 1.06, 3);
    roof("Tower cap", 0, 4.86, 0, 1.2, 0.73, 1.2, 1);
    box("Finial", 0, 5.65, 0, 0.07, 0.25, 0.07, 4);
  } else {
    box("Early chimney", 1.1, 4.14, -0.55, 0.4, 0.85, 0.45, 0);
  }
  const binary = Buffer.concat(buffers);
  const doc = {
    asset: {
      version: "2.0",
      generator: "Layers Museum original procedural demonstration",
    },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binary.length }],
  };
  let json = Buffer.from(JSON.stringify(doc));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + binary.length, 8);
  const j = Buffer.alloc(8);
  j.writeUInt32LE(json.length);
  j.writeUInt32LE(0x4e4f534a, 4);
  const b = Buffer.alloc(8);
  b.writeUInt32LE(binary.length);
  b.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, j, json, b, binary]);
}
for (const historical of [false, true])
  await writeFile(
    new URL(
      historical ? "sample-building-historical.glb" : "sample-building.glb",
      dir,
    ),
    generate(historical),
  );
console.log("Generated aligned original GLB models in server storage.");
