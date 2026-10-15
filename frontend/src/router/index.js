import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import AboutView from '../views/AboutView.vue';
import NotFoundView from '../views/NotFoundView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'inicio', component: HomeView },
    { path: '/acerca-de', name: 'acerca', component: AboutView },
    { path: '/:pathMatch(.*)*', component: NotFoundView },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
