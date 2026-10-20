// Utilidades de fecha para la agenda. El centro opera en America/Guatemala (UTC-6, sin horario de verano).
export const ZONA = 'America/Guatemala';
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

// Fecha de hoy en Guatemala con formato YYYY-MM-DD.
export function todayInGuatemala(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
