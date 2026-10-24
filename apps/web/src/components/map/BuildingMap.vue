<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from "vue";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
import type { Building } from "@museum/shared";
const props = defineProps<{ buildings: Building[]; selected: string | null }>();
const emit = defineEmits<{ select: [id: string] }>();
const container = ref<HTMLDivElement>();
const failure = ref(false);
let map: maplibregl.Map | undefined;
const markers: maplibregl.Marker[] = [];
onMounted(() => {
  try {
    map = new maplibregl.Map({
      container: container.value!,
      center: [12.95267, 47.74991],
      zoom: 15.2,
      minZoom: 13,
      maxZoom: 18,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
          },
        },
        layers: [
          {
            id: "openstreetmap",
            type: "raster",
            source: "osm",
          },
        ],
      },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: false }),
      "bottom-right",
    );
    map.on("error", () => {
      failure.value = true;
    });
    for (const [i, b] of props.buildings.entries()) {
      const el = document.createElement("button");
      el.className = "map-marker";
      el.setAttribute("aria-label", `Select ${b.name}`);
      el.innerHTML = `<span>⌂</span><small>0${i + 1}</small>`;
      el.onclick = () => emit("select", b.id);
      markers.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([b.longitude, b.latitude])
          .addTo(map),
      );
    }
    update();
    map.once("load", () => fitCollection(0));
  } catch {
    failure.value = true;
  }
});
function update() {
  markers.forEach((m, i) => {
    m.getElement().classList.toggle(
      "selected",
      props.buildings[i]?.id === props.selected,
    );
    m.getElement().setAttribute(
      "aria-pressed",
      String(props.buildings[i]?.id === props.selected),
    );
  });
}
watch(
  () => props.selected,
  () => {
    update();
  },
);
function focusBuilding(id: string) {
  const building = props.buildings.find((item) => item.id === id);
  if (building)
    map?.easeTo({
      center: [building.longitude, building.latitude],
      offset: [0, -100],
      duration: 600,
    });
}
function fitCollection(duration = 600) {
  if (!map || !container.value || !props.buildings.length) return;
  const localCollection = props.buildings.filter(
    (building) =>
      Math.abs(building.longitude - 12.95267) < 1 &&
      Math.abs(building.latitude - 47.74991) < 1,
  );
  const visibleBuildings = localCollection.length
    ? localCollection
    : props.buildings;
  const bounds = new maplibregl.LngLatBounds();
  visibleBuildings.forEach((b) => bounds.extend([b.longitude, b.latitude]));
  const { width, height } = container.value.getBoundingClientRect();
  map.fitBounds(bounds, {
    padding:
      width < 700
        ? {
            top: Math.min(330, height * 0.4),
            bottom: Math.min(285, height * 0.34),
            left: 50,
            right: 50,
          }
        : { top: 140, bottom: 120, left: 440, right: 100 },
    maxZoom: 15,
    duration,
  });
}
function reset() {
  fitCollection();
}
defineExpose({ reset, focusBuilding });
onUnmounted(() => {
  markers.forEach((m) => m.remove());
  map?.remove();
});
</script>
<template>
  <div
    ref="container"
    class="map-canvas"
    aria-label="OpenStreetMap collection view. Building markers are displayed around Salzburg."
  />
  <p v-if="failure" class="map-warning">
    Map unavailable. Open the BUILDINGS drawer on the left to choose a model.
  </p>
</template>
