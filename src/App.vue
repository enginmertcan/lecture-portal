<script setup>
import { onMounted, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import AppHeader from './components/AppHeader.vue';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const ensureRouteMatchesAuthState = () => {
  const requiresAuth = Boolean(route.meta.requiresAuth);
  const isLoginView = route.name === 'login';
  if (!authStore.isAuthenticated && requiresAuth && !isLoginView) {
    const query = {
      sessionExpired: '1',
    };
    if (route.fullPath && route.fullPath !== '/login') {
      query.redirect = route.fullPath;
    }
    router.replace({ name: 'login', query });
  }
};

onMounted(() => {
  authStore.ensureProfile();
  ensureRouteMatchesAuthState();
});

watch(
  () => authStore.isAuthenticated,
  () => {
    ensureRouteMatchesAuthState();
  }
);

watch(
  () => route.fullPath,
  () => {
    ensureRouteMatchesAuthState();
  }
);
</script>

<template>
  <div class="app-shell">
    <AppHeader v-if="authStore.isAuthenticated" />
    <main>
      <RouterView />
    </main>
  </div>
</template>
