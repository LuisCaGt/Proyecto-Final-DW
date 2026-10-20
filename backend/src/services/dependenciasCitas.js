// Punto único de contacto entre citas y los módulos del compañero 2 (pacientes, responsables, usuarios).
// Cuando lleguen sus modelos definitivos, solo se ajusta este archivo.
import { Paciente } from '../models/Paciente.js';
import { Usuario } from '../models/Usuario.js';

export const findPaciente = id => Paciente.findById(id).select('nombres apellidos fechaNacimiento estado responsables').lean();
export const findProfesional = id => Usuario.findOne({ _id: id, rol: 'PROFESIONAL' }).select('nombres apellidos estado').lean();
export const tieneResponsable = paciente => Array.isArray(paciente.responsables) && paciente.responsables.length > 0;
export const pacientesActivos = () => Paciente.find({ estado: 'ACTIVO' }).select('nombres apellidos fechaNacimiento responsables').sort({ apellidos: 1, nombres: 1 }).lean();
export const profesionalesActivos = () => Usuario.find({ rol: 'PROFESIONAL', estado: 'ACTIVO' }).select('nombres apellidos').sort({ apellidos: 1, nombres: 1 }).lean();
export const POPULATE_PACIENTE = { path: 'paciente', select: 'nombres apellidos fechaNacimiento estado' };
export const POPULATE_PROFESIONAL = { path: 'profesional', select: 'nombres apellidos estado' };
