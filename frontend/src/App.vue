<template>
  <header class="header">
    <div class="container header-inner">
      <RouterLink class="brand" to="/" aria-label="SIGCA, inicio"><span class="brand-icon" aria-hidden="true">S</span>SIGCA</RouterLink>
      <nav aria-label="Navegación principal">
        <RouterLink to="/">Inicio</RouterLink>
        <RouterLink to="/servicios">Servicios</RouterLink>
        <RouterLink to="/admin/servicios">Administración</RouterLink>
        <RouterLink to="/acerca-de">Acerca del proyecto</RouterLink>
      </nav>
    </div>
  </header>
  <main id="contenido" class="container"><RouterView /></main>
  <footer><div class="container">SIGCA · Proyecto Final de Desarrollo Web</div></footer>
</template>
