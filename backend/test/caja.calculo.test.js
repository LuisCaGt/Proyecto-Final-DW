import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularCierreCaja, calcularTotalesCaja } from '../src/services/calculosCaja.js';

test('caso obligatorio: ingresos Q1,000 y faltante Q10', () => {
  const pagos = [
    { metodo: 'EFECTIVO', montoCentavos: 50000, estado: 'REGISTRADO' },
    { metodo: 'TRANSFERENCIA', montoCentavos: 35000, estado: 'REGISTRADO' },
    { metodo: 'TARJETA', montoCentavos: 15000, estado: 'REGISTRADO' },
  ];
  const totales = calcularTotalesCaja(pagos);
  const cierre = calcularCierreCaja({ montoInicialCentavos: 20000, efectivoContadoCentavos: 69000, totales });
  assert.equal(cierre.totalIngresosCentavos, 100000);
  assert.equal(cierre.efectivoEsperadoCentavos, 70000);
  assert.equal(cierre.diferenciaCentavos, -1000);
  assert.equal(cierre.faltanteCentavos, 1000);
  assert.equal(cierre.sobranteCentavos, 0);
});

test('ignora pagos anulados y reporta sobrante', () => {
  const totales = calcularTotalesCaja([
    { metodo: 'EFECTIVO', montoCentavos: 5000, estado: 'REGISTRADO' },
    { metodo: 'EFECTIVO', montoCentavos: 2000, estado: 'ANULADO' },
  ]);
  const cierre = calcularCierreCaja({ montoInicialCentavos: 10000, efectivoContadoCentavos: 16000, totales });
  assert.equal(cierre.totalIngresosCentavos, 5000);
  assert.equal(cierre.diferenciaCentavos, 1000);
  assert.equal(cierre.sobranteCentavos, 1000);
});
