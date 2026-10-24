import { mkdir, writeFile } from "node:fs/promises";
const dirs = [
  new URL("../storage/models/", import.meta.url),
  new URL("../apps/web/public/models/", import.meta.url),
];
await Promise.all(dirs.map((dir) => mkdir(dir, { recursive: true })));
function generate(historical) {
  const palette = historical
    ? [
        [0.37, 0.35, 0.31, 1],
        [0.22, 0.25, 0.22, 1],
        [0.12, 0.14, 0.13, 1],
        [0.25, 0.23, 0.20, 1],
        [0.22, 0.19, 0.16, 1],
        [0.25, 0.23, 0.20, 1],
        [0.34, 0.32, 0.28, 1],
        [0.43, 0.39, 0.31, 1],
        [0.37, 0.26, 0.20, 1],
      ]
    : [
        [0.48, 0.39, 0.29, 1],
        [0.19, 0.28, 0.25, 1],
        [0.10, 0.18, 0.17, 1],
        [0.29, 0.20, 0.14, 1],
        [0.18, 0.105, 0.058, 1],
        [0.27, 0.23, 0.19, 1],
        [0.23, 0.14, 0.085, 1],
        [0.57, 0.43, 0.21, 1],
        [0.56, 0.20, 0.14, 1],
      ];
  const materials = [
    ["Warm limestone", [0.68, 0.60, 0.47, 1]],
    ["Copper", [0.19, 0.36, 0.32, 1]],
    ["Recessed glass", [0.13, 0.21, 0.23, 1]],
    ["Sandstone trim", [0.89, 0.82, 0.66, 1]],
    ["Dark larch timber", [0.25, 0.16, 0.10, 1]],
    ["Weathered timber roof", [0.31, 0.24, 0.17, 1]],
    ["Limewashed plaster", [0.82, 0.77, 0.65, 1]],
    ["Hay", [0.67, 0.49, 0.20, 1]],
    ["Red geranium", [0.56, 0.20, 0.14, 1]],
  ].map(([name], index) => ({
    name: historical ? `Weathered ${name}` : name,
    pbrMetallicRoughness: {
      baseColorFactor: palette[index],
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
  if (historical) {
    // A weather-worn two-storey 1800 interpretation: uneven darkened logs,
    // a low upper balcony, patched wood-shingle roof, and a simpler plan.
    box("Old stone footing", 0, 0.16, 0, 4.65, 0.32, 3.75, 3);
    box("Aged lower log storey", 0, 1.25, 0, 4.28, 1.95, 3.42, 4);
    box("Aged upper log storey", 0, 3.18, 0, 4.08, 1.85, 3.22, 4);
    box("Hand-hewn floor beam", 0, 2.25, 0, 4.50, 0.20, 3.66, 3);
    box("Old timber attic floor", 0, 4.10, 0, 3.88, 0.14, 3.02, 4);
    // Course lines and irregular repairs make the old walls read as hand-built logs.
    for (const y of [0.48, 0.70, 0.92, 1.14, 1.36, 1.58, 1.80, 2.02, 2.44, 2.66, 2.88, 3.10, 3.32, 3.54, 3.76, 3.98]) {
      const z = y < 2.2 ? 1.755 : 1.665;
      box("Uneven old front log course", 0, y, z, 4.20, 0.075, 0.07, y % 0.44 < 0.1 ? 5 : 4);
    }
    box("Old stable partition", 0.18, 1.18, -0.20, 0.14, 1.58, 2.68, 3);
    box("Old stall divider", -1.14, 0.88, -0.40, 0.10, 0.78, 1.32, 4);
    box("Old feed manger", -1.48, 0.58, -0.83, 0.48, 0.28, 1.08, 4);
    box("Old hay in manger", -1.48, 0.75, -0.83, 0.36, 0.12, 0.82, 7);
    box("Old provisions chest", 1.18, 0.66, -0.55, 0.98, 0.56, 0.72, 4);
    for (const x of [-1.62, -0.20, 0.54, 1.62])
      box("Old oak ground post", x, 1.22, -0.10, 0.13, 1.68, 0.13, 4);
    box("Old upper room partition", -0.55, 3.15, -0.40, 0.12, 1.70, 2.30, 3);
    box("Old hearth", 1.18, 2.74, -1.18, 0.76, 0.78, 0.46, 0);
    box("Old farmhouse table", -1.13, 2.78, 0.24, 1.16, 0.14, 0.72, 4);
    for (const x of [-1.55, -0.70])
      for (const z of [-0.04, 0.52])
        box("Old table leg", x, 2.53, z, 0.08, 0.42, 0.08, 4);
    for (let step = 0; step < 9; step++)
      box("Old narrow stair", 1.22, 0.48 + step * 0.18, -1.05 + step * 0.18, 0.56, 0.09, 0.22, 4);
    // One restrained, slightly sagging-looking balcony distinguishes the older house.
    box("Old balcony deck", 0, 4.12, 1.98, 3.50, 0.14, 0.64, 4);
    for (const x of [-1.53, -0.77, 0, 0.77, 1.53])
      box("Old simple balcony baluster", x, 4.38, 2.22, 0.09, 0.38, 0.09, 4);
    box("Old balcony rail", 0, 4.58, 2.22, 3.54, 0.09, 0.12, 5);
    box("Old roof and deep eaves", 0, 4.38, 0, 5.35, 1.36, 4.80, 5);
    // Muted, uneven shingle patches break up the broad roof surface.
    for (let row = 0; row < 4; row++) {
      const x = 0.55 + row * 0.54;
      const y = 5.60 - row * 0.27;
      for (const z of [-1.72, -0.62, 0.58, 1.70]) {
        box("Patched roof shingle", x, y, z, 0.48, 0.055, 0.58, (row + Math.round(z)) % 2 ? 5 : 3);
        box("Patched roof shingle opposite", -x, y, z, 0.48, 0.055, 0.58, (row + Math.round(z)) % 2 ? 3 : 5);
      }
    }
    for (const x of [-1.60, -0.80, 0, 0.80, 1.60])
      box("Old gable upright", x, 5.18, 1.88, 0.10, 1.00, 0.10, 4);
    box("Old gable crosspiece", 0, 4.90, 1.90, 3.45, 0.10, 0.10, 5);
    box("Old chimney", 1.15, 5.12, -0.62, 0.36, 1.18, 0.38, 0);
    for (const [x, y, width] of [[-1.24, 1.35, 0.48], [1.25, 1.35, 0.48], [-1.22, 3.08, 0.42], [1.20, 3.08, 0.42]]) {
      box("Old window frame", x, y, 1.80, width + 0.16, 0.66, 0.12, 3);
      box("Old dusty window", x, y, 1.87, width, 0.50, 0.04, 2);
      box("Old window crossbar", x, y, 1.90, 0.04, 0.52, 0.03, 5);
      box("Old window sill", x, y - 0.36, 1.90, width + 0.20, 0.08, 0.16, 5);
    }
    box("Old barn door surround", -0.96, 1.08, 1.76, 1.48, 1.42, 0.16, 3);
    box("Old barn door", -0.96, 1.08, 1.86, 1.28, 1.28, 0.08, 5);
    for (const x of [-1.40, -0.96, -0.52])
      box("Old barn door plank seam", x, 1.08, 1.92, 0.035, 1.20, 0.03, 4);
    box("Old store door", 1.06, 0.92, 1.78, 0.60, 1.08, 0.08, 4);
    box("Old threshold", 1.06, 0.33, 1.94, 0.84, 0.14, 0.42, 3);
  } else {
  // A fictional Salzburg-region farmhouse with three timber levels and carved balconies.
  const roofY = 6.35;
  box("Granite foundation course", 0, 0.16, 0, 4.65, 0.32, 3.75, 3);
  box("Dark log stable and storey", 0, 1.28, 0, 4.35, 2.02, 3.45, 4);
  box("Stable floor flagstones", 0, 0.38, 0, 4.05, 0.12, 3.12, 3);
  box("First floor timber sill", 0, 2.34, 0, 4.55, 0.18, 3.68, 4);
  box("Dark timber living storey", 0, 3.42, 0, 4.12, 2.05, 3.28, 4);
  box("Second floor timber sill", 0, 4.48, 0, 4.48, 0.18, 3.62, 4);
  box("Upper timber gable infill", 0, 5.38, 0, 3.92, 1.62, 3.08, 4);
  box("Attic floor", 0, 4.62, 0, 3.85, 0.12, 3.0, 4);
  box("Broad overhanging larch-shingle roof", 0, roofY, 0, 6.0, 1.55, 5.55, 5);
  box("Carved front gable fascia", 0, 6.46, 2.82, 5.25, 0.16, 0.14, 4);
  box("Carved rear gable fascia", 0, 6.46, -2.82, 5.25, 0.16, 0.14, 4);
  // Dark horizontal log courses and exposed corner timbers shape the Alpine facade.
  for (const [start, end, z] of [[0.52, 2.24, 1.75], [2.52, 4.36, 1.66]])
    for (let y = start; y <= end; y += 0.22) {
      box("Front stacked-log course", 0, y, z, 4.16, 0.075, 0.075, y % 0.44 < 0.1 ? 5 : 4);
      for (const x of [-2.19, 2.19])
        box("Side stacked-log course", x, y, 0, 0.075, 0.075, 3.28, y % 0.44 < 0.1 ? 5 : 4);
    }
  for (const x of [-2.02, -0.92, 0.92, 2.02])
    box("Carved facade upright", x, 3.42, 1.69, 0.10, 1.92, 0.10, 5);
  for (const x of [-1.82, 1.82]) {
    box("Gable verge timber", x, 6.85, 0, 0.13, 1.08, 4.18, 4);
    box("Living floor corner post", x, 3.42, 1.68, 0.16, 2.02, 0.16, 4);
    box("Loft corner post", x, 5.36, 1.59, 0.14, 1.65, 0.14, 4);
  }
  // Stone ground floor: cattle stalls to the left, tools and provisions to the right.
  box("Stable and store partition", 0.15, 1.27, -0.25, 0.13, 1.72, 2.65, 3);
  box("Stable stall divider one", -1.18, 0.91, -0.44, 0.10, 0.92, 1.36, 4);
  box("Stable stall divider two", -1.18, 0.91, 0.82, 0.10, 0.92, 1.02, 4);
  box("Oak cattle manger", -1.52, 0.60, -0.90, 0.50, 0.30, 1.18, 4);
  box("Hay in manger", -1.52, 0.80, -0.90, 0.38, 0.16, 0.90, 7);
  box("Feed storage bins", 1.13, 0.70, -0.63, 1.15, 0.66, 0.78, 4);
  box("Barrel in store", 1.26, 0.68, 0.65, 0.48, 0.72, 0.48, 5);
  for (const x of [-1.70, -0.25, 0.48, 1.70])
    box("Ground floor oak post", x, 1.28, -0.15, 0.13, 1.82, 0.13, 4);
  // The second floor is the farmhouse living/work space, with a tiled hearth and table.
  box("Kitchen and parlour partition", -0.66, 3.40, -0.46, 0.12, 1.88, 2.22, 3);
  box("Stone cooking hearth", 1.24, 2.86, -1.20, 0.84, 0.88, 0.48, 0);
  box("Hearth timber mantel", 1.24, 3.34, -0.92, 1.02, 0.12, 0.12, 4);
  box("Farmhouse table", -1.15, 3.00, 0.36, 1.22, 0.14, 0.75, 4);
  for (const x of [-1.62, -0.68])
    for (const z of [0.08, 0.64])
      box("Table leg", x, 2.74, z, 0.09, 0.50, 0.09, 4);
  box("Built-in settle", -1.48, 2.88, -0.92, 0.38, 0.38, 0.95, 4);
  // Compact stair flights join all three levels along the back wall.
  for (let step = 0; step < 10; step++) {
    box("Stair to living floor", 1.25, 0.49 + step * 0.18, -1.10 + step * 0.19, 0.62, 0.10, 0.24, 4);
    box("Stair to loft", 1.25, 2.48 + step * 0.18, -1.10 + step * 0.19, 0.62, 0.10, 0.24, 4);
  }
  // The top floor holds hay and seasonal storage on one side, sleeping rooms on the other.
  box("Loft partition", 0.35, 5.36, -0.46, 0.12, 1.42, 2.16, 4);
  for (const [x, z] of [[-1.12, -0.78], [-1.12, -0.30], [-0.65, -0.78], [-0.65, -0.30]])
    box("Stored hay bale", x, 5.00, z, 0.42, 0.45, 0.40, 7);
  box("Loft bed", 1.16, 4.91, 0.12, 1.20, 0.32, 1.25, 4);
  box("Loft mattress", 1.16, 5.12, 0.12, 1.08, 0.12, 1.12, 6);
  box("Loft blanket", 1.16, 5.20, 0.12, 1.10, 0.08, 0.62, 5);
  for (const x of [-1.55, -0.55, 0.55, 1.55]) {
    box("Loft roof tie beam", x, 5.18, 0, 0.12, 0.16, 2.90, 4);
    box("Living floor ceiling beam", x, 4.38, 0, 0.12, 0.14, 3.0, 4);
  }
  // Deep balconies and timber rails are characteristic details of regional farmhouses.
  function carvedBalcony(level, prefix) {
    const deckY = level;
    const railY = level + 0.62;
    const frontZ = 2.30;
    box(`${prefix} balcony deck`, 0, deckY, 1.98, 3.92, 0.16, 0.76, 4);
    box(`${prefix} balcony lower rail`, 0, deckY + 0.24, frontZ, 3.82, 0.09, 0.12, 5);
    for (let i = 0; i <= 12; i++) {
      const x = -1.78 + i * 0.296;
      box(`${prefix} turned baluster`, x, deckY + 0.43, frontZ, 0.075, 0.42, 0.075, 4);
      box(`${prefix} baluster carved collar`, x, deckY + 0.43, frontZ + 0.045, 0.15, 0.07, 0.07, 5);
    }
    box(`${prefix} carved handrail`, 0, railY, frontZ, 3.98, 0.13, 0.18, 4);
    for (const x of [-1.68, 1.68])
      box(`${prefix} balcony support post`, x, deckY - 0.13, 1.86, 0.14, 0.48, 0.14, 4);
  }
  carvedBalcony(2.38, "Lower carved");
  carvedBalcony(4.53, "Upper carved");
  // Small carved brackets beneath the deep eaves and balcony edges.
  for (const x of [-2.35, -1.55, -0.78, 0, 0.78, 1.55, 2.35]) {
    box("Eave carved pendant", x, 6.18, 2.68, 0.11, 0.25, 0.11, 4);
    box("Balcony carved apron", x, 4.34, 2.15, 0.13, 0.16, 0.12, 5);
  }
  for (const x of [-1.25, 1.25]) {
    box("Geranium window box", x, 4.41, 1.88, 0.82, 0.18, 0.22, 4);
    for (const dx of [-0.24, 0, 0.24])
      box("Red geranium", x + dx, 4.55, 1.90, 0.16, 0.14, 0.14, 8);
  }
  // Deep-set windows, with sturdy timber surrounds and divided panes.
  function frontWindow(x, y, width = 0.48, height = 0.72) {
    box("Deep window reveal", x, y, 1.755, width + 0.16, height + 0.14, 0.10, 3);
    box("Window glass", x, y, 1.82, width, height, 0.035, 2);
    box("Window mullion", x, y, 1.85, 0.045, height, 0.035, 3);
    box("Window transom", x, y, 1.85, width, 0.045, 0.035, 3);
    box("Projecting timber sill", x, y - height / 2 - 0.07, 1.84, width + 0.22, 0.10, 0.20, 4);
  }
  frontWindow(-1.30, 3.35);
  frontWindow(1.28, 3.35);
  frontWindow(-1.28, 5.26, 0.42, 0.50);
  frontWindow(1.24, 5.26, 0.42, 0.50);
  for (const z of [-1.12, 0.12, 1.30]) {
    box("Side window reveal", 2.205, 3.36, z, 0.10, 0.70, 0.50, 3);
    box("Side window glass", 2.26, 3.36, z, 0.035, 0.54, 0.34, 2);
    box("Side window crossbar", 2.29, 3.36, z, 0.035, 0.045, 0.34, 3);
  }
  // Wide stable doors and a smaller store entrance on the front (+Z) facade.
  box("Stable door surround", -0.98, 1.12, 1.77, 1.55, 1.55, 0.18, 3);
  box("Stable double door", -0.98, 1.12, 1.88, 1.34, 1.38, 0.08, 4);
  for (const x of [-1.47, -0.98, -0.49])
    box("Stable door vertical plank", x, 1.12, 1.93, 0.035, 1.30, 0.03, 5);
  box("Stable door cross brace", -0.98, 0.68, 1.95, 1.26, 0.09, 0.04, 5);
  box("Stable door cross brace upper", -0.98, 1.55, 1.95, 1.26, 0.09, 0.04, 5);
  box("Store door", 1.03, 0.94, 1.78, 0.67, 1.14, 0.10, 4);
  box("Store door lintel", 1.03, 1.56, 1.80, 0.88, 0.15, 0.19, 3);
  box("Main entry step", 1.03, 0.34, 1.98, 0.92, 0.16, 0.50, 3);
  // Shallow limewashed gable, exposed carved timbers, and a stone chimney.
  for (const x of [-1.65, -0.82, 0, 0.82, 1.65])
    box("Front timber gable board", x, 6.24, 2.18, 0.10, 1.18, 0.10, 4);
  box("Gable cross tie", 0, 5.92, 2.18, 3.50, 0.11, 0.12, 4);
  box("Chimney stack", 1.20, 6.47, -0.70, 0.38, 1.18, 0.40, 0);
  box("Chimney cap", 1.20, 7.09, -0.70, 0.55, 0.12, 0.55, 3);
  // Traditional timber corner posts and stone quoins articulate the facade.
  for (const x of [-2.12, 2.12]) {
    box("Stone corner quoin lower", x, 1.24, 1.74, 0.18, 2.00, 0.16, 3);
    box("Living-storey timber corner", x, 3.42, 1.69, 0.12, 2.02, 0.12, 4);
  }
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
for (const historical of [false, true]) {
  const name = historical
    ? "sample-building-historical.glb"
    : "sample-building.glb";
  const model = generate(historical);
  await Promise.all(dirs.map((dir) => writeFile(new URL(name, dir), model)));
}
console.log("Generated aligned original GLB models for server and Pages preview.");
