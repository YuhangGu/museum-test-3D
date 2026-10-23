<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { Building, Annotation } from "@museum/shared";
import { api } from "../services/api";
import ModelViewer from "../components/viewer/ModelViewer.vue";
import BottomSheet from "../components/shared/BottomSheet.vue";
const props = defineProps<{ buildingId: string }>();
const emit = defineEmits<{ back: [] }>();
const building = ref<Building | null>(null),
  annotations = ref<Annotation[]>([]),
  error = ref(""),
  annotationError = ref(""),
  compare = ref(false),
  info = ref(false),
  active = ref<Annotation | null>(null);
const viewer = ref<InstanceType<typeof ModelViewer>>();
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
<div class="viewer-badge">
        <i />
        {{
          compare
            ? "TWO MOMENTS, ONE PERSPECTIVE"
            : "EXPLORE IN THREE DIMENSIONS"
        }}
      </div>
      <ModelViewer
        ref="viewer"
        :building="building"
        :annotations="annotations"
        :compare="compare"
        @annotation="active = $event"
      />
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
        <div class="comparison-control">
          <div>
            <span class="eyebrow">THROUGH TIME</span>
            <h2>See another chapter.</h2>
          </div>
          <button
            class="toggle"
            role="switch"
            :aria-checked="compare"
            aria-label="Historical comparison"
            :disabled="!building.historicalModel"
            @click="compare = !compare"
          >
            <span />
          </button>
        </div>
        <p class="demo-note">
          {{
            building.historicalModel
              ? "1800 reconstruction · Illustrative demonstration only"
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
        Fictional building in Salzburg. Both models are original procedural
        examples. The historical version illustrates comparison functionality
        and is not an accurate reconstruction.
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
