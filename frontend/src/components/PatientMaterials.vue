<script setup>
import { computed, onMounted, ref } from 'vue';
import { request } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { MATERIAL_TYPES, formatDate } from '../utils/materials';

// Materiales asignados en la ficha del paciente (RF-09). Asignan el administrador y el profesional; recepción consulta.
const props = defineProps({ patientId: { type: String, required: true }, patientActive: { type: Boolean, default: true } });
const auth = useAuthStore();
const canAssign = computed(() => ['ADMINISTRADOR', 'PROFESIONAL'].includes(auth.user?.rol));
const assigned = ref([]), catalog = ref([]);
const selected = ref(''), observaciones = ref('');
const loading = ref(true), busy = ref(false), error = ref(''), notice = ref('');
// No se ofrecen materiales ya asignados a este paciente.
const available = computed(() => catalog.value.filter(item => !assigned.value.some(a => a.material?._id === item._id)));

async function load() {
  loading.value = true; error.value = '';
  try {
    assigned.value = await request(`/pacientes/${props.patientId}/materiales`);
    if (canAssign.value && props.patientActive) catalog.value = (await request('/materiales?estado=ACTIVO&limite=100')).materiales;
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}
async function assign() {
  busy.value = true; error.value = ''; notice.value = '';
  try {
    await request(`/pacientes/${props.patientId}/materiales`, { method: 'POST', body: JSON.stringify({ material: selected.value, ...(observaciones.value ? { observaciones: observaciones.value } : {}) }) });
    selected.value = ''; observaciones.value = ''; notice.value = 'Material asignado al paciente.';
    await load();
  } catch (err) { error.value = err.message; }
  finally { busy.value = false; }
}
onMounted(load);
</script>

<template>
  <section class="record-section" aria-labelledby="patient-materials-title">
    <h2 id="patient-materials-title">Materiales asignados</h2>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
    <p v-if="loading" role="status">Cargando materiales…</p>
    <template v-else>
      <p v-if="!assigned.length">No hay materiales asignados a este paciente.</p>
      <ul v-else class="admin-services"><li v-for="item in assigned" :key="item._id">
        <div class="service-line">
          <h3><a :href="item.material?.enlace" target="_blank" rel="noopener noreferrer">{{ item.material?.titulo }} ↗</a></h3>
          <span class="badge">{{ MATERIAL_TYPES[item.material?.tipo] }}</span>
        </div>
        <p>Asignado el {{ formatDate(item.fechaAsignacion) }} por {{ item.asignadoPor?.nombres }} {{ item.asignadoPor?.apellidos }}<span v-if="item.material?.estado === 'INACTIVO'"> · material retirado del catálogo</span></p>
        <p v-if="item.observaciones">{{ item.observaciones }}</p>
      </li></ul>

      <p v-if="canAssign && !patientActive" class="feedback error">El paciente está inactivo: no se le pueden asignar nuevos materiales.</p>
      <form v-else-if="canAssign" class="association-form" @submit.prevent="assign">
        <h3>Asignar material</h3>
        <label for="material-select">Material</label>
        <select id="material-select" v-model="selected" required :disabled="busy">
          <option disabled value="">{{ available.length ? 'Selecciona un material' : 'No hay más materiales activos disponibles' }}</option>
          <option v-for="item in available" :key="item._id" :value="item._id">{{ item.titulo }} · {{ MATERIAL_TYPES[item.tipo] }}</option>
        </select>
        <label for="material-notes">Indicaciones (opcional)</label>
        <textarea id="material-notes" v-model.trim="observaciones" rows="2" maxlength="1000" :disabled="busy" placeholder="Por ejemplo: practicar 10 minutos diarios."></textarea>
        <div class="actions"><button class="button" :disabled="busy || !selected">{{ busy ? 'Asignando…' : 'Asignar material' }}</button><RouterLink class="text-button" to="/admin/materiales">Ver catálogo</RouterLink></div>
      </form>
    </template>
  </section>
</template>
