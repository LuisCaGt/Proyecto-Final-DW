import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { useAuthStore } from './stores/auth.js';
import './style.css';
import './people.css';

const pinia = createPinia();
const auth = useAuthStore(pinia);
window.addEventListener('sigca:session-expired', () => {
	auth.logout();
	router.replace({ name: 'login' });
});
createApp(App).use(pinia).use(router).mount('#app');
