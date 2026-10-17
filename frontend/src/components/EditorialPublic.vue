<script setup>
import { computed, onMounted, ref } from 'vue';
import { useEditorialStore, activityTypes, formatPublicationDate } from '../stores/editorial';
const props = defineProps({ publication: Boolean });
const endpoint = props.publication ? 'publicaciones' : 'actividades';
const store = useEditorialStore();
const loading = ref(true), error = ref(''), search = ref(''), type = ref('TODOS');
const items = computed(() => store.publicItems[endpoint].filter(item => item.titulo.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()) && (props.publication || type.value === 'TODOS' || item.tipo === type.value)));
async function load() { loading.value = true; error.value = ''; try { await store.loadPublic(endpoint); } catch (err) { error.value = err.message; } finally { loading.value = false; } }
function fallback(event) { event.target.onerror = null; event.target.src = '/images/servicio.svg'; }
onMounted(load);
</script>
<template>
  <section class="page-heading"><p class="eyebrow">{{ publication ? 'PARA NUESTRA COMUNIDAD' : 'ESPACIOS PARA COMPARTIR' }}</p><h1>{{ publication ? 'Contenido educativo' : 'Corporativo' }}</h1><p class="intro">{{ publication ? 'Publicaciones informativas y recursos compartidos por el centro.' : 'Conoce nuestras capacitaciones, escuela para padres y actividades de la comunidad.' }}</p></section>
  <div class="editorial-filters"><div><label for="buscar-contenido">Buscar por título</label><input id="buscar-contenido" v-model="search" type="search" placeholder="Escribe un título"></div><div v-if="!publication"><label for="tipo-actividad">Tipo de actividad</label><select id="tipo-actividad" v-model="type"><option value="TODOS">Todas las actividades</option><option v-for="(label,key) in activityTypes" :key="key" :value="key">{{ label }}</option></select></div></div>
  <p v-if="loading" class="empty-state" role="status">Cargando contenido…</p><div v-else-if="error" class="feedback error" role="alert"><p>{{ error }}</p><button class="button secondary" @click="load">Reintentar</button></div><p v-else-if="!items.length" class="empty-state">No hay {{ publication ? 'publicaciones' : 'actividades' }} que mostrar.</p>
  <section v-else class="editorial-cards" :aria-label="publication ? 'Publicaciones educativas' : 'Actividades corporativas'"><article v-for="item in items" :key="item._id" class="editorial-card">
    <img v-if="publication && item.imagen" class="editorial-cover" :src="item.imagen" :alt="item.titulo" loading="lazy" referrerpolicy="no-referrer" @error="fallback">
    <div v-else-if="!publication" class="activity-gallery" :class="{ 'single-image': item.imagenes.length === 1 }"><img v-for="(image,index) in item.imagenes" :key="`${image}-${index}`" :src="image" :alt="`${item.titulo}, imagen ${index + 1}`" loading="lazy" referrerpolicy="no-referrer" @error="fallback"></div>
    <div class="editorial-card-body"><p class="eyebrow">{{ publication ? 'PUBLICACIÓN EDUCATIVA' : activityTypes[item.tipo] }}</p><h2>{{ item.titulo }}</h2><time v-if="publication" :datetime="item.fechaPublicacion">{{ formatPublicationDate(item.fechaPublicacion) }}</time><p class="editorial-description">{{ item.descripcion }}</p><a v-if="publication && item.enlace" class="text-button resource-link" :href="item.enlace" target="_blank" rel="noopener noreferrer">Abrir recurso ↗<span class="sr-only"> (se abre en otra pestaña)</span></a></div>
  </article></section>
</template>
