<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import AdminNavigation from "../components/AdminNavigation.vue";
import { request } from "../services/api";

const users = ref([]);
const search = ref("");
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const fields = ref({});
const editingId = ref("");
const blank = () => ({
  identificador: "",
  nombres: "",
  apellidos: "",
  correo: "",
  telefono: "",
  rol: "RECEPCIONISTA",
  especialidad: "",
  estado: "ACTIVO",
  password: "",
});
const form = reactive(blank());
const visible = computed(() =>
  users.value.filter((user) =>
    `${user.nombres} ${user.apellidos} ${user.correo}`
      .toLocaleLowerCase()
      .includes(search.value.toLocaleLowerCase()),
  ),
);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    users.value = await request("/usuarios");
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
function edit(user) {
  editingId.value = user.id;
  Object.assign(form, { ...blank(), ...user, password: "" });
  fields.value = {};
}
async function save() {
  busy.value = true;
  error.value = "";
  notice.value = "";
  fields.value = {};
  const body = {
    identificador: form.identificador,
    nombres: form.nombres,
    apellidos: form.apellidos,
    correo: form.correo,
    telefono: form.telefono,
    rol: form.rol,
    especialidad: form.especialidad,
    estado: form.estado,
  };
  if (!editingId.value) body.password = form.password;
  try {
    if (editingId.value)
      await request(`/usuarios/${editingId.value}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    else
      await request("/usuarios", {
        method: "POST",
        body: JSON.stringify(body),
      });
    reset();
    notice.value = "Usuario guardado.";
    await load();
  } catch (err) {
    error.value = err.message;
    fields.value = err.fields || {};
  } finally {
    busy.value = false;
  }
}
async function toggleState(user) {
  error.value = "";
  notice.value = "";
  try {
    await request(`/usuarios/${user.id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({
        estado: user.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO",
      }),
    });
    notice.value = "Estado actualizado.";
    await load();
  } catch (err) {
    error.value = err.message;
  }
}
async function resetPassword(user) {
  const password = window.prompt(
    `Nueva contraseña para ${user.correo} (mínimo 12 caracteres):`,
  );
  if (password === null) return;
  error.value = "";
  notice.value = "";
  try {
    await request(`/usuarios/${user.id}/restablecer-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    notice.value = "Contraseña restablecida.";
  } catch (err) {
    error.value = err.message;
  }
}
onMounted(load);
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">ADMINISTRACIÓN</p>
    <h1>Usuarios y profesionales</h1>
    <p class="intro">Gestiona las cuentas, los roles y el estado de acceso.</p>
  </section>
  <AdminNavigation />
  <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
  <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
  <div class="admin-grid">
    <section class="form-panel">
      <h2>{{ editingId ? "Editar usuario" : "Registrar usuario" }}</h2>
      <form @submit.prevent="save">
        <fieldset :disabled="busy">
          <label for="user-id">Identificador</label
          ><input
            id="user-id"
            v-model.trim="form.identificador"
            required
            maxlength="40"
          /><small v-if="fields.identificador" class="error">{{
            fields.identificador
          }}</small>
          <div class="form-row">
            <div>
              <label for="user-first">Nombres</label
              ><input
                id="user-first"
                v-model.trim="form.nombres"
                required
                maxlength="100"
              />
            </div>
            <div>
              <label for="user-last">Apellidos</label
              ><input
                id="user-last"
                v-model.trim="form.apellidos"
                required
                maxlength="100"
              />
            </div>
          </div>
          <label for="user-email">Correo</label
          ><input
            id="user-email"
            v-model.trim="form.correo"
            type="email"
            required
            maxlength="254"
          /><small v-if="fields.correo" class="error">{{
            fields.correo
          }}</small>
          <label for="user-phone">Teléfono</label
          ><input
            id="user-phone"
            v-model.trim="form.telefono"
            type="tel"
            maxlength="30"
          />
          <label for="user-role">Rol</label
          ><select id="user-role" v-model="form.rol">
            <option>ADMINISTRADOR</option>
            <option>RECEPCIONISTA</option>
            <option>PROFESIONAL</option>
          </select>
          <div v-if="form.rol === 'PROFESIONAL'">
            <label for="user-specialty">Especialidad</label
            ><input
              id="user-specialty"
              v-model.trim="form.especialidad"
              maxlength="120"
            />
          </div>
          <div v-if="editingId">
            <label for="user-state">Estado</label
            ><select id="user-state" v-model="form.estado">
              <option>ACTIVO</option>
              <option>INACTIVO</option>
            </select>
          </div>
          <div v-else>
            <label for="user-password">Contraseña inicial</label
            ><input
              id="user-password"
              v-model="form.password"
              type="password"
              minlength="12"
              maxlength="128"
              autocomplete="new-password"
              required
            /><small>Mínimo 12 caracteres.</small>
          </div>
          <div class="actions">
            <button class="button" type="submit">
              {{
                busy
                  ? "Guardando…"
                  : editingId
                    ? "Guardar cambios"
                    : "Crear usuario"
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
      <h2>Cuentas registradas</h2>
      <label for="user-search">Buscar usuario</label
      ><input
        id="user-search"
        v-model="search"
        type="search"
        placeholder="Nombre o correo"
      />
      <p v-if="loading" role="status">Cargando…</p>
      <p v-else-if="!visible.length" class="empty-state">
        No hay usuarios para mostrar.
      </p>
      <ul v-else class="admin-services">
        <li v-for="user in visible" :key="user.id">
          <div class="service-line">
            <h3>{{ user.nombres }} {{ user.apellidos }}</h3>
            <span class="badge" :class="user.estado.toLowerCase()">{{
              user.estado
            }}</span>
          </div>
          <p>
            {{ user.correo }} · {{ user.rol
            }}<span v-if="user.especialidad"> · {{ user.especialidad }}</span>
          </p>
          <div class="actions">
            <button class="text-button" @click="edit(user)">Editar</button
            ><button class="text-button" @click="toggleState(user)">
              {{ user.estado === "ACTIVO" ? "Desactivar" : "Activar" }}</button
            ><button class="text-button" @click="resetPassword(user)">
              Restablecer contraseña
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
