import { createRouter, createWebHistory } from 'vue-router';
import { pinia } from '../stores';
import { useAuthStore } from '../stores/auth';

const LoginView = () => import('../views/LoginView.vue');
const RegisterView = () => import('../views/RegisterView.vue');
const DashboardView = () => import('../views/DashboardView.vue');
const LecturesView = () => import('../views/LecturesView.vue');
const ScheduleView = () => import('../views/ScheduleView.vue');
const ClassroomsView = () => import('../views/ClassroomsView.vue');
const ScheduleSlotsView = () => import('../views/ScheduleSlotsView.vue');
const GradeComponentsView = () => import('../views/GradeComponentsView.vue');
const EnrollmentsView = () => import('../views/EnrollmentsView.vue');
const UsersView = () => import('../views/UsersView.vue');
const BootstrapView = () => import('../views/BootstrapView.vue');

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { guestOnly: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: '/lectures',
    name: 'lectures',
    component: LecturesView,
    meta: { requiresAuth: true },
  },
  {
    path: '/schedules',
    name: 'schedules',
    component: ScheduleView,
    meta: { requiresAuth: true },
  },
  {
    path: '/classrooms',
    name: 'classrooms',
    component: ClassroomsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/slots',
    name: 'slots',
    component: ScheduleSlotsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/grade-components',
    name: 'gradeComponents',
    component: GradeComponentsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/enrollments',
    name: 'enrollments',
    component: EnrollmentsView,
    meta: { requiresAuth: true, roles: ['ADMIN', 'TEACHER'] },
  },
  {
    path: '/users',
    name: 'users',
    component: UsersView,
    meta: { requiresAuth: true, roles: ['ADMIN'] },
  },
  {
    path: '/bootstrap',
    name: 'bootstrap',
    component: BootstrapView,
    meta: { requiresAuth: true, roles: ['ADMIN'] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _, next) => {
  const authStore = useAuthStore(pinia);

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.roles && !authStore.hasAnyRole(to.meta.roles)) {
    return next({ name: 'dashboard' });
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  return next();
});

export default router;
