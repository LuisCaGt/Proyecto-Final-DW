<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { formatMoney } from '../utils/money';

const labels = { PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());
const fullName = person => person ? `${person.nombres} ${person.apellidos}` : 'No disponible';
const formatDay = value => new Intl.DateTimeFormat('es-GT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

// Opciones del formulario
const options = ref({ pacientes: [], profesionales: [], servicios: [], horario: [] });
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
const filters = reactive({ profesional: '', estado: '', desde: today, hasta: '' });
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
onMounted(() => { loadOptions(); load(); });
</script>

<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Citas</h1><p class="intro">Programa citas y consulta la agenda de los profesionales.</p></section><AdminNavigation />
  <p class="dev-note">Acceso temporal de desarrollo. Pacientes y profesionales son datos provisionales hasta integrar sus módulos.</p>

  <section class="form-panel" aria-labelledby="new-appointment"><h2 id="new-appointment">Programar cita</h2>
    <p v-if="loadingOptions" role="status">Cargando opciones…</p>
    <template v-else>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
      <form @submit.prevent="save"><fieldset :disabled="busy"><legend class="sr-only">Datos de la cita</legend>
        <div class="form-row">
          <div><label for="ap-patient">Paciente</label><select id="ap-patient" v-model="form.paciente" required :aria-invalid="Boolean(fields.paciente)"><option value="" disabled>Selecciona un paciente</option><option v-for="item in options.pacientes" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select><small v-if="fields.paciente" class="error">{{ fields.paciente }}</small></div>
          <div><label for="ap-professional">Profesional</label><select id="ap-professional" v-model="form.profesional" required :aria-invalid="Boolean(fields.profesional)"><option value="" disabled>Selecciona un profesional</option><option v-for="item in options.profesionales" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select><small v-if="fields.profesional" class="error">{{ fields.profesional }}</small></div>
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
    <div><label for="f-professional">Profesional</label><select id="f-professional" v-model="filters.profesional"><option value="">Todos</option><option v-for="item in options.profesionales" :key="item._id" :value="item._id">{{ fullName(item) }}</option></select></div>
    <div><label for="f-state">Estado</label><select id="f-state" v-model="filters.estado"><option value="">Todos</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></div>
    <div><label for="f-from">Desde</label><input id="f-from" v-model="filters.desde" type="date"></div>
    <div><label for="f-to">Hasta</label><input id="f-to" v-model="filters.hasta" type="date" :min="filters.desde || undefined"></div>
    <button class="button secondary" :disabled="loading">Filtrar</button>
  </form>

  <section class="list-panel"><h2>Agenda</h2>
    <p v-if="listError" class="feedback error" role="alert">{{ listError }}</p>
    <p v-if="loading" role="status">Cargando citas…</p>
    <template v-else><p>{{ result.total }} {{ result.total === 1 ? 'cita' : 'citas' }}</p>
      <p v-if="!result.citas.length" class="empty-state">No hay citas con esos filtros.</p>
      <ul v-else class="appointment-list"><li v-for="cita in result.citas" :key="cita._id">
        <div class="appointment-time"><strong>{{ formatDay(cita.fecha) }}</strong><span>{{ cita.horaInicio }} – {{ cita.horaFin }}</span></div>
        <div class="appointment-info"><strong>{{ fullName(cita.paciente) }}</strong><span>{{ cita.servicio?.nombre }} · {{ fullName(cita.profesional) }}</span><small v-if="cita.observaciones">{{ cita.observaciones }}</small></div>
        <div class="appointment-meta"><span class="state" :class="cita.estado.toLowerCase()">{{ labels[cita.estado] }}</span><span>{{ formatMoney(cita.precioCentavos) }}</span></div>
      </li></ul>
      <div v-if="result.totalPaginas > 1" class="pagination"><button class="button secondary" :disabled="result.pagina <= 1" @click="load(result.pagina - 1)">Anterior</button><span>{{ result.pagina }} / {{ result.totalPaginas }}</span><button class="button secondary" :disabled="result.pagina >= result.totalPaginas" @click="load(result.pagina + 1)">Siguiente</button></div>
    </template>
  </section>
</template>

<style scoped>
.form-panel{margin-bottom:10px}
.appointment-list{list-style:none;margin:0;padding:0}
.appointment-list li{display:grid;grid-template-columns:150px 1fr auto;gap:18px;align-items:center;padding:16px 0;border-top:1px solid #e2e8e0}
.appointment-time,.appointment-info,.appointment-meta{display:flex;flex-direction:column;gap:4px;min-width:0}
.appointment-time span,.appointment-info span{font-size:14px;color:#55625a}
.appointment-info small{color:#65736a}
.appointment-meta{align-items:flex-end;font-size:14px}
.state{font-size:11px;border-radius:20px;padding:3px 10px;background:#f5efdf;color:#7a5a1d}
.state.confirmada{background:#e4edf5;color:#2d4e6b}
.state.completada{background:#eaf0e4;color:#35573e}
.state.cancelada{background:#eee;color:#666}
@media (max-width:700px){.appointment-list li{grid-template-columns:1fr}.appointment-meta{align-items:flex-start}}
</style>
