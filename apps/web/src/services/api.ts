import type { Building, Annotation } from "@museum/shared";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const demo = import.meta.env.VITE_DEMO_MODE === "true";

const demoBuildings: Building[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    name: "The Rivergate House",
    description:
      "An imagined merchant’s residence beside the Salzach. Explore its arcaded entrance, limestone walls, and steep copper roof.",
    longitude: 13.0449,
    latitude: 47.8013,
    thumbnailUrl: null,
    currentModel: {
      id: "10000000-0000-4000-8000-000000000001",
      url: "models/sample-building.glb",
    },
    historicalModel: {
      id: "10000000-0000-4000-8000-000000000002",
      url: "models/sample-building-historical.glb",
    },
    historicalYear: 1800,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    name: "The Linden Pavilion",
    description:
      "A fictional garden pavilion inspired by the region’s quiet courtyards, with a lantern tower and finely framed windows.",
    longitude: 13.0407,
    latitude: 47.8035,
    thumbnailUrl: null,
    currentModel: {
      id: "10000000-0000-4000-8000-000000000001",
      url: "models/sample-building.glb",
    },
    historicalModel: {
      id: "10000000-0000-4000-8000-000000000002",
      url: "models/sample-building-historical.glb",
    },
    historicalYear: 1800,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    name: "The Bellmaker’s Hall",
    description:
      "An imagined workshop and meeting hall celebrating the craft traditions of an Alpine city.",
    longitude: 13.0508,
    latitude: 47.7983,
    thumbnailUrl: null,
    currentModel: {
      id: "10000000-0000-4000-8000-000000000001",
      url: "models/sample-building.glb",
    },
    historicalModel: {
      id: "10000000-0000-4000-8000-000000000002",
      url: "models/sample-building-historical.glb",
    },
    historicalYear: 1800,
  },
];

const demoAnnotations: Annotation[] = [
  {
    id: "feature-0",
    buildingId: demoBuildings[0].id,
    title: "The copper roof",
    description:
      "A steep roof sheds Alpine rain and snow. The green surface suggests weathered copper. This geometry is an original demonstration design.",
    x: -0.9,
    y: 4.2,
    z: 1.2,
    historicalPeriod: "Illustrative present-day model",
    imageUrl: null,
    sourceReference: "Original procedural demonstration; not a historical source.",
  },
  {
    id: "feature-1",
    buildingId: demoBuildings[0].id,
    title: "The main entrance",
    description:
      "A recessed doorway marks the central axis of the house. Tap and rotate to see how the entrance relates to the tower above.",
    x: 0,
    y: 0.9,
    z: 1.62,
    historicalPeriod: "Demonstration architecture",
    imageUrl: null,
    sourceReference: "Original procedural demonstration; not a historical source.",
  },
  {
    id: "feature-2",
    buildingId: demoBuildings[0].id,
    title: "The limestone facade",
    description:
      "Warm stone walls and repeated windows give the building its rhythm. No claim of archaeological or historical accuracy is made.",
    x: 2.01,
    y: 2,
    z: 1.15,
    historicalPeriod: "Demonstration architecture",
    imageUrl: null,
    sourceReference: "Original procedural demonstration; not a historical source.",
  },
];

export function assetUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  if (demo && url.startsWith("models/")) return import.meta.env.BASE_URL + url;
  return base + url;
}
async function get<T>(path: string): Promise<T> {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error("The museum could not be reached. Please try again.");
  return (await response.json()).data;
}
export const api = {
  buildings: () =>
    demo ? Promise.resolve(demoBuildings) : get<Building[]>("/api/buildings"),
  building: (id: string) =>
    demo
      ? Promise.resolve(demoBuildings.find((building) => building.id === id) || null)
      : get<Building>(`/api/buildings/${id}`),
  annotations: (id: string) =>
    demo
      ? Promise.resolve(demoAnnotations.map((annotation) => ({ ...annotation, buildingId: id })))
      : get<Annotation[]>(`/api/buildings/${id}/annotations`),
};
