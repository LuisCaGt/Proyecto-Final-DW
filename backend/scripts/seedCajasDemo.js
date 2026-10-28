import 'dotenv/config';import mongoose from 'mongoose';import {Caja} from '../src/models/Caja.js';import {Pago} from '../src/models/Pago.js';import {Usuario} from '../src/models/Usuario.js';import {Paciente} from '../src/models/Paciente.js';import {Servicio} from '../src/models/Servicio.js';import {Cita} from '../src/models/Cita.js';import {calcularCierreCaja,calcularTotalesCaja} from '../src/services/calculosCaja.js';
if(process.env.NODE_ENV==='production')throw Error('Los ejemplos solo se cargan en desarrollo.');
await mongoose.connect(process.env.MONGODB_URI);
try{
 const user=await Usuario.findOne({correo:'recepcion2@sigca.test',estado:'ACTIVO'}),prof=await Usuario.findOne({rol:'PROFESIONAL',estado:'ACTIVO'}),patient=await Paciente.findOne({identificador:'PAC-004'}),service=await Servicio.findOne({estado:'ACTIVO'});
 if(!user||!prof||!patient||!service)throw Error('Ejecuta primero seed:demo y seed:servicios.');
 const specs=[
  {key:'finanzas-ejemplo-cierre',initial:20000,closed:true,counted:69000,payments:[['EFECTIVO',50000,0],['TRANSFERENCIA',35000,0],['TARJETA',15000,0]]},
  {key:'finanzas-ejemplo-historial',initial:10000,closed:true,counted:20000,payments:[['EFECTIVO',10000,0],['TARJETA',5000,0],['EFECTIVO',2500,0,true]]},
  {key:'finanzas-ejemplo-abierta',initial:5000,closed:false,payments:[['EFECTIVO',10000,0],['TRANSFERENCIA',15000,0],['TARJETA',7500,1],['EFECTIVO',2500,1,true]]},
 ];
 for(const [group,spec] of specs.entries()){
  if(await Caja.exists({seedKey:spec.key})){console.log('Ejemplo existente conservado: '+spec.key);continue;}
  if(!spec.closed&&await Caja.exists({responsable:user._id,estado:'ABIERTA'})){console.log('Se conserva la caja abierta de recepción; no se crea otra.');continue;}
  const session=await mongoose.startSession();
  try{await session.withTransaction(async()=>{
   const [box]=await Caja.create([{seedKey:spec.key,responsable:user._id,montoInicialCentavos:spec.initial,estado:spec.closed?'CERRADA':'ABIERTA'}],{session});const citas=[];
   for(let i=0;i<=Math.max(...spec.payments.map(p=>p[2]));i++){
    const [c]=await Cita.create([{paciente:patient._id,servicio:service._id,profesional:prof._id,fecha:'2026-10-01',horaInicio:'09:00',horaFin:'10:00',inicio:new Date('2026-10-01T15:00:00Z'),fin:new Date('2026-10-01T16:00:00Z'),duracionMinutos:60,precioCentavos:group===0?100000:25000,estado:'COMPLETADA',observaciones:'Demostración financiera '+spec.key+' '+i}],{session});citas.push(c);
   }
   const rows=spec.payments.map(([metodo,montoCentavos,index,anulado])=>({cita:citas[index]._id,paciente:patient._id,caja:box._id,registradoPor:user._id,metodo,montoCentavos,estado:anulado?'ANULADO':'REGISTRADO',...(anulado?{anuladoPor:user._id,anuladoEn:new Date(),motivoAnulacion:'Ejemplo de corrección de cobro'}:{})}));await Pago.create(rows,{session,ordered:true});
   if(spec.closed){const totals=calcularTotalesCaja(rows),calc=calcularCierreCaja({montoInicialCentavos:spec.initial,efectivoContadoCentavos:spec.counted,totales:totals});box.cierre={...calc,cerradoPor:user._id,cerradoEn:new Date(),efectivoContadoCentavos:spec.counted};await box.save({session});}
  });console.log('Ejemplo financiero cargado: '+spec.key);}finally{await session.endSession();}
 }
}finally{await mongoose.disconnect();}
