<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import type { Building, Annotation } from "@museum/shared";
import { api } from "../services/api";
import ModelViewer from "../components/viewer/ModelViewer.vue";
import BottomSheet from "../components/shared/BottomSheet.vue";
type FarmRoom = {
  id: string;
  name: string;
  shortName: string;
  level: string;
  description: string;
  purpose: string;
  point: { x: number; y: number; z: number };
  bounds: { min: [number, number, number]; max: [number, number, number] };
};
const props = defineProps<{ buildingId: string }>();
const emit = defineEmits<{ back: [] }>();
const building = ref<Building | null>(null),
  modelBounds = ref<{
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  } | null>(null),
  annotations = ref<Annotation[]>([]),
  error = ref(""),
  annotationError = ref(""),
  compare = ref(false),
  sectionEnabled = ref(false),
  sectionAxis = ref<"front" | "top">("front"),
  section = ref(0),
  roomListOpen = ref(false),
  selectedRoom = ref(""),
  currentRoom = ref<FarmRoom | null>(null),
  roomInfoOpen = ref(false),
  info = ref(false),
  active = ref<Annotation | null>(null);
const viewer = ref<InstanceType<typeof ModelViewer>>();
const farmRooms: FarmRoom[] = [
  { id: "hayloft", name: "Hay and seasonal storage", shortName: "Hayloft", level: "TOP", description: "The open loft sits beneath the steep roof, above the living floor. Stored hay is shown beside the small sleeping nook.", purpose: "Dry and store hay, tools, and supplies for the changing seasons.", point: { x: -0.9, y: 5.12, z: -0.52 }, bounds: { min: [-1.78, 4.68, -1.53], max: [0.25, 6.15, 0.42] } },
  { id: "sleeping", name: "Loft sleeping nook", shortName: "Sleep nook", level: "TOP", description: "A modest sleeping space shares the upper loft with stored farm goods.", purpose: "Resting place for household members or seasonal farm workers.", point: { x: 1.12, y: 5.0, z: 0.16 }, bounds: { min: [0.42, 4.68, -0.55], max: [1.80, 5.86, 1.20] } },
  { id: "parlour", name: "Farmhouse parlour", shortName: "Parlour", level: "SECOND", description: "The main family room occupies the warmer timber level above the stable.", purpose: "Gathering, eating, and everyday domestic life.", point: { x: -1.15, y: 3.35, z: 0.1 }, bounds: { min: [-1.82, 2.48, -1.47], max: [-0.20, 4.40, 1.45] } },
  { id: "hearth", name: "Kitchen & hearth", shortName: "Kitchen", level: "SECOND", description: "A masonry hearth and work area form the practical heart of the house.", purpose: "Prepare meals and provide heat through the Alpine winter.", point: { x: 1.15, y: 3.1, z: -0.95 }, bounds: { min: [0.20, 2.48, -1.55], max: [1.80, 4.40, 0.38] } },
  { id: "stable", name: "Stable & manger", shortName: "Stable", level: "GROUND", description: "The ground floor stable includes timber stalls, a manger, and a direct farmyard entrance.", purpose: "Shelter cattle and keep feed close at hand.", point: { x: -1.2, y: 1.12, z: -0.55 }, bounds: { min: [-1.75, 0.38, -1.58], max: [-0.25, 2.25, 0.42] } },
  { id: "store", name: "Provisions store", shortName: "Store", level: "GROUND", description: "A separate ground-floor bay contains bins, barrels, and provisions.", purpose: "Keep grain, tools, and preserved food apart from the stable.", point: { x: 1.15, y: 0.95, z: -0.5 }, bounds: { min: [0.30, 0.38, -1.52], max: [1.78, 2.24, 0.95] } },
];
// The mosque entrance portal is on the model's +Z edge; cut from that front.
const frontAxis: "x" | "z" = "z";
const rooms = computed<FarmRoom[]>(() => {
  const bounds = modelBounds.value;
  if (!bounds || props.buildingId === "20000000-0000-4000-8000-000000000001")
    return farmRooms;
  const min = bounds.min;
  const max = bounds.max;
  const span = {
    x: Math.max(0.001, max.x - min.x),
    y: Math.max(0.001, max.y - min.y),
    z: Math.max(0.001, max.z - min.z),
  };
  const makeRoom = (
    index: number,
    label: string,
    xRatio: number,
    yRatio: number,
    zRatio: number,
    size: { x: number; y: number; z: number },
  ): FarmRoom => {
    const point = {
      x: min.x + span.x * xRatio,
      y: min.y + span.y * yRatio,
      z: min.z + span.z * zRatio,
    };
    return {
      id: `room-${String(index).padStart(2, "0")}`,
      name: label,
      shortName: label,
      level: props.buildingId.endsWith("0003")
        ? "INTERIOR"
        : yRatio > 0.5
          ? "UPPER"
          : "GROUND",
      description: "This interior space has no name in the model data.",
      purpose: "Room function is not identified in the supplied model.",
      point,
      bounds: {
        min: [
          Math.max(min.x, point.x - span.x * size.x),
          Math.max(min.y, point.y - span.y * size.y),
          Math.max(min.z, point.z - span.z * size.z),
        ],
        max: [
          Math.min(max.x, point.x + span.x * size.x),
          Math.min(max.y, point.y + span.y * size.y),
          Math.min(max.z, point.z + span.z * size.z),
        ],
      },
    };
  };
  if (props.buildingId.endsWith("0003")) {
    return [makeRoom(1, "Room 01", 0.5, 0.36, 0.5, { x: 0.46, y: 0.28, z: 0.43 })];
  }
  const positions = [
    [0.3, 0.67, 0.72],
    [0.7, 0.67, 0.72],
    [0.5, 0.67, 0.3],
    [0.3, 0.47, 0.72],
    [0.7, 0.47, 0.72],
    [0.5, 0.47, 0.3],
  ];
  return positions.map(([x, y, z], index) =>
    makeRoom(index + 1, `Room ${String(index + 1).padStart(2, "0")}`, x, y, z, {
      x: 0.18,
      y: 0.1,
      z: 0.17,
    }),
  );
});
function sliderAt(axis: "x" | "y" | "z", threshold: number) {
  const bounds = modelBounds.value;
  if (!bounds) return 0;
  const min = bounds.min[axis];
  const max = bounds.max[axis];
  return Math.max(0, Math.min(100, ((max - threshold) / (max - min)) * 100));
}
function toggleSection() {
  sectionEnabled.value = !sectionEnabled.value;
  if (sectionEnabled.value) compare.value = false;
  else {
    section.value = 0;
    roomListOpen.value = false;
    selectedRoom.value = "";
    currentRoom.value = null;
    roomInfoOpen.value = false;
  }
}
function selectRoom(room: FarmRoom) {
  if (!sectionEnabled.value) return;
  if (sectionAxis.value === "front") {
    section.value = sliderAt(frontAxis, room.point[frontAxis]);
  } else {
    section.value = sliderAt("y", room.bounds.max[1]);
  }
  selectedRoom.value = room.id;
  currentRoom.value = room;
  roomInfoOpen.value = false;
  viewer.value?.reset();
  viewer.value?.highlightRoom(room.bounds);
  roomListOpen.value = false;
}
function toggleCompare() {
  compare.value = !compare.value;
  if (compare.value) {
    sectionEnabled.value = false;
    section.value = 0;
    roomListOpen.value = false;
    selectedRoom.value = "";
    currentRoom.value = null;
    roomInfoOpen.value = false;
  }
}
async function load() {
  error.value = "";
  try {
    building.value = await api.building(props.buildingId);
    try {
      annotations.value = await api.annotations(props.buildingId);
    } catch {
      annotationError.value =
        "Architectural notes are temporarily unavailable.";
    }
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
</script>
<template>
  <main class="viewer-screen">
    <header class="viewer-header">
      <button
        class="icon-button"
        aria-label="Back to map"
        @click="emit('back')"
      >
        ←
      </button>
      <div>
        <span class="eyebrow">THE 3D COLLECTION</span>
        <h1>{{ building?.name || "Opening building…" }}</h1>
      </div>
      <button
        class="icon-button"
        aria-label="Building information"
        @click="info = true"
      >
        i
      </button>
    </header>
    <template v-if="building"
      >
        <div v-if="compare" class="viewer-badge">
        <i />
        TWO MOMENTS, ONE PERSPECTIVE
        </div>
      <div class="viewer-stage-wrap">
        <div v-if="currentRoom" class="room-current-card">
          <button
            class="room-current-prompt"
            type="button"
            :aria-expanded="roomInfoOpen"
            @click="roomInfoOpen = !roomInfoOpen"
          >
            <span>CURRENT ROOM</span><strong>{{ currentRoom.name }}</strong>
            <i :class="{ expanded: roomInfoOpen }">⌄</i>
          </button>
          <Transition name="room-curtain">
            <section v-if="roomInfoOpen" class="room-info-curtain">
              <span class="room-info-level">{{ currentRoom.level }} FLOOR</span>
              <p>{{ currentRoom.description }}</p>
              <div class="room-info-purpose">
                <span>FUNCTION</span>
                <p>{{ currentRoom.purpose }}</p>
              </div>
            </section>
          </Transition>
        </div>
        <ModelViewer
          ref="viewer"
          :building="building"
          :annotations="annotations"
          :compare="compare"
          :section="sectionEnabled ? section : 0"
          :section-axis="sectionAxis"
          :front-axis="frontAxis"
          @model-bounds="modelBounds = $event"
          @annotation="active = $event"
        />
        <div v-if="sectionEnabled" class="section-control section-control-overlay">
          <div class="section-slider-row">
            <input
              v-model.number="section"
              class="section-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              :aria-label="sectionAxis === 'front' ? 'Reveal the building interior from the front' : 'Reveal the building interior from the top down'"
              :aria-valuetext="sectionAxis === 'front' ? `${section}% interior revealed from the entrance` : `${section}% revealed from the roof toward the ground floor`"
            />
            <button
              class="section-axis-switch"
              type="button"
              role="switch"
              :aria-checked="sectionAxis === 'top'"
              :aria-label="sectionAxis === 'front' ? 'Switch to top-down section' : 'Switch to front-to-interior section'"
              @click="sectionAxis = sectionAxis === 'front' ? 'top' : 'front'"
            >
              <span class="section-axis-track"><i /></span>
              <span>{{ sectionAxis === "front" ? "TOP" : "FRONT" }}</span>
            </button>
          </div>
          <div class="section-control-footer">
            <div class="section-labels">
              <span>{{ sectionAxis === "front" ? "FRONT" : "TOP" }}</span>
              <span>{{ sectionAxis === "front" ? "INSIDE" : "GROUND" }}</span>
            </div>
          </div>
        </div>
        <div
          v-if="sectionEnabled"
          class="room-drawer"
          :class="{ 'is-open': roomListOpen }"
        >
          <section
            class="room-list-panel"
            aria-label="Model rooms"
            :aria-hidden="!roomListOpen"
            :inert="!roomListOpen"
          >
            <header>
              <span class="eyebrow">ROOMS</span>
            </header>
            <button
              v-for="room in rooms"
              :key="room.id"
              class="room-list-item"
              :class="{ selected: selectedRoom === room.id }"
              type="button"
              :title="room.name"
              :aria-label="`${room.level}: ${room.name}`"
              @click="selectRoom(room)"
            >
              <span class="room-list-level">{{ room.level }}</span>
              <span class="room-list-name">{{ room.shortName }}</span>
            </button>
          </section>
          <button
            class="room-drawer-handle"
            type="button"
            :aria-expanded="roomListOpen"
            :aria-label="roomListOpen ? 'Hide room list' : 'Show room list'"
            @click="roomListOpen = !roomListOpen"
          >
            <span>ROOMS</span>
            <span class="room-drawer-arrow">{{ roomListOpen ? "‹" : "›" }}</span>
          </button>
        </div>
      </div>
      <div class="viewer-tools">
        <button
          class="icon-button"
          aria-label="Reset camera"
          title="Reset camera"
          @click="viewer?.reset()"
        >
          ⟲
        </button>
      </div>
      <footer class="viewer-footer">
        <p class="gesture-hint">
          Drag to rotate <span>·</span> Pinch to zoom <span>·</span> Two fingers
          to pan
        </p>
        <div class="viewer-modes">
          <div class="viewer-mode">
            <div class="viewer-mode-heading">
              <span class="eyebrow">INSIDE THE BUILDING</span>
              <button
                class="toggle mode-toggle"
                role="switch"
                :aria-checked="sectionEnabled"
                aria-label="Explore the building interior"
                @click="toggleSection"
              >
                <span />
              </button>
            </div>
          </div>
          <div class="viewer-mode">
            <div class="viewer-mode-heading">
              <span class="eyebrow">SEE ANOTHER CHAPTER</span>
              <button
                class="toggle mode-toggle"
                role="switch"
                :aria-checked="compare"
                aria-label="Historical comparison"
                :disabled="!building.historicalModel"
                @click="toggleCompare"
              >
                <span />
              </button>
            </div>
          </div>
        </div>
        <p class="demo-note">
          {{
            building.historicalModel
            ? "Shared 1800 model · Illustrative comparison only"
              : "Historical comparison is not available for this building."
          }}
        </p>
        <p v-if="annotationError" class="demo-note">{{ annotationError }}</p>
      </footer>
</template
    >
    <div v-if="error" class="viewer-error">
      <p>{{ error }}</p>
      <button class="primary-button" @click="load">Try again</button>
    </div>
    <BottomSheet
      v-if="info && building"
      :title="building.name"
      @close="info = false"
      >
<p>{{ building.description }}</p>
        <p>
        <template v-if="buildingId === '20000000-0000-4000-8000-000000000001'">
          This is an interpretive Salzburg-region farmhouse model. Its 1800
          comparison is illustrative and is not a measured reconstruction.
        </template>
        <template v-else-if="buildingId === '20000000-0000-4000-8000-000000000002'">
          The supplied house model includes an unfurnished interior layout. Its
          source does not provide a real-world location or named rooms.
        </template>
        <template v-else>
          Devonaboy Jome Masjidi is in Andijan, Uzbekistan. The model file does
          not provide room names or survey metadata.
        </template>
      </p>
      <span class="eyebrow">ARCHITECTURAL FEATURES</span
      ><button
        v-for="a in annotations"
        :key="a.id"
        class="list-building"
        @click="
          info = false;
          active = a;
        "
      >
        {{ a.title }} <span>↗</span>
      </button>
</BottomSheet
    ><BottomSheet v-if="active" :title="active.title" @close="active = null"
      >
<span class="small-label">{{ active.historicalPeriod }}</span>
      <p>{{ active.description }}</p>
      <img
        v-if="active.imageUrl"
        :src="active.imageUrl"
        :alt="active.title"
        class="annotation-image"
      />
      <p v-if="active.sourceReference" class="source-note">
        Source: {{ active.sourceReference }}
      </p>
</BottomSheet
    >
  </main>
</template>
