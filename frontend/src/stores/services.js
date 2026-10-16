import { defineStore } from 'pinia';
import { request } from '../services/api';

export const useServicesStore = defineStore('services', {
  state: () => ({ publicItems: [], adminItems: [] }),
  actions: {
    async loadPublic() { this.publicItems = await request('/servicios'); },
    async loadAdmin() { this.adminItems = await request('/admin/servicios'); },
    async save(data, id) {
      const saved = await request(id ? `/servicios/${id}` : '/servicios', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
      this.adminItems = [...this.adminItems.filter(item => item._id !== saved._id), saved].sort((a,b) => a.nombre.localeCompare(b.nombre));
      return saved;
    },
    async setState(item) {
      const saved = await request(`/servicios/${item._id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }) });
      this.adminItems = this.adminItems.map(service => service._id === saved._id ? saved : service);
    },
  },
});
