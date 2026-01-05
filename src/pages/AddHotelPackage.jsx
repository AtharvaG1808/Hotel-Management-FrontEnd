
import React, { useEffect, useMemo, useRef, useState } from 'react';
import HotelApi, { toDataUrl } from '../api/hotelApi';
import '../style/addHotelPackage.css';

/** ---------- Utilities ---------- **/
async function compressImageFile(
  file,
  { maxWidth = 1024, quality = 0.72, mimeType = 'image/jpeg' } = {}
) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const dataUrl = canvas.toDataURL(mimeType, quality);
  return { dataUrl, mimeType };
}

const extractBase64 = (dataUrlOrB64) => {
  if (!dataUrlOrB64) return '';
  const commaIdx = dataUrlOrB64.indexOf(',');
  return commaIdx >= 0 ? dataUrlOrB64.slice(commaIdx + 1) : dataUrlOrB64;
};

const normalizeBannerSrc = (bannerImage, mimeFallback = 'image/jpeg') => {
  if (!bannerImage || typeof bannerImage !== 'string') return '';
  if (bannerImage.startsWith('data:')) return bannerImage;
  if (bannerImage.startsWith('base64,')) {
    const b64 = bannerImage.replace(/^base64,/, '');
    return toDataUrl ? toDataUrl(b64, mimeFallback) : `data:${mimeFallback};base64,${b64}`;
  }
  return toDataUrl ? toDataUrl(bannerImage, mimeFallback) : `data:${mimeFallback};base64,${bannerImage}`;
};

const PLACEHOLDER = '/images/placeholder-16x9.jpg';

/** ---------- Component ---------- **/
export default function AddHotelPackage() {
  /** ===== Create form state ===== */
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [country, setCountry] = useState('');
  const [zip, setZip] = useState('');
  const [amenitiesInput, setAmenitiesInput] = useState('');

  const [bannerPreview, setBannerPreview] = useState('');
  const [photo1Preview, setPhoto1Preview] = useState('');
  const [photo2Preview, setPhoto2Preview] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [photo1File, setPhoto1File] = useState(null);
  const [photo2File, setPhoto2File] = useState(null);

  const bannerInputRef = useRef(null);
  const photo1InputRef = useRef(null);
  const photo2InputRef = useRef(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createOk, setCreateOk] = useState(null);

  /** ===== Edit Hotel (modal) ===== */
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  /** ===== Derived ===== */
  const canSubmitCreate = useMemo(() => {
    if (!name.trim() || !destination.trim() || !city.trim() || !country.trim()) return false;
    if (!bannerFile || !photo1File) return false;
    return true;
  }, [name, destination, city, country, bannerFile, photo1File]);

  /** ===== Image handlers (Create) ===== */
  const onBannerChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const { dataUrl, mimeType } = await compressImageFile(f, {
      maxWidth: 1280, quality: 0.8, mimeType: 'image/jpeg',
    });
    setBannerPreview(dataUrl);
    setBannerFile({ type: mimeType });
  };

  const onPhoto1Change = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const { dataUrl, mimeType } = await compressImageFile(f);
    setPhoto1Preview(dataUrl);
    setPhoto1File({ type: mimeType });
  };

  const onPhoto2Change = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const { dataUrl, mimeType } = await compressImageFile(f);
    setPhoto2Preview(dataUrl);
    setPhoto2File({ type: mimeType });
  };

  /** ===== Create submit ===== */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canSubmitCreate) return;

    setCreateError(null);
    setCreateOk(null);
    setCreating(true);
    try {
      const dto = {
        name: name.trim(),
        description: description.trim(),
        destination: destination.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: stateCode.trim(),
        country: country.trim(),
        zip: zip.trim(),
        amenities: amenitiesInput.split(',').map((s) => s.trim()).filter(Boolean),
        bannerImage: extractBase64(bannerPreview),
        photo1: extractBase64(photo1Preview),
        photo2: extractBase64(photo2Preview),
      };

      await HotelApi.create(dto);
      setCreateOk('Hotel created successfully');

      // clear form
      setName(''); setDescription(''); setDestination('');
      setAddressLine1(''); setCity(''); setStateCode(''); setCountry(''); setZip('');
      setAmenitiesInput('');
      setBannerFile(null); setPhoto1File(null); setPhoto2File(null);
      setBannerPreview(''); setPhoto1Preview(''); setPhoto2Preview('');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      if (photo1InputRef.current) photo1InputRef.current.value = '';
      if (photo2InputRef.current) photo2InputRef.current.value = '';

      await fetchMine({ pageArg: 0 });
    } catch (err) {
      setCreateError(err.message || 'Failed to create hotel');
    } finally {
      setCreating(false);
    }
  };

  /** ===== My Hotels list ===== */
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  const [mineSortBy, setMineSortBy] = useState('updatedAt');
  const [mineSortDir, setMineSortDir] = useState('desc');
  const [mineSize, setMineSize] = useState(10);

  useEffect(() => {
    fetchMine({ pageArg: 0, sizeArg: mineSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineSortBy, mineSortDir, mineSize]);

  async function fetchMine({ pageArg = pageData?.number ?? 0, sizeArg = pageData?.size ?? mineSize } = {}) {
    setLoading(true);
    setListError(null);
    try {
      const data = await HotelApi.mine({ page: pageArg, size: sizeArg, sortBy: mineSortBy, sortDir: mineSortDir });
      setPageData(data);
    } catch (e) {
      setListError(e.message || 'Failed to load your hotels');
    } finally {
      setLoading(false);
    }
  }

  /** ===== Edit Hotel helpers ===== */
  
const normalizeAmenities = (raw) => {
  if (!raw) return [];
  // Case 1: already an array of strings
  if (Array.isArray(raw) && raw.every(x => typeof x === 'string')) {
    return Array.from(new Set(raw.map(s => s.trim()).filter(Boolean)));
  }
  // Case 2: array of objects (e.g., [{name:'wifi'}])
  if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
    const arr = raw
      .map(o => (o?.name ?? o?.label ?? o?.value ?? '').toString().trim())
      .filter(Boolean);
    return Array.from(new Set(arr));
  }
  // Case 3: comma/space separated string
  if (typeof raw === 'string') {
    const arr = raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(arr));
  }
  return [];
};

const startEdit = (hotel) => {
  setEditError(null);
  const amenitiesArr = normalizeAmenities(hotel.amenities);
  setEditing({
    id: hotel.id,
    name: hotel.name || '',
    description: hotel.description || '',
    destination: hotel.destination || '',
    addressLine1: hotel.addressLine1 || '',
    city: hotel.city || '',
    state: hotel.state || '',
    country: hotel.country || '',
    zip: hotel.zip || '',
    amenities: amenitiesArr,            // <-- always a clean string[]
    bannerImage: hotel.bannerImage || null,
    photo1: hotel.photo1 || null,
    photo2: hotel.photo2 || null,
  });
};


  const cancelEdit = () => { setEditing(null); setEditError(null); };
  const updateEditField = (field, value) => { setEditing((prev) => ({ ...prev, [field]: value })); };

  
const updateEditAmenitiesInput = (value) => {
  const parts = value.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
  setEditing((prev) => ({ ...prev, amenities: Array.from(new Set(parts)) }));
};

  const saveEdit = async () => {
    if (!editing || !editing.id) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const dto = {
        name: editing.name?.trim() || '',
        description: editing.description?.trim() || '',
        destination: editing.destination?.trim() || '',
        addressLine1: editing.addressLine1?.trim() || '',
        city: editing.city?.trim() || '',
        state: editing.state?.trim() || '',
        country: editing.country?.trim() || '',
        zip: editing.zip?.trim() || '',
        amenities: editing.amenities || [],
        // keep images unchanged in this simple edit flow
        bannerImage: null,
        photo1: null,
        photo2: null,
      };
      await HotelApi.update(editing.id, dto);
      await fetchMine({ pageArg: pageData.number, sizeArg: pageData.size });
      cancelEdit();
    } catch (e) {
      setEditError(e.message || 'Failed to update hotel');
    } finally {
      setSavingEdit(false);
    }
  };

  const removeHotel = async (id) => {
    const ok = window.confirm('Delete this hotel? This action cannot be undone.');
    if (!ok) return;
    try {
      await HotelApi.remove(id);
      await fetchMine({ pageArg: pageData.number, sizeArg: pageData.size });
    } catch (e) {
      alert(e.message || 'Failed to delete hotel');
    }
  };

  /** ===== Rooms Manager (modal) ===== */
  const [roomsHotel, setRoomsHotel] = useState(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [roomsPage, setRoomsPage] = useState({ content: [], number: 0, size: 10, totalPages: 0, totalElements: 0 });
  const [roomsSortBy, setRoomsSortBy] = useState('updatedAt');
  const [roomsSortDir, setRoomsSortDir] = useState('desc');
  const [roomsTypeFilter, setRoomsTypeFilter] = useState('');

  const openRoomsManager = (hotel) => {
    setRoomsHotel(hotel);
    loadRooms({ hotelId: hotel.id, page: 0, size: roomsPage.size || 10, sortBy: roomsSortBy, sortDir: roomsSortDir, type: roomsTypeFilter });
  };
  const closeRoomsManager = () => {
    setRoomsHotel(null);
    setRoomsError(null);
    setRoomsPage({ content: [], number: 0, size: 10, totalPages: 0, totalElements: 0 });
  };

  async function loadRooms({ hotelId, page = roomsPage.number || 0, size = roomsPage.size || 10, sortBy = roomsSortBy, sortDir = roomsSortDir, type = roomsTypeFilter } = {}) {
    const id = hotelId || roomsHotel?.id;
    if (!id) return;
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const data = await HotelApi.listRooms({ hotelId: id, type, page, size, sortBy, sortDir });
      setRoomsPage(data);
    } catch (e) {
      setRoomsError(e.message || 'Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  }

  const [roomForm, setRoomForm] = useState({ type: '', description: '', capacity: '', price: '', inventory: '' });
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomFormError, setRoomFormError] = useState(null);
  const updateRoomForm = (field, value) => setRoomForm((prev) => ({ ...prev, [field]: value }));

  const canSubmitRoom = () => {
    const capacity = Number(roomForm.capacity);
    const price = Number(roomForm.price);
    const inventory = Number(roomForm.inventory);
    return (
      roomForm.type.trim() &&
      !Number.isNaN(capacity) && capacity > 0 &&
      !Number.isNaN(price) && price > 0 &&
      !Number.isNaN(inventory) && inventory >= 0
    );
  };

  async function createRoom() {
    if (!roomsHotel?.id || !canSubmitRoom()) return;
    setRoomFormError(null);
    setRoomSaving(true);
    try {
      const dto = {
        hotelId: roomsHotel.id,
        type: roomForm.type.trim(),
        description: roomForm.description.trim(),
        capacity: Number(roomForm.capacity),
        price: Number(roomForm.price),
        inventory: Number(roomForm.inventory),
      };
      await HotelApi.createRoom(dto);
      await loadRooms({ page: roomsPage.number, size: roomsPage.size });
      setRoomForm({ type: '', description: '', capacity: '', price: '', inventory: '' });
    } catch (e) {
      setRoomFormError(e.message || 'Failed to create room');
    } finally {
      setRoomSaving(false);
    }
  }

  const [roomEditing, setRoomEditing] = useState(null);
  const [roomEditSaving, setRoomEditSaving] = useState(false);
  const [roomEditError, setRoomEditError] = useState(null);

  const startRoomEdit = (room) => { setRoomEditing({ ...room }); setRoomEditError(null); };
  const cancelRoomEdit = () => { setRoomEditing(null); setRoomEditError(null); };

  async function saveRoomEdit() {
    if (!roomsHotel?.id || !roomEditing?.id) return;
    setRoomEditSaving(true);
    setRoomEditError(null);
    try {
      const dto = {
        hotelId: roomsHotel.id,
        type: roomEditing.type?.trim() || '',
        description: roomEditing.description?.trim() || '',
        capacity: Number(roomEditing.capacity),
        price: Number(roomEditing.price),
        inventory: Number(roomEditing.inventory),
      };
      await HotelApi.updateRoom(roomEditing.id, dto);
      await loadRooms({ page: roomsPage.number, size: roomsPage.size });
      cancelRoomEdit();
    } catch (e) {
      setRoomEditError(e.message || 'Failed to update room');
    } finally {
      setRoomEditSaving(false);
    }
  }

  async function deleteRoom(roomId) {
    if (!roomId) return;
    const ok = window.confirm('Delete this room? This action cannot be undone.');
    if (!ok) return;
    try {
      await HotelApi.deleteRoom(roomId);
      await loadRooms({ page: roomsPage.number, size: roomsPage.size });
    } catch (e) {
      alert(e.message || 'Failed to delete room');
    }
  }

  async function patchInventory(roomId, newInventory) {
    try {
      await HotelApi.updateRoomInventory(roomId, Number(newInventory));
      await loadRooms({ page: roomsPage.number, size: roomsPage.size });
    } catch (e) {
      alert(e.message || 'Failed to update inventory');
    }
  }

  /** Lock background scroll when any modal is open */
  useEffect(() => {
    const open = Boolean(roomsHotel) || Boolean(editing);
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [roomsHotel, editing]);

  /** ---------- Render ---------- */
  return (
    <div className="ahp-page">
      <div className="ahp-container">
        {/* ===== Create section (as provided) ===== */}
        <h3 className="ahp-sectionTitle">Add Hotel</h3>
        <p className="ahp-muted">Create a new hotel with banner and photos.</p>

        <form className="ahp-card" onSubmit={handleCreate}>
          <div className="ahp-row">
            <label className="ahp-field">
              <span className="ahp-label">Name</span>
              <input className="ahp-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Blue Lagoon Hotel" required />
            </label>
            <label className="ahp-field">
              <span className="ahp-label">Destination</span>
              <input className="ahp-input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Goa" required />
            </label>
          </div>

          <label className="ahp-field">
            <span className="ahp-label">Description</span>
            <textarea className="ahp-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beachfront property with sea view rooms." />
          </label>

          <div className="ahp-row">
            <label className="ahp-field">
              <span className="ahp-label">Address Line 1</span>
              <input className="ahp-input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Near Candolim Beach" />
            </label>
            <label className="ahp-field">
              <span className="ahp-label">City</span>
              <input className="ahp-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Panaji" required />
            </label>
          </div>

          <div className="ahp-row">
            <label className="ahp-field">
              <span className="ahp-label">State</span>
              <input className="ahp-input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} placeholder="Goa" />
            </label>
            <label className="ahp-field">
              <span className="ahp-label">Country</span>
              <input className="ahp-input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" required />
            </label>
          </div>

          <div className="ahp-row">
            <label className="ahp-field">
              <span className="ahp-label">Zip</span>
              <input className="ahp-input" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="403001" />
            </label>
            <label className="ahp-field">
              <span className="ahp-label">Amenities (comma separated)</span>
              <input className="ahp-input" value={amenitiesInput} onChange={(e) => setAmenitiesInput(e.target.value)} placeholder="wifi,pool,spa" />
            </label>
          </div>

          {/* Images */}
          <div className="ahp-row">
            <label className="ahp-field">
              <span className="ahp-label">Banner Photo</span>
              <input className="ahp-input" type="file" accept="image/*" onChange={onBannerChange} ref={bannerInputRef} required />
              {bannerPreview && <img className="ahp-preview" src={bannerPreview} alt="Banner preview" />}
            </label>
            <label className="ahp-field">
              <span className="ahp-label">Photo 1</span>
              <input className="ahp-input" type="file" accept="image/*" onChange={onPhoto1Change} ref={photo1InputRef} required />
              {photo1Preview && <img className="ahp-preview" src={photo1Preview} alt="Photo 1 preview" />}
            </label>
            <label className="ahp-field">
              <span className="ahp-label">Photo 2</span>
              <input className="ahp-input" type="file" accept="image/*" onChange={onPhoto2Change} ref={photo2InputRef} />
              {photo2Preview && <img className="ahp-preview" src={photo2Preview} alt="Photo 2 preview" />}
            </label>
          </div>

          {createError && <div className="ahp-error">{createError}</div>}
          {createOk && <div className="ahp-success">{createOk}</div>}

          <div className="ahp-actions">
            <button className="ahp-btn ahp-btnPrimary" type="submit" disabled={!canSubmitCreate || creating}>
              {creating ? 'Creating…' : 'Create hotel'}
            </button>
          </div>
        </form>

        {/* ===== My Hotels ===== */}
        <h4 className="ahp-sectionTitle" style={{ marginTop: 16 }}>My Hotels</h4>

        {loading && <div className="ahp-muted">Loading…</div>}
        {listError && <div className="ahp-error">Error: {listError}</div>}
        {!loading && !listError && pageData.content.length === 0 && <div className="ahp-muted">No hotels created yet.</div>}

        {!loading && !listError && pageData.content.length > 0 && (
          <>
            {/* Grid of hotels */}
            <div className="ahp-grid">
              {pageData.content.map((h) => (
                <div key={h.id} className="ahp-card" style={{ position: 'relative' }}>
                  <span className="ahp-badge">{h.destination || h.city || '—'}</span>

                  <img
                    className="ahp-preview"
                    src={normalizeBannerSrc(h.bannerImage, h.bannerImageContentType || 'image/jpeg') || PLACEHOLDER}
                    alt={h.name ? `${h.name} image` : 'Hotel image'}
                    loading="lazy"
                    onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                  />

                  <h4 className="ahp-title" style={{ marginTop: 10 }}>{h.name}</h4>
                  {h.description && <p className="ahp-desc">{h.description}</p>}

                  <div className="ahp-metaRow">
                    <div className="ahp-metaItem">
                      <span className="ahp-metaLabel">Location</span>
                      <span className="ahp-metaValue">
                        {[h.city, h.state, h.country].filter(Boolean).join(', ') || '—'}
                      </span>
                    </div>
                     <div className="ahp-creator">
                      <span className="ahp-creatorLabel">Created by</span>
                      <span className="ahp-creatorName">{h.createdByUsername || 'You'}</span>
                    </div>
                    <div className="ahp-metaItem">
                      <span className="ahp-metaLabel">Rating</span>
                      <span className="ahp-metaValue">{h.rating ?? '—'}</span>
                    </div>
                  </div>

                  <div className="ahp-footer">

                    <div className="ahp-actions">
                      <button className="ahp-btn" onClick={() => startEdit(h)} title="Edit hotel">Edit</button>
                      <button className="ahp-btn ahp-btnDanger" onClick={() => removeHotel(h.id)} title="Delete hotel">Delete</button>
                      <button className="ahp-btn" type="button" onClick={() => openRoomsManager(h)} title="Manage rooms">
                        Manage Rooms
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pageData.totalPages > 1 && (
              <div className="ahp-actions-1">
                <button
                  className="ahp-btn"
                  onClick={() => fetchMine({ pageArg: Math.max(0, pageData.number - 1), sizeArg: pageData.size })}
                  disabled={pageData.number <= 0}
                >
                  Prev
                </button>
                <span>Page {pageData.number + 1} of {pageData.totalPages}</span>
                <button
                  className="ahp-btn"
                  onClick={() =>
                    fetchMine({
                      pageArg: Math.min(pageData.totalPages - 1, pageData.number + 1),
                      sizeArg: pageData.size,
                    })
                  }
                  disabled={pageData.number >= pageData.totalPages - 1}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== Edit Hotel Modal (polished, scrollable) ===== */}
        {editing && (
          <div className="ahp-modalBackdrop" role="dialog" aria-modal="true" aria-label={`Edit hotel ${editing?.name || ''}`}>
            <div className="ahp-modalCard ahp-modalCard--wide">
              <div className="ahp-modalHeader ahp-modalHeader--brand">
                <div className="ahp-modalHeaderLeft">
                  <h4 className="ahp-title">Edit Hotel</h4>
                  <div className="ahp-chipRow">
                    <span className="ahp-chip">{editing.name || 'Untitled'}</span>
                    {(editing.city || editing.country) && (
                      <span className="ahp-chip ahp-chip--muted">
                        {[editing.city, editing.state, editing.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <button className="ahp-btn" onClick={cancelEdit} aria-label="Close edit hotel">Close</button>
              </div>

              <div className="ahp-modalBody">
                {/* Basics */}
                <div className="ahp-sectionHeader">
                  <h5 className="ahp-title">Basics</h5>
                </div>
                <div className="ahp-formGrid">
                  <label className="ahp-field">
                    <span className="ahp-label">Name</span>
                    <input className="ahp-input" value={editing.name} onChange={(e) => updateEditField('name', e.target.value)} required />
                  </label>
                  <label className="ahp-field">
                    <span className="ahp-label">Destination</span>
                    <input className="ahp-input" value={editing.destination} onChange={(e) => updateEditField('destination', e.target.value)} />
                  </label>
                  <label className="ahp-field ahp-formGrid-span2">
                    <span className="ahp-label">Description</span>
                    <textarea className="ahp-textarea" rows={3} value={editing.description} onChange={(e) => updateEditField('description', e.target.value)} />
                  </label>
                </div>

                <div className="ahp-divider"></div>

                {/* Address */}
                <div className="ahp-sectionHeader">
                  <h5 className="ahp-title">Address</h5>
                </div>
                <div className="ahp-formGrid">
                  <label className="ahp-field ahp-formGrid-span2">
                    <span className="ahp-label">Address Line 1</span>
                    <input className="ahp-input" value={editing.addressLine1} onChange={(e) => updateEditField('addressLine1', e.target.value)} />
                  </label>
                  <label className="ahp-field">
                    <span className="ahp-label">City</span>
                    <input className="ahp-input" value={editing.city} onChange={(e) => updateEditField('city', e.target.value)} />
                  </label>
                  <label className="ahp-field">
                    <span className="ahp-label">State</span>
                    <input className="ahp-input" value={editing.state} onChange={(e) => updateEditField('state', e.target.value)} />
                  </label>
                  <label className="ahp-field">
                    <span className="ahp-label">Country</span>
                    <input className="ahp-input" value={editing.country} onChange={(e) => updateEditField('country', e.target.value)} />
                  </label>
                  <label className="ahp-field">
                    <span className="ahp-label">Zip</span>
                    <input className="ahp-input" value={editing.zip} onChange={(e) => updateEditField('zip', e.target.value)} />
                  </label>
                </div>

                <div className="ahp-divider"></div>

                {/* Amenities */}
                <div className="ahp-sectionHeader">
                  <h5 className="ahp-title">Amenities</h5>
                </div>
                <div className="ahp-formGrid">
                    <label className="ahp-field ahp-formGrid-span2">
                    <span className="ahp-label">Amenities (comma/space)</span>
                    <input
                        className="ahp-input"
                        value={(editing.amenities || []).join(', ')}
                        onChange={(e) => updateEditAmenitiesInput(e.target.value)}
                        placeholder="wifi, pool, spa"
                    />
                    </label>
                </div>

                {editError && <div className="ahp-error" style={{ marginTop: 8 }}>{editError}</div>}
              </div>

              <div className="ahp-modalFooter">
                <div className="ahp-actions" style={{ justifyContent: 'flex-end', width: '100%' }}>
                  <button className="ahp-btn" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
                  <button className="ahp-btn ahp-btnPrimary" onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Rooms Manager Modal (scrollable, polished table) ===== */}
        {roomsHotel && (
          <div className="ahp-modalBackdrop" role="dialog" aria-modal="true" aria-label={`Manage rooms for ${roomsHotel.name}`}>
            <div className="ahp-modalCard">
              <div className="ahp-modalHeader">
                <h4 className="ahp-title">Manage Rooms — {roomsHotel.name}</h4>
                <button className="ahp-btn" onClick={closeRoomsManager}>Close</button>
              </div>

              <div className="ahp-modalBody">
                {/* Add Room */}
                <div className="ahp-card" style={{ marginTop: 10 }}>
                  <h5 className="ahp-title">Add Room</h5>
                  <div className="ahp-row">
                    <label className="ahp-field">
                      <span className="ahp-label">Type</span>
                      <input className="ahp-input" value={roomForm.type} onChange={(e) => updateRoomForm('type', e.target.value)} placeholder="Deluxe / Suite / Standard" required />
                    </label>
                    <label className="ahp-field">
                      <span className="ahp-label">Capacity</span>
                      <input className="ahp-input" type="number" min="1" value={roomForm.capacity} onChange={(e) => updateRoomForm('capacity', e.target.value)} placeholder="2" required />
                    </label>
                    <label className="ahp-field">
                      <span className="ahp-label">Price (per night)</span>
                      <input className="ahp-input" type="number" min="0.01" step="0.01" value={roomForm.price} onChange={(e) => updateRoomForm('price', e.target.value)} placeholder="4999" required />
                    </label>
                    <label className="ahp-field">
                      <span className="ahp-label">Inventory</span>
                      <input className="ahp-input" type="number" min="0" value={roomForm.inventory} onChange={(e) => updateRoomForm('inventory', e.target.value)} placeholder="10" required />
                    </label>
                  </div>
                  <label className="ahp-field">
                    <span className="ahp-label">Description</span>
                    <textarea className="ahp-textarea" rows={2} value={roomForm.description} onChange={(e) => updateRoomForm('description', e.target.value)} placeholder="Sea view, king bed, breakfast included" />
                  </label>

                  {roomFormError && <div className="ahp-error">{roomFormError}</div>}
                  <div className="ahp-actions" style={{ marginTop: 8 }}>
                    <button className="ahp-btn ahp-btnPrimary" type="button" disabled={!canSubmitRoom() || roomSaving} onClick={createRoom}>
                      {roomSaving ? 'Saving…' : 'Add Room'}
                    </button>
                  </div>
                </div>

                {/* Rooms List */}
                <div className="ahp-card" style={{ marginTop: 10 }}>
                  <h5 className="ahp-title">Rooms</h5>

                  {roomsLoading && <div className="ahp-muted">Loading rooms…</div>}
                  {roomsError && <div className="ahp-error">Error: {roomsError}</div>}
                  {!roomsLoading && !roomsError && roomsPage.content.length === 0 && <div className="ahp-muted">No rooms yet.</div>}

                  {!roomsLoading && !roomsError && roomsPage.content.length > 0 && (
                    <div className="ahp-tableWrap">
                      <table className="ahp-table">
                        <colgroup>
                          <col className="ahp-col--type" />
                          <col className="ahp-col--desc" />
                          <col className="ahp-col--num" />
                          <col className="ahp-col--num" />
                          <col className="ahp-col--num" />
                          <col className="ahp-col--actions" />
                        </colgroup>

                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Description</th>
                            <th className="ahp-col--num">Capacity</th>
                            <th className="ahp-col--num">Price</th>
                            <th className="ahp-col--num">Inventory</th>
                            <th className="ahp-col--actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomsPage.content.map((r) => {
                            const priceDisplay = typeof r.price === 'number'
                              ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.price)
                              : r.price;

                            const inventoryChipClass =
                              r.inventory > 10 ? 'ahp-chip ahp-chip--ok'
                              : r.inventory > 0 ? 'ahp-chip ahp-chip--low'
                              : 'ahp-chip ahp-chip--zero';

                            const capacityChip = <span className="ahp-chip">👥 {r.capacity}</span>;
                            const inventoryChip = <span className={inventoryChipClass}>📦 {r.inventory}</span>;

                            return (
                              <tr key={r.id}>
                                <td>
                                  {roomEditing?.id === r.id ? (
                                    <input
                                      className="ahp-input"
                                      value={roomEditing.type}
                                      onChange={(e) => setRoomEditing((p) => ({ ...p, type: e.target.value }))}
                                      placeholder="Deluxe / Suite / Standard"
                                    />
                                  ) : (
                                    <strong>{r.type}</strong>
                                  )}
                                </td>

                                <td className="ahp-td--desc" title={r.description || ''}>
                                  {roomEditing?.id === r.id ? (
                                    <textarea
                                      className="ahp-textarea"
                                      rows={2}
                                      value={roomEditing.description || ''}
                                      onChange={(e) => setRoomEditing((p) => ({ ...p, description: e.target.value }))}
                                      placeholder="Sea view, king bed, breakfast included"
                                    />
                                  ) : (
                                    <div className="ahp-descClamp">{r.description || '—'}</div>
                                  )}
                                </td>

                                <td className="ahp-col--num">
                                  {roomEditing?.id === r.id ? (
                                    <input
                                      className="ahp-input"
                                      type="number"
                                      min="1"
                                      value={roomEditing.capacity}
                                      onChange={(e) => setRoomEditing((p) => ({ ...p, capacity: e.target.value }))}
                                      placeholder="2"
                                    />
                                  ) : (
                                    capacityChip
                                  )}
                                </td>

                                <td className="ahp-col--num">
                                  {roomEditing?.id === r.id ? (
                                    <input
                                      className="ahp-input"
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={roomEditing.price}
                                      onChange={(e) => setRoomEditing((p) => ({ ...p, price: e.target.value }))}
                                      placeholder="4999"
                                    />
                                  ) : (
                                    priceDisplay
                                  )}
                                </td>

                                <td className="ahp-col--num">
                                  {roomEditing?.id === r.id ? (
                                    <input
                                      className="ahp-input"
                                      type="number"
                                      min="0"
                                      value={roomEditing.inventory}
                                      onChange={(e) => setRoomEditing((p) => ({ ...p, inventory: e.target.value }))}
                                    />
                                  ) : (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                      {inventoryChip}
                                    </div>
                                  )}
                                </td>

                                <td className="ahp-col--actions">
                                  {roomEditing?.id === r.id ? (
                                    <div className="ahp-actions">
                                      <button className="ahp-btn" type="button" onClick={cancelRoomEdit}>Cancel</button>
                                      <button className="ahp-btn ahp-btnPrimary" type="button" onClick={saveRoomEdit} disabled={roomEditSaving}>
                                        {roomEditSaving ? 'Saving…' : 'Save'}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="ahp-actions">
                                      <button className="ahp-btn" type="button" onClick={() => startRoomEdit(r)}>Edit</button>
                                      <button className="ahp-btn ahp-btnDanger" type="button" onClick={() => deleteRoom(r.id)}>Delete</button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {roomsPage.totalPages > 1 && (
                        <div className="ahp-actions-1" style={{ margin: '10px 12px' }}>
                          <button
                            className="ahp-btn"
                            type="button"
                            onClick={() => loadRooms({ page: Math.max(0, roomsPage.number - 1), size: roomsPage.size })}
                            disabled={roomsPage.number <= 0}
                          >
                            Prev
                          </button>
                          <span>Page {roomsPage.number + 1} of {roomsPage.totalPages}</span>
                          <button
                            className="ahp-btn"
                            type="button"
                            onClick={() => loadRooms({ page: Math.min(roomsPage.totalPages - 1, roomsPage.number + 1), size: roomsPage.size })}
                            disabled={roomsPage.number >= roomsPage.totalPages - 1}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}