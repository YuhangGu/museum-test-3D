export interface ModelAsset {
  id: string;
  url: string;
}
export interface Building {
  id: string;
  name: string;
  description: string;
  longitude: number;
  latitude: number;
  thumbnailUrl: string | null;
  currentModel: ModelAsset | null;
  historicalModel: ModelAsset | null;
  historicalYear: number | null;
}
export interface Annotation {
  id: string;
  buildingId: string;
  title: string;
  description: string;
  x: number;
  y: number;
  z: number;
  historicalPeriod: string | null;
  imageUrl: string | null;
  sourceReference: string | null;
}
