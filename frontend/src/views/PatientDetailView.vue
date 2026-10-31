<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AdminNavigation from "../components/AdminNavigation.vue";
import PatientMaterials from "../components/PatientMaterials.vue";
import { request } from "../services/api";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const auth = useAuthStore();
const patient = ref(null);
const guardians = ref([]);
const professionals = ref([]);
const responsibleId = ref("");
const parentesco = ref("");
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const canManage = computed(() => auth.canManagePeople);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    patient.value = await request(`/pacientes/${route.params.id}`);
    if (canManage.value) {
      const [guardianData, professionalData] = await Promise.all([
        request("/responsables"),
        request("/profesionales/activos"),
      ]);
      guardians.value = guardianData;
      professionals.value = professionalData;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
async function associate() {
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await request(`/pacientes/${route.params.id}/responsables`, {
      method: "POST",
      body: JSON.stringify({
        responsableId: responsibleId.value,
        parentesco: parentesco.value,
      }),
    });
    responsibleId.value = "";
    parentesco.value = "";
    notice.value = "Responsable asociado al paciente.";
    await load();
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">EXPEDIENTE</p>
    <h1>Ficha del paciente</h1>
  </section>
  <AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
  <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <p v-if="loading" role="status">Cargando ficha…</p>
  <section v-else-if="patient" class="patient-detail form-panel">
    <div class="service-line">
      <div>
        <p class="eyebrow">{{ patient.identificador }}</p>
        <h2>{{ patient.nombres }} {{ patient.apellidos }}</h2>
      </div>
      <span class="badge" :class="patient.estado.toLowerCase()">{{
        patient.estado
      }}</span>
    </div>
    <img
      class="record-photo large"
      :src="patient.fotografia || '/images/persona.svg'"
      :alt="`Fotografía de ${patient.nombres}`"
    />
    <dl class="record-facts">
      <div>
        <dt>Edad</dt>
        <dd>{{ patient.edad }} años</dd>
      </div>
      <div>
        <dt>Fecha de nacimiento</dt>
        <dd>
          {{
            new Date(patient.fechaNacimiento).toLocaleDateString("es-GT", {
              timeZone: "UTC",
            })
          }}
        </dd>
      </div>
      <div v-if="canManage">
        <dt>Teléfono</dt>
        <dd>{{ patient.telefono || "No registrado" }}</dd>
      </div>
      <div v-if="canManage">
        <dt>Dirección</dt>
        <dd>{{ patient.direccion || "No registrada" }}</dd>
      </div>
      <div v-if="canManage">
        <dt>Inicio del proceso</dt>
        <dd>
          {{
            patient.fechaInicioProceso
              ? new Date(patient.fechaInicioProceso).toLocaleDateString(
                  "es-GT",
                  { timeZone: "UTC" },
                )
              : "No registrado"
          }}
        </dd>
      </div>
      <div v-if="canManage">
        <dt>Observaciones administrativas</dt>
        <dd>
          {{ patient.observacionesAdministrativas || "Sin observaciones" }}
        </dd>
      </div>
    </dl>
    <section v-if="canManage" class="record-section">
      <h2>Profesionales asignados</h2>
      <ul v-if="patient.profesionales?.length">
        <li v-for="id in patient.profesionales" :key="id">
          {{
            professionals.find((item) => item.id === id || item.id === id._id)
              ?.nombres || "Profesional"
          }}
          {{
            professionals.find((item) => item.id === id || item.id === id._id)
              ?.apellidos || ""
          }}
        </li>
      </ul>
      <p v-else>No hay profesionales asignados.</p>
    </section>
    <section v-if="canManage" class="record-section">
      <h2>Responsables</h2>
      <p
        v-if="patient.menorDeEdad && !patient.tieneResponsable"
        class="feedback error"
      >
        Paciente menor de edad sin responsable asociado. La programación de
        citas está bloqueada hasta asociar un responsable.
      </p>
      <p v-else-if="patient.menorDeEdad" class="feedback success">
        Responsable asociado para paciente menor de edad.
      </p>
      <p v-else-if="!patient.responsables?.length">
        No hay responsables asociados.
      </p>
      <ul v-if="patient.responsables?.length" class="admin-services">
        <li v-for="guardian in patient.responsables" :key="guardian._id">
          <div class="service-line">
            <h3>{{ guardian.nombres }} {{ guardian.apellidos }}</h3>
            <span class="badge">{{ guardian.parentesco }}</span>
          </div>
          <p>
            {{ guardian.telefono
            }}<span v-if="guardian.correo"> · {{ guardian.correo }}</span>
          </p>
        </li>
      </ul>
      <form class="association-form" @submit.prevent="associate">
        <h3>Asociar responsable</h3>
        <label for="guardian-select">Responsable</label
        ><select id="guardian-select" v-model="responsibleId" required>
          <option disabled value="">Selecciona un responsable</option>
          <option
            v-for="guardian in guardians"
            :key="guardian._id"
            :value="guardian._id"
          >
            {{ guardian.nombres }} {{ guardian.apellidos }} ·
            {{ guardian.identificador }}
          </option></select
        ><label for="guardian-relation">Parentesco para este paciente</label
        ><input
          id="guardian-relation"
          v-model.trim="parentesco"
          maxlength="80"
          required
          placeholder="Madre, padre, tutor…"
        />
        <div class="actions">
          <button class="button" :disabled="busy || !guardians.length">
            {{ busy ? "Asociando…" : "Asociar responsable" }}</button
          ><RouterLink class="text-button" to="/admin/responsables"
            >Gestionar responsables</RouterLink
          >
        </div>
      </form>
    </section>
    <section v-if="canManage" class="record-section">
      <h2>Historial de citas</h2>
      <RouterLink :to="{ path: '/admin/pagos', query: { paciente: route.params.id } }">Consultar pagos y saldos del paciente</RouterLink>
      <ul v-if="patient.citas?.length" class="admin-services">
        <li v-for="cita in patient.citas" :key="cita._id">
          <strong>{{ cita.fecha }} · {{ cita.horaInicio }}–{{ cita.horaFin }}</strong>
          <p>{{ cita.servicio?.nombre }} · {{ cita.profesional?.nombres }} {{ cita.profesional?.apellidos }}</p>
          <span class="badge">{{ cita.estado }}</span>
        </li>
      </ul>
      <p v-else>No hay citas registradas para este paciente.</p>
      <p>La baja del paciente conserva sus citas y asociaciones.</p>
    </section>
    <PatientMaterials
      :patient-id="String(route.params.id)"
      :patient-active="patient.estado === 'ACTIVO'"
    />
  </section>
</template>
