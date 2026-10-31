<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import AdminNavigation from "../components/AdminNavigation.vue";
import { request } from "../services/api";

const guardians = ref([]);
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
  telefono: "",
  correo: "",
  direccion: "",
});
const form = reactive(blank());
const visible = computed(() =>
  guardians.value.filter((guardian) =>
    `${guardian.identificador} ${guardian.nombres} ${guardian.apellidos} ${guardian.correo}`
      .toLocaleLowerCase()
      .includes(search.value.toLocaleLowerCase()),
  ),
);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    guardians.value = await request(
      `/responsables?buscar=${encodeURIComponent(search.value)}`,
    );
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
async function edit(guardian) {
  editingId.value = guardian._id;
  Object.assign(form, Object.fromEntries(Object.keys(blank()).map(key => [key, guardian[key] ?? blank()[key]])));
}
async function viewPatients(guardian) {
  if (guardian.pacientes) {
    guardian.pacientes = null;
    return;
  }
  try {
    const detail = await request(`/responsables/${guardian._id}`);
    guardian.pacientes = detail.pacientes;
  } catch (err) {
    error.value = err.message;
  }
}
async function save() {
  busy.value = true;
  error.value = "";
  notice.value = "";
  fields.value = {};
  try {
    if (editingId.value)
      await request(`/responsables/${editingId.value}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    else
      await request("/responsables", {
        method: "POST",
        body: JSON.stringify(form),
      });
    reset();
    notice.value = "Responsable guardado.";
    await load();
  } catch (err) {
    error.value = err.message;
    fields.value = err.fields || {};
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">ADMINISTRACIÓN</p>
    <h1>Responsables</h1>
    <p class="intro">
      Un responsable puede estar asociado a varios pacientes; el parentesco se
      registra en cada relación.
    </p>
  </section>
  <AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
  <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <div class="admin-grid">
    <section class="form-panel">
      <h2>{{ editingId ? "Editar responsable" : "Registrar responsable" }}</h2>
      <form @submit.prevent="save">
        <fieldset :disabled="busy">
          <label for="guardian-id">Identificador</label
          ><input
            id="guardian-id"
            v-model.trim="form.identificador"
            required
            maxlength="40"
          /><small v-if="fields.identificador" class="error">{{
            fields.identificador
          }}</small>
          <label for="guardian-photo">Fotografía</label
          ><input
            id="guardian-photo"
            v-model.trim="form.fotografia"
            required
            placeholder="/images/responsable.jpg"
            maxlength="2048"
          />
          <div class="form-row">
            <div>
              <label for="guardian-first">Nombres</label
              ><input
                id="guardian-first"
                v-model.trim="form.nombres"
                required
                maxlength="100"
              />
            </div>
            <div>
              <label for="guardian-last">Apellidos</label
              ><input
                id="guardian-last"
                v-model.trim="form.apellidos"
                required
                maxlength="100"
              />
            </div>
          </div>
          <label for="guardian-phone">Teléfono</label
          ><input
            id="guardian-phone"
            v-model.trim="form.telefono"
            type="tel"
            required
            maxlength="30"
          />
          <label for="guardian-email">Correo electrónico</label
          ><input
            id="guardian-email"
            v-model.trim="form.correo"
            required
            type="email"
            maxlength="254"
          />
          <label for="guardian-address">Dirección</label
          ><input
            id="guardian-address"
            v-model.trim="form.direccion"
            required
            maxlength="300"
          />
          <ul v-if="Object.keys(fields).length" class="error" role="alert">
            <li v-for="(message, field) in fields" :key="field">{{ message }}</li>
          </ul>
          <div class="actions">
            <button class="button" type="submit">
              {{
                busy
                  ? "Guardando…"
                  : editingId
                    ? "Guardar cambios"
                    : "Registrar responsable"
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
      <h2>Personas responsables</h2>
      <label for="guardian-search">Buscar responsable</label
      ><input
        id="guardian-search"
        v-model="search"
        type="search"
        placeholder="Nombre, correo o identificador"
        @input="load"
      />
      <p v-if="loading" role="status">Cargando…</p>
      <p v-else-if="!visible.length" class="empty-state">
        No hay responsables registrados.
      </p>
      <ul v-else class="admin-services">
        <li v-for="guardian in visible" :key="guardian._id">
          <div class="service-line">
            <h3>{{ guardian.nombres }} {{ guardian.apellidos }}</h3>
            <span class="badge">{{ guardian.identificador }}</span>
          </div>
          <p>
            {{ guardian.telefono
            }}<span v-if="guardian.correo"> · {{ guardian.correo }}</span>
          </p>
          <img
            class="record-photo"
            :src="guardian.fotografia || '/images/persona.svg'"
            :alt="`Fotografía de ${guardian.nombres}`"
          />
          <div class="actions">
            <button class="text-button" @click="edit(guardian)">Editar</button
            ><button class="text-button" @click="viewPatients(guardian)">
              {{ guardian.pacientes ? "Ocultar pacientes" : "Ver pacientes" }}
            </button>
          </div>
          <ul v-if="guardian.pacientes?.length" class="relation-list">
            <li v-for="patient in guardian.pacientes" :key="patient._id">
              <RouterLink :to="`/admin/pacientes/${patient._id}`"
                >{{ patient.nombres }} {{ patient.apellidos }}</RouterLink
              >
              · {{ patient.parentesco }}
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
</template>
