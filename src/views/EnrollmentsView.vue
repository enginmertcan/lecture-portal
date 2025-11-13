<script setup>
import { computed, reactive, ref, watch } from 'vue';
import httpClient from '../api/httpClient';
import InfoHint from '../components/InfoHint.vue';
import EnrollmentTableCard from '../components/enrollments/EnrollmentTableCard.vue';
import EnrollmentCreateCard from '../components/enrollments/EnrollmentCreateCard.vue';
import EnrollmentGradeCard from '../components/enrollments/EnrollmentGradeCard.vue';

const enrollments = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(0);
const pageSize = 10;
const totalPages = ref(0);

const filterLectureId = ref('');
const filterStudentId = ref('');

const lectures = ref([]);

const enrollmentForm = reactive({
  lectureId: '',
  studentId: '',
});

const completionForm = reactive({
  enrollmentId: '',
  grade: '',
});

const gradeForm = reactive({
  enrollmentId: '',
  lectureId: '',
  gradeComponentId: '',
  score: '',
});

const gradeComponents = ref([]);
const gradeLoading = ref(false);
const gradeError = ref('');

const formState = reactive({
  createLoading: false,
  createError: '',
  completionLoading: false,
  completionError: '',
  gradeLoading: false,
  gradeError: '',
});

const fetchLectures = async () => {
  try {
    const { data } = await httpClient.get('/api/lectures', { params: { page: 0, pageSize: 100 } });
    lectures.value = data.content;
    if (!enrollmentForm.lectureId && lectures.value.length) {
      enrollmentForm.lectureId = lectures.value[0].id;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Ders listesi getirilemedi';
  }
};

const fetchEnrollments = async () => {
  loading.value = true;
  error.value = '';
  try {
    let data;
    if (filterStudentId.value) {
      const res = await httpClient.get(`/api/enrollments/student/${filterStudentId.value}`);
      data = res.data;
      enrollments.value = data;
      totalPages.value = 1;
    } else if (filterLectureId.value) {
      const res = await httpClient.get(`/api/enrollments/lecture/${filterLectureId.value}`);
      data = res.data;
      enrollments.value = data;
      totalPages.value = 1;
    } else {
      const res = await httpClient.get('/api/enrollments', { params: { page: page.value, pageSize } });
      enrollments.value = res.data.content;
      totalPages.value = res.data.totalPages;
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Kayıtlar getirilemedi';
  } finally {
    loading.value = false;
  }
};

const createEnrollment = async () => {
  formState.createLoading = true;
  formState.createError = '';
  try {
    await httpClient.post('/api/enrollments', enrollmentForm);
    await fetchEnrollments();
  } catch (err) {
    formState.createError =
      err.response?.data?.message || 'Kayıt oluşturulamadı (öğrenci rolü gerekebilir).';
  } finally {
    formState.createLoading = false;
  }
};

const runAction = async (id, action) => {
  try {
    await httpClient.post(`/api/enrollments/${id}/${action}`);
    await fetchEnrollments();
  } catch (err) {
    alert(err.response?.data?.message || `${action} işlemi başarısız`);
  }
};

const completeEnrollment = async () => {
  formState.completionLoading = true;
  formState.completionError = '';
  try {
    await httpClient.post(`/api/enrollments/${completionForm.enrollmentId}/complete`, {
      grade: completionForm.grade ? Number(completionForm.grade) : null,
    });
    await fetchEnrollments();
  } catch (err) {
    formState.completionError = err.response?.data?.message || 'Tamamlama başarısız';
  } finally {
    formState.completionLoading = false;
  }
};

const fetchGradeComponents = async (lectureId) => {
  if (!lectureId) {
    gradeComponents.value = [];
    return;
  }
  gradeLoading.value = true;
  gradeError.value = '';
  try {
    const { data } = await httpClient.get('/api/grade-components', {
      params: { lectureId },
    });
    gradeComponents.value = data;
    if (data.length && !gradeForm.gradeComponentId) {
      gradeForm.gradeComponentId = data[0].id;
    }
  } catch (err) {
    gradeError.value = err.response?.data?.message || 'Not bileşenleri getirilemedi';
  } finally {
    gradeLoading.value = false;
  }
};

const recordGrade = async () => {
  formState.gradeLoading = true;
  formState.gradeError = '';
  try {
    await httpClient.post(`/api/enrollments/${gradeForm.enrollmentId}/grades`, {
      gradeComponentId: gradeForm.gradeComponentId,
      score: Number(gradeForm.score),
    });
    await fetchEnrollments();
  } catch (err) {
    formState.gradeError = err.response?.data?.message || 'Not kaydedilemedi';
  } finally {
    formState.gradeLoading = false;
  }
};

const nextPage = () => {
  if (page.value < totalPages.value - 1) {
    page.value += 1;
    fetchEnrollments();
  }
};

const prevPage = () => {
  if (page.value > 0) {
    page.value -= 1;
    fetchEnrollments();
  }
};

watch([filterLectureId, filterStudentId], () => {
  page.value = 0;
  fetchEnrollments();
});

watch(
  () => gradeForm.lectureId,
  (lectureId) => {
    gradeForm.gradeComponentId = '';
    fetchGradeComponents(lectureId);
  }
);

fetchLectures();
fetchEnrollments();

const showPagination = computed(() => !filterLectureId.value && !filterStudentId.value);

const handleTableAction = ({ id, action }) => {
  runAction(id, action);
};

const handleCreate = () => createEnrollment();
const handleComplete = () => completeEnrollment();
const handleRecordGrade = () => recordGrade();
</script>

<template>
  <section class="layout-grid">
    <header class="section-headline">
      <div>
        <p class="eyebrow">Öğrenci İşleri</p>
        <h1>
          Kayıt ve not yönetimi
          <InfoHint title="Kayıt yaşam döngüsü">
            <ul>
              <li><strong>Pending:</strong> Onay bekleyen başvuru.</li>
              <li><strong>Active:</strong> Derse katılan öğrenci.</li>
              <li><strong>Waiting:</strong> Kontenjan doluysa sıraya alınır.</li>
              <li><strong>Completed:</strong> Ders bitince genel not girilir.</li>
            </ul>
          </InfoHint>
        </h1>
        <p>Enrollment uçları üzerinden ders kayıtlarını ilerlet, drop et, not gir.</p>
      </div>
      <div class="filter-row">
        <select v-model="filterLectureId">
          <option value="">Tüm dersler</option>
          <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
            Ders #{{ lecture.id }} - {{ lecture.name }}
          </option>
        </select>
        <input
          v-model="filterStudentId"
          placeholder="Öğrenci ID filtrele"
          type="number"
          min="1"
        />
      </div>
    </header>

    <EnrollmentTableCard
      :enrollments="enrollments"
      :loading="loading"
      :error="error"
      :page="page"
      :total-pages="totalPages"
      :show-pagination="showPagination"
      @action="handleTableAction"
      @prev-page="prevPage"
      @next-page="nextPage"
    />

    <div class="grid-2 stretch">
      <EnrollmentCreateCard
        :lectures="lectures"
        :enrollment-form="enrollmentForm"
        :completion-form="completionForm"
        :form-state="formState"
        @create="handleCreate"
        @complete="handleComplete"
      />

      <EnrollmentGradeCard
        :lectures="lectures"
        :grade-form="gradeForm"
        :grade-components="gradeComponents"
        :form-state="formState"
        :grade-loading="gradeLoading"
        :grade-error="gradeError"
        @record="handleRecordGrade"
      />
    </div>
  </section>
</template>
