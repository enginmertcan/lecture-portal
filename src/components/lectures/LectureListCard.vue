<script setup>
const props = defineProps({
  lectures: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  selectedLectureId: { type: Number, default: null },
  isStudent: { type: Boolean, default: false },
  canManageLectures: { type: Boolean, default: false },
  studentEnrollmentMap: { type: Object, default: () => new Map() },
  enrollmentStatusLabel: { type: Function, required: true },
  formatEnrollmentDate: { type: Function, required: true },
  page: { type: Number, default: 0 },
  totalPages: { type: Number, default: 0 },
});

const emit = defineEmits(['select', 'delete', 'next-page', 'prev-page']);

const handleSelect = (lecture) => emit('select', lecture);
const handleDelete = (lecture) => emit('delete', lecture);
const nextPage = () => emit('next-page');
const prevPage = () => emit('prev-page');
</script>

<template>
  <div class="card">
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ders</th>
            <th>Açıklama</th>
            <th>Kontenjan</th>
            <th>Öğretmen</th>
            <th v-if="isStudent">Kayıt Durumu</th>
            <th v-if="canManageLectures"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="lecture in lectures"
            :key="lecture.id"
            :class="{ active: selectedLectureId === lecture.id }"
            @click="handleSelect(lecture)"
          >
            <td>{{ lecture.id }}</td>
            <td>{{ lecture.name }}</td>
            <td>{{ lecture.description }}</td>
            <td>{{ lecture.capacity }}</td>
            <td>
              <div>{{ lecture.teacherName || 'Atanmadı' }}</div>
              <small v-if="lecture.teacherId">#{{ lecture.teacherId }}</small>
            </td>
            <td v-if="isStudent">
              <template v-if="studentEnrollmentMap.get(lecture.id)">
                <span class="pill secondary">
                  {{ enrollmentStatusLabel(studentEnrollmentMap.get(lecture.id).status) }}
                </span>
                <p class="hint">
                  Güncelleme:
                  {{ formatEnrollmentDate(studentEnrollmentMap.get(lecture.id).enrolledAt) }}
                </p>
              </template>
              <p v-else class="hint">Henüz kayıtlı değilsin</p>
            </td>
            <td v-if="canManageLectures">
              <button class="ghost tiny" @click.stop="handleDelete(lecture)">Sil</button>
            </td>
          </tr>
          <tr v-if="!loading && !lectures.length">
            <td colspan="6">Sonuç bulunamadı</td>
          </tr>
        </tbody>
      </table>
      <p v-if="loading" class="status">Dersler yükleniyor...</p>
      <p v-if="error" class="error status">{{ error }}</p>
    </div>
    <footer class="table-footer">
      <button @click="prevPage" :disabled="page === 0">Önceki</button>
      <span>Sayfa {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
      <button @click="nextPage" :disabled="page >= totalPages - 1">Sonraki</button>
    </footer>
  </div>
</template>
