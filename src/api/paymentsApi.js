
// src/api/paymentsApi.js
const BASE_URL = 'http://localhost:8080'; // absolute

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function toJsonOrThrow(res, defaultMessage) {
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    const message =
      res.status === 401 || res.status === 403
        ? 'You are not authorized. Please log in.'
        : `${defaultMessage} (${res.status})${text ? `: ${text}` : ''}`;
    throw new Error(message);
  }
  try { return text ? JSON.parse(text) : null; } catch { return text || null; }
}

/** Create Razorpay order */
export async function createPaymentOrder(amountPaise) {
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new Error('Invalid amount provided to createPaymentOrder');
  }
  const res = await fetch(`${BASE_URL}/payments/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ amount: Math.round(amountPaise), currency: 'INR' }),
  });
  return toJsonOrThrow(res, 'Failed to create payment order');
}

/** Verify payment */
export async function verifyPaymentOnServer(response) {
  const res = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(response),
  });
  return toJsonOrThrow(res, 'Failed to verify payment');
}

/** Optional: create payment link */
export async function createPaymentLink(amountPaise, description = 'Payment') {
  const res = await fetch(`${BASE_URL}/payments/payment-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ amount: Math.round(amountPaise), description }),
  });
  return toJsonOrThrow(res, 'Failed to create payment link');
}
