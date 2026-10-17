<script setup>
import { onMounted, reactive, ref } from 'vue';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
const filters = reactive({ buscar:'',estado:'' });
const applied = ref({ buscar:'',estado:'' });
const result = ref({ mensajes:[],total:0,pagina:1,totalPaginas:0 });
const loading = ref(true), busy = ref(false), detailBusy = ref(false), error = ref(''), notice = ref(''), selected = ref(null), messagePanel = ref(null);
let loadVersion = 0, detailVersion = 0;
function formatDate(value) { return new Intl.DateTimeFormat('es-GT', { dateStyle:'medium',timeStyle:'short',timeZone:'America/Guatemala' }).format(new Date(value)); }
async function load(page=1) {
  const version = ++loadVersion; loading.value = true; error.value = '';
  const params = new URLSearchParams({ pagina:String(page),limite:'10',...applied.value });if (!params.get('estado')) params.delete('estado');
  try { const data = await request(`/contacto?${params}`); if (version === loadVersion) result.value = data; }
  catch (err) { if (version === loadVersion) error.value = err.message; }
  finally { if (version === loadVersion) loading.value = false; }
}
function search() { applied.value = { ...filters }; selected.value = null; detailVersion++; detailBusy.value = false; load(1); }
async function open(item) {
  const version = ++detailVersion; selected.value = null; detailBusy.value = true; error.value = ''; notice.value = '';
  try { const data = await request(`/contacto/${item._id}`); if (version === detailVersion) { selected.value = data; messagePanel.value?.scrollIntoView({ behavior:'smooth',block:'start' }); } }
  catch (err) { if (version === detailVersion) error.value = err.message; }
  finally { if (version === detailVersion) detailBusy.value = false; }
}
async function toggleState() { busy.value = true; error.value = ''; notice.value = ''; try { selected.value = await request(`/contacto/${selected.value._id}/estado`, { method:'PATCH', body:JSON.stringify({ estado:selected.value.estado === 'NUEVO' ? 'LEIDO' : 'NUEVO' }) }); notice.value = selected.value.estado === 'LEIDO' ? 'Mensaje marcado como leído.' : 'Mensaje marcado como nuevo.'; await load(result.value.pagina); if (!result.value.mensajes.length && result.value.pagina > 1) await load(result.value.pagina - 1); } catch (err) { error.value = err.message; } finally { busy.value = false; } }
onMounted(() => load());
</script>
<template>
  <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Mensajes de contacto</h1><p class="intro">Consulta las solicitudes de información enviadas desde el portal.</p></section><AdminNavigation /><p class="dev-note">Los mensajes solo pueden consultarse mediante el acceso administrativo de desarrollo. La autorización por roles se integrará con usuarios.</p><p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <form class="inbox-filters" @submit.prevent="search"><div><label for="message-search">Nombre, correo o asunto</label><input id="message-search" v-model.trim="filters.buscar" type="search" maxlength="120"></div><div><label for="message-state">Estado</label><select id="message-state" v-model="filters.estado"><option value="">Todos</option><option value="NUEVO">Nuevos</option><option value="LEIDO">Leídos</option></select></div><button class="button secondary" :disabled="loading || busy">Buscar</button></form>
  <div class="inbox-grid"><section class="list-panel"><h2>Bandeja de mensajes</h2><p v-if="loading" role="status">Cargando mensajes…</p><template v-else><p>{{ result.total }} {{ result.total === 1 ? 'mensaje encontrado' : 'mensajes encontrados' }}</p><div v-if="error && !result.mensajes.length"><button class="button secondary" @click="load(result.pagina)">Reintentar</button></div><p v-else-if="!result.mensajes.length" class="empty-state">No hay mensajes que mostrar.</p><ul v-else class="message-list"><li v-for="item in result.mensajes" :key="item._id"><button class="message-open" :disabled="busy" :aria-pressed="selected?._id === item._id" @click="open(item)"><span class="service-line"><strong>{{ item.asunto }}</strong><span class="badge" :class="item.estado === 'NUEVO' ? 'activo' : 'inactivo'">{{ item.estado === 'NUEVO' ? 'Nuevo' : 'Leído' }}</span></span><span>{{ item.nombre }}</span><small>{{ item.correo }}</small><small>{{ formatDate(item.createdAt) }}</small></button></li></ul><div v-if="result.totalPaginas > 1" class="pagination"><button class="button secondary" :disabled="result.pagina <= 1 || busy" @click="load(result.pagina - 1)">Anterior</button><span>{{ result.pagina }} / {{ result.totalPaginas }}</span><button class="button secondary" :disabled="result.pagina >= result.totalPaginas || busy" @click="load(result.pagina + 1)">Siguiente</button></div></template></section>
  <section ref="messagePanel" class="message-detail form-panel" aria-labelledby="message-detail-title"><h2 id="message-detail-title">Detalle del mensaje</h2><p v-if="detailBusy" role="status">Abriendo mensaje…</p><template v-else-if="selected"><h3>{{ selected.asunto }}</h3><dl><dt>Nombre</dt><dd>{{ selected.nombre }}</dd><dt>Correo electrónico</dt><dd>{{ selected.correo }}</dd><dt>Teléfono</dt><dd>{{ selected.telefono }}</dd><dt>Recibido</dt><dd>{{ formatDate(selected.createdAt) }} · Guatemala</dd></dl><p class="message-body">{{ selected.mensaje }}</p><button class="button secondary" :disabled="busy" @click="toggleState">{{ busy ? 'Guardando…' : selected.estado === 'NUEVO' ? 'Marcar como leído' : 'Marcar como nuevo' }}</button></template><p v-else class="empty-state">Selecciona un mensaje para consultar sus datos y contenido.</p></section></div>
</template>
