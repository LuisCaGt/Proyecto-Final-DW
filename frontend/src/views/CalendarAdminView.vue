<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { formatMoney } from '../utils/money';

const labels = { PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' };
const colors = { PENDIENTE: '#b7832f', CONFIRMADA: '#2d6a9f', COMPLETADA: '#3f7a4f', CANCELADA: '#8a8a8a' };
const fullName = person => person ? `${person.nombres} ${person.apellidos}` : 'No disponible';
const formatDay = value => new Intl.DateTimeFormat('es-GT', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
const addDays = (fecha, n) => { const d = new Date(`${fecha}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());

const calendar = ref(null);
const professionals = ref([]);
const filters = reactive({ profesional: '', estado: '' });
const citas = ref([]);           // citas del rango visible
const loading = ref(false), error = ref('');
const selectedDate = ref(today), selected = ref(null);
const dayCitas = computed(() => citas.value.filter(cita => cita.fecha === selectedDate.value));

// FullCalendar pide los eventos cada vez que cambia el mes visible; se consultan a la API REST.
async function fetchEvents(info, success, failure) {
  loading.value = true; error.value = '';
  const params = new URLSearchParams({ desde: info.startStr.slice(0, 10), hasta: addDays(info.endStr.slice(0, 10), -1) });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  try {
    citas.value = await request(`/citas/calendario?${params}`);
    success(citas.value.map(cita => ({
      id: cita._id, title: fullName(cita.paciente), start: `${cita.fecha}T${cita.horaInicio}`, end: `${cita.fecha}T${cita.horaFin}`,
      backgroundColor: colors[cita.estado], borderColor: colors[cita.estado], textColor: '#fff',
      classNames: cita.estado === 'CANCELADA' ? ['cita-cancelada'] : [], extendedProps: { cita },
    })));
  } catch (err) { error.value = err.message; failure(err); }
  finally { loading.value = false; }
}

// Opciones fijas: el día elegido se resalta con la selección nativa de FullCalendar.
const calendarOptions = {
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth', locale: esLocale, height: 'auto', fixedWeekCount: false,
  headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
  dayMaxEvents: 3, displayEventEnd: true,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  events: fetchEvents,
  selectable: true, unselectAuto: false, selectAllow: info => info.end - info.start === 86400000,
  select: info => { selectedDate.value = info.startStr; selected.value = null; },
  eventClick: info => { selected.value = info.event.extendedProps.cita; selectedDate.value = selected.value.fecha; info.view.calendar.select(selected.value.fecha); },
};

watch(filters, () => calendar.value?.getApi().refetchEvents());
onMounted(async () => {
  calendar.value?.getApi().select(today);
  try { professionals.value = (await request('/citas/opciones')).profesionales; } catch (err) { error.value = err.message; }
});
</script>

<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Calendario de citas</h1><p class="intro">Visualiza las citas por mes, selecciona un día para ver su agenda y una cita para consultar sus detalles.</p></section><AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p>

  <div class="inbox-filters">
    <div><label for="cal-professional">Profesional</label><select id="cal-professional" v-model="filters.profesional"><option value="">Todos</option><option v-for="item in professionals" :key="item._id" :value="item._id">{{ fullName(item) }}{{ item.estado === 'INACTIVO' ? ' (inactivo)' : '' }}</option></select></div>
    <div><label for="cal-state">Estado</label><select id="cal-state" v-model="filters.estado"><option value="">Todos</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></div>
    <ul class="legend" aria-label="Colores por estado"><li v-for="(label, key) in labels" :key="key"><span :style="{ background: colors[key] }"></span>{{ label }}</li></ul>
  </div>

  <div class="calendar-layout">
    <section class="list-panel calendar-panel" :aria-busy="loading"><FullCalendar ref="calendar" :options="calendarOptions" /></section>

    <section class="form-panel day-panel" aria-labelledby="day-title">
      <template v-if="selected">
        <button class="text-button" @click="selected = null"><span aria-hidden="true">←</span> Citas del día</button>
        <h2 id="day-title">Detalle de la cita</h2>
        <dl>
          <dt>Paciente</dt><dd>{{ fullName(selected.paciente) }}</dd>
          <dt>Servicio</dt><dd>{{ selected.servicio?.nombre }} · {{ selected.duracionMinutos }} min</dd>
          <dt>Profesional</dt><dd>{{ fullName(selected.profesional) }}</dd>
          <dt>Fecha</dt><dd>{{ formatDay(selected.fecha) }}</dd>
          <dt>Horario</dt><dd>{{ selected.horaInicio }} – {{ selected.horaFin }}</dd>
          <dt>Estado</dt><dd><span class="state" :style="{ background: colors[selected.estado] }">{{ labels[selected.estado] }}</span></dd>
          <dt>Precio</dt><dd>{{ formatMoney(selected.precioCentavos) }}</dd>
          <template v-if="selected.observaciones"><dt>Observaciones</dt><dd>{{ selected.observaciones }}</dd></template>
        </dl>
        <RouterLink class="button secondary" to="/admin/citas">Gestionar en Citas</RouterLink>
      </template>
      <template v-else>
        <h2 id="day-title">{{ formatDay(selectedDate) }}</h2>
        <p v-if="!dayCitas.length" class="empty-state">No hay citas este día.</p>
        <ul v-else class="day-list"><li v-for="cita in dayCitas" :key="cita._id"><button type="button" @click="selected = cita">
          <span class="dot" :style="{ background: colors[cita.estado] }" aria-hidden="true"></span>
          <span class="day-info"><strong>{{ cita.horaInicio }} – {{ cita.horaFin }} · {{ fullName(cita.paciente) }}</strong><small>{{ cita.servicio?.nombre }} · {{ fullName(cita.profesional) }}</small><small>{{ labels[cita.estado] }}</small></span>
        </button></li></ul>
      </template>
    </section>
  </div>
</template>

<style scoped>
.calendar-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:20px;align-items:start}
.calendar-panel{padding:16px;overflow-x:auto}
.legend{list-style:none;display:flex;flex-wrap:wrap;gap:12px;margin:0;padding:0;align-self:end;font-size:13px}
.legend li{display:flex;align-items:center;gap:6px}
.legend span,.dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}
.day-panel dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:12px 0 18px}
.day-panel dt{color:#65736a;font-size:13px}
.day-panel dd{margin:0}
.state{color:#fff;font-size:12px;border-radius:20px;padding:2px 10px}
.day-list{list-style:none;margin:0;padding:0}
.day-list button{all:unset;box-sizing:border-box;width:100%;cursor:pointer;display:flex;gap:10px;align-items:flex-start;padding:12px 6px;border-top:1px solid #e2e8e0}
.day-list button:hover,.day-list button:focus-visible{background:#f6f8f3}
.dot{margin-top:6px}
.day-info{display:flex;flex-direction:column;gap:3px}
.day-info small{color:#65736a}
:deep(.fc .fc-highlight){background:#e3eddc}
:deep(.fc .fc-daygrid-day){cursor:pointer}
:deep(.fc .cita-cancelada .fc-event-title){text-decoration:line-through}
:deep(.fc .fc-button){text-transform:capitalize}
@media (max-width:900px){.calendar-layout{grid-template-columns:1fr}}
</style>
