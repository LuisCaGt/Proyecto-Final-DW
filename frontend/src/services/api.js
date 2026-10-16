export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: AbortSignal.timeout(10000),
    });
  } catch { throw new Error('No se pudo conectar con el servidor. Intenta de nuevo.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'No se pudo completar la operación.');
    error.fields = data?.fields;
    throw error;
  }
  return data;
}
