<script setup>
const props = defineProps({
  canManageLectures: { type: Boolean, default: false },
  lectureForm: { type: Object, required: true },
  teacherOptions: { type: Array, default: () => [] },
  formLoading: { type: Boolean, default: false },
  formError: { type: String, default: '' },
});

const emit = defineEmits(['submit']);
const handleSubmit = () => emit('submit');
</script>

<template>
  <div v-if="canManageLectures" class="card">
    <header class="card-header">
      <div>
        <p class="eyebrow">Yeni Ders</p>
        <h2>Ders oluştur</h2>
      </div>
    </header>
    <form class="form-grid" @submit.prevent="handleSubmit">
      <label>
        İsim
        <input v-model="lectureForm.name" placeholder="Mikroservis Tasarımı" required />
      </label>
      <label class="full-span">
        Açıklama
        <textarea v-model="lectureForm.description" placeholder="Kısa ders özeti" rows="3"></textarea>
      </label>
      <label>
        Kontenjan
        <input v-model.number="lectureForm.capacity" type="number" min="1" required />
      </label>
      <label>
        Öğretmen
        <select v-model="lectureForm.teacherId" required>
          <option disabled value="">Öğretmen seç</option>
          <option v-for="teacher in teacherOptions" :key="teacher.id" :value="teacher.id">
            {{ teacher.name }} {{ teacher.surname }}
          </option>
        </select>
      </label>
      <div class="full-span">
        <button type="submit" :disabled="formLoading">
          {{ formLoading ? 'Kaydediliyor...' : 'Dersi Oluştur' }}
        </button>
        <p v-if="formError" class="error">{{ formError }}</p>
      </div>
    </form>
  </div>
</template>
