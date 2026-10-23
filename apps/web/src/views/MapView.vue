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
  showList = ref(false),
  about = ref(false);
const map = ref<InstanceType<typeof BuildingMap>>();
const building = computed(() =>
  buildings.value.find((b) => b.id === selected.value),
);
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
  showList.value = false;
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
      <h1>Every building<br />has another story.</h1>
      <p>Discover the layers of a city.</p>
      <span class="collection-pill"
        ><i /> {{ buildings.length }} buildings to explore</span
      >
    </div>
    <button
      class="map-about icon-button"
      aria-label="About this demonstration"
      @click="about = true"
    >
      i
</button
    ><button
      class="locate-button icon-button"
      aria-label="Reset map view"
      @click="map?.reset()"
    >
      ⌖
    </button>
    <div class="map-caption">Salzburg, Austria · Schematic map</div>
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
          <span class="small-label">SALZBURG · FICTIONAL BUILDING</span>
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
      <div class="explore-heading">
        <div>
          <span class="eyebrow">LOOK CLOSER</span>
          <h2>Your journey starts here.</h2>
        </div>
        <span class="compass-art">✳</span>
      </div>
      <p>Tap a building on the map to step into its story.</p>
      <button class="text-button" @click="showList = true">
        Explore the collection
        <span>{{ String(buildings.length).padStart(2, "0") }} &nbsp; ↗</span>
      </button>
    </section>
    <BottomSheet
      v-if="showList"
      title="The collection"
      @close="showList = false"
      >
<p>Three fictional places. One shared demonstration model.</p>
      <button
        v-for="(b, i) in buildings"
        :key="b.id"
        class="list-building"
        @click="select(b.id)"
      >
        <span class="list-number">0{{ i + 1 }}</span
        ><span>{{ b.name }}</span
        ><span>↗</span>
      </button>
</BottomSheet
    >
    <BottomSheet
      v-if="about"
      title="A museum without walls"
      @close="about = false"
      >
<p>
        Layers is an architectural heritage prototype. All three buildings are
        fictional and share one original, procedurally generated model.
      </p>
      <p>
        The 1800 comparison is an invented demonstration, not a historically
        accurate reconstruction. Locations are around central Salzburg; the
        locally stored map is schematic and is not for navigation.
      </p>
</BottomSheet
    >
  </main>
</template>
