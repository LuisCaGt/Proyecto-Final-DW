import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Publicacion, ActividadCorporativa } from '../src/models/Editorial.js';

const publications = [
  { titulo: 'Conoce los espacios de atención del centro', descripcion: 'En este espacio compartiremos información general sobre nuestros servicios y actividades. Puedes consultar el catálogo de servicios y los horarios del centro para planificar tu visita.', fechaPublicacion: '2026-10-16', imagen: '/images/carrusel-atencion.svg', enlace: '' },
  { titulo: 'Un espacio para escuchar y compartir', descripcion: 'La comunicación es parte de la vida cotidiana. Este apartado reunirá contenidos informativos seleccionados por el centro para acompañar a las familias y su comunidad.', fechaPublicacion: '2026-10-15', imagen: '/images/carrusel-escucha.svg', enlace: '' },
  { titulo: 'Actividades para nuestra comunidad', descripcion: 'Consulta la sección Corporativo para conocer las capacitaciones, la escuela para padres y otras actividades publicadas por el centro.', fechaPublicacion: '2026-10-14', imagen: '', enlace: '' },
];
const activities = [
  { titulo: 'Capacitación para equipos educativos', descripcion: 'Actividad ficticia de demostración: un espacio de intercambio para equipos interesados en conocer los servicios del centro y fortalecer su comunicación.', tipo: 'CAPACITACION', imagenes: ['/images/carrusel-desarrollo.svg', '/images/carrusel-escucha.svg'] },
  { titulo: 'Escuela para padres', descripcion: 'Actividad ficticia de demostración: encuentros para compartir experiencias de acompañamiento familiar y conocer las actividades de la comunidad.', tipo: 'ESCUELA_PARA_PADRES', imagenes: ['/images/carrusel-familia.svg'] },
  { titulo: 'Encuentro de la comunidad', descripcion: 'Actividad ficticia de demostración: una jornada para conocer los espacios del centro y compartir con nuestra comunidad.', tipo: 'OTRA', imagenes: ['/images/carrusel-bienestar.svg'] },
];
try {
  await connectDatabase();
  for (const item of publications) await Publicacion.updateOne({ titulo: item.titulo }, { $setOnInsert: { ...item, estado: 'ACTIVO' } }, { upsert: true, runValidators: true });
  for (const item of activities) await ActividadCorporativa.updateOne({ titulo: item.titulo }, { $setOnInsert: { ...item, estado: 'ACTIVO' } }, { upsert: true, runValidators: true });
  console.log('Publicaciones y actividades ficticias cargadas sin modificar registros existentes.');
} catch { console.error('No se pudieron cargar los datos. Revisa MongoDB.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
