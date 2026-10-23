<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Building, Annotation } from "@museum/shared";
import { assetUrl } from "../../services/api";
const props = defineProps<{
  building: Building;
  annotations: Annotation[];
  compare: boolean;
}>();
const emit = defineEmits<{ annotation: [a: Annotation] }>();
const host = ref<HTMLDivElement>(),
  loading = ref(true),
  error = ref(""),
  historyError = ref(""),
  historyLoading = ref(false),
  split = ref(50),
  points = ref<
    { annotation: Annotation; x: number; y: number; visible: boolean }[]
  >([]);
let renderer: THREE.WebGLRenderer | undefined,
  controls: OrbitControls | undefined,
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  historical: THREE.Scene,
  currentRoot: THREE.Object3D | undefined,
  historyRoot: THREE.Object3D | undefined,
  observer: ResizeObserver,
  frame = 0,
  disposed = false,
  historyRequested = false;
const home = new THREE.Vector3(),
  target = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    }
  });
}
function makeScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color("#eae8df");
  s.add(new THREE.HemisphereLight(0xffffff, 0x746c5c, 2.4));
  const sun = new THREE.DirectionalLight(0xfff5df, 3.2);
  sun.position.set(5, 10, 7);
  s.add(sun);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.6, 96),
    new THREE.MeshStandardMaterial({ color: 0xd9d6c8, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  s.add(floor);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(5.7, 5.715, 96),
    new THREE.MeshBasicMaterial({ color: 0xc4c1b2, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.015;
  s.add(ring);
  return s;
}
function reset() {
  if (!controls || !camera) return;
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  camera.position.copy(home);
  controls.target.copy(target);
  controls.update();
  controls.enableDamping = damping;
}
defineExpose({ reset });
async function loadHistory() {
  if (historyRequested || !props.building.historicalModel) return;
  historyRequested = true;
  historyLoading.value = true;
  try {
    const gltf = await new GLTFLoader().loadAsync(
      assetUrl(props.building.historicalModel.url),
    );
    if (disposed) {
      disposeObject(gltf.scene);
      return;
    }
    historyRoot = gltf.scene;
    historical.add(historyRoot);
  } catch {
    historyError.value = "Historical model could not be loaded.";
    historyRequested = false;
  } finally {
    historyLoading.value = false;
  }
}
watch(
  () => props.compare,
  (value) => {
    if (value && renderer) void loadHistory();
  },
);
function resize() {
  if (!host.value || !renderer) return;
  const { width, height } = host.value.getBoundingClientRect();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function render() {
  if (disposed || !renderer) return;
  frame = requestAnimationFrame(render);
  controls?.update();
  const w = host.value!.clientWidth,
    h = host.value!.clientHeight;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, w, h);
  renderer.render(scene, camera);
  if (props.compare && historyRoot) {
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, Math.round((w * split.value) / 100), h);
    renderer.render(historical, camera);
    renderer.setScissorTest(false);
  }
  camera.updateMatrixWorld();
  points.value = props.annotations.map((a) => {
    const p = new THREE.Vector3(a.x, a.y, a.z);
    const distance = camera.position.distanceTo(p);
    raycaster.set(camera.position, p.clone().sub(camera.position).normalize());
    const hit = currentRoot
      ? raycaster.intersectObject(currentRoot, true)[0]
      : undefined;
    p.project(camera);
    return {
      annotation: a,
      x: (p.x * 0.5 + 0.5) * w,
      y: (-0.5 * p.y + 0.5) * h,
      visible:
        !props.compare &&
        p.z > -1 &&
        p.z < 1 &&
        Math.abs(p.x) < 1 &&
        Math.abs(p.y) < 1 &&
        (!hit || hit.distance >= distance - 0.2),
    };
  });
}
onMounted(async () => {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.value!.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
    scene = makeScene();
    historical = makeScene();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 2;
    controls.maxDistance = 35;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    observer = new ResizeObserver(resize);
    observer.observe(host.value!);
    resize();
    if (!props.building.currentModel)
      throw new Error("No 3D model is available for this building.");
    const gltf = await new GLTFLoader().loadAsync(
      assetUrl(props.building.currentModel.url),
    );
    if (disposed) {
      disposeObject(gltf.scene);
      return;
    }
    currentRoot = gltf.scene;
    scene.add(currentRoot);
    const box = new THREE.Box3().setFromObject(currentRoot);
    if (box.isEmpty())
      throw new Error("The model contains no visible geometry.");
    box.getCenter(target);
    const size = box.getSize(new THREE.Vector3());
    const radius = size.length() / 2;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.12;
    home
      .copy(target)
      .add(
        new THREE.Vector3(1, 0.52, 1.6).normalize().multiplyScalar(distance),
      );
    camera.near = Math.max(0.01, radius / 1000);
    camera.far = Math.max(100, radius * 100);
    camera.updateProjectionMatrix();
    controls.minDistance = radius * 0.5;
    controls.maxDistance = distance * 3;
    reset();
    loading.value = false;
    render();
    if (props.compare) void loadHistory();
  } catch (e) {
    loading.value = false;
    error.value =
      e instanceof Error ? e.message : "The 3D viewer could not start.";
  }
});
function onContextLost(event: Event) {
  event.preventDefault();
  error.value =
    "The graphics session was interrupted. Reload the viewer to continue.";
  cancelAnimationFrame(frame);
}
onUnmounted(() => {
  disposed = true;
  cancelAnimationFrame(frame);
  observer?.disconnect();
  controls?.dispose();
  if (scene) disposeObject(scene);
  if (historical) disposeObject(historical);
  renderer?.domElement.removeEventListener("webglcontextlost", onContextLost);
  renderer?.dispose();
  renderer?.domElement.remove();
});
</script>
<template>
  <div ref="host" class="model-stage">
    <div v-if="loading" class="viewer-loading" role="status">
      <span class="loading-ring" />Preparing your perspective…
    </div>
    <div v-if="error" class="viewer-error" role="alert">
      <p>{{ error }}</p>
      <p>Return to the map and reopen this building to retry.</p>
    </div>
    <template v-if="!loading && !error"
      >
<button
        v-for="p in points.filter((p) => p.visible)"
        :key="p.annotation.id"
        class="hotspot"
        :style="{ left: p.x + 'px', top: p.y + 'px' }"
        :aria-label="'Explore ' + p.annotation.title"
        @click="emit('annotation', p.annotation)"
      >
        <span>+</span>
</button
      ><template v-if="compare && historyRoot"
        >
<div class="comparison-label historical-label">
          {{ building.historicalYear || "Historical"
          }}<small>DEMONSTRATION</small>
        </div>
        <div class="comparison-label current-label">
          Present<small>SAMPLE MODEL</small>
        </div>
        <div class="split-line" :style="{ left: split + '%' }">
          <span>‹ &nbsp; ›</span>
        </div>
        <input
          v-model.number="split"
          class="comparison-slider"
          type="range"
          min="3"
          max="97"
          aria-label="Historical and current model comparison"
          :aria-valuetext="`${split}% historical model`"
      />
</template>
      <div
        v-if="compare && historyLoading"
        class="comparison-message"
        role="status"
      >
        Loading the earlier chapter…
      </div>
      <div
        v-if="compare && historyError && !historyLoading"
        class="comparison-message"
        role="alert"
      >
        {{ historyError }}
        <button
          @click="
            historyError = '';
            loadHistory();
          "
        >
          Retry
        </button>
      </div>
      <span class="model-caption">{{
        compare ? "SYNCHRONIZED PERSPECTIVE" : "TAP + TO EXPLORE THE DETAILS"
      }}</span>
</template
    >
  </div>
</template>
