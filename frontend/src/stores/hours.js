import { defineStore } from 'pinia';
import { request } from '../services/api';
export const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const weekOrder = [1, 2, 3, 4, 5, 6, 0];
export const useHoursStore = defineStore('hours', {
  state: () => ({ hours: null, loading: false, error: '' }),
  actions: {
    async load() { this.loading = true; this.error = ''; try { this.hours = await request('/horarios'); } catch (err) { this.error = err.message; } finally { this.loading = false; } },
    async save(dias) { this.hours = await request('/horarios', { method: 'PUT', body: JSON.stringify({ dias }) }); return this.hours; },
  },
});
