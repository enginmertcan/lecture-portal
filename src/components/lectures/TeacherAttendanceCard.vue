<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  attendanceEligibleEnrollments: { type: Array, default: () => [] },
  attendanceWeek: { type: String, default: '' },
  attendanceState: { type: Object, required: true },
  attendanceLimit: { type: Number, default: 5 },
  statusLabels: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['update:attendanceWeek', 'record-attendance']);

const updateWeek = (event) => emit('update:attendanceWeek', event.target.value);
const recordAttendance = (enrollment, attended) => emit('record-attendance', { enrollment, attended });
</script>

<template>
  <section v-if="visible" class="card attendance-card">
    <header class="card-header">
      <div>
        <p class="eyebrow">Yoklama</p>
        <h2>Derse Katılım Yönetimi</h2>
        <p class="subtitle">
          Devamsızlık limiti {{ attendanceLimit }}. Limit dolarsa öğrenci dersten otomatik düşer.
        </p>
      </div>
      <label class="attendance-week">
        Yoklama haftası
        <input type="date" :value="attendanceWeek" @input="updateWeek" />
      </label>
    </header>

    <p v-if="attendanceState.success" class="status success">{{ attendanceState.success }}</p>
    <p v-if="attendanceState.error" class="error status">{{ attendanceState.error }}</p>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Öğrenci</th>
            <th>Durum</th>
            <th>Devamsızlık</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="enrollment in attendanceEligibleEnrollments" :key="enrollment.id">
            <td>
              <strong>{{ enrollment.studentName }} {{ enrollment.studentSurname }}</strong>
              <p class="hint">#{{ enrollment.studentId }}</p>
            </td>
            <td>
              <span class="pill secondary">{{ statusLabels[enrollment.status] }}</span>
            </td>
            <td>
              <div class="absence-indicator">
                <strong>{{ enrollment.absenceCount || 0 }}</strong>
                <span>/ {{ enrollment.absenceLimit || attendanceLimit }}</span>
              </div>
            </td>
            <td class="actions">
              <button
                class="ghost tiny"
                :disabled="attendanceState.savingId === enrollment.id"
                @click.prevent="recordAttendance(enrollment, true)"
              >
                Geldi
              </button>
              <button
                class="ghost tiny danger"
                :disabled="attendanceState.savingId === enrollment.id"
                @click.prevent="recordAttendance(enrollment, false)"
              >
                Gelmedi
              </button>
            </td>
          </tr>
          <tr v-if="!attendanceEligibleEnrollments.length">
            <td colspan="4">Aktif öğrenci bulunamadı.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
