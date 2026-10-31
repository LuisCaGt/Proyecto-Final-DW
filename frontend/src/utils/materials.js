export const MATERIAL_TYPES = { DOCUMENTO: 'Documento', VIDEO: 'Video', AUDIO: 'Audio', EJERCICIO: 'Ejercicio', ENLACE: 'Enlace', OTRO: 'Otro' };
export const formatDate = value => new Date(value).toLocaleDateString('es-GT', { timeZone: 'America/Guatemala', day: 'numeric', month: 'short', year: 'numeric' });
