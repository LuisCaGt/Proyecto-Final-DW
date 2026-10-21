<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const form = reactive({ correo: "", password: "" });
const busy = ref(false);
const error = ref("");

async function submit() {
  busy.value = true;
  error.value = "";
  try {
    await auth.login(form.correo, form.password);
    const requested =
      typeof route.query.redirect === "string" ? route.query.redirect : "";
    const fallback =
      auth.user.rol === "PROFESIONAL" ? "/mis-pacientes" : "/admin/pacientes";
    const destination =
      requested.startsWith("/") && !requested.startsWith("//")
        ? requested
        : fallback;
    await router.replace(destination);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">CUENTA</p>
    <h1>Iniciar sesión</h1>
    <p class="intro">
      Accede con las credenciales que te asignó el administrador.
    </p>
  </section>
  <form class="form-panel login-panel" @submit.prevent="submit">
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <fieldset :disabled="busy">
      <legend class="sr-only">Credenciales</legend>
      <label for="login-email">Correo electrónico</label
      ><input
        id="login-email"
        v-model.trim="form.correo"
        type="email"
        autocomplete="username"
        maxlength="254"
        required
      />
      <label for="login-password">Contraseña</label
      ><input
        id="login-password"
        v-model="form.password"
        type="password"
        autocomplete="current-password"
        minlength="12"
        maxlength="128"
        required
      />
      <div class="actions">
        <button class="button" type="submit">
          {{ busy ? "Validando…" : "Iniciar sesión" }}
        </button>
      </div>
    </fieldset>
  </form>
</template>
