import { defineStore } from 'pinia';
import { request } from '../services/api';

export const useContentStore = defineStore('content', {
  state: () => ({ content: null, loading: true, error: '' }),
  actions: {
    async load() {
      this.loading = true; this.error = '';
      try { this.content = await request('/contenido'); }
      catch (error) { this.error = error.message; }
      finally { this.loading = false; }
    },
    async save(data) {
      const content = await request('/contenido/principal', { method: 'PUT', body: JSON.stringify(data) });
      this.content = content;
      this.error = '';
      return content;
    },
  },
});
