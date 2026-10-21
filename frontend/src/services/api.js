export async function request(path, options = {}) {
  let response;
  try {
    const savedSession = JSON.parse(sessionStorage.getItem('sigca.session') || 'null');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (savedSession?.token) headers.Authorization = `Bearer ${savedSession.token}`;
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(10000),
    });
  } catch { throw new Error('No se pudo conectar con el servidor. Intenta de nuevo.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      sessionStorage.removeItem('sigca.session');
      window.dispatchEvent(new Event('sigca:session-expired'));
    }
    const error = new Error(data?.message || 'No se pudo completar la operación.');
    error.fields = data?.fields;
    error.status = response.status;
    throw error;
  }
  return data;
}
