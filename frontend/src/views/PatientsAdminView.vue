<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import AdminNavigation from "../components/AdminNavigation.vue";
import { request } from "../services/api";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const patients = ref([]);
const professionals = ref([]);
const search = ref("");
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const editingId = ref("");
const fields = ref({});
const blank = () => ({
  identificador: "",
  fotografia: "",
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  sexo: "PREFIERO_NO_DECIR",
  telefono: "",
  direccion: "",
  fechaInicioProceso: "",
  observacionesAdministrativas: "",
  estado: "ACTIVO",
  profesionales: [],
});
const form = reactive(blank());
const canManage = computed(() => auth.canManagePeople);
const visible = computed(() =>
  patients.value.filter((patient) =>
    `${patient.identificador} ${patient.nombres} ${patient.apellidos}`
      .toLocaleLowerCase()
      .includes(search.value.toLocaleLowerCase()),
  ),
);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const calls = [
      request(`/pacientes?buscar=${encodeURIComponent(search.value)}`),
    ];
    if (canManage.value) calls.push(request("/profesionales/activos"));
    const [patientData, professionalData = []] = await Promise.all(calls);
    patients.value = patientData;
    professionals.value = professionalData;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
function reset() {
  editingId.value = "";
  Object.assign(form, blank());
  fields.value = {};
}
function edit(patient) {
  editingId.value = patient.id || patient._id;
  Object.assign(form, {
    ...blank(),
    ...Object.fromEntries(Object.keys(blank()).map(key => [key, patient[key] ?? blank()[key]])),
    fechaNacimiento: new Date(patient.fechaNacimiento)
      .toISOString()
      .slice(0, 10),
    fechaInicioProceso: patient.fechaInicioProceso
      ? new Date(patient.fechaInicioProceso).toISOString().slice(0, 10)
      : "",
    profesionales: (patient.profesionales || []).map(
      (professional) => professional._id || professional,
    ),
  });
}
async function save() {
  busy.value = true;
  error.value = "";
  notice.value = "";
  fields.value = {};
  const body = { ...form, fechaInicioProceso: form.fechaInicioProceso || null };
  try {
    if (editingId.value)
      await request(`/pacientes/${editingId.value}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    else
      await request("/pacientes", {
        method: "POST",
        body: JSON.stringify(body),
      });
    reset();
    notice.value = "Paciente guardado.";
    await load();
  } catch (err) {
    error.value = err.message;
    fields.value = err.fields || {};
  } finally {
    busy.value = false;
  }
}
async function toggleState(patient) {
  try {
    await request(`/pacientes/${patient.id || patient._id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({
        estado: patient.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO",
      }),
    });
    notice.value = "Estado actualizado; el historial se conserva.";
    await load();
  } catch (err) {
    error.value = err.message;
  }
}
onMounted(load);
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">
      {{ canManage ? "ADMINISTRACIÓN" : "ATENCIÓN CLÍNICA" }}
    </p>
    <h1>{{ canManage ? "Pacientes" : "Mis pacientes" }}</h1>
    <p class="intro">
      {{
        canManage
          ? "Consulta, busca y actualiza expedientes. La edad se calcula desde la fecha de nacimiento."
          : "Pacientes activos vinculados a tu atención."
      }}
    </p>
  </section>
  <AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
  <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <div class="admin-grid">
    <section v-if="canManage" class="form-panel">
      <h2>{{ editingId ? "Editar paciente" : "Registrar paciente" }}</h2>
      <form @submit.prevent="save">
        <fieldset :disabled="busy">
          <label for="patient-id">Identificador</label
          ><input
            id="patient-id"
            v-model.trim="form.identificador"
            required
            maxlength="40"
          /><small v-if="fields.identificador" class="error">{{
            fields.identificador
          }}</small>
          <label for="patient-photo">Fotografía</label
          ><input
            id="patient-photo"
            v-model.trim="form.fotografia"
            placeholder="/images/paciente.jpg"
            maxlength="2048"
          /><small v-if="fields.fotografia" class="error">{{
            fields.fotografia
          }}</small>
          <div class="form-row">
            <div>
              <label for="patient-first">Nombres</label
              ><input
                id="patient-first"
                v-model.trim="form.nombres"
                required
                maxlength="100"
              />
            </div>
            <div>
              <label for="patient-last">Apellidos</label
              ><input
                id="patient-last"
                v-model.trim="form.apellidos"
                required
                maxlength="100"
              />
            </div>
          </div>
          <div class="form-row">
            <div>
              <label for="patient-birth">Fecha de nacimiento</label
              ><input
                id="patient-birth"
                v-model="form.fechaNacimiento"
                type="date"
                required
                :max="new Date().toISOString().slice(0, 10)"
              />
            </div>
            <div>
              <label for="patient-sex">Sexo</label
              ><select id="patient-sex" v-model="form.sexo">
                <option>FEMENINO</option>
                <option>MASCULINO</option>
                <option>OTRO</option>
                <option>PREFIERO_NO_DECIR</option>
              </select>
            </div>
          </div>
          <label for="patient-phone">Teléfono</label
          ><input
            id="patient-phone"
            v-model.trim="form.telefono"
            type="tel"
            maxlength="30"
          />
          <label for="patient-address">Dirección</label
          ><input
            id="patient-address"
            v-model.trim="form.direccion"
            maxlength="300"
          />
          <div class="form-row">
            <div>
              <label for="patient-start">Inicio del proceso</label
              ><input
                id="patient-start"
                v-model="form.fechaInicioProceso"
                type="date"
              />
            </div>
            <div v-if="editingId">
              <label for="patient-state">Estado</label
              ><select id="patient-state" v-model="form.estado">
                <option>ACTIVO</option>
                <option>INACTIVO</option>
              </select>
            </div>
          </div>
          <label for="patient-notes">Observaciones administrativas</label
          ><textarea
            id="patient-notes"
            v-model.trim="form.observacionesAdministrativas"
            rows="3"
            maxlength="3000"
          ></textarea>
          <label for="patient-professionals">Profesionales asignados</label
          ><select
            id="patient-professionals"
            v-model="form.profesionales"
            multiple
            size="4"
          >
            <option
              v-for="professional in professionals"
              :key="professional.id"
              :value="professional.id"
            >
              {{ professional.nombres }} {{ professional.apellidos
              }}<span v-if="professional.especialidad">
                · {{ professional.especialidad }}</span
              >
            </option>
          </select>
          <div class="actions">
            <button class="button" type="submit">
              {{
                busy
                  ? "Guardando…"
                  : editingId
                    ? "Guardar cambios"
                    : "Registrar paciente"
              }}</button
            ><button
              v-if="editingId"
              class="button secondary"
              type="button"
              @click="reset"
            >
              Cancelar
            </button>
          </div>
        </fieldset>
      </form>
    </section>
    <section class="list-panel">
      <div class="service-line">
        <h2>Expedientes</h2>
        <button
          v-if="canManage && editingId"
          class="text-button"
          @click="reset"
        >
          Nuevo
        </button>
      </div>
      <label for="patient-search">Buscar paciente</label
      ><input
        id="patient-search"
        v-model="search"
        type="search"
        placeholder="Nombre o identificador"
        @input="load"
      />
      <p v-if="loading" role="status">Cargando pacientes…</p>
      <p v-else-if="!visible.length" class="empty-state">
        No hay pacientes que coincidan.
      </p>
      <ul v-else class="admin-services">
        <li v-for="patient in visible" :key="patient.id || patient._id">
          <div class="service-line">
            <h3>{{ patient.nombres }} {{ patient.apellidos }}</h3>
            <span
              v-if="canManage"
              class="badge"
              :class="patient.estado.toLowerCase()"
              >{{ patient.estado }}</span
            >
          </div>
          <p>{{ patient.identificador }} · {{ patient.edad }} años</p>
          <img
            class="record-photo"
            :src="patient.fotografia || '/images/persona.svg'"
            :alt="`Fotografía de ${patient.nombres}`"
          />
          <div class="actions">
            <RouterLink
              class="text-button"
              :to="`/admin/pacientes/${patient.id || patient._id}`"
              >Ver ficha</RouterLink
            ><button
              v-if="canManage"
              class="text-button"
              @click="edit(patient)"
            >
              Editar</button
            ><button
              v-if="canManage"
              class="text-button"
              @click="toggleState(patient)"
            >
              {{ patient.estado === "ACTIVO" ? "Desactivar" : "Reactivar" }}
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
