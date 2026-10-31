import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import AboutView from '../views/AboutView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import AccessDeniedView from '../views/AccessDeniedView.vue';
import { useAuthStore } from '../stores/auth.js';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'inicio', component: HomeView },
    { path: '/acerca-de', name: 'acerca', component: AboutView },
    { path: '/nosotros', name: 'nosotros', component: () => import('../views/InstitutionView.vue') },
    { path: '/iniciar-sesion', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true } },
    { path: '/sin-acceso', name: 'sin-acceso', component: AccessDeniedView },
    { path: '/admin/contenido', name: 'admin-contenido', component: () => import('../views/ContentAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/servicios', name: 'servicios', component: () => import('../views/ServicesView.vue') },
    { path: '/admin/servicios', name: 'admin-servicios', component: () => import('../views/ServicesAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/horarios', name: 'horarios', component: () => import('../views/HoursView.vue') },
    { path: '/admin/horarios', name: 'admin-horarios', component: () => import('../views/HoursAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/admin/carrusel', name: 'admin-carrusel', component: () => import('../views/CarouselAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/educativo', name: 'educativo', component: () => import('../views/EducationView.vue') },
    { path: '/corporativo', name: 'corporativo', component: () => import('../views/CorporateView.vue') },
    { path: '/admin/publicaciones', name: 'admin-publicaciones', component: () => import('../views/EducationAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/admin/actividades', name: 'admin-actividades', component: () => import('../views/CorporateAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/contacto', name: 'contacto', component: () => import('../views/ContactView.vue') },
    { path: '/admin/contacto', name: 'admin-contacto', component: () => import('../views/ContactAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/admin/mensajes', name: 'admin-mensajes', component: () => import('../views/MessagesAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/admin/caja', component: () => import('../views/CashAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] } },
    { path: '/admin/pagos', component: () => import('../views/PaymentsAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] } },
    { path: '/admin/pagos/:id/comprobante', component: () => import('../views/PaymentReceiptView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] } },
    { path: '/admin/usuarios', name: 'admin-usuarios', component: () => import('../views/UsersAdminView.vue'), meta: { roles: ['ADMINISTRADOR'] } },
    { path: '/admin/pacientes', name: 'admin-pacientes', component: () => import('../views/PatientsAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] } },
    { path: '/mis-pacientes', name: 'mis-pacientes', component: () => import('../views/PatientsAdminView.vue'), meta: { roles: ['PROFESIONAL'] } },
    { path: '/admin/pacientes/:id', name: 'admin-paciente-detalle', component: () => import('../views/PatientDetailView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'] } },
    { path: '/admin/responsables', name: 'admin-responsables', component: () => import('../views/GuardiansAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] } },
    { path: '/solicitar-cita', name: 'solicitar-cita', component: () => import('../views/AppointmentRequestView.vue') },
    { path: '/admin/calendario', name: 'admin-calendario', component: () => import('../views/CalendarAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'] } },
    { path: '/admin/citas', name: 'admin-citas', component: () => import('../views/AppointmentsAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] } },
    { path: '/admin/materiales', name: 'admin-materiales', component: () => import('../views/MaterialsAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'PROFESIONAL'] } },
    { path: '/admin/solicitudes', name: 'admin-solicitudes', component: () => import('../views/RequestsAdminView.vue'), meta: { roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] } },
    { path: '/:pathMatch(.*)*', component: NotFoundView },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async to => {
  if (!to.meta.roles && !to.meta.guestOnly) return true;
  const auth = useAuthStore();
  await auth.restore();
  if (to.meta.guestOnly && auth.authenticated) return auth.user.rol === 'PROFESIONAL' ? '/mis-pacientes' : '/admin/pacientes';
  if (to.meta.roles && !auth.authenticated) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.meta.roles && !to.meta.roles.includes(auth.user.rol)) return { name: 'sin-acceso' };
  return true;
});

export default router;
