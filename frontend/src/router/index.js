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
    { path: '/:pathMatch(.*)*', component: NotFoundView },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
