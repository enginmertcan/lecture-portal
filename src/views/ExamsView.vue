<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import InfoHint from '../components/InfoHint.vue';
import ExamQuestionEditor from '../components/exams/ExamQuestionEditor.vue';
import { useAuthStore } from '../stores/auth';
import httpClient from '../api/httpClient';
import {
  createExam,
  fetchAvailableExams,
  fetchLectureExams,
  startExamAttempt,
  submitExamAttempt,
} from '../api/exams';

const authStore = useAuthStore();

const isTeacher = computed(() => authStore.hasAnyRole(['ADMIN', 'TEACHER']));
const isStudent = computed(() => authStore.hasRole('STUDENT'));

const lectures = ref([]);
const lecturesLoading = ref(false);
const lectureError = ref('');

const selectedTeacherLectureId = ref(null);
const teacherExams = ref([]);
const teacherExamsLoading = ref(false);
const teacherExamError = ref('');

const selectedStudentLectureId = ref(null);
const availableExams = ref([]);
const availableExamsLoading = ref(false);
const availableExamError = ref('');

const examFormState = reactive({
  submitting: false,
  error: '',
  success: '',
});

const attemptState = reactive({
  loading: false,
  submitting: false,
  error: '',
  activeAttempt: null,
  examPlay: null,
  answers: {},
  expiresAt: null,
  result: null,
});

const localDateValue = (date) => {
  if (!date) {
    return '';
  }
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 16);
};

const now = new Date();
const defaultOpen = new Date(now.getTime() + 30 * 60 * 1000);
const defaultClose = new Date(now.getTime() + 90 * 60 * 1000);

const examForm = reactive({
  lectureId: null,
  title: '',
  description: '',
  opensAt: localDateValue(defaultOpen),
  closesAt: localDateValue(defaultClose),
  timeLimitMinutes: 30,
});

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;

const createQuestionDraft = () => ({
  uid: uid(),
  prompt: '',
  questionType: 'MULTIPLE_CHOICE',
  points: 1,
  correctAnswer: '',
  options: [
    { uid: uid(), label: 'A', content: '', correct: true },
    { uid: uid(), label: 'B', content: '', correct: false },
  ],
});

const questionDrafts = ref([createQuestionDraft()]);

const addQuestion = () => {
  questionDrafts.value.push(createQuestionDraft());
};

const removeQuestion = (uidToRemove) => {
  if (questionDrafts.value.length === 1) {
    return;
  }
  questionDrafts.value = questionDrafts.value.filter((question) => question.uid !== uidToRemove);
};

const fetchLectures = async () => {
  lecturesLoading.value = true;
  lectureError.value = '';
  try {
    const { data } = await httpClient.get('/api/lectures', {
      params: { page: 0, pageSize: 100 },
    });
    lectures.value = data?.content || [];
    if (!selectedTeacherLectureId.value && lectures.value.length) {
      selectedTeacherLectureId.value = lectures.value[0].id;
    }
    if (!selectedStudentLectureId.value && lectures.value.length) {
      selectedStudentLectureId.value = lectures.value[0].id;
    }
  } catch (error) {
    lectureError.value = error.response?.data?.message || 'Ders listesi getirilemedi';
  } finally {
    lecturesLoading.value = false;
  }
};

const refreshTeacherExams = async () => {
  if (!selectedTeacherLectureId.value) {
    teacherExams.value = [];
    return;
  }
  teacherExamsLoading.value = true;
  teacherExamError.value = '';
  try {
    const { data } = await fetchLectureExams(selectedTeacherLectureId.value);
    teacherExams.value = data || [];
  } catch (error) {
    teacherExamError.value = error.response?.data?.message || 'Sınav listesi alınamadı';
  } finally {
    teacherExamsLoading.value = false;
  }
};

const refreshAvailableExams = async () => {
  if (!selectedStudentLectureId.value) {
    availableExams.value = [];
    return;
  }
  availableExamsLoading.value = true;
  availableExamError.value = '';
  try {
    const { data } = await fetchAvailableExams(selectedStudentLectureId.value);
    availableExams.value = data || [];
  } catch (error) {
    availableExamError.value = error.response?.data?.message || 'Aktif sınav bulunamadı';
  } finally {
    availableExamsLoading.value = false;
  }
};

const toIsoString = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return date.toISOString();
};

const buildExamPayload = () => ({
  lectureId: examForm.lectureId,
  title: examForm.title.trim(),
  description: examForm.description?.trim() || null,
  opensAt: toIsoString(examForm.opensAt),
  closesAt: toIsoString(examForm.closesAt),
  timeLimitMinutes: examForm.timeLimitMinutes || null,
  questions: questionDrafts.value.map((question, index) => ({
    prompt: question.prompt,
    questionType: question.questionType,
    points: Number(question.points) || 1,
    correctAnswer: question.correctAnswer,
    options:
      question.options?.map((option, optionIndex) => ({
        content: option.content,
        label: option.label || String.fromCharCode(65 + optionIndex),
        displayOrder: optionIndex + 1,
        correct: Boolean(option.correct),
      })) || [],
  })),
});

const validateExamForm = () => {
  if (!examForm.lectureId) {
    examFormState.error = 'Önce bir ders seçmelisin.';
    return false;
  }
  if (!examForm.title.trim()) {
    examFormState.error = 'Sınav başlığı gerekli.';
    return false;
  }
  if (!examForm.opensAt || !examForm.closesAt) {
    examFormState.error = 'Başlangıç ve bitiş zamanı zorunludur.';
    return false;
  }
  if (!questionDrafts.value.length) {
    examFormState.error = 'En az bir soru eklemelisin.';
    return false;
  }
  for (const question of questionDrafts.value) {
    if (!question.prompt.trim()) {
      examFormState.error = 'Tüm soruların metni doldurulmalı.';
      return false;
    }
    if (['CLASSIC', 'FILL_IN_THE_BLANK'].includes(question.questionType)) {
      if (!question.correctAnswer || !question.correctAnswer.trim()) {
        examFormState.error = 'Metin tabanlı sorular için referans cevap zorunludur.';
        return false;
      }
    } else {
      const hasCorrect = (question.options || []).some((option) => option.correct);
      if (!hasCorrect) {
        examFormState.error = 'Seçenekli sorularda en az bir doğru seçenek belirtilmeli.';
        return false;
      }
      const allFilled = (question.options || []).every((option) => option.content.trim());
      if (!allFilled) {
        examFormState.error = 'Tüm seçenek içerikleri doldurulmalı.';
        return false;
      }
    }
  }
  examFormState.error = '';
  return true;
};

const resetExamForm = () => {
  examForm.title = '';
  examForm.description = '';
  examForm.opensAt = localDateValue(defaultOpen);
  examForm.closesAt = localDateValue(defaultClose);
  examForm.timeLimitMinutes = 30;
  questionDrafts.value = [createQuestionDraft()];
};

const handleCreateExam = async () => {
  if (!validateExamForm()) {
    return;
  }
  examFormState.submitting = true;
  examFormState.error = '';
  examFormState.success = '';
  try {
    await createExam(buildExamPayload());
    examFormState.success = 'Sınav taslağı başarıyla oluşturuldu.';
    resetExamForm();
    await refreshTeacherExams();
  } catch (error) {
    examFormState.error = error.response?.data?.message || 'Sınav kaydedilemedi.';
  } finally {
    examFormState.submitting = false;
  }
};

const hydrateAnswers = (questions) => {
  const initial = {};
  questions.forEach((question) => {
    initial[question.id] = {
      selectedOptionId: null,
      answerText: '',
    };
  });
  attemptState.answers = initial;
};

const beginAttempt = async (examId) => {
  attemptState.loading = true;
  attemptState.error = '';
  attemptState.result = null;
  try {
    const { data } = await startExamAttempt(examId);
    attemptState.activeAttempt = {
      attemptId: data.attemptId,
      examId: data.examId,
      startedAt: data.startedAt,
    };
    attemptState.expiresAt = data.expiresAt;
    attemptState.examPlay = data.exam;
    hydrateAnswers(data.exam?.questions || []);
  } catch (error) {
    attemptState.error = error.response?.data?.message || 'Sınav başlatılamadı.';
    attemptState.examPlay = null;
    attemptState.activeAttempt = null;
  } finally {
    attemptState.loading = false;
  }
};

const isQuestionAnswered = (question) => {
  const response = attemptState.answers[question.id];
  if (!response) {
    return false;
  }
  if (question.textAnswerRequired) {
    return Boolean(response.answerText?.trim());
  }
  return Boolean(response.selectedOptionId);
};

const allQuestionsAnswered = computed(() => {
  if (!attemptState.examPlay?.questions?.length) {
    return false;
  }
  return attemptState.examPlay.questions.every((question) => isQuestionAnswered(question));
});

const submitActiveAttempt = async () => {
  if (!attemptState.activeAttempt || !attemptState.examPlay) {
    return;
  }
  if (!allQuestionsAnswered.value) {
    attemptState.error = 'Lütfen tüm sorulara yanıt ver.';
    return;
  }
  attemptState.submitting = true;
  attemptState.error = '';
  try {
    const payload = {
      answers: attemptState.examPlay.questions.map((question) => {
        const response = attemptState.answers[question.id] || {};
        return {
          questionId: question.id,
          selectedOptionId: response.selectedOptionId,
          answerText: response.answerText?.trim() || null,
        };
      }),
    };
    const { data } = await submitExamAttempt(
      attemptState.activeAttempt.examId,
      attemptState.activeAttempt.attemptId,
      payload
    );
    attemptState.result = data;
    attemptState.examPlay = null;
    attemptState.activeAttempt = null;
    attemptState.answers = {};
    await refreshAvailableExams();
  } catch (error) {
    attemptState.error = error.response?.data?.message || 'Sınav gönderilemedi.';
  } finally {
    attemptState.submitting = false;
  }
};

watch(selectedTeacherLectureId, (lectureId) => {
  examForm.lectureId = lectureId;
  if (lectureId) {
    refreshTeacherExams();
  }
});

watch(selectedStudentLectureId, () => {
  refreshAvailableExams();
});

onMounted(async () => {
  await authStore.ensureProfile();
  await fetchLectures();
  if (isTeacher.value && selectedTeacherLectureId.value) {
    examForm.lectureId = selectedTeacherLectureId.value;
    await refreshTeacherExams();
  }
  if (isStudent.value && selectedStudentLectureId.value) {
    await refreshAvailableExams();
  }
});
</script>

<template>
  <div class="layout-grid exams-layout">
    <section class="card" v-if="isTeacher">
      <div class="section-headline">
        <div>
          <p class="eyebrow">Sınav Tasarımı</p>
          <h2>Dersin için yeni sınav oluştur</h2>
          <p class="subtitle">Soru tiplerini karıştırabilir, zaman penceresi ve süre limiti tanımlayabilirsin.</p>
        </div>
        <div class="stacked">
          <label>
            Hedef ders
            <select v-model.number="selectedTeacherLectureId">
              <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
                {{ lecture.name }}
              </option>
            </select>
          </label>
          <small class="hint" v-if="lectureError">{{ lectureError }}</small>
        </div>
      </div>

      <form @submit.prevent="handleCreateExam">
        <label>
          Başlık
          <input v-model="examForm.title" type="text" placeholder="Örn. Hafta 5 Quiz" />
        </label>

        <label>
          Açıklama
          <textarea
            v-model="examForm.description"
            rows="2"
            placeholder="Öğrencilerin görmesini istediğin notlar"
          ></textarea>
        </label>

        <div class="question-grid">
          <label>
            Yayın zamanı
            <input v-model="examForm.opensAt" type="datetime-local" />
          </label>
          <label>
            Bitiş zamanı
            <input v-model="examForm.closesAt" type="datetime-local" />
          </label>
          <label>
            Süre limiti (dakika)
            <input v-model.number="examForm.timeLimitMinutes" type="number" min="5" step="5" />
          </label>
        </div>

        <InfoHint>
          <strong>İpucu</strong>
          <ul>
            <li>Çoktan seçmeli ve Doğru/Yanlış sorular otomatik değerlendirilir.</li>
            <li>Ek süre tanımlamazsan sınav, bitiş saatine kadar açık kalır.</li>
            <li>Soru sıralaması öğrencinin ekranında korunur.</li>
          </ul>
        </InfoHint>

        <div class="question-stack">
          <ExamQuestionEditor
            v-for="(question, index) in questionDrafts"
            :key="question.uid"
            :question="question"
            :index="index"
            @remove="removeQuestion"
          />
        </div>

        <div class="action-row">
          <button type="button" class="ghost" @click="addQuestion">Yeni soru ekle</button>
          <button type="submit" :disabled="examFormState.submitting">
            {{ examFormState.submitting ? 'Kaydediliyor...' : 'Sınavı Kaydet' }}
          </button>
        </div>

        <p v-if="examFormState.error" class="error form-error-banner">{{ examFormState.error }}</p>
        <p v-if="examFormState.success" class="status success">{{ examFormState.success }}</p>
      </form>
    </section>

    <section class="card" v-if="isTeacher">
      <div class="section-headline">
        <div>
          <p class="eyebrow">Taslaklar</p>
          <h2>Bu ders için oluşturduğun sınavlar</h2>
        </div>
        <button class="ghost" type="button" @click="refreshTeacherExams">Yenile</button>
      </div>
      <p v-if="teacherExamError" class="error">{{ teacherExamError }}</p>
      <p v-if="teacherExamsLoading">Sınavlar yükleniyor...</p>
      <div v-if="teacherExams.length" class="exam-list">
        <article v-for="exam in teacherExams" :key="exam.id" class="exam-summary">
          <header>
            <div>
              <strong>{{ exam.title }}</strong>
              <p class="subtitle">{{ exam.description || 'Açıklama belirtilmemiş' }}</p>
            </div>
            <span class="pill">{{ exam.status }}</span>
          </header>
          <dl>
            <div>
              <dt>Zaman Aralığı</dt>
              <dd>{{ exam.opensAt?.replace('T', ' ') }} → {{ exam.closesAt?.replace('T', ' ') }}</dd>
            </div>
            <div>
              <dt>Toplam Puan</dt>
              <dd>{{ exam.totalScore ?? 0 }}</dd>
            </div>
            <div>
              <dt>Süre limiti</dt>
              <dd>{{ exam.timeLimitMinutes ? exam.timeLimitMinutes + 'dk' : 'Sınav bitişine kadar' }}</dd>
            </div>
          </dl>
        </article>
      </div>
      <p v-else-if="!teacherExamsLoading" class="hint">Henüz sınav oluşturmadın.</p>
    </section>

    <section class="card" v-if="isStudent">
      <div class="section-headline">
        <div>
          <p class="eyebrow">Öğrenci Alanı</p>
          <h2>Aktif sınavlar</h2>
          <p class="subtitle">Kayıtlı olduğun dersler için açık sınavları görüntüle ve yanıtla.</p>
        </div>
        <label>
          Ders seç
          <select v-model.number="selectedStudentLectureId">
            <option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">
              {{ lecture.name }}
            </option>
          </select>
        </label>
      </div>
      <p v-if="availableExamError" class="error">{{ availableExamError }}</p>
      <p v-if="availableExamsLoading">Sınavlar yükleniyor...</p>
      <div class="available-exams" v-if="availableExams.length">
        <article v-for="exam in availableExams" :key="exam.id" class="exam-available-card">
          <div>
            <strong>{{ exam.title }}</strong>
            <p class="subtitle">{{ exam.description || 'Açıklama belirtilmemiş' }}</p>
            <p class="hint">
              {{ exam.opensAt?.replace('T', ' ') }} → {{ exam.closesAt?.replace('T', ' ') }}
            </p>
          </div>
          <button type="button" @click="beginAttempt(exam.id)" :disabled="attemptState.loading">
            Başlat
          </button>
        </article>
      </div>
      <p v-else-if="!availableExamsLoading" class="hint">Bu ders için açık sınav bulunmuyor.</p>

      <div v-if="attemptState.examPlay" class="exam-player">
        <header>
          <div>
            <p class="eyebrow">Sınav devam ediyor</p>
            <h3>{{ attemptState.examPlay.summary.title }}</h3>
          </div>
          <div class="pill">
            {{ attemptState.examPlay.summary.timeLimitMinutes
              ? attemptState.examPlay.summary.timeLimitMinutes + ' dk'
              : 'Sınav bitişine kadar' }}
          </div>
        </header>
        <div class="question-stack play">
          <article v-for="(question, index) in attemptState.examPlay.questions" :key="question.id" class="question-player">
            <header>
              <strong>Soru {{ index + 1 }}</strong>
              <span class="pill">{{ question.points }} puan</span>
            </header>
            <p>{{ question.prompt }}</p>
            <div v-if="question.textAnswerRequired">
              <textarea
                v-model="attemptState.answers[question.id].answerText"
                rows="3"
                placeholder="Yanıtını yaz"
              ></textarea>
            </div>
            <div v-else class="option-column">
              <label
                v-for="option in question.options"
                :key="option.id"
                class="option-choice"
              >
                <input
                  type="radio"
                  :name="`question_${question.id}`"
                  :value="option.id"
                  v-model="attemptState.answers[question.id].selectedOptionId"
                />
                <span>{{ option.content }}</span>
              </label>
            </div>
          </article>
        </div>
        <div class="action-row">
          <button
            type="button"
            class="ghost"
            @click="
              attemptState.examPlay = null;
              attemptState.activeAttempt = null;
              attemptState.answers = {};
            "
          >
            Vazgeç
          </button>
          <button
            type="button"
            :disabled="attemptState.submitting || !allQuestionsAnswered"
            @click="submitActiveAttempt"
          >
            {{ attemptState.submitting ? 'Gönderiliyor...' : 'Sınavı Gönder' }}
          </button>
        </div>
        <p v-if="attemptState.error" class="error">{{ attemptState.error }}</p>
      </div>

      <div v-if="attemptState.result" class="exam-result card">
        <header>
          <p class="eyebrow">Sonuç</p>
          <h3>Toplam Puan: {{ attemptState.result.score ?? 0 }}</h3>
          <p class="subtitle">
            {{ attemptState.result.status }} • Başlangıç:
            {{ attemptState.result.startedAt?.replace('T', ' ') }} • Teslim:
            {{ attemptState.result.submittedAt?.replace('T', ' ') }}
          </p>
        </header>
        <div class="question-stack play">
          <article v-for="answer in attemptState.result.answers" :key="answer.questionId" class="question-player">
            <header>
              <strong>{{ answer.prompt }}</strong>
              <span class="pill" :class="{ success: answer.correct, danger: answer.correct === false }">
                {{ answer.correct ? 'Doğru' : answer.correct === false ? 'Yanlış' : 'Beklemede' }}
              </span>
            </header>
            <p v-if="answer.answerText">Yanıtın: {{ answer.answerText }}</p>
            <p v-else-if="answer.selectedOptionId">Seçtiğin seçenek ID: {{ answer.selectedOptionId }}</p>
            <p class="hint">Puan: {{ answer.scoreAwarded ?? 0 }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.exams-layout {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.question-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-stack.play .question-player {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem;
}

.exam-list,
.available-exams {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exam-summary,
.exam-available-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.exam-summary header,
.exam-player > header,
.question-player header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.exam-summary dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.exam-summary dt {
  font-size: 0.8rem;
  color: #94a3b8;
}

.exam-summary dd {
  margin: 0;
  font-weight: 600;
}

.exam-available-card {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.exam-player {
  margin-top: 1.5rem;
  border: 1px solid #c7d2fe;
  border-radius: 16px;
  padding: 1.25rem;
  background: #eef2ff;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-choice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
}

.exam-result {
  margin-top: 1.5rem;
  background: #ecfccb;
  border: 1px solid #bef264;
}

.status.success {
  color: #059669;
}

.pill.success {
  background: #d1fae5;
  color: #065f46;
}

.pill.danger {
  background: #fee2e2;
  color: #b91c1c;
}
</style>

