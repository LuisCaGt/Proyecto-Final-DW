import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import AboutView from '../views/AboutView.vue';
import NotFoundView from '../views/NotFoundView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'inicio', component: HomeView },
    { path: '/acerca-de', name: 'acerca', component: AboutView },
    { path: '/nosotros', name: 'nosotros', component: () => import('../views/InstitutionView.vue') },
    { path: '/admin/contenido', name: 'admin-contenido', component: () => import('../views/ContentAdminView.vue') },
    { path: '/servicios', name: 'servicios', component: () => import('../views/ServicesView.vue') },
    { path: '/admin/servicios', name: 'admin-servicios', component: () => import('../views/ServicesAdminView.vue') },
    { path: '/horarios', name: 'horarios', component: () => import('../views/HoursView.vue') },
    { path: '/admin/horarios', name: 'admin-horarios', component: () => import('../views/HoursAdminView.vue') },
    { path: '/admin/carrusel', name: 'admin-carrusel', component: () => import('../views/CarouselAdminView.vue') },
    { path: '/educativo', name: 'educativo', component: () => import('../views/EducationView.vue') },
    { path: '/corporativo', name: 'corporativo', component: () => import('../views/CorporateView.vue') },
    { path: '/admin/publicaciones', name: 'admin-publicaciones', component: () => import('../views/EducationAdminView.vue') },
    { path: '/admin/actividades', name: 'admin-actividades', component: () => import('../views/CorporateAdminView.vue') },
    { path: '/contacto', name: 'contacto', component: () => import('../views/ContactView.vue') },
    { path: '/admin/contacto', name: 'admin-contacto', component: () => import('../views/ContactAdminView.vue') },
    { path: '/admin/mensajes', name: 'admin-mensajes', component: () => import('../views/MessagesAdminView.vue') },
    { path: '/:pathMatch(.*)*', component: NotFoundView },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
