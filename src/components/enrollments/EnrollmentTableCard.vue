<script setup>
const props = defineProps({
  enrollments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  page: { type: Number, default: 0 },
  totalPages: { type: Number, default: 0 },
  showPagination: { type: Boolean, default: true },
});

const emit = defineEmits(['action', 'prev-page', 'next-page']);

const runAction = (id, action) => emit('action', { id, action });
const prevPage = () => emit('prev-page');
const nextPage = () => emit('next-page');
</script>

<template>
  <article class="card">
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ders</th>
            <th>Öğrenci</th>
            <th>Durum</th>
            <th>Bekleme</th>
            <th>Not</th>
            <th>Aksiyonlar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="enrollment in enrollments" :key="enrollment.id">
            <td>#{{ enrollment.id }}</td>
            <td>{{ enrollment.lectureId }}</td>
            <td>{{ enrollment.studentId }}</td>
            <td><span class="pill secondary">{{ enrollment.status }}</span></td>
            <td>{{ enrollment.waitlistPosition ?? '—' }}</td>
            <td>{{ enrollment.grade ?? '—' }}</td>
            <td class="action-buttons">
              <button class="ghost tiny" @click="runAction(enrollment.id, 'approve')">Onayla</button>
              <button class="ghost tiny" @click="runAction(enrollment.id, 'drop')">Drop</button>
              <button class="ghost tiny" @click="runAction(enrollment.id, 'promote')">Promote</button>
            </td>
          </tr>
          <tr v-if="!loading && !enrollments.length">
            <td colspan="7">Kayıt bulunamadı.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="loading" class="status">Kayıtlar yükleniyor...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <footer class="table-footer" v-if="showPagination">
      <button @click="prevPage" :disabled="page === 0">Önceki</button>
      <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
      <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
    </footer>
  </article>
</template>
