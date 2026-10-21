<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { formatMoney } from '../utils/money';
const labels = { PENDIENTE: 'Pendiente', ATENDIDA: 'Atendida', RECHAZADA: 'Rechazada' };
const filters = reactive({ buscar: '', estado: 'PENDIENTE' });
const applied = ref({ buscar: '', estado: 'PENDIENTE' });
const result = ref({ solicitudes: [], total: 0, pagina: 1, totalPaginas: 0 });
const loading = ref(true), busy = ref(false), error = ref(''), notice = ref(''), selected = ref(null), motivo = ref(''), rejecting = ref(false), rejectDialog = ref(null);
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
// Abre el diálogo de confirmación del rechazo.
async function openReject() { motivo.value = ''; rejecting.value = true; await nextTick(); rejectDialog.value.showModal(); }
function closeReject() { if (!busy.value) rejecting.value = false; }
async function reject() {
  busy.value = true; error.value = ''; notice.value = '';
  try {
    selected.value = await request(`/solicitudes-cita/${selected.value._id}/rechazar`, { method: 'PATCH', body: JSON.stringify(motivo.value ? { motivo: motivo.value } : {}) });
    notice.value = 'Solicitud rechazada.'; rejecting.value = false; await load(result.value.pagina);
  } catch (err) { error.value = err.message; rejecting.value = false; } finally { busy.value = false; }
}
// Convertir en cita
const appointmentLabels = { PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());
const fullName = person => `${person.nombres} ${person.apellidos}`;
const options = ref(null), converting = ref(false), convertDialog = ref(null), convertError = ref(''), convertFields = ref({});
const convertForm = reactive({ paciente: '', servicio: '', profesional: '', fecha: '', horaInicio: '', observaciones: '' });
const activePatients = computed(() => options.value?.pacientes.filter(item => item.estado === 'ACTIVO') || []);
const activeProfessionals = computed(() => options.value?.profesionales.filter(item => item.estado === 'ACTIVO') || []);
const convertService = computed(() => options.value?.servicios.find(item => item._id === convertForm.servicio));
const convertHours = computed(() => convertForm.fecha && options.value ? options.value.horario.find(day => day.dia === new Date(`${convertForm.fecha}T12:00:00Z`).getUTCDay()) : null);
async function openConvert() {
  convertError.value = ''; convertFields.value = {};
  try { if (!options.value) options.value = await request('/citas/opciones'); }
  catch (err) { error.value = err.message; return; }
  const sol = selected.value;
  // Precarga lo que pidió el solicitante; la recepcionista ajusta lo necesario.
  Object.assign(convertForm, {
    paciente: '', profesional: '', horaInicio: '',
    servicio: options.value.servicios.some(item => item._id === sol.servicio?._id) ? sol.servicio._id : '',
    fecha: sol.fechaPreferida >= today ? sol.fechaPreferida : today,
    observaciones: sol.mensaje ? `Solicitud: ${sol.mensaje}` : '',
  });
  converting.value = true; await nextTick(); convertDialog.value.showModal();
}
function closeConvert() { if (!busy.value) converting.value = false; }
async function convert() {
  busy.value = true; convertError.value = ''; convertFields.value = {};
  try {
    selected.value = await request(`/solicitudes-cita/${selected.value._id}/convertir`, { method: 'POST', body: JSON.stringify(convertForm) });
    converting.value = false;
    notice.value = `Cita programada para el ${formatDay(selected.value.cita.fecha)} de ${selected.value.cita.horaInicio} a ${selected.value.cita.horaFin}.`;
    await load(result.value.pagina);
  } catch (err) { convertError.value = err.message; convertFields.value = err.fields || {}; } finally { busy.value = false; }
}
onMounted(() => load());
</script>

<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Solicitudes de cita</h1><p class="intro">Revisa las solicitudes enviadas desde el portal y conviértelas en citas o recházalas.</p></section><AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <form class="inbox-filters" @submit.prevent="search"><div><label for="req-search">Nombre, correo o teléfono</label><input id="req-search" v-model.trim="filters.buscar" type="search" maxlength="120"></div><div><label for="req-state">Estado</label><select id="req-state" v-model="filters.estado"><option value="">Todos</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></div><button class="button secondary" :disabled="loading || busy">Buscar</button></form>
  <div class="inbox-grid">
    <section class="list-panel"><h2>Bandeja</h2><p v-if="loading" role="status">Cargando solicitudes…</p><template v-else><p>{{ result.total }} {{ result.total === 1 ? 'solicitud' : 'solicitudes' }}</p>
      <p v-if="!result.solicitudes.length" class="empty-state">No hay solicitudes que mostrar.</p>
      <ul v-else class="message-list"><li v-for="item in result.solicitudes" :key="item._id"><button class="message-open" :disabled="busy" :aria-pressed="selected?._id === item._id" @click="open(item)"><span class="service-line"><strong>{{ item.nombreSolicitante }}</strong><span class="badge" :class="item.estado === 'PENDIENTE' ? 'activo' : 'inactivo'">{{ labels[item.estado] }}</span></span><span>{{ item.servicio?.nombre || 'Servicio no disponible' }}</span><small>Prefiere: {{ formatDay(item.fechaPreferida) }}</small><small>Recibida {{ formatDate(item.createdAt) }}</small></button></li></ul>
      <div v-if="result.totalPaginas > 1" class="pagination"><button class="button secondary" :disabled="result.pagina <= 1 || busy" @click="load(result.pagina - 1)">Anterior</button><span>{{ result.pagina }} / {{ result.totalPaginas }}</span><button class="button secondary" :disabled="result.pagina >= result.totalPaginas || busy" @click="load(result.pagina + 1)">Siguiente</button></div>
    </template></section>
    <section class="message-detail form-panel" aria-labelledby="req-detail-title"><h2 id="req-detail-title">Detalle</h2>
      <template v-if="selected"><dl><dt>Solicitante</dt><dd>{{ selected.nombreSolicitante }}</dd><dt>Correo</dt><dd>{{ selected.correo }}</dd><dt>Teléfono</dt><dd>{{ selected.telefono }}</dd><dt>Servicio</dt><dd>{{ selected.servicio?.nombre }}</dd><dt>Fecha preferida</dt><dd>{{ formatDay(selected.fechaPreferida) }}</dd><dt>Estado</dt><dd>{{ labels[selected.estado] }}</dd><template v-if="selected.motivoRechazo"><dt>Motivo de rechazo</dt><dd>{{ selected.motivoRechazo }}</dd></template><template v-if="selected.cita"><dt>Cita generada</dt><dd>{{ formatDay(selected.cita.fecha) }}, {{ selected.cita.horaInicio }} – {{ selected.cita.horaFin }} · {{ appointmentLabels[selected.cita.estado] }} <RouterLink to="/admin/citas">Ver en citas →</RouterLink></dd></template></dl>
        <p v-if="selected.mensaje" class="message-body">{{ selected.mensaje }}</p>
        <div v-if="selected.estado === 'PENDIENTE'" class="actions"><button class="button" :disabled="busy" @click="openConvert">Convertir en cita</button><button class="button secondary" :disabled="busy" @click="openReject">Rechazar solicitud</button></div>
      </template><p v-else class="empty-state">Selecciona una solicitud para ver sus datos.</p>
    </section>
  </div>
  <dialog v-if="rejecting" ref="rejectDialog" class="confirm-panel" aria-labelledby="reject-title" @cancel.prevent="closeReject">
    <h2 id="reject-title">¿Rechazar solicitud?</h2>
    <p><strong>{{ selected?.nombreSolicitante }}</strong> · {{ selected?.servicio?.nombre }}</p>
    <p>La solicitud quedará como rechazada y no podrá convertirse en cita. Esta acción no se puede deshacer.</p>
    <label for="req-reason">Motivo de rechazo (opcional)</label><textarea id="req-reason" v-model.trim="motivo" rows="3" maxlength="500" :disabled="busy"></textarea>
    <div class="actions"><button class="button" :disabled="busy" @click="reject">{{ busy ? 'Guardando…' : 'Rechazar' }}</button><button class="button secondary" :disabled="busy" autofocus @click="closeReject">Cancelar</button></div>
  </dialog>
  <dialog v-if="converting" ref="convertDialog" class="confirm-panel convert-dialog" aria-labelledby="convert-title" @cancel.prevent="closeConvert">
    <h2 id="convert-title">Convertir en cita</h2>
    <p>Solicitud de <strong>{{ selected?.nombreSolicitante }}</strong> · prefiere el {{ formatDay(selected?.fechaPreferida) }}.</p>
    <p v-if="convertError" class="feedback error" role="alert">{{ convertError }}</p>
    <form @submit.prevent="convert"><fieldset :disabled="busy"><legend class="sr-only">Datos de la cita</legend>
      <label for="cv-patient">Paciente</label><select id="cv-patient" v-model="convertForm.paciente" required><option value="" disabled>Selecciona un paciente</option><option v-for="item in activePatients" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select><small v-if="convertFields.paciente" class="error">{{ convertFields.paciente }}</small>
      <div class="form-row">
        <div><label for="cv-service">Servicio</label><select id="cv-service" v-model="convertForm.servicio" required><option value="" disabled>Selecciona un servicio</option><option v-for="item in options.servicios" :key="item._id" :value="item._id">{{ item.nombre }}</option></select><small v-if="convertService">{{ convertService.duracionMinutos }} min · {{ formatMoney(convertService.precioCentavos) }}</small><small v-if="convertFields.servicio" class="error">{{ convertFields.servicio }}</small></div>
        <div><label for="cv-professional">Profesional</label><select id="cv-professional" v-model="convertForm.profesional" required><option value="" disabled>Selecciona un profesional</option><option v-for="item in activeProfessionals" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select><small v-if="convertFields.profesional" class="error">{{ convertFields.profesional }}</small></div>
      </div>
      <div class="form-row">
        <div><label for="cv-date">Fecha</label><input id="cv-date" v-model="convertForm.fecha" type="date" required :min="today"><small v-if="convertHours">{{ convertHours.abierto ? `Atención de ${convertHours.inicio} a ${convertHours.fin}` : 'El centro no atiende este día' }}</small><small v-if="convertFields.fecha" class="error">{{ convertFields.fecha }}</small></div>
        <div><label for="cv-start">Hora de inicio</label><input id="cv-start" v-model="convertForm.horaInicio" type="time" required step="300"><small v-if="convertFields.horaInicio" class="error">{{ convertFields.horaInicio }}</small></div>
      </div>
      <label for="cv-notes">Observaciones administrativas</label><textarea id="cv-notes" v-model.trim="convertForm.observaciones" rows="3" maxlength="2000"></textarea>
      <div class="actions"><button class="button">{{ busy ? 'Guardando…' : 'Programar cita' }}</button><button type="button" class="button secondary" autofocus @click="closeConvert">Cancelar</button></div>
    </fieldset></form>
  </dialog>
</template>

<style scoped>
.convert-dialog{max-width:600px}
</style>
