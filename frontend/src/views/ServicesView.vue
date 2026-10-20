<script setup>
import { onMounted, ref } from 'vue';
import { useServicesStore } from '../stores/services';
import { formatMoney } from '../utils/money';
const store = useServicesStore();
const loading = ref(true);
const error = ref('');
async function load() {
  loading.value = true; error.value = '';
  try { await store.loadPublic(); } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}
function fallback(event) {
  event.target.onerror = null;
  event.target.src = '/images/servicio.svg';
}
onMounted(load);
</script>

<template>
  <section class="page-heading"><p class="eyebrow">NUESTROS SERVICIOS</p><h1>Atención para cada etapa.</h1><p class="intro">Conoce las opciones de acompañamiento del centro y la duración de cada sesión.</p></section>
  <p v-if="loading" class="empty-state" role="status">Cargando servicios…</p>
  <section v-else-if="error" class="feedback error" role="alert"><p>{{ error }}</p><button class="button secondary" @click="load">Reintentar</button></section>
  <p v-else-if="!store.publicItems.length" class="empty-state">No hay servicios disponibles en este momento.</p>
  <section v-else class="service-cards" aria-label="Servicios disponibles">
    <article v-for="item in store.publicItems" :key="item._id" class="service-card">
      <img :src="item.imagen" :alt="item.nombre" loading="lazy" referrerpolicy="no-referrer" @error="fallback">
      <div class="service-card-body"><p class="eyebrow">{{ item.duracionMinutos }} MINUTOS</p><h2>{{ item.nombre }}</h2><p class="service-description">{{ item.descripcion }}</p><p class="service-price">{{ formatMoney(item.precioCentavos) }} <span>/ sesión</span></p><RouterLink class="button secondary" :to="{ name: 'solicitar-cita', query: { servicio: item._id } }">Solicitar cita</RouterLink></div>
    </article>
  </section>
</template>
