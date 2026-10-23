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
      center: [13.045, 47.801],
      zoom: 14.7,
      minZoom: 12,
      maxZoom: 18,
      attributionControl: false,
      style: {
        version: 8,
        sources: { land: { type: "geojson", data: "/schematic-map.geojson" } },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#e9e8de" },
          },
          {
            id: "parks",
            type: "fill",
            source: "land",
            filter: ["==", "kind", "park"],
            paint: { "fill-color": "#d4ddc5" },
          },
          {
            id: "blocks",
            type: "fill",
            source: "land",
            filter: ["==", "kind", "block"],
            paint: { "fill-color": "#dbd8cc", "fill-outline-color": "#d1cdbf" },
          },
          {
            id: "river",
            type: "line",
            source: "land",
            filter: ["==", "kind", "river"],
            paint: { "line-color": "#a9c9c7", "line-width": 70 },
          },
          {
            id: "streets",
            type: "line",
            source: "land",
            filter: ["==", "kind", "street"],
            paint: { "line-color": "#f6f3e9", "line-width": 7 },
          },
          {
            id: "bridges",
            type: "line",
            source: "land",
            filter: ["==", "kind", "bridge"],
            paint: { "line-color": "#f6f3e9", "line-width": 10 },
          },
        ],
      },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
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
    const b = props.buildings.find((b) => b.id === props.selected);
    if (b)
      map?.easeTo({
        center: [b.longitude, b.latitude],
        offset: [0, -100],
        duration: 600,
      });
  },
);
function fitCollection(duration = 600) {
  if (!map || !container.value || !props.buildings.length) return;
  const bounds = new maplibregl.LngLatBounds();
  props.buildings.forEach(b => bounds.extend([b.longitude,b.latitude]));
  const {width,height} = container.value.getBoundingClientRect();
  map.fitBounds(bounds, {padding: width < 700
    ? {top: Math.min(330,height*.4),bottom: Math.min(285,height*.34),left:50,right:50}
    : {top:140,bottom:120,left:440,right:100},maxZoom:15,duration});
}
function reset() { fitCollection(); }
defineExpose({ reset });
onUnmounted(() => {
  markers.forEach((m) => m.remove());
  map?.remove();
});
</script>
<template>
  <div
    ref="container"
    class="map-canvas"
    aria-label="Map of three fictional buildings around Salzburg"
  />
  <div class="map-place city-label">SALZBURG</div>
  <div class="map-place river-label">S A L Z A C H</div>
  <p v-if="failure" class="map-warning">
    Map unavailable. Choose a building from the list below.
  </p>
</template>
