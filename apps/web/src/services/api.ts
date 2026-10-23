import type { Building, Annotation } from "@museum/shared";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export function assetUrl(url: string) {
  return /^https?:\/\//.test(url) ? url : base + url;
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
  buildings: () => get<Building[]>("/api/buildings"),
  building: (id: string) => get<Building>(`/api/buildings/${id}`),
  annotations: (id: string) =>
    get<Annotation[]>(`/api/buildings/${id}/annotations`),
};
