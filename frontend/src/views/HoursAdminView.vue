<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import AdminNavigation from '../components/AdminNavigation.vue';
import { dayNames, weekOrder, useHoursStore } from '../stores/hours';
const store = useHoursStore();
const days = reactive([]);
const loading = ref(true), loaded = ref(false), busy = ref(false), error = ref(''), notice = ref(''), saved = ref('');
const fields = ref({});
const dirty = computed(() => loaded.value && JSON.stringify(days) !== saved.value);
function assign(data) { days.splice(0, days.length, ...weekOrder.map(dia => { const day = data.dias.find(item => item.dia === dia); return { ...day, inicio: day.inicio || '08:00', fin: day.fin || '17:00' }; })); saved.value = JSON.stringify(days); }
async function load() { loading.value = true; error.value = ''; try { await store.load(); if (store.error) throw new Error(store.error); assign(store.hours); loaded.value = true; } catch (err) { error.value = err.message; } finally { loading.value = false; } }
function discard() { days.splice(0, days.length, ...JSON.parse(saved.value)); fields.value = {}; error.value = ''; notice.value = ''; }
async function save() { error.value = ''; notice.value = ''; fields.value = {}; days.forEach((day, index) => { if (day.abierto && (!day.inicio || !day.fin || day.inicio >= day.fin)) fields.value[`dias.${index}`] = 'El cierre debe ser posterior a la apertura.'; }); if (Object.keys(fields.value).length) { error.value = 'Revisa los horarios de atención.'; return; } busy.value = true; try { assign(await store.save(days.map(day => ({ ...day, inicio: day.abierto ? day.inicio : null, fin: day.abierto ? day.fin : null })))); notice.value = 'Horarios guardados. La página pública ya utiliza la nueva configuración.'; } catch (err) { error.value = err.message; fields.value = err.fields || {}; } finally { busy.value = false; } }
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?')));
onMounted(load);
</script>
<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Configurar horarios</h1><p class="intro">Define los días de atención y sus horas de apertura y cierre.</p></section><AdminNavigation /><p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p><p v-if="loading" class="empty-state" role="status">Cargando horarios…</p><div v-else-if="!loaded" class="empty-state"><button class="button secondary" @click="load">Reintentar</button></div>
  <form v-else class="hours-editor" @submit.prevent="save"><fieldset :disabled="busy"><legend class="sr-only">Horario semanal</legend><p class="eyebrow">HORA DE GUATEMALA · FORMATO DE 24 HORAS</p><p>Configura un intervalo por día. Marca como cerrados los días sin atención.</p>
    <div v-for="(day, index) in days" :key="day.dia" class="day-editor"><div class="day-heading"><h2>{{ dayNames[day.dia] }}</h2><label class="checkbox-label"><input v-model="day.abierto" type="checkbox" :aria-label="`${dayNames[day.dia]} abierto`">Abierto</label></div><div class="day-times"><div><label :for="`inicio-${day.dia}`">Apertura</label><input :id="`inicio-${day.dia}`" v-model="day.inicio" type="time" :disabled="!day.abierto" :required="day.abierto" :aria-label="`Apertura ${dayNames[day.dia]}`"></div><div><label :for="`fin-${day.dia}`">Cierre</label><input :id="`fin-${day.dia}`" v-model="day.fin" type="time" :disabled="!day.abierto" :required="day.abierto" :aria-label="`Cierre ${dayNames[day.dia]}`"></div></div><small v-if="fields[`dias.${index}`]" class="error">{{ fields[`dias.${index}`] }}</small></div>
    <p v-if="fields.dias" class="error">{{ fields.dias }}</p><div class="actions"><button class="button" :disabled="!dirty">{{ busy ? 'Guardando…' : 'Guardar horarios' }}</button><button class="button secondary" type="button" :disabled="!dirty" @click="discard">Descartar cambios</button></div><p class="editor-status" role="status">{{ dirty ? 'Hay cambios sin guardar.' : 'No hay cambios pendientes.' }}</p>
  </fieldset></form>
</template>
