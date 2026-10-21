<script setup>
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useContentStore } from "./stores/content";
import { useAuthStore } from "./stores/auth";
import CenterLogo from "./components/CenterLogo.vue";
const store = useContentStore();
const auth = useAuthStore();
const router = useRouter();
onMounted(() => {
  store.load();
  auth.restore();
});
watch(
  () => store.content?.nombreCentro,
  (name) => {
    document.title = name ? `${name} · SIGCA` : "SIGCA";
  },
);
function logout() {
  auth.logout();
  router.replace({ name: "login" });
}
</script>
<template>
  <header class="header">
    <div class="container header-inner">
      <RouterLink
        class="brand"
        to="/"
        :aria-label="`${store.content?.nombreCentro || 'SIGCA'}, inicio`"
        ><CenterLogo :src="store.content?.logo" /><span>{{
          store.content?.nombreCentro || "SIGCA"
        }}</span></RouterLink
      >
      <nav aria-label="Navegación principal">
        <RouterLink to="/">Inicio</RouterLink
        ><RouterLink to="/nosotros">Misión y visión</RouterLink
        ><RouterLink to="/servicios">Servicios</RouterLink
        ><RouterLink to="/educativo">Educativo</RouterLink
        ><RouterLink to="/corporativo">Corporativo</RouterLink
        ><RouterLink to="/horarios">Horarios</RouterLink
        ><RouterLink to="/contacto">Contacto</RouterLink
        ><RouterLink to="/solicitar-cita">Solicitar cita</RouterLink><RouterLink
          v-if="
            auth.user?.rol === 'ADMINISTRADOR' ||
            auth.user?.rol === 'RECEPCIONISTA'
          "
          to="/admin/pacientes"
          >Administración</RouterLink
        ><RouterLink
          v-else-if="auth.user?.rol === 'PROFESIONAL'"
          to="/mis-pacientes"
          >Mis pacientes</RouterLink
        ><RouterLink v-else to="/iniciar-sesion">Iniciar sesión</RouterLink
        ><button
          v-if="auth.authenticated"
          class="text-button"
          type="button"
          @click="logout"
        >
          Cerrar sesión
        </button>
      </nav>
    </div>
  </header>
  <main id="contenido" class="container">
    <div v-if="store.error" class="feedback error" role="alert">
      <p>No se pudo actualizar la información del centro. {{ store.error }}</p>
      <button
        class="button secondary"
        :disabled="store.loading"
        @click="store.load"
      >
        Reintentar
      </button>
    </div>
    <RouterView />
  </main>
  <footer>
    <div class="container">
      {{ store.content?.nombreCentro || "SIGCA" }} · Atención y bienestar
    </div>
  </footer>
</template>
