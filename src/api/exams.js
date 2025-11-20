import httpClient from './httpClient';

export const fetchLectureExams = (lectureId) =>
  httpClient.get(`/api/exams/lecture/${lectureId}`);

export const fetchAvailableExams = (lectureId) =>
  httpClient.get(`/api/exams/lecture/${lectureId}/available`);

export const createExam = (payload) => httpClient.post('/api/exams', payload);

export const updateExam = (examId, payload) => httpClient.put(`/api/exams/${examId}`, payload);

export const startExamAttempt = (examId) =>
  httpClient.post(`/api/exams/${examId}/attempts`);

export const submitExamAttempt = (examId, attemptId, payload) =>
  httpClient.post(`/api/exams/${examId}/attempts/${attemptId}/submit`, payload);

export const fetchAttempt = (examId, attemptId) =>
  httpClient.get(`/api/exams/${examId}/attempts/${attemptId}`);

