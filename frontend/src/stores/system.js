import { defineStore } from 'pinia';

export const useSystemStore = defineStore('system', {
  state: () => ({ status: 'idle', message: 'Sin comprobar' }),
  actions: {
    async checkConnection() {
      this.status = 'loading';
      this.message = 'Comprobando conexión…';
      try {
        const response = await fetch('/api/health', { signal: AbortSignal.timeout(8000) });
        const data = await response.json();
        if (!response.ok || data.database !== 'connected') throw new Error('unavailable');
        this.status = 'success';
        this.message = 'API y MongoDB conectados';
      } catch {
        this.status = 'error';
        this.message = 'No se pudo conectar. Comprueba que la API y MongoDB estén ejecutándose.';
      }
    },
  },
});
