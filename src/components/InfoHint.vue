<script setup>
defineProps({
  title: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <div class="info-hint">
    <button type="button" class="info-badge" aria-label="Bilgi">
      i
    </button>
    <div class="info-popover">
      <strong v-if="title">{{ title }}</strong>
      <slot />
    </div>
  </div>
</template>
