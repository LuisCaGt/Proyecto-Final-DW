<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { formatMoney } from '../utils/money';

const labels = { PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' };
// Mismas transiciones que valida el backend (RN-05, RN-06).
const transitions = { PENDIENTE: ['CONFIRMADA', 'CANCELADA'], CONFIRMADA: ['COMPLETADA', 'CANCELADA'], COMPLETADA: [], CANCELADA: [] };
const actionLabels = { CONFIRMADA: 'Confirmar', COMPLETADA: 'Marcar como completada', CANCELADA: 'Cancelar cita' };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());
const fullName = person => person ? `${person.nombres} ${person.apellidos}` : 'No disponible';
const formatDay = value => new Intl.DateTimeFormat('es-GT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

// Opciones del formulario
const options = ref({ pacientes: [], profesionales: [], servicios: [], horario: [] });
const activePatients = computed(() => options.value.pacientes.filter(item => item.estado === 'ACTIVO'));
const activeProfessionals = computed(() => options.value.profesionales.filter(item => item.estado === 'ACTIVO'));
const blank = () => ({ paciente: '', servicio: '', profesional: '', fecha: '', horaInicio: '', observaciones: '' });
const form = reactive(blank());
const loadingOptions = ref(true), busy = ref(false), error = ref(''), notice = ref(''), fields = ref({});
const service = computed(() => options.value.servicios.find(item => item._id === form.servicio));
const dayHours = computed(() => form.fecha ? options.value.horario.find(day => day.dia === new Date(`${form.fecha}T12:00:00Z`).getUTCDay()) : null);
// Vista previa de la hora de finalización (el cálculo definitivo lo hace el backend, RN-12).
const endPreview = computed(() => {
  if (!service.value || !/^\d{2}:\d{2}$/.test(form.horaInicio)) return '';
  const [h, m] = form.horaInicio.split(':').map(Number), total = h * 60 + m + service.value.duracionMinutos;
  return total >= 1440 ? 'después de medianoche' : `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
});

// Listado
const filters = reactive({ paciente: '', profesional: '', estado: '', desde: today, hasta: '' });
const result = ref({ citas: [], total: 0, pagina: 1, totalPaginas: 0 });
const loading = ref(true), listError = ref('');
let loadVersion = 0;

async function loadOptions() {
  loadingOptions.value = true; error.value = '';
  try { options.value = await request('/citas/opciones'); }
  catch (err) { error.value = err.message; } finally { loadingOptions.value = false; }
}
async function load(page = 1) {
  const version = ++loadVersion; loading.value = true; listError.value = '';
  const params = new URLSearchParams({ pagina: String(page), limite: '10' });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  try { const data = await request(`/citas?${params}`); if (version === loadVersion) result.value = data; }
  catch (err) { if (version === loadVersion) listError.value = err.message; }
  finally { if (version === loadVersion) loading.value = false; }
}
async function save() {
  busy.value = true; error.value = ''; notice.value = ''; fields.value = {};
  try {
    const cita = await request('/citas', { method: 'POST', body: JSON.stringify(form) });
    notice.value = `Cita programada para ${fullName(cita.paciente)} el ${formatDay(cita.fecha)} de ${cita.horaInicio} a ${cita.horaFin}.`;
    Object.assign(form, blank()); await load(1);
  } catch (err) { error.value = err.message; fields.value = err.fields || {}; }
  finally { busy.value = false; }
}
// Detalle y acciones sobre una cita
const selected = ref(null), mode = ref('detail'), dialog = ref(null), dialogBusy = ref(false), dialogError = ref(''), dialogFields = ref({}), motivo = ref('');
const reprogram = reactive({ profesional: '', fecha: '', horaInicio: '', observaciones: '' });
const reprogramHours = computed(() => reprogram.fecha ? options.value.horario.find(day => day.dia === new Date(`${reprogram.fecha}T12:00:00Z`).getUTCDay()) : null);
async function openDetail(cita) {
  selected.value = cita; mode.value = 'detail'; dialogError.value = ''; dialogFields.value = {}; notice.value = '';
  await nextTick(); if (!dialog.value.open) dialog.value.showModal();
}
function closeDetail() { if (!dialogBusy.value) { dialog.value?.close(); selected.value = null; } }
function startReprogram() {
  Object.assign(reprogram, { profesional: selected.value.profesional?._id || '', fecha: selected.value.fecha, horaInicio: selected.value.horaInicio, observaciones: selected.value.observaciones || '' });
  mode.value = 'reprogram'; dialogError.value = ''; dialogFields.value = {};
}
function startAction(estado) { if (estado === 'CANCELADA') { motivo.value = ''; mode.value = 'cancel'; } else changeState(estado); }
async function afterChange(cita, message) { selected.value = cita; mode.value = 'detail'; notice.value = message; await load(result.value.pagina); }
async function changeState(estado) {
  dialogBusy.value = true; dialogError.value = '';
  try {
    const body = { estado, ...(estado === 'CANCELADA' && motivo.value ? { motivo: motivo.value } : {}) };
    const cita = await request(`/citas/${selected.value._id}/estado`, { method: 'PATCH', body: JSON.stringify(body) });
    await afterChange(cita, `Cita ${labels[estado].toLowerCase()}.`);
  } catch (err) { dialogError.value = err.message; } finally { dialogBusy.value = false; }
}
async function saveReprogram() {
  dialogBusy.value = true; dialogError.value = ''; dialogFields.value = {};
  try {
    const cita = await request(`/citas/${selected.value._id}`, { method: 'PUT', body: JSON.stringify(reprogram) });
    await afterChange(cita, `Cita actualizada: ${formatDay(cita.fecha)} de ${cita.horaInicio} a ${cita.horaFin}.`);
  } catch (err) { dialogError.value = err.message; dialogFields.value = err.fields || {}; } finally { dialogBusy.value = false; }
}
// Historial por paciente: todas sus citas, sin límite de fechas.
function showHistory(paciente) {
  Object.assign(filters, { paciente: paciente._id, profesional: '', estado: '', desde: '', hasta: '' });
  closeDetail(); load(1);
}
const historyPatient = computed(() => filters.paciente ? options.value.pacientes.find(item => item._id === filters.paciente) : null);
onMounted(() => { loadOptions(); load(); });
</script>

<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Citas</h1><p class="intro">Programa citas y consulta la agenda de los profesionales.</p></section><AdminNavigation />

  <section class="form-panel" aria-labelledby="new-appointment"><h2 id="new-appointment">Programar cita</h2>
    <p v-if="loadingOptions" role="status">Cargando opciones…</p>
    <template v-else>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
      <form @submit.prevent="save"><fieldset :disabled="busy"><legend class="sr-only">Datos de la cita</legend>
        <div class="form-row">
          <div><label for="ap-patient">Paciente</label><select id="ap-patient" v-model="form.paciente" required :aria-invalid="Boolean(fields.paciente)"><option value="" disabled>Selecciona un paciente</option><option v-for="item in activePatients" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select><small v-if="fields.paciente" class="error">{{ fields.paciente }}</small></div>
          <div><label for="ap-professional">Profesional</label><select id="ap-professional" v-model="form.profesional" required :aria-invalid="Boolean(fields.profesional)"><option value="" disabled>Selecciona un profesional</option><option v-for="item in activeProfessionals" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select><small v-if="fields.profesional" class="error">{{ fields.profesional }}</small></div>
        </div>
        <label for="ap-service">Servicio</label><select id="ap-service" v-model="form.servicio" required :aria-invalid="Boolean(fields.servicio)"><option value="" disabled>Selecciona un servicio</option><option v-for="item in options.servicios" :key="item._id" :value="item._id">{{ item.nombre }}</option></select>
        <small v-if="service">{{ service.duracionMinutos }} minutos · {{ formatMoney(service.precioCentavos) }}</small><small v-if="fields.servicio" class="error">{{ fields.servicio }}</small>
        <div class="form-row">
          <div><label for="ap-date">Fecha</label><input id="ap-date" v-model="form.fecha" type="date" required :min="today" :aria-invalid="Boolean(fields.fecha)"><small v-if="dayHours">{{ dayHours.abierto ? `Atención de ${dayHours.inicio} a ${dayHours.fin}` : 'El centro no atiende este día' }}</small><small v-if="fields.fecha" class="error">{{ fields.fecha }}</small></div>
          <div><label for="ap-start">Hora de inicio</label><input id="ap-start" v-model="form.horaInicio" type="time" required step="300" :aria-invalid="Boolean(fields.horaInicio)"><small v-if="endPreview">Finaliza a las {{ endPreview }}</small><small v-if="fields.horaInicio" class="error">{{ fields.horaInicio }}</small></div>
        </div>
        <label for="ap-notes">Observaciones administrativas (opcional)</label><textarea id="ap-notes" v-model.trim="form.observaciones" rows="3" maxlength="2000"></textarea>
        <div class="actions"><button class="button">{{ busy ? 'Guardando…' : 'Programar cita' }}</button></div>
      </fieldset></form>
    </template>
  </section>

  <form class="inbox-filters" @submit.prevent="load(1)">
    <div><label for="f-patient">Paciente</label><select id="f-patient" v-model="filters.paciente"><option value="">Todos</option><option v-for="item in options.pacientes" :key="item._id" :value="item._id">{{ fullName(item) }}{{ item.estado === 'INACTIVO' ? ' (inactivo)' : '' }}</option></select></div>
    <div><label for="f-professional">Profesional</label><select id="f-professional" v-model="filters.profesional"><option value="">Todos</option><option v-for="item in options.profesionales" :key="item._id" :value="item._id">{{ fullName(item) }}{{ item.estado === 'INACTIVO' ? ' (inactivo)' : '' }}</option></select></div>
    <div><label for="f-state">Estado</label><select id="f-state" v-model="filters.estado"><option value="">Todos</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></div>
    <div><label for="f-from">Desde</label><input id="f-from" v-model="filters.desde" type="date"></div>
    <div><label for="f-to">Hasta</label><input id="f-to" v-model="filters.hasta" type="date" :min="filters.desde || undefined"></div>
    <button class="button secondary" :disabled="loading">Filtrar</button>
  </form>

  <section class="list-panel"><h2>{{ historyPatient ? `Historial de ${fullName(historyPatient)}` : 'Agenda' }}</h2>
    <p v-if="listError" class="feedback error" role="alert">{{ listError }}</p>
    <p v-if="loading" role="status">Cargando citas…</p>
    <template v-else><p>{{ result.total }} {{ result.total === 1 ? 'cita' : 'citas' }}</p>
      <p v-if="!result.citas.length" class="empty-state">No hay citas con esos filtros.</p>
      <ul v-else class="appointment-list"><li v-for="cita in result.citas" :key="cita._id"><button type="button" class="appointment-item" @click="openDetail(cita)">
        <div class="appointment-time"><strong>{{ formatDay(cita.fecha) }}</strong><span>{{ cita.horaInicio }} – {{ cita.horaFin }}</span></div>
        <div class="appointment-info"><strong>{{ fullName(cita.paciente) }}</strong><span>{{ cita.servicio?.nombre }} · {{ fullName(cita.profesional) }}</span><small v-if="cita.observaciones">{{ cita.observaciones }}</small></div>
        <div class="appointment-meta"><span class="state" :class="cita.estado.toLowerCase()">{{ labels[cita.estado] }}</span><span>{{ formatMoney(cita.precioCentavos) }}</span></div>
      </button></li></ul>
      <div v-if="result.totalPaginas > 1" class="pagination"><button class="button secondary" :disabled="result.pagina <= 1" @click="load(result.pagina - 1)">Anterior</button><span>{{ result.pagina }} / {{ result.totalPaginas }}</span><button class="button secondary" :disabled="result.pagina >= result.totalPaginas" @click="load(result.pagina + 1)">Siguiente</button></div>
    </template>
  </section>
  <dialog ref="dialog" class="confirm-panel appointment-dialog" aria-labelledby="ap-dialog-title" @cancel.prevent="closeDetail">
    <template v-if="selected">
      <h2 id="ap-dialog-title">{{ mode === 'reprogram' ? 'Reprogramar cita' : mode === 'cancel' ? '¿Cancelar cita?' : 'Detalle de la cita' }}</h2>
      <p v-if="dialogError" class="feedback error" role="alert">{{ dialogError }}</p>

      <template v-if="mode === 'detail'">
        <dl>
          <dt>Paciente</dt><dd>{{ fullName(selected.paciente) }}</dd>
          <dt>Servicio</dt><dd>{{ selected.servicio?.nombre }} · {{ selected.duracionMinutos }} min</dd>
          <dt>Profesional</dt><dd>{{ fullName(selected.profesional) }}</dd>
          <dt>Fecha y hora</dt><dd>{{ formatDay(selected.fecha) }}, {{ selected.horaInicio }} – {{ selected.horaFin }}</dd>
          <dt>Precio registrado</dt><dd>{{ formatMoney(selected.precioCentavos) }}</dd>
          <dt>Estado</dt><dd><span class="state" :class="selected.estado.toLowerCase()">{{ labels[selected.estado] }}</span></dd>
          <template v-if="selected.observaciones"><dt>Observaciones</dt><dd>{{ selected.observaciones }}</dd></template>
          <template v-if="selected.motivoCancelacion"><dt>Motivo de cancelación</dt><dd>{{ selected.motivoCancelacion }}</dd></template>
          <dt>Creada</dt><dd>{{ new Date(selected.createdAt).toLocaleString('es-GT', { timeZone: 'America/Guatemala' }) }}</dd>
        </dl>
        <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
        <div class="actions">
          <button v-for="estado in transitions[selected.estado].filter(e => e !== 'CANCELADA')" :key="estado" class="button" :disabled="dialogBusy" @click="startAction(estado)">{{ dialogBusy ? 'Guardando…' : actionLabels[estado] }}</button>
          <button v-if="['PENDIENTE', 'CONFIRMADA'].includes(selected.estado)" class="button secondary" :disabled="dialogBusy" @click="startReprogram">Reprogramar</button>
          <button v-if="transitions[selected.estado].includes('CANCELADA')" class="button secondary" :disabled="dialogBusy" @click="startAction('CANCELADA')">Cancelar cita</button>
        </div>
        <div class="actions"><button class="text-button" :disabled="dialogBusy" @click="showHistory(selected.paciente)">Ver historial del paciente</button><button class="button secondary" :disabled="dialogBusy" autofocus @click="closeDetail">Cerrar</button></div>
      </template>

      <form v-else-if="mode === 'reprogram'" @submit.prevent="saveReprogram"><fieldset :disabled="dialogBusy"><legend class="sr-only">Nuevo horario</legend>
        <p>{{ fullName(selected.paciente) }} · {{ selected.servicio?.nombre }} ({{ selected.duracionMinutos }} min). Se conservan el servicio y el precio; si cambia el horario, la cita vuelve a quedar pendiente de confirmación.</p>
        <label for="rp-professional">Profesional</label><select id="rp-professional" v-model="reprogram.profesional" required><option v-for="item in activeProfessionals" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select><small v-if="dialogFields.profesional" class="error">{{ dialogFields.profesional }}</small>
        <div class="form-row">
          <div><label for="rp-date">Fecha</label><input id="rp-date" v-model="reprogram.fecha" type="date" required :min="today"><small v-if="reprogramHours">{{ reprogramHours.abierto ? `Atención de ${reprogramHours.inicio} a ${reprogramHours.fin}` : 'El centro no atiende este día' }}</small><small v-if="dialogFields.fecha" class="error">{{ dialogFields.fecha }}</small></div>
          <div><label for="rp-start">Hora de inicio</label><input id="rp-start" v-model="reprogram.horaInicio" type="time" required step="300"><small v-if="dialogFields.horaInicio" class="error">{{ dialogFields.horaInicio }}</small></div>
        </div>
        <label for="rp-notes">Observaciones administrativas</label><textarea id="rp-notes" v-model.trim="reprogram.observaciones" rows="3" maxlength="2000"></textarea>
        <div class="actions"><button class="button">{{ dialogBusy ? 'Guardando…' : 'Guardar cambios' }}</button><button type="button" class="button secondary" @click="mode = 'detail'">Volver</button></div>
      </fieldset></form>

      <template v-else-if="mode === 'cancel'">
        <p><strong>{{ fullName(selected.paciente) }}</strong> · {{ formatDay(selected.fecha) }}, {{ selected.horaInicio }}</p>
        <p>La cita quedará cancelada y liberará el horario del profesional. Esta acción no se puede deshacer.</p>
        <label for="cancel-reason">Motivo (opcional)</label><textarea id="cancel-reason" v-model.trim="motivo" rows="3" maxlength="500" :disabled="dialogBusy"></textarea>
        <div class="actions"><button class="button" :disabled="dialogBusy" @click="changeState('CANCELADA')">{{ dialogBusy ? 'Guardando…' : 'Cancelar cita' }}</button><button class="button secondary" :disabled="dialogBusy" autofocus @click="mode = 'detail'">Volver</button></div>
      </template>
    </template>
  </dialog>
</template>

<style scoped>
.form-panel{margin-bottom:10px}
.appointment-list{list-style:none;margin:0;padding:0}
.appointment-item{all:unset;box-sizing:border-box;width:100%;cursor:pointer;display:grid;grid-template-columns:150px 1fr auto;gap:18px;align-items:center;padding:16px 0;border-top:1px solid #e2e8e0}
.appointment-item:hover,.appointment-item:focus-visible{background:#f6f8f3;outline:none}
.appointment-item:focus-visible{box-shadow:0 0 0 2px #35573e}
.appointment-dialog{max-width:560px}
.appointment-dialog dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0 0 16px}
.appointment-dialog dt{color:#65736a;font-size:13px}
.appointment-dialog dd{margin:0}
.appointment-time,.appointment-info,.appointment-meta{display:flex;flex-direction:column;gap:4px;min-width:0}
.appointment-time span,.appointment-info span{font-size:14px;color:#55625a}
.appointment-info small{color:#65736a}
.appointment-meta{align-items:flex-end;font-size:14px}
.state{font-size:11px;border-radius:20px;padding:3px 10px;background:#f5efdf;color:#7a5a1d}
.state.confirmada{background:#e4edf5;color:#2d4e6b}
.state.completada{background:#eaf0e4;color:#35573e}
.state.cancelada{background:#eee;color:#666}
@media (max-width:700px){.appointment-item{grid-template-columns:1fr}.appointment-meta{align-items:flex-start}}
</style>
