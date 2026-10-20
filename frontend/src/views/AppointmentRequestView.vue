<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRoute } from 'vue-router';
import { useServicesStore } from '../stores/services';
import { request } from '../services/api';
import { formatMoney } from '../utils/money';
const route = useRoute();
const services = useServicesStore();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());
const blank = () => ({ nombreSolicitante: '', correo: '', telefono: '', servicio: '', fechaPreferida: '', mensaje: '' });
const form = reactive(blank());
const loading = ref(true), busy = ref(false), error = ref(''), notice = ref(''), fields = ref({});
const selected = computed(() => services.publicItems.find(item => item._id === form.servicio));
const dirty = computed(() => ['nombreSolicitante', 'correo', 'telefono', 'mensaje'].some(key => form[key].trim()));
async function load() {
  loading.value = true; error.value = '';
  try {
    await services.loadPublic();
    // Servicio elegido desde el botón "Solicitar cita" del catálogo.
    const wanted = typeof route.query.servicio === 'string' ? route.query.servicio : '';
    if (services.publicItems.some(item => item._id === wanted)) form.servicio = wanted;
  } catch (err) { error.value = err.message; } finally { loading.value = false; }
}
async function send() {
  busy.value = true; error.value = ''; notice.value = ''; fields.value = {};
  try { const data = await request('/solicitudes-cita', { method: 'POST', body: JSON.stringify(form) }); Object.assign(form, blank()); notice.value = data.message; }
  catch (err) { error.value = err.message; fields.value = err.fields || {}; } finally { busy.value = false; }
}
onMounted(load);
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tu solicitud no se ha enviado. ¿Quieres salir y descartarla?')));
</script>

<template>
  <section class="page-heading"><p class="eyebrow">SOLICITUD DE CITA</p><h1>Solicita tu cita</h1><p class="intro">Envía tus datos y una fecha preferida. El centro te contactará para confirmar el horario; la solicitud no reserva un espacio automáticamente.</p></section>
  <p v-if="loading" class="empty-state" role="status">Cargando servicios…</p>
  <section v-else-if="error && !services.publicItems.length" class="feedback error" role="alert"><p>{{ error }}</p><button class="button secondary" @click="load">Reintentar</button></section>
  <section v-else class="form-panel" aria-labelledby="request-title"><h2 id="request-title">Datos de la solicitud</h2>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
    <form @submit.prevent="send"><fieldset :disabled="busy"><legend class="sr-only">Datos del solicitante y del servicio</legend>
      <label for="req-name">Nombre del solicitante</label><input id="req-name" v-model.trim="form.nombreSolicitante" required maxlength="120" autocomplete="name" :aria-invalid="Boolean(fields.nombreSolicitante)"><small v-if="fields.nombreSolicitante" class="error">{{ fields.nombreSolicitante }}</small>
      <div class="form-row"><div><label for="req-email">Correo electrónico</label><input id="req-email" v-model.trim="form.correo" required type="email" maxlength="254" autocomplete="email" :aria-invalid="Boolean(fields.correo)"><small v-if="fields.correo" class="error">{{ fields.correo }}</small></div>
      <div><label for="req-phone">Teléfono</label><input id="req-phone" v-model.trim="form.telefono" required type="tel" maxlength="30" autocomplete="tel" :aria-invalid="Boolean(fields.telefono)"><small v-if="fields.telefono" class="error">{{ fields.telefono }}</small></div></div>
      <div class="form-row"><div><label for="req-service">Servicio</label><select id="req-service" v-model="form.servicio" required :aria-invalid="Boolean(fields.servicio)"><option value="" disabled>Selecciona un servicio</option><option v-for="item in services.publicItems" :key="item._id" :value="item._id">{{ item.nombre }}</option></select><small v-if="selected">{{ selected.duracionMinutos }} minutos · {{ formatMoney(selected.precioCentavos) }}</small><small v-if="fields.servicio" class="error">{{ fields.servicio }}</small></div>
      <div><label for="req-date">Fecha preferida</label><input id="req-date" v-model="form.fechaPreferida" required type="date" :min="today" :aria-invalid="Boolean(fields.fechaPreferida)"><small v-if="fields.fechaPreferida" class="error">{{ fields.fechaPreferida }}</small></div></div>
      <label for="req-message">Mensaje adicional (opcional)</label><textarea id="req-message" v-model.trim="form.mensaje" rows="4" maxlength="2000" :aria-invalid="Boolean(fields.mensaje)"></textarea><small v-if="fields.mensaje" class="error">{{ fields.mensaje }}</small>
      <div class="actions"><button class="button">{{ busy ? 'Enviando…' : 'Enviar solicitud' }}</button></div>
    </fieldset></form>
  </section>
</template>
