export function calcularTotalesCaja(movimientos) {
  const totales = { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0 };
  for (const pago of movimientos) {
    if (pago.estado !== 'REGISTRADO') continue;
    if (!Object.hasOwn(totales, pago.metodo) || !Number.isSafeInteger(pago.montoCentavos) || pago.montoCentavos < 0) throw new TypeError('Movimiento inválido para calcular la caja.');
    totales[pago.metodo] += pago.montoCentavos;
  }
  const totalIngresosCentavos = totales.EFECTIVO + totales.TRANSFERENCIA + totales.TARJETA;
  if (!Number.isSafeInteger(totalIngresosCentavos)) throw new RangeError('El total excede el límite seguro.');
  return { totalEfectivoCentavos: totales.EFECTIVO, totalTransferenciasCentavos: totales.TRANSFERENCIA,
    totalTarjetaCentavos: totales.TARJETA, totalIngresosCentavos };
}

export function calcularCierreCaja({ montoInicialCentavos, efectivoContadoCentavos, totales }) {
  const efectivoEsperadoCentavos = montoInicialCentavos + totales.totalEfectivoCentavos;
  const diferenciaCentavos = efectivoContadoCentavos - efectivoEsperadoCentavos;
  return { ...totales, efectivoEsperadoCentavos, diferenciaCentavos,
    faltanteCentavos: Math.max(0, -diferenciaCentavos), sobranteCentavos: Math.max(0, diferenciaCentavos) };
}
