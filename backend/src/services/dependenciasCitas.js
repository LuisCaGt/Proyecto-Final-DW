// Consultas de pacientes, responsables y profesionales utilizadas por la agenda.
// Las relaciones de responsables se resuelven contra registros persistidos reales.
import { Paciente } from '../models/Paciente.js';
import { Usuario } from '../models/Usuario.js';
import { ResponsablePaciente } from '../models/ResponsablePaciente.js';
import { Cita } from '../models/Cita.js';

export const findPaciente = id => Paciente.findById(id).select('nombres apellidos fechaNacimiento estado').lean();
export const findProfesional = id => Usuario.findOne({ _id: id, rol: 'PROFESIONAL' }).select('nombres apellidos estado').lean();
export async function tieneResponsable(paciente) {
  const links = await ResponsablePaciente.find({ paciente: paciente._id }).populate('responsable', '_id').lean();
  return links.some(link => link.responsable);
}
export async function filtroPacientesProfesional(profesional) {
  const ids = await Cita.distinct('paciente', { profesional });
  return { $or: [{ profesionales: profesional }, { _id: { $in: ids } }] };
}
export const listarPacientes = (filter = {}) => Paciente.find(filter).select('nombres apellidos fechaNacimiento estado').sort({ apellidos: 1, nombres: 1 }).lean();
export const listarProfesionales = (filter = {}) => Usuario.find({ rol: 'PROFESIONAL', ...filter }).select('nombres apellidos estado').sort({ apellidos: 1, nombres: 1 }).lean();
export const POPULATE_PACIENTE = { path: 'paciente', select: 'nombres apellidos fechaNacimiento estado' };
export const POPULATE_PROFESIONAL = { path: 'profesional', select: 'nombres apellidos estado' };
