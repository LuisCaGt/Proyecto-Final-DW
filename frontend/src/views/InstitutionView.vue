<script setup>
import { useContentStore } from '../stores/content';
const store = useContentStore();
</script>
<template>
  <p v-if="store.loading" class="empty-state" role="status">Cargando información del centro…</p>
  <template v-else-if="store.content">
    <section class="page-heading"><p class="eyebrow">CONÓCENOS</p><h1>{{ store.content.nombreCentro }}</h1><p class="intro">Un propósito que guía nuestra atención.</p></section>
    <div class="institution-grid"><section class="institution-card" aria-labelledby="mission-title"><span class="section-number">01</span><h2 id="mission-title">Nuestra misión</h2><p>{{ store.content.mision }}</p></section><section class="institution-card" aria-labelledby="vision-title"><span class="section-number">02</span><h2 id="vision-title">Nuestra visión</h2><p>{{ store.content.vision }}</p></section></div>
    <RouterLink class="button institution-link" to="/servicios">Conoce nuestros servicios →</RouterLink>
  </template>
</template>
