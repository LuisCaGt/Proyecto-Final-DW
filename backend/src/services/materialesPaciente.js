// Consulta de materiales asignados a un paciente. La usa la ficha del paciente y la API de asignaciones.
import { AsignacionMaterial } from '../models/AsignacionMaterial.js';

export const listarMaterialesAsignados = paciente => AsignacionMaterial.find({ paciente })
  .sort({ fechaAsignacion: -1, _id: -1 })
  .populate('material', 'identificador titulo descripcion tipo enlace estado')
  .populate('asignadoPor', 'nombres apellidos rol')
  .lean();
