<script setup>
import { computed, ref, watch } from 'vue';
const props = defineProps({ slides: { type: Array, default: () => [] } });
const active = ref(0);
const current = computed(() => props.slides[active.value]);
watch(() => props.slides, () => { active.value = 0; });
function move(step) { active.value = (active.value + step + props.slides.length) % props.slides.length; }
function fallback(event) { event.target.onerror = null; event.target.src = '/images/servicio.svg'; }
</script>
<template>
  <section v-if="current" class="home-carousel" aria-roledescription="carrusel" aria-label="Conoce nuestro centro">
    <div class="carousel-image"><img :key="current.imagen" :src="current.imagen" :alt="current.textoAlternativo" referrerpolicy="no-referrer" @error="fallback"></div>
    <div class="carousel-bottom"><div aria-live="polite" aria-atomic="true"><p class="eyebrow">{{ active + 1 }} / {{ slides.length }}</p><h2>{{ current.titulo }}</h2></div><div class="carousel-arrows"><button class="round-button" aria-label="Imagen anterior" @click="move(-1)">←</button><button class="round-button" aria-label="Imagen siguiente" @click="move(1)">→</button></div></div>
    <div class="carousel-dots" role="group" aria-label="Elegir imagen"><button v-for="(slide, index) in slides" :key="index" :aria-label="`Ver imagen ${index + 1}: ${slide.titulo}`" :aria-current="active === index ? 'true' : undefined" @click="active = index"><span class="sr-only">{{ index + 1 }}</span></button></div>
  </section>
</template>
