import { defineStore } from 'pinia';
import { request } from '../services/api';
export const activityTypes = { CAPACITACION: 'Capacitación', ESCUELA_PARA_PADRES: 'Escuela para padres', OTRA: 'Otra actividad' };
export const useEditorialStore = defineStore('editorial', {
  state: () => ({ publicItems: { publicaciones: [], actividades: [] }, adminItems: { publicaciones: [], actividades: [] } }),
  actions: {
    async loadPublic(endpoint) { this.publicItems[endpoint] = await request(`/${endpoint}`); },
    async loadAdmin(endpoint) { this.adminItems[endpoint] = await request(`/admin/${endpoint}`); },
    async save(endpoint, data, id) {
      const item = await request(id ? `/${endpoint}/${id}` : `/${endpoint}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
      this.adminItems[endpoint] = [item, ...this.adminItems[endpoint].filter(entry => entry._id !== item._id)];
    },
    async setState(endpoint, item) {
      const changed = await request(`/${endpoint}/${item._id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }) });
      this.adminItems[endpoint] = this.adminItems[endpoint].map(entry => entry._id === changed._id ? changed : entry);
    },
  },
});
export function formatPublicationDate(value) {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}
