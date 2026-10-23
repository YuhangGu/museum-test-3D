<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
const emit = defineEmits<{ close: [] }>();
defineProps<{ title: string }>();
const panel = ref<HTMLElement>();
const previous = document.activeElement as HTMLElement | null;
function key(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
  if (event.key === "Tab") {
    const buttons = panel.value?.querySelectorAll<HTMLElement>(
      'button,a[href],input,[tabindex="0"]',
    );
    if (!buttons?.length) return;
    const first = buttons[0],
      last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
onMounted(() => {
  panel.value?.querySelector("button")?.focus();
  window.addEventListener("keydown", key);
});
onUnmounted(() => {
  window.removeEventListener("keydown", key);
  previous?.focus();
});
</script>
<template>
  <div class="sheet-scrim" @click.self="emit('close')">
    <section
      ref="panel"
      class="modal-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="handle" />
      <button
        class="icon-button sheet-close"
        aria-label="Close information"
        @click="emit('close')"
      >
        ×
</button
      ><span class="eyebrow">A CLOSER LOOK</span>
      <h2>{{ title }}</h2>
      <slot />
    </section>
  </div>
</template>
