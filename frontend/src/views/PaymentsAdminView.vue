<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import AdminNavigation from '../components/AdminNavigation.vue';
import { request } from '../services/api';
import { formatMoney as money } from '../utils/money';
import { useAuthStore } from '../stores/auth';
const auth = useAuthStore(), route = useRoute();
const patients = ref([]), citas = ref({ citas:[], totalPaginas:0, pagina:1 }), ledger = ref({ pagos:[], totalPaginas:0, pagina:1 });
const filters = reactive({ paciente:route.query.paciente || '', metodo:'', estado:'', desde:'', hasta:'' });
const selected = ref(null), cash = ref(null), busy = ref(false), error = ref(''), notice = ref(''), voiding = ref(null), motivo = ref('');
const form = reactive({ monto:'', metodo:'EFECTIVO' });
const name = p => p ? `${p.nombres} ${p.apellidos}` : 'No disponible';
const date = d => new Date(d).toLocaleString('es-GT',{timeZone:'America/Guatemala'});
async function loadCitas(page=1) {
 const q=new URLSearchParams({pagina:String(page),limite:'10'}); if(filters.paciente)q.set('paciente',filters.paciente);
 citas.value=await request('/pagos/citas?'+q);
}
async function loadLedger(page=1) {
 const q=new URLSearchParams({pagina:String(page),limite:'10'}); for(const [k,v] of Object.entries(filters))if(v)q.set(k,v);
 ledger.value=await request('/pagos?'+q);
}
async function refresh() {
 try { await Promise.all([loadCitas(),loadLedger()]); try{cash.value=await request('/cajas/actual');}catch(e){if(e.status!==404)throw e;cash.value=null;} }
 catch(e){error.value=e.message;}
}
async function search(){error.value='';selected.value=null;await refresh();}
function choose(c){selected.value=c;form.monto='';notice.value='';error.value='';}
async function pay(){busy.value=true;error.value='';notice.value='';try{
 const p=await request('/pagos',{method:'POST',body:JSON.stringify({cita:selected.value._id,metodo:form.metodo,monto:form.monto})});
 notice.value='Pago registrado. Comprobante '+p.comprobante;selected.value=null;form.monto='';await refresh();
}catch(e){error.value=e.message;}finally{busy.value=false;}}
function canVoid(p){return p.estado==='REGISTRADO' && p.caja?.estado==='ABIERTA' && (auth.user.rol==='ADMINISTRADOR'||String(p.caja.responsable)===String(auth.user.id));}
async function voidPayment(){busy.value=true;error.value='';try{
 await request('/pagos/'+voiding.value._id+'/anular',{method:'PATCH',body:JSON.stringify({motivo:motivo.value})});
 voiding.value=null;motivo.value='';selected.value=null;notice.value='Pago anulado; saldo e ingresos recalculados.';await refresh();
}catch(e){error.value=e.message;}finally{busy.value=false;}}
async function pageCitas(n){try{await loadCitas(n);}catch(e){error.value=e.message;}}
async function pageLedger(n){try{await loadLedger(n);}catch(e){error.value=e.message;}}
onMounted(async()=>{try{patients.value=await request('/pacientes');await refresh();}catch(e){error.value=e.message;}});
</script>
<template>
 <section class="page-heading"><p class="eyebrow">ADMINISTRACIÓN</p><h1>Pagos y saldos</h1><p class="intro">Registra abonos y consulta el saldo de cada cita y el historial de cobros.</p></section><AdminNavigation/>
 <p v-if="error" class="feedback error" role="alert">{{error}}</p><p v-if="notice" class="feedback success" role="status">{{notice}}</p>
 <p v-if="!cash" class="dev-note">Para registrar cobros debes <RouterLink to="/admin/caja">abrir tu caja</RouterLink>.</p>
 <p v-else class="feedback success">Tu caja está abierta. Los cobros se registrarán en ella.</p>
 <form class="inbox-filters" @submit.prevent="search">
  <div><label for="pay-patient">Paciente</label><select id="pay-patient" v-model="filters.paciente"><option value="">Todos</option><option v-for="p in patients" :value="p.id" :key="p.id">{{name(p)}}</option></select></div>
  <div><label for="pay-method-filter">Método</label><select id="pay-method-filter" v-model="filters.metodo"><option value="">Todos</option><option>EFECTIVO</option><option>TRANSFERENCIA</option><option>TARJETA</option></select></div>
  <div><label for="pay-state">Estado del pago</label><select id="pay-state" v-model="filters.estado"><option value="">Todos</option><option>REGISTRADO</option><option>ANULADO</option></select></div>
  <div><label for="pay-from">Desde</label><input id="pay-from" type="date" v-model="filters.desde"></div><div><label for="pay-to">Hasta</label><input id="pay-to" type="date" v-model="filters.hasta"></div>
  <button class="button" :disabled="busy">Filtrar</button>
 </form>
 <section class="list-panel"><h2>Citas y saldos</h2><p>Los saldos usan el precio registrado al programar la cita. Los filtros de método, estado y fechas se aplican al historial de pagos.</p>
  <p v-if="!citas.citas.length">No hay citas para este paciente.</p>
  <ul class="admin-services"><li v-for="c in citas.citas" :key="c._id"><div class="service-line"><h3>{{name(c.paciente)}}</h3><span class="badge">{{c.financiero.estadoFinanciero}}</span></div>
   <p>{{c.fecha}} · {{c.horaInicio}} · {{c.servicio?.nombre}} · {{c.estado}}</p><p>Precio {{money(c.financiero.precioCentavos)}} · Pagado {{money(c.financiero.pagadoCentavos)}} · <strong>Saldo {{money(c.financiero.saldoCentavos)}}</strong></p>
   <button class="button secondary" :disabled="busy||!cash||c.estado==='CANCELADA'||c.financiero.saldoCentavos<=0" @click="choose(c)">Registrar abono</button>
  </li></ul><div class="pagination" v-if="citas.totalPaginas>1"><button class="button secondary" :disabled="citas.pagina<=1||busy" @click="pageCitas(citas.pagina-1)">Anterior</button><span>{{citas.pagina}} / {{citas.totalPaginas}}</span><button class="button secondary" :disabled="citas.pagina>=citas.totalPaginas||busy" @click="pageCitas(citas.pagina+1)">Siguiente</button></div>
 </section>
 <section v-if="selected" class="form-panel"><h2>Registrar abono</h2><p>{{name(selected.paciente)}} · {{selected.fecha}} · Saldo {{money(selected.financiero.saldoCentavos)}}</p>
  <form @submit.prevent="pay"><fieldset :disabled="busy"><label for="pay-amount">Monto en quetzales</label><input id="pay-amount" type="number" step="0.01" min="0.01" :max="selected.financiero.saldoCentavos/100" v-model="form.monto" required>
  <label for="pay-method">Método de pago</label><select id="pay-method" v-model="form.metodo"><option>EFECTIVO</option><option>TRANSFERENCIA</option><option>TARJETA</option></select>
  <div class="actions"><button class="button">{{busy?'Guardando…':'Guardar pago'}}</button><button class="button secondary" type="button" @click="selected=null">Cancelar</button></div></fieldset></form>
 </section>
 <section class="list-panel"><h2>Historial de pagos</h2><p v-if="!ledger.pagos.length">No hay pagos con estos filtros.</p>
  <ul class="admin-services"><li v-for="p in ledger.pagos" :key="p._id"><div class="service-line"><h3>{{name(p.paciente)}}</h3><span class="badge">{{p.estado}}</span></div><p>{{money(p.montoCentavos)}} · {{p.metodo}} · {{date(p.registradoEn)}}</p><p class="receipt-number">{{p.comprobante}}</p>
   <p v-if="p.motivoAnulacion">Motivo de anulación: {{p.motivoAnulacion}}</p><div class="actions"><RouterLink class="text-button" :to="'/admin/pagos/'+p._id+'/comprobante'">Ver comprobante</RouterLink><button v-if="canVoid(p)" class="text-button" :disabled="busy" @click="voiding=p;motivo=''">Anular pago</button></div>
  </li></ul><div v-if="ledger.totalPaginas>1" class="pagination"><button class="button secondary" :disabled="ledger.pagina<=1||busy" @click="pageLedger(ledger.pagina-1)">Anterior</button><span>{{ledger.pagina}} / {{ledger.totalPaginas}}</span><button class="button secondary" :disabled="ledger.pagina>=ledger.totalPaginas||busy" @click="pageLedger(ledger.pagina+1)">Siguiente</button></div>
 </section>
 <section v-if="voiding" class="form-panel"><h2>Anular pago</h2><p>{{money(voiding.montoCentavos)}} · {{name(voiding.paciente)}}. El movimiento permanecerá en el historial.</p><form @submit.prevent="voidPayment"><fieldset :disabled="busy"><label for="void-reason">Motivo obligatorio</label><textarea id="void-reason" v-model.trim="motivo" required maxlength="500" rows="3"></textarea><div class="actions"><button class="button">Confirmar anulación</button><button class="button secondary" type="button" @click="voiding=null">Volver</button></div></fieldset></form></section>
</template>
<style scoped>.list-panel,.form-panel{margin-bottom:20px}.receipt-number{overflow-wrap:anywhere;font-size:13px}</style>
