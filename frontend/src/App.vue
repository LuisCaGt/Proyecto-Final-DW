<script setup>
import { onMounted, watch } from 'vue';
import { useContentStore } from './stores/content';
import CenterLogo from './components/CenterLogo.vue';
const store = useContentStore();
onMounted(() => store.load());
watch(() => store.content?.nombreCentro, name => { document.title = name ? `${name} · SIGCA` : 'SIGCA'; });
</script>
<template>
  <header class="header"><div class="container header-inner"><RouterLink class="brand" to="/" :aria-label="`${store.content?.nombreCentro || 'SIGCA'}, inicio`"><CenterLogo :src="store.content?.logo"/><span>{{ store.content?.nombreCentro || 'SIGCA' }}</span></RouterLink><nav aria-label="Navegación principal"><RouterLink to="/">Inicio</RouterLink><RouterLink to="/nosotros">Misión y visión</RouterLink><RouterLink to="/servicios">Servicios</RouterLink><RouterLink to="/admin/contenido">Administración</RouterLink></nav></div></header>
  <main id="contenido" class="container"><div v-if="store.error" class="feedback error" role="alert"><p>No se pudo actualizar la información del centro. {{ store.error }}</p><button class="button secondary" :disabled="store.loading" @click="store.load">Reintentar</button></div><RouterView /></main>
  <footer><div class="container">{{ store.content?.nombreCentro || 'SIGCA' }} · Atención y bienestar</div></footer>
</template>
