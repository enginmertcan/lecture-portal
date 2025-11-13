<script setup>
const props = defineProps({
  schedules: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const emit = defineEmits(['delete']);
const handleDelete = (item) => emit('delete', item);
</script>

<template>
  <article class="card">
    <p v-if="loading" class="status">Program yükleniyor...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="schedule-grid" v-if="!loading && !error">
      <article v-for="item in schedules" :key="item.id" class="card schedule mini">
        <header>
          <div>
            <p class="eyebrow">#{{ item.id }}</p>
            <h2>{{ item.lectureName }} • {{ item.classroomName }}</h2>
            <p>Konum: {{ item.classroomName }} (#{{ item.classroomId }})</p>
          </div>
          <button class="ghost tiny" @click="handleDelete(item)">Sil</button>
        </header>
        <div class="schedule-meta">
          <span>{{ item.dayOfWeek }}</span>
          <span>{{ item.startTime }} - {{ item.endTime }}</span>
        </div>
        <p class="date-range">
          {{ item.startDate }} → {{ item.endDate }}
        </p>
      </article>
    </div>
    <p v-if="!loading && !error && !schedules.length" class="status">
      Gösterilecek oturum bulunamadı.
    </p>
  </article>
</template>
