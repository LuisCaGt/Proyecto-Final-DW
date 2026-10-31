<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { MATERIAL_TYPES, formatDate } from '../utils/materials';

const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.rol === 'ADMINISTRADOR');

// Listado
const filters = reactive({ buscar: '', tipo: '', estado: '' });
const result = ref({ materiales: [], total: 0, pagina: 1, totalPaginas: 0 });
const loading = ref(true), error = ref(''), notice = ref('');
let loadVersion = 0;
async function load(page = 1) {
  const version = ++loadVersion; loading.value = true; error.value = '';
  const params = new URLSearchParams({ pagina: String(page), limite: '10' });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  try { const data = await request(`/materiales?${params}`); if (version === loadVersion) result.value = data; }
  catch (err) { if (version === loadVersion) error.value = err.message; }
  finally { if (version === loadVersion) loading.value = false; }
}

// Formulario (solo administrador)
const blank = () => ({ identificador: '', titulo: '', descripcion: '', tipo: 'DOCUMENTO', enlace: '' });
const form = reactive(blank());
const saved = ref(JSON.stringify(form));
const dirty = computed(() => saved.value !== JSON.stringify(form));
const editingId = ref(null), busy = ref(false), fields = ref({}), formSection = ref(null);
function reset() { editingId.value = null; Object.assign(form, blank()); saved.value = JSON.stringify(form); fields.value = {}; }
function edit(item) {
  if (dirty.value && !window.confirm('¿Descartar los cambios sin guardar?')) return;
  editingId.value = item._id;
  for (const key of Object.keys(blank())) form[key] = item[key];
  saved.value = JSON.stringify(form); fields.value = {}; notice.value = ''; error.value = '';
  formSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function save() {
  busy.value = true; error.value = ''; notice.value = ''; fields.value = {};
  try {
    const wasEditing = Boolean(editingId.value);
    await request(wasEditing ? `/materiales/${editingId.value}` : '/materiales', { method: wasEditing ? 'PUT' : 'POST', body: JSON.stringify(form) });
    reset(); notice.value = wasEditing ? 'Material actualizado.' : 'Material registrado.';
    await load(wasEditing ? result.value.pagina : 1);
  } catch (err) { error.value = err.message; fields.value = err.fields || {}; }
  finally { busy.value = false; }
}

// Activar / desactivar con confirmación
const pendingState = ref(null), stateDialog = ref(null);
watch(pendingState, async item => { if (item) { await nextTick(); stateDialog.value?.showModal(); } });
async function confirmState() {
  busy.value = true; error.value = ''; notice.value = '';
  const item = pendingState.value;
  try {
    await request(`/materiales/${item._id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }) });
    notice.value = item.estado === 'ACTIVO' ? 'Material desactivado. Ya no podrá asignarse; las asignaciones anteriores se conservan.' : 'Material activado.';
    if (editingId.value === item._id) reset();
    await load(result.value.pagina);
  } catch (err) { error.value = err.message; }
  finally { busy.value = false; pendingState.value = null; }
}

onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?')));
onMounted(() => load());
</script>

<template>
  <section class="page-heading"><p class="eyebrow">{{ isAdmin ? 'ADMINISTRACIÓN' : 'CONSULTA' }}</p><h1>Materiales de apoyo</h1>
    <p class="intro">{{ isAdmin ? 'Registra los recursos que los profesionales pueden asignar a sus pacientes.' : 'Consulta los materiales disponibles. Para asignarlos, abre la ficha del paciente desde Mis pacientes.' }}</p></section>
  <AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
  <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>

  <div :class="isAdmin ? 'admin-grid' : ''">
    <section v-if="isAdmin" ref="formSection" class="form-panel" aria-labelledby="material-form-title">
      <h2 id="material-form-title">{{ editingId ? 'Editar material' : 'Nuevo material' }}</h2>
      <form @submit.prevent="save"><fieldset :disabled="busy"><legend class="sr-only">Datos del material</legend>
        <div class="form-row">
          <div><label for="mat-id">Identificador</label><input id="mat-id" v-model.trim="form.identificador" required maxlength="40" placeholder="MAT-007" :aria-invalid="Boolean(fields.identificador)"><small v-if="fields.identificador" class="error">{{ fields.identificador }}</small></div>
          <div><label for="mat-type">Tipo</label><select id="mat-type" v-model="form.tipo" required><option v-for="(label, key) in MATERIAL_TYPES" :key="key" :value="key">{{ label }}</option></select><small v-if="fields.tipo" class="error">{{ fields.tipo }}</small></div>
        </div>
        <label for="mat-title">Título</label><input id="mat-title" v-model.trim="form.titulo" required maxlength="150" :aria-invalid="Boolean(fields.titulo)"><small v-if="fields.titulo" class="error">{{ fields.titulo }}</small>
        <label for="mat-desc">Descripción</label><textarea id="mat-desc" v-model.trim="form.descripcion" required maxlength="2000" rows="4" :aria-invalid="Boolean(fields.descripcion)"></textarea><small v-if="fields.descripcion" class="error">{{ fields.descripcion }}</small>
        <label for="mat-link">Enlace al recurso</label><input id="mat-link" v-model.trim="form.enlace" type="url" required maxlength="2048" placeholder="https://…" :aria-invalid="Boolean(fields.enlace)"><small>No se suben archivos: registra el enlace donde está publicado el recurso.</small><small v-if="fields.enlace" class="error">{{ fields.enlace }}</small>
        <div class="actions"><button class="button">{{ busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar material' }}</button><button v-if="editingId || dirty" type="button" class="button secondary" @click="reset">{{ editingId ? 'Cancelar edición' : 'Limpiar formulario' }}</button></div>
      </fieldset></form>
    </section>

    <section class="list-panel" aria-labelledby="material-list-title"><h2 id="material-list-title">Catálogo</h2>
      <form class="form-row filters" @submit.prevent="load(1)">
        <div><label for="mat-search">Buscar</label><input id="mat-search" v-model.trim="filters.buscar" type="search" maxlength="100" placeholder="Título o identificador"></div>
        <div><label for="mat-filter-type">Tipo</label><select id="mat-filter-type" v-model="filters.tipo"><option value="">Todos</option><option v-for="(label, key) in MATERIAL_TYPES" :key="key" :value="key">{{ label }}</option></select></div>
        <div v-if="isAdmin"><label for="mat-filter-state">Estado</label><select id="mat-filter-state" v-model="filters.estado"><option value="">Todos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select></div>
        <div class="actions"><button class="button secondary" :disabled="loading">Filtrar</button></div>
      </form>
      <p v-if="loading" role="status">Cargando materiales…</p>
      <p v-else-if="!result.materiales.length" class="empty-state">No hay materiales que mostrar.</p>
      <template v-else>
        <p>{{ result.total }} {{ result.total === 1 ? 'material' : 'materiales' }}</p>
        <ul class="admin-services"><li v-for="item in result.materiales" :key="item._id">
          <div class="service-line"><h3>{{ item.titulo }}</h3><span class="badge" :class="item.estado.toLowerCase()">{{ item.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}</span></div>
          <p>{{ item.identificador }} · {{ MATERIAL_TYPES[item.tipo] }} · Registrado el {{ formatDate(item.fechaRegistro) }}</p>
          <p>{{ item.descripcion }}</p>
          <div class="actions">
            <a class="text-button" :href="item.enlace" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>
            <template v-if="isAdmin"><button class="text-button" :disabled="busy" @click="edit(item)">Editar</button><button class="text-button" :disabled="busy" @click="pendingState = item">{{ item.estado === 'ACTIVO' ? 'Desactivar' : 'Activar' }}</button></template>
          </div>
        </li></ul>
        <div v-if="result.totalPaginas > 1" class="pagination"><button class="button secondary" :disabled="result.pagina <= 1" @click="load(result.pagina - 1)">Anterior</button><span>{{ result.pagina }} / {{ result.totalPaginas }}</span><button class="button secondary" :disabled="result.pagina >= result.totalPaginas" @click="load(result.pagina + 1)">Siguiente</button></div>
      </template>
    </section>
  </div>

  <dialog v-if="pendingState" ref="stateDialog" class="confirm-panel" aria-labelledby="mat-state-title" @cancel.prevent="!busy && (pendingState = null)">
    <h2 id="mat-state-title">¿{{ pendingState.estado === 'ACTIVO' ? 'Desactivar' : 'Activar' }} material?</h2>
    <p>{{ pendingState.titulo }}</p>
    <p>{{ pendingState.estado === 'ACTIVO' ? 'Ya no se ofrecerá para nuevas asignaciones. Los pacientes que ya lo tienen asignado lo conservan en su historial.' : 'Volverá a estar disponible para asignarse a pacientes.' }}</p>
    <div class="actions"><button class="button" :disabled="busy" @click="confirmState">{{ busy ? 'Guardando…' : 'Confirmar' }}</button><button class="button secondary" :disabled="busy" autofocus @click="pendingState = null">Cancelar</button></div>
  </dialog>
</template>
