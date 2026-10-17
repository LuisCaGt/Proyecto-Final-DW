import { ContenidoInstitucional, initialContent, initialSlides, initialContact } from '../models/ContenidoInstitucional.js';
import { isImageUrl } from '../models/Servicio.js';

const limits = { nombreCentro: 100, logo: 2048, tituloInicio: 180, descripcionInicio: 1500, mision: 3000, vision: 3000 };

function validate(body) {
  const fields = Object.create(null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Envía un objeto JSON.'); error.status = 400; throw error;
  }
  for (const key of Object.keys(body)) if (!(Object.hasOwn(limits, key))) fields[key] = 'Campo no permitido.';
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > limit) fields[key] = `Campo obligatorio, máximo ${limit} caracteres.`;
  }
  if (typeof body.logo === 'string' && !isImageUrl(body.logo.trim())) fields.logo = 'Usa una URL HTTP/HTTPS o una imagen de /images/.';
  if (Object.keys(fields).length) {
    const error = new Error('Revisa los campos del contenido institucional.'); error.status = 400; error.fields = fields; throw error;
  }
  return Object.fromEntries(Object.keys(limits).map(key => [key, body[key].trim()]));
}

export async function getContent(req, res) {
  await ContenidoInstitucional.updateOne({ _id: 'principal', contacto: { $exists: false } }, { $set: { contacto: initialContact } }, { timestamps: false, runValidators: true });
  // Una sola configuración, creada de forma atómica con datos ficticios iniciales.
  await ContenidoInstitucional.updateOne({ _id: 'principal', carrusel: { $exists: false } }, { $set: { carrusel: initialSlides } }, { timestamps: false, runValidators: true });
  const content = await ContenidoInstitucional.findByIdAndUpdate('principal', { $setOnInsert: initialContent }, {
    upsert: true, returnDocument: 'after', runValidators: true, timestamps: false,
  });
  res.json(content);
}

export async function updateContent(req, res) {
  if (req.params.id !== 'principal') return res.status(404).json({ message: 'Contenido no encontrado.' });
  const data = validate(req.body);
  const content = await ContenidoInstitucional.findByIdAndUpdate('principal', { $set: data }, {
    upsert: true, returnDocument: 'after', runValidators: true,
  });
  res.json(content);
}

export async function updateCarousel(req, res) {
  if (req.params.id !== 'principal') return res.status(404).json({ message: 'Contenido no encontrado.' });
  const body = req.body;
  const fields = Object.create(null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'carrusel') || !Array.isArray(body.carrusel) || body.carrusel.length < 5 || body.carrusel.length > 10) {
    fields.carrusel = 'Envía únicamente carrusel con entre cinco y diez imágenes.';
  } else {
    body.carrusel.forEach((slide, index) => {
      const key = `carrusel.${index}`;
      if (!slide || typeof slide !== 'object' || Array.isArray(slide) || Object.keys(slide).some(k => !['imagen', 'titulo', 'textoAlternativo'].includes(k))) { fields[key] = 'Imagen inválida.'; return; }
      if (typeof slide.imagen !== 'string' || slide.imagen.length > 2048 || !isImageUrl(slide.imagen.trim())) fields[`${key}.imagen`] = 'Usa una URL HTTP/HTTPS o una imagen de /images/.';
      for (const [field, limit] of [['titulo', 100], ['textoAlternativo', 180]]) {
        if (typeof slide[field] !== 'string' || !slide[field].trim() || slide[field].trim().length > limit) fields[`${key}.${field}`] = `Campo obligatorio, máximo ${limit} caracteres.`;
      }
    });
  }
  if (Object.keys(fields).length) { const error = new Error('Revisa las imágenes del carrusel.'); error.status = 400; error.fields = fields; throw error; }
  const carrusel = body.carrusel.map(slide => ({ imagen: slide.imagen.trim(), titulo: slide.titulo.trim(), textoAlternativo: slide.textoAlternativo.trim() }));
  const content = await ContenidoInstitucional.findByIdAndUpdate('principal', { $set: { carrusel }, $setOnInsert: Object.fromEntries(Object.entries(initialContent).filter(([key]) => key !== 'carrusel')) }, { upsert: true, returnDocument: 'after', runValidators: true });
  res.json(content);
}
