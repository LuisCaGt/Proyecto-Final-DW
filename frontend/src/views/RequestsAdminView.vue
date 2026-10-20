<script setup>
import { onMounted, reactive, ref } from 'vue';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
const labels = { PENDIENTE: 'Pendiente', ATENDIDA: 'Atendida', RECHAZADA: 'Rechazada' };
const filters = reactive({ buscar: '', estado: 'PENDIENTE' });
const applied = ref({ buscar: '', estado: 'PENDIENTE' });
const result = ref({ solicitudes: [], total: 0, pagina: 1, totalPaginas: 0 });
const loading = ref(true), busy = ref(false), error = ref(''), notice = ref(''), selected = ref(null), motivo = ref('');
let loadVersion = 0;
const formatDate = value => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(value));
const formatDay = value => new Intl.DateTimeFormat('es-GT', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
async function load(page = 1) {
  const version = ++loadVersion; loading.value = true; error.value = '';
  const params = new URLSearchParams({ pagina: String(page), limite: '10', ...applied.value });
  if (!params.get('estado')) params.delete('estado'); if (!params.get('buscar')) params.delete('buscar');
  try { const data = await request(`/solicitudes-cita?${params}`); if (version === loadVersion) result.value = data; }
  catch (err) { if (version === loadVersion) error.value = err.message; }
  finally { if (version === loadVersion) loading.value = false; }
}
function search() { applied.value = { ...filters }; selected.value = null; load(1); }
function open(item) { selected.value = item; motivo.value = ''; notice.value = ''; error.value = ''; }
async function reject() {
  if (!window.confirm('¿Rechazar esta solicitud? Esta acción no se puede deshacer.')) return;
  busy.value = true; error.value = ''; notice.value = '';
  try {
    selected.value = await request(`/solicitudes-cita/${selected.value._id}/rechazar`, { method: 'PATCH', body: JSON.stringify(motivo.value ? { motivo: motivo.value } : {}) });
    notice.value = 'Solicitud rechazada.'; await load(result.value.pagina);
  } catch (err) { error.value = err.message; } finally { busy.value = false; }
}
onMounted(() => load());
</script>

<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Solicitudes de cita</h1><p class="intro">Revisa las solicitudes enviadas desde el portal y conviértelas en citas o recházalas.</p></section><AdminNavigation />
  <p class="dev-note">Acceso temporal de desarrollo. Al integrar usuarios quedará disponible para ADMINISTRADOR y RECEPCIONISTA.</p>
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <form class="inbox-filters" @submit.prevent="search"><div><label for="req-search">Nombre, correo o teléfono</label><input id="req-search" v-model.trim="filters.buscar" type="search" maxlength="120"></div><div><label for="req-state">Estado</label><select id="req-state" v-model="filters.estado"><option value="">Todos</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></div><button class="button secondary" :disabled="loading || busy">Buscar</button></form>
  <div class="inbox-grid">
    <section class="list-panel"><h2>Bandeja</h2><p v-if="loading" role="status">Cargando solicitudes…</p><template v-else><p>{{ result.total }} {{ result.total === 1 ? 'solicitud' : 'solicitudes' }}</p>
      <p v-if="!result.solicitudes.length" class="empty-state">No hay solicitudes que mostrar.</p>
      <ul v-else class="message-list"><li v-for="item in result.solicitudes" :key="item._id"><button class="message-open" :disabled="busy" :aria-pressed="selected?._id === item._id" @click="open(item)"><span class="service-line"><strong>{{ item.nombreSolicitante }}</strong><span class="badge" :class="item.estado === 'PENDIENTE' ? 'activo' : 'inactivo'">{{ labels[item.estado] }}</span></span><span>{{ item.servicio?.nombre || 'Servicio no disponible' }}</span><small>Prefiere: {{ formatDay(item.fechaPreferida) }}</small><small>Recibida {{ formatDate(item.createdAt) }}</small></button></li></ul>
      <div v-if="result.totalPaginas > 1" class="pagination"><button class="button secondary" :disabled="result.pagina <= 1 || busy" @click="load(result.pagina - 1)">Anterior</button><span>{{ result.pagina }} / {{ result.totalPaginas }}</span><button class="button secondary" :disabled="result.pagina >= result.totalPaginas || busy" @click="load(result.pagina + 1)">Siguiente</button></div>
    </template></section>
    <section class="message-detail form-panel" aria-labelledby="req-detail-title"><h2 id="req-detail-title">Detalle</h2>
      <template v-if="selected"><dl><dt>Solicitante</dt><dd>{{ selected.nombreSolicitante }}</dd><dt>Correo</dt><dd>{{ selected.correo }}</dd><dt>Teléfono</dt><dd>{{ selected.telefono }}</dd><dt>Servicio</dt><dd>{{ selected.servicio?.nombre }}</dd><dt>Fecha preferida</dt><dd>{{ formatDay(selected.fechaPreferida) }}</dd><dt>Estado</dt><dd>{{ labels[selected.estado] }}</dd><template v-if="selected.motivoRechazo"><dt>Motivo de rechazo</dt><dd>{{ selected.motivoRechazo }}</dd></template></dl>
        <p v-if="selected.mensaje" class="message-body">{{ selected.mensaje }}</p>
        <template v-if="selected.estado === 'PENDIENTE'"><label for="req-reason">Motivo de rechazo (opcional)</label><textarea id="req-reason" v-model.trim="motivo" rows="3" maxlength="500"></textarea>
          <div class="actions"><button class="button secondary" :disabled="busy" @click="reject">{{ busy ? 'Guardando…' : 'Rechazar' }}</button><button class="button" disabled title="Disponible al integrar pacientes y citas">Convertir en cita</button></div></template>
      </template><p v-else class="empty-state">Selecciona una solicitud para ver sus datos.</p>
    </section>
  </div>
</template>
