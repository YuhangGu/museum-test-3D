<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import type { Building } from "@museum/shared";
import { api } from "../services/api";
import BuildingMap from "../components/map/BuildingMap.vue";
import BrandHeader from "../components/shared/BrandHeader.vue";
import BottomSheet from "../components/shared/BottomSheet.vue";
const emit = defineEmits<{ open: [id: string] }>();
const buildings = ref<Building[]>([]),
  selected = ref<string | null>(null),
  error = ref(""),
  loading = ref(true),
  buildingListOpen = ref(false),
  about = ref(false);
const map = ref<InstanceType<typeof BuildingMap>>();
const building = computed(() =>
  buildings.value.find((b) => b.id === selected.value),
);
function locationLabel(item: Building) {
  if (item.id === "20000000-0000-4000-8000-000000000002")
    return "LOCATION NOT SPECIFIED · REFERENCE MODEL";
  if (item.id === "20000000-0000-4000-8000-000000000003")
    return "SALZBURG · COLLECTION DISPLAY";
  return "SALZBURG REGION · CONCEPT MODEL";
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    buildings.value = await api.buildings();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
function select(id: string) {
  selected.value = id;
  buildingListOpen.value = false;
  map.value?.focusBuilding(id);
}
onMounted(load);
</script>
<template>
  <main class="map-screen">
    <BuildingMap
      v-if="buildings.length"
      ref="map"
      :buildings="buildings"
      :selected="selected"
      @select="select"
    /><BrandHeader />
    <div class="map-intro">
      <span class="eyebrow">THE OPEN-AIR COLLECTION</span>
    </div>
    <aside
      class="map-building-drawer"
      :class="{ 'is-open': buildingListOpen }"
      aria-label="Building list"
    >
      <div class="map-building-panel" :inert="!buildingListOpen">
        <header><span class="eyebrow">BUILDINGS</span></header>
        <button
          v-for="(item, index) in buildings"
          :key="item.id"
          class="map-building-item"
          :class="{ selected: item.id === selected }"
          :aria-pressed="item.id === selected"
          @click="select(item.id)"
        >
          <span class="map-building-number">0{{ index + 1 }}</span>
          <span class="map-building-name">{{ item.name }}</span>
        </button>
      </div>
      <button
        class="map-building-handle"
        :aria-expanded="buildingListOpen"
        aria-label="Toggle building list"
        @click="buildingListOpen = !buildingListOpen"
      >
        <span>BUILDINGS</span
        ><span class="room-drawer-arrow">{{
          buildingListOpen ? "‹" : "›"
        }}</span>
      </button>
    </aside>
    <button
      class="map-about icon-button"
      aria-label="About this demonstration"
      @click="about = true"
    >
      i
    </button>
    <button
      class="locate-button icon-button"
      aria-label="Reset map view"
      @click="map?.reset()"
    >
      ⌖
    </button>
    <div class="map-caption">
      {{
        building
          ? locationLabel(building)
          : "Salzburger Freilichtmuseum · Großgmain"
      }}
    </div>
    <div v-if="loading || error" class="map-status">
      <p>{{ error || "Opening the collection…" }}</p>
      <button v-if="error" class="primary-button" @click="load">
        Try again
      </button>
    </div>
    <section v-if="building" class="building-card">
      <div class="handle" />
      <div class="card-heading">
        <span class="eyebrow"
          >THE COLLECTION / 0{{ buildings.indexOf(building) + 1 }}</span
        ><button
          class="icon-button"
          aria-label="Close building details"
          @click="selected = null"
        >
          ×
        </button>
      </div>
      <div class="card-body">
        <img
          v-if="building.thumbnailUrl"
          :src="building.thumbnailUrl"
          :alt="building.name"
          class="building-thumbnail"
        />
        <div v-else class="mini-building" aria-hidden="true">⌂</div>
        <div>
          <h2>{{ building.name }}</h2>
          <span class="small-label">{{ locationLabel(building) }}</span>
        </div>
      </div>
      <p>{{ building.description }}</p>
      <button class="primary-button" @click="emit('open', building.id)">
        <span>View in 3D</span><span>↗</span>
      </button>
      <p class="card-footnote">An interactive model. A new perspective.</p>
    </section>
    <section v-else class="explore-card">
      <div class="handle" />
      <button class="text-button" @click="buildingListOpen = true">
        Browse buildings
        <span>{{ String(buildings.length).padStart(2, "0") }} &nbsp; ↗</span>
      </button>
    </section>
    <BottomSheet
      v-if="about"
      title="A museum without walls"
      @close="about = false"
    >
      <p>
        Layers is an architectural model collection: a Salzburg-region farmhouse
        interpretation, an unfurnished house with a detailed interior layout,
        and a model of the Devonaboy Jome Masjidi.
      </p>
      <p>
        The 1800 comparison belongs only to the farmhouse interpretation and is
        illustrative, not a measured reconstruction. The house model has no
        supplied real-world location; its map marker is a collection browsing
        point only. All three markers are displayed around Salzburg; the mosque
        marker stays at its original demonstration coordinate. Selecting a
        building from the side drawer moves the map to its marker. OpenStreetMap
        provides geographic context and is not intended for navigation.
      </p>
    </BottomSheet>
  </main>
</template>
