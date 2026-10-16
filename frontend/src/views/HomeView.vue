<script setup>
import { useSystemStore } from '../stores/system';
const system = useSystemStore();
</script>

<template>
  <section class="hero">
    <p class="eyebrow">SISTEMA INTEGRAL DE GESTIÓN</p>
    <h1>Un espacio para conectar<br>atención y bienestar.</h1>
    <p class="intro">SIGCA organizará los servicios, las citas y la atención de un centro de psicología y estimulación auditiva verbal.</p>
    <RouterLink class="button" to="/servicios">Ver servicios <span aria-hidden="true">→</span></RouterLink>
  </section>
  <section class="status-panel" aria-labelledby="status-title">
    <div><p class="eyebrow">AVANCE 01</p><h2 id="status-title">El proyecto comienza aquí</h2><p>La estructura inicial está lista. Los módulos del centro se agregarán en los siguientes avances.</p></div>
    <div class="connection"><button class="button secondary" :disabled="system.status === 'loading'" @click="system.checkConnection">{{ system.status === 'loading' ? 'Comprobando…' : 'Comprobar conexión' }}</button><p role="status" :class="system.status">{{ system.message }}</p></div>
  </section>
  <section class="roadmap" aria-label="Próximos módulos">
    <article><span>01</span><h2>Portal público</h2><p>Información del centro, servicios y contacto.</p><RouterLink class="text-button" to="/servicios">Consultar servicios →</RouterLink></article>
    <article><span>02</span><h2>Gestión de atención</h2><p>Pacientes, responsables y calendario de citas.</p><small>Próximamente</small></article>
    <article><span>03</span><h2>Control administrativo</h2><p>Usuarios, materiales, pagos y caja diaria.</p><small>Próximamente</small></article>
  </section>
</template>
