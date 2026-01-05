const API_BASE = 'http://localhost:8080'; 
const HOTELS_URL = `${API_BASE}/api/hotels`;
const ROOMS_URL = `${API_BASE}/api/rooms`;

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    qs.append(k, String(v));
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
};


const handleResponse = async (res, as = 'json') => {
  if (!res.ok) {
    // Try to read text for error details
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  const contentLength = res.headers.get('content-length');
  if (contentLength === '0' || contentLength === null) {
    // If you need to be extra safe for chunked transfers, you can also do:
    // const peek = await res.clone().text();
    // if (!peek) return null;
  }

  if (as === 'json') return res.json();
  if (as === 'bytes') return res.arrayBuffer();
  if (as === 'text') return res.text();
  return res;
};

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



export const toDataUrl = (b64, mime = 'image/jpeg') => (b64 ? `data:${mime};base64,${b64}` : '');

const HotelApi = {
  /**
   * Search hotels with filters and pagination.
   * @param {Object} args
   * @param {string} [args.q] - keyword
   * @param {string} [args.country]
   * @param {string} [args.state]
   * @param {number} [args.minRating]
   * @param {number} [args.page=0]
   * @param {number} [args.size=10]
   * @param {string} [args.sort='name,asc'] - e.g., "name,asc"
   */
  async search({
    q,
    country,
    state,
    minRating,
    page = 0,
    size = 10,
    sort = 'name,asc',
  } = {}) {
    const url = `${HOTELS_URL}${buildQuery({ q, country, state, minRating, page, size, sort })}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return handleResponse(res, 'json'); // returns Page<HotelDTO>
  },
  

  /**
   * Get a single hotel by id.
   * @param {number|string} id
   */
  async getById(id) {
    const res = await fetch(`${HOTELS_URL}/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return handleResponse(res, 'json'); // HotelDTO
  },

  /**
   * Create a hotel (roles: HOTELMANAGER/ADMIN).
   * @param {Object} dto - HotelDTO payload; images as Base64 string for bannerImage/photo1/photo2
   */
  async create(dto) {
    const res = await fetch(HOTELS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, 'json'); // HotelDTO
  },

  /**
   * Update a hotel (roles: HOTELMANAGER own / ADMIN any).
   * @param {number|string} id
   * @param {Object} dto
   */
  async update(id, dto) {
    const res = await fetch(`${HOTELS_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, 'json'); // HotelDTO
  },

  /**
   * Delete a hotel (roles: HOTELMANAGER own / ADMIN any).
   * @param {number|string} id
   */
  async remove(id) {
    const res = await fetch(`${HOTELS_URL}/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
     await toJsonOrThrow(res, `Failed to delete package #${id}`);
    return true;
  },

  /**
   * List amenities for a hotel (view for all roles).
   * @param {number|string} id
   */
  async listAmenities(id) {
    const res = await fetch(`${HOTELS_URL}/${id}/amenities`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return handleResponse(res, 'json'); // string[]
  },

  /**
   * Add an amenity (roles: HOTELMANAGER/ADMIN).
   * @param {number|string} id
   * @param {string} amenity
   */
  async addAmenity(id, amenity) {
    const res = await fetch(`${HOTELS_URL}/${id}/amenities${buildQuery({ amenity })}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res, 'json'); // updated string[] list
  },

  /**
   * Remove an amenity (roles: HOTELMANAGER/ADMIN).
   * @param {number|string} id
   * @param {string} amenity
   */
  async removeAmenity(id, amenity) {
    const res = await fetch(`${HOTELS_URL}/${id}/amenities${buildQuery({ amenity })}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    await handleResponse(res); // Void
    return true;
  },

  /**
   * Rate a hotel (roles: USER/HOTELMANAGER/ADMIN).
   * @param {number|string} id
   * @param {number} stars - integer 1..5
   * @returns {Promise<number>} - average rating after rating
   */
  async rate(id, stars) {
    const res = await fetch(`${HOTELS_URL}/${id}/rating${buildQuery({ stars })}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res, 'json'); // average rating (number)
  },
  

  /**
   * Optional: get banner image as bytes (arrayBuffer) if you add /banner endpoint.
   * @param {number|string} id
   * @param {string} mime - default 'image/jpeg'
   */
  async downloadBanner(id, mime = 'image/jpeg') {
    const res = await fetch(`${HOTELS_URL}/${id}/banner`, {
      headers: { Accept: mime, ...getAuthHeaders() },
    });
    return handleResponse(res, 'bytes'); // ArrayBuffer
  },

  
    async mine({ page = 0, size = 10, sortBy = 'updatedAt', sortDir = 'desc' } = {}) {
        const url = `${HOTELS_URL}/mine?page=${page}&size=${size}&sortBy=${encodeURIComponent(sortBy)}&sortDir=${encodeURIComponent(sortDir)}`;
        const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
        }
        return res.json();
    },

  async listRooms({ hotelId, type, page = 0, size = 10, sortBy = 'updatedAt', sortDir = 'desc' } = {}) {
    const params = new URLSearchParams();
    if (hotelId != null) params.set('hotelId', hotelId);
    if (type) params.set('type', type);
    params.set('page', page);
    params.set('size', size);
    // Spring supports multiple sort params; we’ll send one "field,direction"
    params.set('sort', `${sortBy},${sortDir}`);

    const res = await fetch(`${ROOMS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res, 'json'); // Page<RoomDTO> { content, number, size, totalPages, totalElements, ... }
  },

  async getRoom(id) {
    const res = await fetch(`${ROOMS_URL}/${id}`, {
      method: 'GET',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res, 'json'); // RoomDTO
  },

  async createRoom(request) {
    // request must include: { hotelId, type, description, capacity, price, inventory }
    const res = await fetch(`${ROOMS_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
    });
    return handleResponse(res, 'json'); // RoomDTO
  },

  async updateRoom(id, request) {
    // request must include hotelId (RoomController expects it for PreAuthorize)
    const res = await fetch(`${ROOMS_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
    });
    return handleResponse(res, 'json'); // RoomDTO
  },

  async updateRoomInventory(id, inventory) {
    const res = await fetch(`${ROOMS_URL}/${id}/inventory`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ inventory }),
    });
    return handleResponse(res, 'json'); // RoomDTO
  },

  async deleteRoom(id) {
    const res = await fetch(`${ROOMS_URL}/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res); // 204 No Content
  },



  /**
   * Optional: Convert bytes to Blob URL (for <img src> without base64).
   * @param {ArrayBuffer} buffer
   * @param {string} mime
   */
  bytesToBlobUrl(buffer, mime = 'image/jpeg') {
    const blob = new Blob([buffer], { type: mime });
    return URL.createObjectURL(blob);
  },
};

export default HotelApi;

