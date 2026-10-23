<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent } from "vue";
import MapView from "./views/MapView.vue";
const BuildingView = defineAsyncComponent(
  () => import("./views/BuildingView.vue"),
);
const selected = ref<string | null>(null);
function sync() {
  selected.value = new URLSearchParams(location.hash.slice(1)).get("building");
}
function open(id: string) {
  location.hash = `building=${id}`;
}
function back() {
  location.hash = "";
}
onMounted(() => {
  sync();
  window.addEventListener("hashchange", sync);
});
onUnmounted(() => window.removeEventListener("hashchange", sync));
</script>
<template>
  <BuildingView
    v-if="selected"
    :key="selected"
    :building-id="selected"
    @back="back"
  /><MapView v-else @open="open" />
</template>
