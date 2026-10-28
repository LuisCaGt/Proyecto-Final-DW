// Convierte quetzales con hasta dos decimales sin errores de coma flotante.
export function aCentavos(value, permitirCero = true) {
  if (!['string', 'number'].includes(typeof value)) return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [entero, decimal = ''] = text.split('.');
  const result = Number(entero) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result <= 99999999 && (permitirCero || result > 0) ? result : null;
}
