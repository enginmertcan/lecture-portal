<script setup>
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const links = [
  { label: 'Panel', to: '/', name: 'dashboard', roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  { label: 'Dersler', to: '/lectures', name: 'lectures', roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  { label: 'Program', to: '/schedules', name: 'schedules', roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  { label: 'Sınıflar', to: '/classrooms', name: 'classrooms', roles: ['ADMIN', 'TEACHER'] },
  { label: 'Slotlar', to: '/slots', name: 'slots', roles: ['ADMIN'] },
  {
    label: 'Not Bileşenleri',
    to: '/grade-components',
    name: 'gradeComponents',
    roles: ['ADMIN', 'TEACHER'],
  },
  { label: 'Kayıtlar', to: '/enrollments', name: 'enrollments', roles: ['ADMIN', 'TEACHER'] },
  { label: 'Veri Seti', to: '/bootstrap', name: 'bootstrap', roles: ['ADMIN'] },
  { label: 'Kullanıcılar', to: '/users', name: 'users', roles: ['ADMIN'] },
];

const visibleLinks = computed(() =>
  links.filter((link) => authStore.hasAnyRole(link.roles))
);

const roleLabel = computed(() => {
  if (!authStore.roles.length) {
    return 'rol bilgisi yok';
  }
  return authStore.roles
    .map((role) => role.replace('ROLE_', '').toLowerCase())
    .join(', ');
});

const subject = computed(() => authStore.identityNo || 'Bilinmeyen Kullanıcı');

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
        v-for="link in visibleLinks"
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
        <small>{{ roleLabel }}</small>
      </div>
      <div class="endpoint">
        <p>API</p>
        <small>{{ API_BASE_URL }}</small>
      </div>
      <button class="ghost" @click="logout">Çıkış</button>
    </div>
  </header>
</template>
