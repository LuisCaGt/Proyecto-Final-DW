<script setup>
import { onBeforeRouteLeave } from 'vue-router';
import AdminNavigation from '../components/AdminNavigation.vue';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useServicesStore } from '../stores/services';
import { formatMoney, toCents } from '../utils/money';
const store = useServicesStore();
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const fields = ref({});
const editingId = ref(null);
const pendingState = ref(null);
const confirmationDialog = ref(null);
watch(pendingState, async (item) => {
  if (item) { await nextTick(); confirmationDialog.value?.showModal(); }
});
const filter = ref('TODOS');
const search = ref('');
const formSection = ref(null);
const blank = () => ({ nombre: '', descripcion: '', duracionMinutos: 60, precio: '', imagen: '/images/servicio.svg', estado: 'ACTIVO' });
const form = reactive(blank());
const saved = ref(JSON.stringify(form));
const dirty = computed(() => saved.value !== JSON.stringify(form));
const visible = computed(() => store.adminItems.filter(item => (filter.value === 'TODOS' || item.estado === filter.value) && item.nombre.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())));
async function load() {
  loading.value = true; error.value = '';
  try { await store.loadAdmin(); } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}
function reset() { editingId.value = null; Object.assign(form, blank()); saved.value = JSON.stringify(form); fields.value = {}; }
function cancel() { if (!dirty.value || window.confirm('¿Descartar los cambios sin guardar?')) reset(); }
function openState(item) {
  if (dirty.value) { error.value = 'Guarda o descarta los cambios del formulario antes de cambiar un estado.'; return; }
  pendingState.value = item;
}
function edit(item) {
  if (dirty.value && !window.confirm('¿Descartar los cambios sin guardar para editar otro servicio?')) return;
  editingId.value = item._id;
  const data = { ...item, precio: (item.precioCentavos / 100).toFixed(2) };
  for (const key of Object.keys(blank())) form[key] = data[key];
  saved.value = JSON.stringify(form);
  fields.value = {}; error.value = ''; notice.value = '';
  formSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function save() {
  busy.value = true; error.value = ''; notice.value = ''; fields.value = {};
  try {
    let precioCentavos;
    try { precioCentavos = toCents(form.precio); } catch (err) { fields.value.precioCentavos = err.message; throw err; }
    const wasEditing = Boolean(editingId.value);
    await store.save({ nombre: form.nombre, descripcion: form.descripcion, duracionMinutos: Number(form.duracionMinutos), precioCentavos, imagen: form.imagen, estado: form.estado }, editingId.value);
    reset(); notice.value = wasEditing ? 'Servicio actualizado.' : 'Servicio registrado.';
  } catch (err) { error.value = err.message; fields.value = err.fields || fields.value; }
  finally { busy.value = false; }
}
async function confirmState() {
  busy.value = true; error.value = ''; notice.value = '';
  const item = pendingState.value;
  try {
    await store.setState(item);
    if (editingId.value === item._id) reset();
    notice.value = item.estado === 'ACTIVO' ? 'Servicio desactivado. Ya no aparece en el portal.' : 'Servicio activado. Ya aparece en el portal.';
  } catch (err) { error.value = err.message; }
  finally { busy.value = false; pendingState.value = null; }
}
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?')));
onMounted(load);
</script>

<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Servicios del centro</h1><p class="intro">Registra la oferta de atención y actualiza sus precios, duración y disponibilidad.</p></section>
  <AdminNavigation />
  <p class="dev-note">Vista de desarrollo local. La autenticación y los permisos de administrador están pendientes de integración.</p>
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
  <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <div class="admin-grid">
    <section ref="formSection" class="form-panel" aria-labelledby="form-title">
      <h2 id="form-title">{{ editingId ? 'Editar servicio' : 'Nuevo servicio' }}</h2>
      <form @submit.prevent="save">
        <fieldset :disabled="busy || loading"><legend class="sr-only">Datos del servicio</legend>
          <label for="nombre">Nombre</label><input id="nombre" v-model.trim="form.nombre" required maxlength="120" :aria-invalid="Boolean(fields.nombre)"><small v-if="fields.nombre" class="error">{{ fields.nombre }}</small>
          <label for="descripcion">Descripción</label><textarea id="descripcion" v-model.trim="form.descripcion" required maxlength="2000" rows="4" :aria-invalid="Boolean(fields.descripcion)"></textarea><small v-if="fields.descripcion" class="error">{{ fields.descripcion }}</small>
          <div class="form-row"><div><label for="duracion">Duración (minutos)</label><input id="duracion" v-model="form.duracionMinutos" type="number" min="1" max="1440" step="1" required :aria-invalid="Boolean(fields.duracionMinutos)"><small class="error" v-if="fields.duracionMinutos">{{ fields.duracionMinutos }}</small></div>
          <div><label for="precio">Precio (Q)</label><input id="precio" v-model="form.precio" inputmode="decimal" placeholder="250.00" required :aria-invalid="Boolean(fields.precioCentavos)"><small v-if="fields.precioCentavos" class="error">{{ fields.precioCentavos }}</small></div></div>
          <label for="imagen">URL de imagen</label><input id="imagen" v-model.trim="form.imagen" required maxlength="2048" :aria-invalid="Boolean(fields.imagen)"><small>Usa HTTP/HTTPS o conserva la imagen incluida.</small><small v-if="fields.imagen" class="error">{{ fields.imagen }}</small>
          <label for="estado">Estado</label><select id="estado" v-model="form.estado"><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select>
          <div class="actions"><button class="button" type="submit">{{ busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar servicio' }}</button><button v-if="editingId || dirty" class="button secondary" type="button" @click="cancel">{{ editingId ? 'Cancelar edición' : 'Limpiar formulario' }}</button></div>
        </fieldset>
      </form>
    </section>
    <section class="list-panel" aria-labelledby="list-title"><h2 id="list-title">Servicios registrados</h2>
      <div class="form-row filters"><div><label for="buscar">Buscar por nombre</label><input id="buscar" v-model="search" type="search" placeholder="Nombre del servicio"></div><div><label for="filtrar">Estado</label><select id="filtrar" v-model="filter"><option value="TODOS">Todos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select></div></div>
      <p v-if="loading" role="status">Cargando servicios…</p>
      <div v-else-if="error && !store.adminItems.length" class="empty-state"><p>No se pudo cargar el listado.</p><button class="button secondary" @click="load">Reintentar</button></div>
      <p v-else-if="!visible.length" class="empty-state">No hay servicios que mostrar.</p>
      <ul v-else class="admin-services"><li v-for="item in visible" :key="item._id"><div class="service-line"><h3>{{ item.nombre }}</h3><span class="badge" :class="item.estado.toLowerCase()">{{ item.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}</span></div><p>{{ item.duracionMinutos }} minutos · {{ formatMoney(item.precioCentavos) }}</p><div class="actions"><button class="text-button" :disabled="busy" @click="edit(item)" :aria-label="`Editar ${item.nombre}`">Editar</button><button class="text-button" :disabled="busy" @click="openState(item)" :aria-label="`${item.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'} ${item.nombre}`">{{ item.estado === 'ACTIVO' ? 'Desactivar' : 'Activar' }}</button></div></li></ul>
    </section>
  </div>
  <dialog v-if="pendingState" ref="confirmationDialog" class="confirm-panel" aria-labelledby="confirm-title" @cancel.prevent="!busy && (pendingState = null)"><h2 id="confirm-title">¿{{ pendingState.estado === 'ACTIVO' ? 'Desactivar' : 'Activar' }} servicio?</h2><p>{{ pendingState.nombre }}</p><p>{{ pendingState.estado === 'ACTIVO' ? 'Dejará de aparecer en el portal público. Su información se conservará.' : 'Volverá a aparecer en el portal público.' }}</p><div class="actions"><button class="button" :disabled="busy" @click="confirmState">{{ busy ? 'Guardando…' : 'Confirmar' }}</button><button class="button secondary" :disabled="busy" @click="pendingState = null" autofocus>Cancelar</button></div></dialog>
</template>
