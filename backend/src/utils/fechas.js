// Utilidades de fecha para la agenda. El centro opera en America/Guatemala (UTC-6, sin horario de verano).
export const ZONA = 'America/Guatemala';
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

// Fecha de hoy en Guatemala con formato YYYY-MM-DD.
export function todayInGuatemala(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Guatemala usa UTC-6 fijo todo el año, por eso la conversión es directa.
export const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const toDate = (fecha, hora) => new Date(`${fecha}T${hora}:00-06:00`);
export const dayOfWeek = fecha => new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 = domingo
export function addMinutes(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  return { hora: `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`, mismoDia: total < 24 * 60 };
}
// Edad cumplida a una fecha YYYY-MM-DD.
export function ageAt(fechaNacimiento, fecha) {
  const birth = new Date(fechaNacimiento).toISOString().slice(0, 10);
  const [by, bm, bd] = birth.split('-').map(Number), [y, m, d] = fecha.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
