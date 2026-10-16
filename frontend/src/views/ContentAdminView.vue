<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { request } from '../services/api';
import { useContentStore } from '../stores/content';
import AdminNavigation from '../components/AdminNavigation.vue';
import CenterLogo from '../components/CenterLogo.vue';
const store = useContentStore();
const form = reactive({ nombreCentro: '', logo: '', tituloInicio: '', descripcionInicio: '', mision: '', vision: '' });
const loading = ref(true);
const loaded = ref(false);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const fields = ref({});
const saved = ref('');
const dirty = computed(() => loaded.value && JSON.stringify(form) !== saved.value);
function assign(data) { for (const key of Object.keys(form)) form[key] = data[key]; saved.value = JSON.stringify(form); }
async function load() {
  loading.value = true; error.value = '';
  try { assign(await request('/contenido')); loaded.value = true; }
  catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}
async function save() {
  busy.value = true; error.value = ''; notice.value = ''; fields.value = {};
  try { assign(await store.save({ ...form })); notice.value = 'Contenido guardado. Los cambios ya se muestran en el portal.'; }
  catch (err) { error.value = err.message; fields.value = err.fields || {}; }
  finally { busy.value = false; }
}
function discard() { Object.assign(form, JSON.parse(saved.value)); fields.value = {}; error.value = ''; notice.value = ''; }
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?')));
onMounted(load);
</script>
<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Contenido institucional</h1><p class="intro">Actualiza la identidad y la presentación del centro.</p></section>
  <AdminNavigation />
  <p class="dev-note">Vista de desarrollo local. La autenticación y los permisos de administrador están pendientes de integración.</p>
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <p v-if="loading" class="empty-state" role="status">Cargando contenido…</p>
  <div v-else-if="!loaded" class="empty-state"><button class="button secondary" @click="load">Reintentar</button></div>
  <form v-else class="content-editor" @submit.prevent="save">
    <fieldset :disabled="busy"><legend class="sr-only">Información institucional</legend>
      <section class="form-panel"><h2>Identidad del centro</h2><div class="identity-fields"><div><label for="centro">Nombre del centro</label><input id="centro" v-model.trim="form.nombreCentro" required maxlength="100" :aria-invalid="Boolean(fields.nombreCentro)"><small v-if="fields.nombreCentro" class="error">{{ fields.nombreCentro }}</small><label for="logo">URL del logo</label><input id="logo" v-model.trim="form.logo" required maxlength="2048" :aria-invalid="Boolean(fields.logo)"><small>Usa HTTP/HTTPS o conserva /images/logo.svg.</small><small v-if="fields.logo" class="error">{{ fields.logo }}</small></div><div class="identity-preview"><CenterLogo :src="form.logo"/><span>{{ form.nombreCentro || 'Nombre del centro' }}</span><small>Vista previa de la identidad</small></div></div></section>
      <section class="form-panel"><h2>Presentación de inicio</h2><label for="titulo">Título principal</label><input id="titulo" v-model.trim="form.tituloInicio" required maxlength="180" :aria-invalid="Boolean(fields.tituloInicio)"><small v-if="fields.tituloInicio" class="error">{{ fields.tituloInicio }}</small><label for="informacion">Información principal</label><textarea id="informacion" v-model.trim="form.descripcionInicio" required maxlength="1500" rows="4" :aria-invalid="Boolean(fields.descripcionInicio)"></textarea><small v-if="fields.descripcionInicio" class="error">{{ fields.descripcionInicio }}</small></section>
      <section class="form-panel"><h2>Misión y visión</h2><label for="mision">Misión</label><textarea id="mision" v-model.trim="form.mision" required maxlength="3000" rows="5" :aria-invalid="Boolean(fields.mision)"></textarea><small v-if="fields.mision" class="error">{{ fields.mision }}</small><label for="vision">Visión</label><textarea id="vision" v-model.trim="form.vision" required maxlength="3000" rows="5" :aria-invalid="Boolean(fields.vision)"></textarea><small v-if="fields.vision" class="error">{{ fields.vision }}</small></section>
      <div class="editor-actions"><div class="actions"><button class="button" type="submit" :disabled="!dirty">{{ busy ? 'Guardando…' : 'Guardar contenido' }}</button><button class="button secondary" type="button" :disabled="!dirty" @click="discard">Descartar cambios</button></div><p class="editor-status" role="status">{{ dirty ? 'Hay cambios sin guardar.' : 'No hay cambios pendientes.' }}</p></div>
    </fieldset>
  </form>
</template>
