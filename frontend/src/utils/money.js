export function formatMoney(cents) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(cents / 100);
}

export function toCents(value) {
  const text = String(value).trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) throw new Error('El precio debe tener hasta dos decimales, entre Q0.00 y Q999,999.99.');
  const [whole, decimal = ''] = text.split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}
