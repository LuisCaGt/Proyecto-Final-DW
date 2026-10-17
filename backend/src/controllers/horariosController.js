import { Horario, initialHours, validTime } from '../models/Horario.js';

export async function getHours(req, res) {
  res.json(await Horario.findByIdAndUpdate('atencion', { $setOnInsert: { dias: initialHours, zonaHoraria: 'America/Guatemala' } }, { upsert: true, returnDocument: 'after', runValidators: true, timestamps: false }));
}
export async function updateHours(req, res) {
  const body = req.body;
  const fields = Object.create(null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'dias') || !Array.isArray(body.dias) || body.dias.length !== 7) {
    fields.dias = 'Envía únicamente dias con los siete días de la semana.';
  } else {
    const seen = new Set();
    body.dias.forEach((day, index) => {
      const key = `dias.${index}`;
      if (!day || typeof day !== 'object' || Array.isArray(day) || Object.keys(day).some(k => !['dia', 'abierto', 'inicio', 'fin'].includes(k))) { fields[key] = 'Día inválido.'; return; }
      if (!Number.isInteger(day.dia) || day.dia < 0 || day.dia > 6 || seen.has(day.dia)) fields[key] = 'El día debe ser único y estar entre 0 (domingo) y 6 (sábado).';
      seen.add(day.dia);
      if (typeof day.abierto !== 'boolean') fields[key] = 'Indica si el día está abierto o cerrado.';
      else if (day.abierto && (!validTime(day.inicio) || !validTime(day.fin) || day.inicio >= day.fin)) fields[key] = 'Usa horas HH:mm; el cierre debe ser posterior a la apertura.';
    });
  }
  if (Object.keys(fields).length) { const error = new Error('Revisa los horarios de atención.'); error.status = 400; error.fields = fields; throw error; }
  const dias = body.dias.map(day => ({ dia: day.dia, abierto: day.abierto, inicio: day.abierto ? day.inicio : null, fin: day.abierto ? day.fin : null })).sort((a,b) => a.dia - b.dia);
  res.json(await Horario.findByIdAndUpdate('atencion', { $set: { dias } }, { upsert: true, returnDocument: 'after', runValidators: true }));
}
