
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HotelApi, { toDataUrl } from '../api/hotelApi';
import { createPaymentOrder, verifyPaymentOnServer } from '../api/paymentsApi';
import '../style/propertyDetails.css';

const PLACEHOLDER = '/images/placeholder-16x9.jpg';
const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Normalize base64 -> data URL (works with raw "base64,..." or raw b64) */
function normalizeImage(img, fallbackMime = 'image/jpeg') {
  if (!img) return '';
  if (typeof img !== 'string') return '';
  if (img.startsWith('data:')) return img;
  if (img.startsWith('base64,')) {
    const b64 = img.replace(/^base64,/, '');
    return toDataUrl ? toDataUrl(b64, fallbackMime) : `data:${fallbackMime};base64,${b64}`;
  }
  return toDataUrl ? toDataUrl(img, fallbackMime) : `data:${fallbackMime};base64,${img}`;
}

/** Simple stars renderer (rounded to nearest whole star) */
function Stars({ value = 0 }) {
  const full = Math.round(Number(value) || 0);
  const filled = full > 0 ? '★'.repeat(full) : '';
  const empty = full < 5 ? '☆'.repeat(5 - full) : '';
  return (
    <span className="pd-stars" aria-label={`Rating ${full} out of 5`}>
      {filled}{empty}
    </span>
  );
}

/** Nights between two yyyy-mm-dd strings (min 1 night if same day/invalid) */
function diffNights(checkIn, checkOut) {
  try {
    if (!checkIn || !checkOut) return 1;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const ms = outDate - inDate;
    const nights = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Number.isFinite(nights) && nights > 0 ? nights : 1;
  } catch {
    return 1;
  }
}

async function ensureRazorpayScript() {
  if (window.Razorpay) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(s);
  });
}

export default function HotelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Hotel
  const [hotel, setHotel] = useState(null);
  const [loadingHotel, setLoadingHotel] = useState(true);
  const [hotelError, setHotelError] = useState(null);

  // Rooms page (list)
  const [roomsPage, setRoomsPage] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState(null);

  // Booking panel state
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1); // default 1 guest
  const bookCardRef = useRef(null);

  // Derived media
  const bannerSrc = useMemo(() => normalizeImage(hotel?.bannerImage) || PLACEHOLDER, [hotel]);
  const photo1Src = useMemo(() => normalizeImage(hotel?.photo1) || PLACEHOLDER, [hotel]);
  const photo2Src = useMemo(() => normalizeImage(hotel?.photo2) || PLACEHOLDER, [hotel]);

  // Derived lowest price (used when no room selected)
  const lowestPrice = useMemo(() => {
    const list = roomsPage?.content || [];
    if (!list.length) return null;
    const nums = list.map(r => Number(r.price)).filter(n => Number.isFinite(n) && n > 0);
    if (!nums.length) return null;
    const min = Math.min(...nums);
    return INR.format(min);
  }, [roomsPage]);

  // Load hotel + rooms (+ amenities, if separate)
  useEffect(() => {
    let mounted = true;

    async function loadHotel() {
      setLoadingHotel(true);
      setHotelError(null);
      try {
        const data = await HotelApi.getById(id);
        if (!mounted) return;
        setHotel(data);
      } catch (e) {
        if (!mounted) return;
        setHotelError(e.message || 'Failed to load hotel');
      } finally {
        if (mounted) setLoadingHotel(false);
      }
    }

    async function loadRooms() {
      setLoadingRooms(true);
      setRoomsError(null);
      try {
        const page = await HotelApi.listRooms({
          hotelId: Number(id),
          page: 0,
          size: 50,
          sortBy: 'price',
          sortDir: 'asc',
        });
        if (!mounted) return;
        setRoomsPage(page || { content: [], totalElements: 0, totalPages: 0 });
      } catch (e) {
        if (!mounted) return;
        setRoomsError(e.message || 'Failed to load rooms');
      } finally {
        if (mounted) setLoadingRooms(false);
      }
    }

    loadHotel();
    loadRooms();

    // Optional amenities fetch if not included in hotel DTO
    (async () => {
      try {
        const list = await HotelApi.listAmenities?.(Number(id));
        if (list && mounted) setHotel(h => (h ? { ...h, amenities: list } : h));
      } catch { /* ignore */ }
    })();

    return () => { mounted = false; };
  }, [id]);

  /**
   * AUTO-SELECT A DEFAULT ROOM WHEN ROOMS LOAD
   * Prefer cheapest room with inventory > 0. If none, pick first room (so guests dropdown is ready).
   */
  useEffect(() => {
    if (!selectedRoom && Array.isArray(roomsPage.content) && roomsPage.content.length > 0) {
      const available = roomsPage.content.filter(r => Number(r.inventory) > 0);
      const cheapestAvail = available.length
        ? available.reduce((min, r) => (Number(r.price) < Number(min.price) ? r : min), available[0])
        : roomsPage.content[0]; // fallback to first if all are out of stock
      setSelectedRoom(cheapestAvail);
      // reset guests to 1 to fit the selected capacity
      setGuests(1);
    }
  }, [roomsPage, selectedRoom]);

  /** When clicking Book on a specific room */
  function onBookRoom(room) {
    setSelectedRoom(room);
    // reset guests to 1 if current guests > new capacity
    if (Number(guests) > Number(room?.capacity || 1)) {
      setGuests(1);
    }
    // Smooth scroll the booking card into view
    if (bookCardRef.current) {
      bookCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function onBookPackage(room) {
    try {
      if (estimatedTotal <= 0) {
        alert('Please select check-in and check-out dates.');
        return;
      }
      const amountPaise = Math.round(estimatedTotal * 100);

      await ensureRazorpayScript();
      const data = await createPaymentOrder(amountPaise); // { orderId, amount, currency, key }

      if (window.Razorpay && data?.orderId && data?.key) {
        const rzp = new window.Razorpay({
          key: data.key,
          order_id: data.orderId,
          amount: data.amount,
          currency: data.currency,
          name: 'Hotel & Travel Booking',
          description: room.type ?? 'Hotel Room',
          handler: async (response) => {
            try {
              const verify = await verifyPaymentOnServer(response);
              alert(verify?.verified ? 'Payment verified!' : 'Payment received, but verification failed.');
            } catch (err) {
              alert(err?.message || 'Verification failed.');
            }
          },
        });

        rzp.on('payment.failed', (e) => {
          alert(e?.error?.description ?? 'Payment failed');
        });

        rzp.open();
      } else {
        alert('Order created. Proceed to payment.');
        console.log('Payment order:', data);
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to start payment');
    }
  }

  /** Ensure guests never exceed selected capacity; if capacity shrinks, clamp */
  useEffect(() => {
    const cap = Number(selectedRoom?.capacity || 1);
    if (Number(guests) > cap) setGuests(1);
  }, [selectedRoom, guests]);

  /** Build guest options 1..capacity for selected room */
  const guestOptions = useMemo(() => {
    const cap = Number(selectedRoom?.capacity || 1);
    return Array.from({ length: cap }, (_, i) => i + 1);
  }, [selectedRoom]);

  /** Base nightly price (selected room if any, else parse lowestPrice) */
  const baseNightPrice =
    selectedRoom && Number(selectedRoom.price)
      ? Number(selectedRoom.price)
      : lowestPrice
        ? Number(lowestPrice.replace(/[^0-9]/g, '')) // parse "₹ 5,000" -> 5000
        : 0;

  /** Nights + fees + total */
  const nights = diffNights(checkIn, checkOut);
  const serviceFee = 299;
  const taxes = 449;
  const subtotal = baseNightPrice * nights;
  const estimatedTotal = subtotal > 0 ? subtotal + serviceFee + taxes : 0;

  return (
    <div className="pd-page">
      <div className="pd-container">
        {/* Top bar */}
        <div className="pd-topbar">
          <button className="pd-btn pd-btnSecondary" onClick={() => navigate(-1)} aria-label="Go back">← Back</button>
          <div className="pd-topbarRight">
            <button className="pd-btn" title="Share">🔗 Share</button>
            <button className="pd-btn" title="Save">❤ Save</button>
          </div>
        </div>

        {/* Hotel load states */}
        {loadingHotel ? (
          <div className="pd-skeleton">
            <div className="pd-skel-banner" />
            <div className="pd-skel-line" />
            <div className="pd-skel-line short" />
          </div>
        ) : hotelError ? (
          <div className="pd-error">{hotelError}</div>
        ) : hotel ? (
          <>
            {/* Header */}
            <header className="pd-header">
              <h1 className="pd-title">{hotel.name || 'Hotel'}</h1>
              <div className="pd-metaRow">
                <Stars value={hotel.rating} />
                <span className="pd-dot">•</span>
                <span className="pd-meta">
                  {[hotel.city, hotel.state, hotel.country].filter(Boolean).join(', ') || '—'}
                </span>
                {hotel.destination && (
                  <>
                    <span className="pd-dot">•</span>
                    <span className="pd-chip pd-chip--brand">{hotel.destination}</span>
                  </>
                )}
              </div>
            </header>

            {/* Gallery */}
            <section className="pd-gallery">
              <div className="pd-galleryLeft">
                <img
                  src={bannerSrc}
                  alt="Banner"
                  className="pd-photo pd-photo--left"
                  onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                />
              </div>
              <div className="pd-galleryRight">
                <img
                  src={photo1Src}
                  alt="Photo 1"
                  className="pd-photo"
                  onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                />
                <img
                  src={photo2Src}
                  alt="Photo 2"
                  className="pd-photo"
                  onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                />
              </div>
            </section>

            {/* Main content + sticky booking */}
            <section className="pd-main">
              {/* LEFT: content */}
              <div className="pd-left">
                {/* About & amenities */}
                <div className="pd-aboutCard">
                  {hotel.description && <p className="pd-desc">{hotel.description}</p>}

                  <div className="pd-amenitiesBlock" style={{ marginTop: hotel.description ? 10 : 0 }}>
                    <h3 className="pd-subtitle">Amenities</h3>
                    {Array.isArray(hotel.amenities) && hotel.amenities.length > 0 ? (
                      <div className="pd-amenities">
                        {hotel.amenities.map((a, i) => (
                          <span key={i} className="pd-pill">{a}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="pd-muted">No amenities listed</div>
                    )}
                  </div>
                </div>

                {/* Rooms */}
                <div className="pd-roomsSection">
                  <div className="pd-roomsHeader">
                    <h2 className="pd-subtitle">Rooms</h2>
                    {loadingRooms && <span className="pd-muted">Loading rooms…</span>}
                    {roomsError && <span className="pd-error" style={{ marginLeft: 8 }}>{roomsError}</span>}
                  </div>

                  {!loadingRooms && !roomsError && (
                    roomsPage.content?.length ? (
                      <div className="pd-roomsGrid">
                        {roomsPage.content.map((r) => (
                          <article
                            className={`pd-roomCard ${selectedRoom?.id === r.id ? 'pd-roomCard--selected' : ''}`}
                            key={r.id}
                          >
                            <div className="pd-roomTop">
                              <h3 className="pd-roomTitle">{r.type}</h3>
                              <div className="pd-roomBadges">
                                <span className="pd-chip">👥 {r.capacity}</span>
                                <span className={`pd-chip ${r.inventory > 10 ? 'pd-chip--ok' : r.inventory > 0 ? 'pd-chip--warn' : 'pd-chip--danger'}`}>
                                  📦 {r.inventory}
                                </span>
                              </div>
                            </div>

                            {r.description && <p className="pd-roomDesc">{r.description}</p>}

                            <div className="pd-roomBottom">
                              <span className="pd-price">
                                {typeof r.price === 'number' ? INR.format(r.price) : r.price}
                              </span>
                              <div className="pd-roomActions">
                                <button
                                  className="pd-btn pd-btnPrimary"
                                  disabled={r.inventory <= 0}
                                  onClick={() => onBookRoom(r)}
                                  title="Select this room"
                                >
                                  Book
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="pd-empty">No Rooms available</div>
                    )
                  )}
                </div>

                {/* Policies / small info */}
                <div className="pd-aboutCard">
                  <h3 className="pd-subtitle">House rules & policies</h3>
                  <ul className="pd-list">
                    <li>Check‑in after 2:00 PM • Check‑out before 11:00 AM</li>
                    <li>No smoking • Pets allowed on request</li>
                    <li>Government ID required at check‑in</li>
                  </ul>
                </div>
              </div>

              {/* RIGHT: sticky booking panel */}
              <aside className="pd-right">
                <div className="pd-bookCard" ref={bookCardRef}>
                  {/* Price & rating */}
                  <div className="pd-bookHeader">
                    <div className="pd-priceLine">
                      <span className="pd-price">
                        {selectedRoom
                          ? INR.format(Number(selectedRoom.price) || 0)
                          : (lowestPrice || '—')}
                      </span>
                      <span className="pd-night">/ night</span>
                    </div>
                    <div className="pd-ratingLine">
                      <Stars value={hotel.rating} />
                      <span className="pd-muted" style={{ marginLeft: 6 }}>
                        {typeof hotel.rating === 'number' ? hotel.rating.toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Selected room summary */}
                  {selectedRoom && (
                    <div className="pd-selectedRoom">
                      <div className="pd-selectedLine">
                        <span className="pd-muted">Selected:</span>
                        <strong style={{ marginLeft: 6 }}>{selectedRoom.type}</strong>
                        <span className="pd-dot">•</span>
                        <span className="pd-chip">👥 {selectedRoom.capacity}</span>
                        <span className={`pd-chip ${selectedRoom.inventory > 10 ? 'pd-chip--ok' : selectedRoom.inventory > 0 ? 'pd-chip--warn' : 'pd-chip--danger'}`}>
                          📦 {selectedRoom.inventory}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dates & guests */}
                  <div className="pd-formRow">
                    <label className="pd-field">
                      <span className="pd-label">Check‑in</span>
                      <input
                        className="pd-input"
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                      />
                    </label>
                    <label className="pd-field">
                      <span className="pd-label">Check‑out</span>
                      <input
                        className="pd-input"
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="pd-field" style={{ marginTop: 8 }}>
                    <span className="pd-label">Guests</span>
                    <select
                      className="pd-input"
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      // NOTE: dropdown now enabled from the start because we auto-select a room
                    >
                      {guestOptions.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    {selectedRoom && Number(guests) > Number(selectedRoom.capacity) && (
                      <small className="pd-error" style={{ marginTop: 6 }}>
                        Guests exceed room capacity. Please choose up to {selectedRoom.capacity}.
                      </small>
                    )}
                  </label>

                  {/* Fees & total */}
                  <div className="pd-fees">
                    <div className="pd-feeLine">
                      <span>
                        {nights > 1
                          ? `₹ ${baseNightPrice.toLocaleString('en-IN')} x ${nights} night${nights > 1 ? 's' : ''}`
                          : 'Nightly rate'}
                      </span>
                      <span>
                        {nights > 1
                          ? `₹ ${(baseNightPrice * nights).toLocaleString('en-IN')}`
                          : `₹ ${baseNightPrice.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="pd-feeLine"><span>Service fee</span><span>₹ {serviceFee.toLocaleString('en-IN')}</span></div>
                    <div className="pd-feeLine"><span>Taxes</span><span>₹ {taxes.toLocaleString('en-IN')}</span></div>
                    <div className="pd-divider"></div>
                    <div className="pd-feeLine pd-total">
                      <span>Total (est.)</span>
                      <span>{estimatedTotal ? `₹ ${estimatedTotal.toLocaleString('en-IN')}` : '—'}</span>
                    </div>
                  </div>

                  <button
                    className="pd-btn pd-btnPrimary pd-bookCta"
                    disabled={!selectedRoom || selectedRoom.inventory <= 0}
                    title={!selectedRoom ? 'Select a room to reserve' : undefined}
                    onClick={() => onBookPackage(selectedRoom)}
                  >
                    Reserve
                  </button>
                  <div className="pd-note">You won’t be charged yet</div>
                </div>

                {/* Map placeholder */}
                <div className="pd-mapCard">
                  <h3 className="pd-subtitle">Where you’ll be</h3>
                  <div className="pd-mapPlaceholder">
                    Map preview
                  </div>
                    <div className="pd-muted" style={{ marginTop: 8 }}>
                    {[hotel.city, hotel.state, hotel.country].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
              </aside>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}