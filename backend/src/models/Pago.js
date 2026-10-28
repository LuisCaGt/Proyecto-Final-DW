import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema({
  cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true, index: true },
  caja: { type: mongoose.Schema.Types.ObjectId, ref: 'Caja', required: true, index: true },
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  metodo: { type: String, enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'], required: true },
  montoCentavos: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  estado: { type: String, enum: ['REGISTRADO', 'ANULADO'], default: 'REGISTRADO', required: true },
  registradoEn: { type: Date, default: Date.now, required: true },
  anuladoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  anuladoEn: { type: Date, default: null },
  motivoAnulacion: { type: String, trim: true, maxlength: 500, default: null },
}, { timestamps: true, collection: 'pagos' });

export const Pago = mongoose.models.Pago || mongoose.model('Pago', pagoSchema);
