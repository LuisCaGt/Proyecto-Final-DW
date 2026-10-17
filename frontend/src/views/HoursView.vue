<script setup>
import { computed, onMounted } from 'vue';
import { dayNames, weekOrder, useHoursStore } from '../stores/hours';
const store = useHoursStore();
const days = computed(() => weekOrder.map(dia => store.hours?.dias.find(day => day.dia === dia)).filter(Boolean));
onMounted(() => store.load());
</script>
<template>
  <section class="page-heading"><p class="eyebrow">PLANIFICA TU VISITA</p><h1>Horarios de atención</h1><p class="intro">Consulta nuestros días y horas de atención antes de visitar el centro.</p></section>
  <p v-if="store.loading" class="empty-state" role="status">Cargando horarios…</p><div v-else-if="store.error" class="feedback error" role="alert"><p>{{ store.error }}</p><button class="button secondary" @click="store.load">Reintentar</button></div>
  <section v-else-if="store.hours" class="hours-public"><p class="eyebrow">HORA DE GUATEMALA · UTC−06:00</p><p v-if="days.every(day => !day.abierto)" class="feedback" role="status">El centro no tiene días de atención habilitados por el momento.</p><table class="hours-table"><caption class="sr-only">Horario semanal del centro</caption><thead><tr><th scope="col">Día</th><th scope="col">Atención</th></tr></thead><tbody><tr v-for="day in days" :key="day.dia"><th scope="row">{{ dayNames[day.dia] }}</th><td><span v-if="day.abierto">{{ day.inicio }} – {{ day.fin }}</span><span v-else class="closed-label">Cerrado</span></td></tr></tbody></table><p class="hours-note">Horarios expresados en formato de 24 horas. La atención está sujeta a una cita confirmada.</p><RouterLink class="button secondary" to="/servicios">Consultar servicios →</RouterLink></section>
</template>
