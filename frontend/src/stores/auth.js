import { defineStore } from 'pinia';
import { request } from '../services/api';

const STORAGE_KEY = 'sigca.session';
let restorePromise;

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: '', user: null, checked: false }),
  getters: {
    authenticated: state => Boolean(state.token && state.user),
    canManagePeople: state => ['ADMINISTRADOR', 'RECEPCIONISTA'].includes(state.user?.rol),
  },
  actions: {
    saveSession(token, user) {
      this.token = token;
      this.user = user;
      this.checked = true;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));
    },
    clearSession() {
      this.token = '';
      this.user = null;
      this.checked = true;
      sessionStorage.removeItem(STORAGE_KEY);
    },
    async login(correo, password) {
      const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ correo, password }) });
      this.saveSession(data.token, data.user);
      return data.user;
    },
    async restore() {
      if (restorePromise) return restorePromise;
      if (this.checked) return this.authenticated;
      restorePromise = (async () => {
        try {
          const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
          if (!saved?.token) return false;
          this.token = saved.token;
          this.user = await request('/auth/me');
          return true;
        } catch {
          this.clearSession();
          return false;
        } finally {
          this.checked = true;
          restorePromise = undefined;
        }
      })();
      return restorePromise;
    },
    logout() {
      this.clearSession();
    },
  },
});
