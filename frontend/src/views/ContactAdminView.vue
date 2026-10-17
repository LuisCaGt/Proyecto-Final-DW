<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { useContentStore } from '../stores/content';
const store = useContentStore();
const form = reactive({ correo:'',telefono:'',direccion:'',texto:'' });
const loading = ref(true), loaded = ref(false), busy = ref(false), error = ref(''), notice = ref(''), saved = ref(''), fields = ref({});
const dirty = computed(() => loaded.value && JSON.stringify(form) !== saved.value);
function assign(data) { for (const key of Object.keys(form)) form[key] = data[key]; saved.value = JSON.stringify(form); }
async function load() { loading.value = true; error.value = ''; try { assign((await request('/contenido')).contacto); loaded.value = true; } catch (err) { error.value = err.message; } finally { loading.value = false; } }
async function save() { busy.value = true; error.value = ''; notice.value = ''; fields.value = {}; try { const data = await request('/contenido/principal/contacto', { method:'PUT',body:JSON.stringify(form) }); store.content = data; store.error = ''; assign(data.contacto); notice.value = 'Información de contacto guardada y actualizada en el portal.'; } catch (err) { error.value = err.message; fields.value = err.fields || {}; } finally { busy.value = false; } }
function discard() { assign(JSON.parse(saved.value)); fields.value = {}; error.value = ''; notice.value = ''; }
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?')));
onMounted(load);
</script>
<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Información de contacto</h1><p class="intro">Actualiza los datos que los visitantes ven en el portal.</p></section><AdminNavigation /><p class="dev-note">Edición habilitada únicamente mediante el acceso administrativo local de desarrollo.</p><p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p><p v-if="loading" class="empty-state" role="status">Cargando información…</p><div v-else-if="!loaded"><button class="button secondary" @click="load">Reintentar</button></div>
  <form v-else class="content-editor" @submit.prevent="save"><fieldset :disabled="busy"><legend class="sr-only">Datos públicos del centro</legend><section class="form-panel"><h2>Datos del centro</h2><label for="config-email">Correo electrónico</label><input id="config-email" v-model.trim="form.correo" required type="email" maxlength="254" :aria-invalid="Boolean(fields.correo)"><small v-if="fields.correo" class="error">{{ fields.correo }}</small><label for="config-phone">Teléfono</label><input id="config-phone" v-model.trim="form.telefono" required type="tel" maxlength="30" :aria-invalid="Boolean(fields.telefono)"><small v-if="fields.telefono" class="error">{{ fields.telefono }}</small><label for="config-address">Dirección</label><textarea id="config-address" v-model.trim="form.direccion" required maxlength="300" rows="3" :aria-invalid="Boolean(fields.direccion)"></textarea><small v-if="fields.direccion" class="error">{{ fields.direccion }}</small><label for="config-text">Texto de presentación</label><textarea id="config-text" v-model.trim="form.texto" required maxlength="1000" rows="4" :aria-invalid="Boolean(fields.texto)"></textarea><small v-if="fields.texto" class="error">{{ fields.texto }}</small><div class="actions"><button class="button" :disabled="!dirty">{{ busy ? 'Guardando…' : 'Guardar contacto' }}</button><button class="button secondary" type="button" :disabled="!dirty" @click="discard">Descartar cambios</button></div><p class="editor-status" role="status">{{ dirty ? 'Hay cambios sin guardar.' : 'No hay cambios pendientes.' }}</p></section></fieldset></form>
</template>
