import type { Building, Annotation } from "@museum/shared";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const demo = import.meta.env.VITE_DEMO_MODE === "true";

const demoBuildings: Building[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Salzburg Alpine Farmhouse",
    description:
      "An interpretive Salzburg-region farmhouse model with a stable and store on the ground floor, living spaces above, and a hayloft under the roof. The design is illustrative, not a measured reconstruction of a specific historic house.",
    longitude: 12.95267,
    latitude: 47.74991,
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
    name: "Realistic House (With Interior Structure)",
    description:
      "A fully modeled house with a complete, unfurnished interior layout. Room divisions, walls, doors, and flooring show the spatial plan and proportions. The source model does not specify a real-world location.",
    longitude: 12.9531,
    latitude: 47.7503,
    thumbnailUrl: null,
    currentModel: {
      id: "10000000-0000-4000-8000-000000000003",
      url: "models/realistic-house-with-interior.glb",
    },
    historicalModel: {
      id: "10000000-0000-4000-8000-000000000002",
      url: "models/sample-building-historical.glb",
    },
    historicalYear: 1800,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    name: "Devonaboy Jome Masjidi",
    description:
      "A 3D model of the real Devonaboy Jome Masjidi in Andijan, Uzbekistan. It is located at Mustaqillik Street 14 (40.788741° N, 72.340649° E). The supplied model does not include room names or survey metadata.",
    longitude: 12.9519,
    latitude: 47.7504,
    thumbnailUrl: null,
    currentModel: {
      id: "10000000-0000-4000-8000-000000000004",
      url: "models/devonaboy_web.glb",
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
    title: "Hay and seasonal storage",
    description:
      "The upper loft stores hay and farm supplies, with a smaller sleeping space beneath the steep timber roof. The room arrangement is an original interpretation.",
    x: -0.9,
    y: 5.1,
    z: 0.4,
    historicalPeriod: "Illustrative present-day model",
    imageUrl: null,
    sourceReference: "Original procedural demonstration; not a historical source.",
  },
  {
    id: "feature-1",
    buildingId: demoBuildings[0].id,
    title: "Stable and provisions store",
    description:
      "The ground floor is divided between animal stalls and a separate provisions bay, with broad timber doors opening to the farmyard.",
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
    title: "Living floor and timber balcony",
    description:
      "The warmer plastered living level sits above the stable, with a deep wooden balcony and window boxes typical of Alpine farmhouses.",
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
      ? Promise.resolve(
          id === demoBuildings[0].id
            ? demoAnnotations.map((annotation) => ({ ...annotation, buildingId: id }))
            : [],
        )
      : get<Annotation[]>(`/api/buildings/${id}/annotations`),
};
