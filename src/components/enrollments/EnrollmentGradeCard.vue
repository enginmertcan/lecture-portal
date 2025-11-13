<script setup>
const props = defineProps({
  lectures: { type: Array, default: () => [] },
  gradeForm: { type: Object, required: true },
  gradeComponents: { type: Array, default: () => [] },
  formState: { type: Object, required: true },
  gradeLoading: { type: Boolean, default: false },
  gradeError: { type: String, default: '' },
});

const emit = defineEmits(['record']);
const handleRecord = () => emit('record');
</script>

<template>
  <article class="card">
    <header class="card-header">
      <div>
        <p class="eyebrow">Not kayıt</p>
        <h2>Bileşene not gir</h2>
      </div>
    </header>
    <form class="form-grid" @submit.prevent="handleRecord">
      <label>
        Enrollment ID
        <input v-model="gradeForm.enrollmentId" type="number" min="1" required />
      </label>
      <label>
        Ders
        <select v-model="gradeForm.lectureId" required>
          <option disabled value="">Ders seç</option>
          <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
            {{ lecture.name }}
          </option>
        </select>
      </label>
      <label>
        Bileşen
        <select v-model="gradeForm.gradeComponentId" required>
          <option value="" disabled>Bileşen seç</option>
          <option v-for="component in gradeComponents" :key="component.id" :value="component.id">
            {{ component.name }} (Max {{ component.maxScore }})
          </option>
        </select>
      </label>
      <label>
        Puan
        <input v-model="gradeForm.score" type="number" min="0" required />
      </label>
      <div class="full-span">
        <button type="submit" :disabled="formState.gradeLoading || gradeLoading">
          {{ formState.gradeLoading ? 'Kaydediliyor...' : 'Not Kaydet' }}
        </button>
        <p v-if="formState.gradeError" class="error">{{ formState.gradeError }}</p>
        <p v-if="gradeError" class="error">{{ gradeError }}</p>
      </div>
    </form>
  </article>
</template>
