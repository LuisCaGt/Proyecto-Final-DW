import mongoose from 'mongoose';

const cierreSchema = new mongoose.Schema({
  cerradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  cerradoEn: { type: Date, required: true },
  efectivoContadoCentavos: { type: Number, required: true },
  efectivoEsperadoCentavos: { type: Number, required: true },
  diferenciaCentavos: { type: Number, required: true },
  faltanteCentavos: { type: Number, required: true, default: 0 },
  sobranteCentavos: { type: Number, required: true, default: 0 },
  totalEfectivoCentavos: { type: Number, required: true },
  totalTransferenciasCentavos: { type: Number, required: true },
  totalTarjetaCentavos: { type: Number, required: true },
  totalIngresosCentavos: { type: Number, required: true },
}, { _id: false });

const cajaSchema = new mongoose.Schema({
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  seedKey: { type: String, default: null, select: false },
  abiertaEn: { type: Date, required: true, default: Date.now },
  montoInicialCentavos: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  estado: { type: String, enum: ['ABIERTA', 'CERRADA'], default: 'ABIERTA', required: true },
  cierre: { type: cierreSchema, default: null },
  versionMovimientos: { type: Number, default: 0 },
}, { timestamps: true, collection: 'cajas' });

cajaSchema.index({ responsable: 1, estado: 1 }, { unique: true, partialFilterExpression: { estado: 'ABIERTA' }, name: 'una_caja_abierta_por_responsable' });
cajaSchema.index({ seedKey: 1 }, { unique: true, sparse: true });
export const Caja = mongoose.models.Caja || mongoose.model('Caja', cajaSchema);
