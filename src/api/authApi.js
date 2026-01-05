
// src/api/authApi.js

const BASE_URL = 'http://localhost:8080/api/auth';

/**
 * Registers a new user.
 * Expects: { username, email, password, role }
 * Returns: created UserDTO from backend
 */
export async function register(payload) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Ensure keys match your RegisterDTO in Spring
    body: JSON.stringify({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      role: payload.role, // e.g., "USER" or "HOST"
    }),
  });

  // Try to extract server-provided message if available
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.details)) ||
      `Registration failed (${res.status})`;
    throw new Error(msg);
  }

  return data; // UserDTO
}

/**
 * Logs in a user by email/password.
 * Expects: { email, password }
 * Returns: token string from { token: "..." }
 */
export async function login(payload) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.details)) ||
      `Login failed (${res.status})`;
    throw new Error(msg);
  }

  if (!data || !data.token) {
    throw new Error('Login succeeded but token missing in response.');
  }

  return data.token;
}
