<script setup>
import { useContentStore } from '../stores/content';
const store = useContentStore();
</script>
<template>
  <p v-if="store.loading" class="empty-state" role="status">Cargando información del centro…</p>
  <template v-else-if="store.content">
    <section class="hero"><p class="eyebrow">{{ store.content.nombreCentro }}</p><h1>{{ store.content.tituloInicio }}</h1><p class="intro public-copy">{{ store.content.descripcionInicio }}</p><RouterLink class="button" to="/servicios">Ver servicios <span aria-hidden="true">→</span></RouterLink></section>
    <section class="welcome-panel"><div><p class="eyebrow">NUESTRO PROPÓSITO</p><h2>Conoce lo que nos inspira.</h2><p>Descubre la misión y la visión que guían la atención de nuestro centro.</p></div><RouterLink class="button secondary" to="/nosotros">Misión y visión →</RouterLink></section>
  </template>
</template>
