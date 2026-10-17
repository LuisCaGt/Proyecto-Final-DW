<script setup>
import { computed, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useContentStore } from '../stores/content';
import { request } from '../services/api';
const store = useContentStore();
const blank = () => ({ nombre: '', correo: '', telefono: '', asunto: '', mensaje: '' });
const form = reactive(blank());
const busy = ref(false), error = ref(''), notice = ref(''), fields = ref({});
const dirty = computed(() => Object.values(form).some(value => value.trim()));
async function send() { busy.value = true; error.value = ''; notice.value = ''; fields.value = {}; try { const data = await request('/contacto', { method: 'POST', body: JSON.stringify(form) }); Object.assign(form,blank()); notice.value = data.message; } catch (err) { error.value = err.message; fields.value = err.fields || {}; } finally { busy.value = false; } }
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tu mensaje no se ha enviado. ¿Quieres salir y descartarlo?')));
</script>
<template>
  <section class="page-heading"><p class="eyebrow">ESTAMOS PARA ESCUCHARTE</p><h1>Contacto</h1><p class="intro">Consulta la información del centro o escríbenos un mensaje.</p></section>
  <div class="contact-grid"><section class="contact-details" aria-labelledby="contact-details-title"><h2 id="contact-details-title">Conversemos</h2><p v-if="store.loading" role="status">Cargando información…</p><template v-else-if="store.content?.contacto"><p class="public-copy">{{ store.content.contacto.texto }}</p><dl><dt>Correo electrónico</dt><dd><a :href="`mailto:${store.content.contacto.correo}`">{{ store.content.contacto.correo }}</a></dd><dt>Teléfono</dt><dd><a :href="`tel:${store.content.contacto.telefono.replace(/[^+\d]/g,'')}`">{{ store.content.contacto.telefono }}</a></dd><dt>Dirección</dt><dd class="public-copy">{{ store.content.contacto.direccion }}</dd></dl><RouterLink class="text-button" to="/horarios">Consulta nuestros horarios →</RouterLink></template></section>
  <section class="form-panel" aria-labelledby="contact-form-title"><h2 id="contact-form-title">Envíanos un mensaje</h2><p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p><form @submit.prevent="send"><fieldset :disabled="busy"><legend class="sr-only">Datos de contacto y mensaje</legend>
    <label for="contact-name">Nombre</label><input id="contact-name" v-model.trim="form.nombre" required maxlength="120" autocomplete="name" :aria-invalid="Boolean(fields.nombre)"><small v-if="fields.nombre" class="error">{{ fields.nombre }}</small>
    <div class="form-row"><div><label for="contact-email">Correo electrónico</label><input id="contact-email" v-model.trim="form.correo" required type="email" maxlength="254" autocomplete="email" :aria-invalid="Boolean(fields.correo)"><small v-if="fields.correo" class="error">{{ fields.correo }}</small></div><div><label for="contact-phone">Teléfono</label><input id="contact-phone" v-model.trim="form.telefono" required type="tel" maxlength="30" autocomplete="tel" :aria-invalid="Boolean(fields.telefono)"><small v-if="fields.telefono" class="error">{{ fields.telefono }}</small></div></div>
    <label for="contact-subject">Asunto</label><input id="contact-subject" v-model.trim="form.asunto" required maxlength="160" :aria-invalid="Boolean(fields.asunto)"><small v-if="fields.asunto" class="error">{{ fields.asunto }}</small><label for="contact-message">Mensaje</label><textarea id="contact-message" v-model.trim="form.mensaje" required rows="6" maxlength="5000" :aria-invalid="Boolean(fields.mensaje)"></textarea><small v-if="fields.mensaje" class="error">{{ fields.mensaje }}</small><div class="actions"><button class="button">{{ busy ? 'Enviando…' : 'Enviar mensaje' }}</button></div></fieldset></form></section></div>
</template>
