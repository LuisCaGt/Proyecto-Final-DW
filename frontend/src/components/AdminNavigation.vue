<script setup>
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
</script>

<template>
  <nav class="admin-navigation" aria-label="Secciones administrativas">
    <template v-if="auth.user?.rol === 'ADMINISTRADOR'">
      <RouterLink to="/admin/servicios">Servicios</RouterLink>
      <RouterLink to="/admin/contenido">Contenido institucional</RouterLink>
      <RouterLink to="/admin/carrusel">Carrusel</RouterLink>
      <RouterLink to="/admin/horarios">Horarios</RouterLink>
      <RouterLink to="/admin/publicaciones">Publicaciones</RouterLink>
      <RouterLink to="/admin/actividades">Actividades</RouterLink>
      <RouterLink to="/admin/contacto">Contacto</RouterLink>
      <RouterLink to="/admin/mensajes">Mensajes</RouterLink>
      <RouterLink to="/admin/usuarios">Usuarios</RouterLink>
    </template>
    <template v-if="auth.canManagePeople">
      <RouterLink to="/admin/solicitudes">Solicitudes de cita</RouterLink>
      <RouterLink to="/admin/pagos">Pagos y saldos</RouterLink>
      <RouterLink to="/admin/caja">Caja diaria</RouterLink>
      <RouterLink to="/admin/citas">Citas</RouterLink>
      <RouterLink to="/admin/pacientes">Pacientes</RouterLink>
      <RouterLink to="/admin/responsables">Responsables</RouterLink>
    </template>
    <RouterLink v-if="auth.user?.rol === 'PROFESIONAL'" to="/mis-pacientes"
      >Mis pacientes</RouterLink
    >
    <RouterLink v-if="auth.authenticated" to="/admin/calendario">Calendario</RouterLink>
  </nav>
</template>
