<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { useContentStore } from '../stores/content';
const content = useContentStore();
const slides = reactive([]);
const loading = ref(true), loaded = ref(false), busy = ref(false), error = ref(''), notice = ref(''), saved = ref('');
const fields = ref({});
const dirty = computed(() => loaded.value && JSON.stringify(slides) !== saved.value);
let nextKey = 0;
const keys = reactive([]);
function assign(items) { slides.splice(0, slides.length, ...items.map(s => ({ ...s }))); keys.splice(0, keys.length, ...items.map(() => nextKey++)); saved.value = JSON.stringify(slides); }
async function load() { loading.value = true; error.value = ''; try { assign((await request('/contenido')).carrusel); loaded.value = true; } catch (err) { error.value = err.message; } finally { loading.value = false; } }
function add() { if (slides.length < 10) { slides.push({ imagen: '/images/servicio.svg', titulo: '', textoAlternativo: '' }); keys.push(nextKey++); } }
function remove(index) { if (slides.length > 5) { slides.splice(index, 1); keys.splice(index, 1); fields.value = {}; } }
function move(index, step) { const target = index + step; if (target < 0 || target >= slides.length) return; [slides[index], slides[target]] = [slides[target], slides[index]]; [keys[index], keys[target]] = [keys[target], keys[index]]; fields.value = {}; }
function discard() { assign(JSON.parse(saved.value)); fields.value = {}; error.value = ''; notice.value = ''; }
async function save() { busy.value = true; error.value = ''; notice.value = ''; fields.value = {}; try { const data = await request('/contenido/principal/carrusel', { method: 'PUT', body: JSON.stringify({ carrusel: slides }) }); content.content = data; content.error = ''; assign(data.carrusel); notice.value = 'Carrusel guardado. El inicio ya utiliza las imágenes actualizadas.'; } catch (err) { error.value = err.message; fields.value = err.fields || {}; } finally { busy.value = false; } }
function fallback(event) { event.target.onerror = null; event.target.src = '/images/servicio.svg'; }
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?')));
onMounted(load);
</script>
<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Carrusel de inicio</h1><p class="intro">Elige de cinco a diez imágenes y organiza su presentación.</p></section><AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <p v-if="loading" class="empty-state" role="status">Cargando imágenes…</p><div v-else-if="!loaded" class="empty-state"><button class="button secondary" @click="load">Reintentar</button></div>
  <form v-else class="carousel-editor" @submit.prevent="save"><fieldset :disabled="busy"><legend class="sr-only">Imágenes del carrusel</legend>
    <p>{{ slides.length }} imágenes · El orden de esta lista es el orden del carrusel.</p><p v-if="fields.carrusel" class="error">{{ fields.carrusel }}</p>
    <section v-for="(slide, index) in slides" :key="keys[index]" class="slide-editor" :aria-label="`Imagen ${index + 1}`"><div class="slide-preview"><img :key="slide.imagen" :src="slide.imagen" :alt="slide.textoAlternativo || `Vista previa de imagen ${index + 1}`" referrerpolicy="no-referrer" @error="fallback"><span class="badge">Imagen {{ index + 1 }}</span></div><div class="slide-fields"><h2>Imagen {{ index + 1 }}</h2>
      <label :for="`url-${keys[index]}`">URL de imagen</label><input :id="`url-${keys[index]}`" v-model.trim="slide.imagen" required maxlength="2048"><small v-if="fields[`carrusel.${index}.imagen`]" class="error">{{ fields[`carrusel.${index}.imagen`] }}</small>
      <label :for="`titulo-${keys[index]}`">Título</label><input :id="`titulo-${keys[index]}`" v-model.trim="slide.titulo" required maxlength="100"><small v-if="fields[`carrusel.${index}.titulo`]" class="error">{{ fields[`carrusel.${index}.titulo`] }}</small>
      <label :for="`alt-${keys[index]}`">Descripción accesible de la imagen</label><input :id="`alt-${keys[index]}`" v-model.trim="slide.textoAlternativo" required maxlength="180"><small v-if="fields[`carrusel.${index}.textoAlternativo`]" class="error">{{ fields[`carrusel.${index}.textoAlternativo`] }}</small>
      <div class="actions"><button type="button" class="text-button" :disabled="index === 0" :aria-label="`Subir imagen ${index + 1}`" @click="move(index, -1)">Subir ↑</button><button type="button" class="text-button" :disabled="index === slides.length - 1" :aria-label="`Bajar imagen ${index + 1}`" @click="move(index, 1)">Bajar ↓</button><button type="button" class="text-button" :disabled="slides.length <= 5" :aria-label="`Quitar imagen ${index + 1}`" @click="remove(index)">Quitar</button></div><small v-if="fields[`carrusel.${index}`]" class="error">{{ fields[`carrusel.${index}`] }}</small>
    </div></section>
    <button class="button secondary" type="button" :disabled="slides.length >= 10" @click="add">Agregar imagen</button><small>Se necesitan al menos cinco imágenes. Las direcciones deben ser HTTP/HTTPS o recursos de /images/.</small>
    <div class="actions"><button class="button" :disabled="!dirty">{{ busy ? 'Guardando…' : 'Guardar carrusel' }}</button><button class="button secondary" type="button" :disabled="!dirty" @click="discard">Descartar cambios</button></div><p class="editor-status" role="status">{{ dirty ? 'Hay cambios sin guardar.' : 'No hay cambios pendientes.' }}</p>
  </fieldset></form>
</template>
