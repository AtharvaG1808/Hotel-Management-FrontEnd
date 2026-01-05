export function decodeJwt(token) {
  try {
    const [, payloadB64] = token.split('.');
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode JWT', e);
    return null;
  }
}

export function getRoleFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;
  // Your JwtUtil puts "role": "USER" | "AGENT" | "ADMIN"
  const role = payload.role || null;
  return role ? role.toUpperCase() : null;
}


export function getUsernameFromToken(token) {
  const payload = decodeJwt(token);
  return payload?.sub ?? null; // backend sets subject = username
}

