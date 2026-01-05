
const BASE_URL = 'http://localhost:8080/api/travel-packages';

function buildQuery(paramsObj) {
  const params = new URLSearchParams();
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, v);
  });
  return params.toString();
}

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
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}


/**
 * Search travel packages (GET)
 * Returns Spring Data Page JSON.
 */
export async function searchTravelPackages({
  destination,
  keyword,
  minDurationDays,
  maxDurationDays,
  minPrice,
  maxPrice,
  page = 0,
  size = 10,
  sortBy = 'price',
  sortDir = 'asc',
} = {}) {
  const qs = buildQuery({
    destination,
    keyword,
    minDurationDays,
    maxDurationDays,
    minPrice,
    maxPrice,
    page,
    size,
    sortBy,
    sortDir,
  });

  const res = await fetch(`${BASE_URL}?${qs}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      // NOTE: do NOT set Content-Type for GET to reduce preflight
    },
  });

  return toJsonOrThrow(res, 'Failed to load packages');
}

/**
 * Get one package by ID (GET /{id})
 */
export async function getTravelPackage(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return toJsonOrThrow(res, `Failed to load package #${id}`);
}

/**
 * Create a package (POST)
 * dto: { title, description, destination, durationDays, price, photo1Base64?, photo2Base64?, photo1ContentType?, photo2ContentType? }
 */
export async function createTravelPackage(dto) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(dto),
  });
  return toJsonOrThrow(res, 'Failed to create package');
}


export async function getMyTravelPackages({ page = 0, size = 20, sortBy = 'updatedAt', sortDir = 'desc' }) {
  const res = await fetch(`${BASE_URL}/mine?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`, {
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load packages: ${res.status}`);
  }
  return res.json(); // returns Page<TravelPackageDTO>
}


/**
 * Update a package (PUT /{id})
 * dto: same shape as create; send only the fields you want to update.
 */
export async function updateTravelPackage(id, dto) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(dto),
  });
  return toJsonOrThrow(res, `Failed to update package #${id}`);
}


/**
 * Delete a package (DELETE /{id})
 * Returns true on success.
 */
export async function deleteTravelPackage(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  await toJsonOrThrow(res, `Failed to delete package #${id}`);
  return true;
}




export async function createPaymentOrder(amountPaise) {
  const res = await fetch(`${BASE_URL}/payments/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
  });
  // expects { orderId, amount, currency, key }
  return toJsonOrThrow(res, 'Failed to create payment order');
}




