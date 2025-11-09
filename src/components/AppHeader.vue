<script setup>
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const links = [
  { label: 'Panel', to: '/', name: 'dashboard' },
  { label: 'Dersler', to: '/lectures', name: 'lectures' },
  { label: 'Program', to: '/schedules', name: 'schedules' },
  { label: 'Sınıflar', to: '/classrooms', name: 'classrooms' },
  { label: 'Slotlar', to: '/slots', name: 'slots' },
  { label: 'Not Bileşenleri', to: '/grade-components', name: 'gradeComponents' },
  { label: 'Kayıtlar', to: '/enrollments', name: 'enrollments' },
  { label: 'Kullanıcılar', to: '/users', name: 'users' },
];

const tokenPayload = computed(() => {
  if (!authStore.accessToken) {
    return null;
  }
  try {
    const [, payload] = authStore.accessToken.split('.');
    return JSON.parse(atob(payload));
  } catch (error) {
    console.error('JWT parse failed', error);
    return null;
  }
});

const roles = computed(() => {
  const raw = tokenPayload.value?.role;
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => entry?.authority || entry).filter(Boolean);
  }
  if (typeof raw === 'object') {
    return [raw.authority].filter(Boolean);
  }
  return [raw];
});

const subject = computed(() => tokenPayload.value?.sub || 'Bilinmeyen Kullanıcı');

const logout = () => {
  authStore.logout();
  router.push({ name: 'login' });
};
</script>

<template>
  <header class="app-header">
    <div class="branding">
      <span class="dot"></span>
      <div>
        <p class="eyebrow">Trendyol</p>
        <strong>Lecture Console</strong>
      </div>
    </div>

    <nav>
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :class="{ active: route.name === link.name }"
      >
        {{ link.label }}
      </router-link>
    </nav>

    <div class="session">
      <div class="user-pill">
        <p>{{ subject }}</p>
        <small>{{ roles.length ? roles.join(', ') : 'rol bilgisi yok' }}</small>
      </div>
      <div class="endpoint">
        <p>API</p>
        <small>{{ API_BASE_URL }}</small>
      </div>
      <button class="ghost" @click="logout">Çıkış</button>
    </div>
  </header>
</template>
