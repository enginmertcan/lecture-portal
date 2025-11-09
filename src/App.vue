<script setup>
import { RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth';
import AppHeader from './components/AppHeader.vue';

const authStore = useAuthStore();
</script>

<template>
  <div class="app-shell">
    <AppHeader v-if="authStore.isAuthenticated" />
    <main>
      <RouterView />
    </main>
  </div>
</template>
