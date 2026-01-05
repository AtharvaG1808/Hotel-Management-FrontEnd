
// src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HotelApi, { toDataUrl } from '../api/hotelApi';
import '../style/home.css'; // <-- ensure your CSS (hero + filter + card styles) is imported

// Stars for rating UI
const STARS = [1, 2, 3, 4, 5];

const PLACEHOLDER = '/images/placeholder-16x9.jpg';

export default function HotelSearch() {
  const navigate = useNavigate();

  /** ===== Filters ===== */
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [minRating, setMinRating] = useState('');

  /** ===== Sorting & paging ===== */
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  /** ===== Data ===== */
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 10,
  });

  /** ===== UI state ===== */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const sortParam = useMemo(() => `${sortBy},${sortDir}`, [sortBy, sortDir]);

  const fetchData = async (opts = {}) => {
    try {
      setLoading(true);
      setError(null);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = {
        q,
        country,
        state: stateCode,
        minRating: minRating.trim() ? Number(minRating) : undefined,
        page: typeof opts.pageArg === 'number' ? opts.pageArg : page,
        size,
        sort: sortParam,
      };

      const resPage = await HotelApi.search(params);
      setPageData(resPage);
      setPage(resPage.number);
    } catch (e) {
      setError(e.message || 'Something went wrong while fetching hotels.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchData({ pageArg: 0 });
  };

  const clearFilters = () => {
    setQ('');
    setCountry('');
    setStateCode('');
    setMinRating('');
    setSortBy('name');
    setSortDir('asc');
    setSize(10);
    setPage(0);
    fetchData({ pageArg: 0 });
  };

  useEffect(() => {
    // initial fetch
    fetchData({ pageArg: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextPage = () => {
    if (page + 1 < pageData.totalPages) {
      const p = page + 1;
      setPage(p);
      fetchData({ pageArg: p });
    }
  };

  const prevPage = () => {
    if (page > 0) {
      const p = page - 1;
      setPage(p);
      fetchData({ pageArg: p });
    }
  };

  // Lazy load amenities per hotel card
  const fetchAmenities = async (id) => {
    try {
      const list = await HotelApi.listAmenities(id);
      setPageData((pd) => ({
        ...pd,
        content: pd.content.map((h) => (h.id === id ? { ...h, amenities: list } : h)),
      }));
    } catch (e) {
      console.error('Amenities error', e);
      alert('Could not load amenities.');
    }
  };

  // Rate hotel
  const rateHotel = async (id, stars) => {
    try {
      const avg = await HotelApi.rate(id, stars);
      setPageData((pd) => ({
        ...pd,
        content: pd.content.map((h) => (h.id === id ? { ...h, rating: avg } : h)),
      }));
    } catch (e) {
      console.error('Rating error', e);
      alert('Could not submit rating. Are you logged in with USER/HOTELMANAGER/ADMIN role?');
    }
  };

  return (
    <div className="home-page">

      {/* ===== HERO (Enhanced Booking-style Search) ===== */}
      <section className="home-hero">
        <div className="hero-inner">

          {/* Search card (same fields, improved layout) */}
          <div className="search-card">
            <h1>Find your perfect stay</h1>
            <p className="subtitle">Search by destination, rating and more</p>

            <form className="search-form" onSubmit={onSubmit}>
              {/* Destination / Keyword */}
              <div className="field">
                <label className="field-label">Destination / Keyword</label>
                <input
                  className="input"
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g., Goa, beach, boutique"
                />
              </div>

              {/* Country & State */}
              <div className="row">
                <div className="field small">
                  <label className="field-label">Country</label>
                  <input
                    className="input"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                  />
                </div>
                <div className="field small">
                  <label className="field-label">State</label>
                  <input
                    className="input"
                    type="text"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="Goa"
                  />
                </div>
              </div>

              {/* Min rating */}
              <div className="row">
                <div className="field small">
                  <label className="field-label">Min rating</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    placeholder="3.5"
                  />
                </div>
                <div className="field small">
                  <label className="field-label">Per page</label>
                  <select
                    className="input"
                    value={size}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSize(val);
                      setPage(0);
                      fetchData({ pageArg: 0 });
                    }}
                  >
                    <option value={6}>6</option>
                    <option value={10}>10</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                  </select>
                </div>
              </div>

              {/* Sort controls */}
              <div className="row">
                <div className="field small">
                  <label className="field-label">Sort by</label>
                  <select
                    className="input"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(0);
                      fetchData({ pageArg: 0 });
                    }}
                  >
                    <option value="name">Name</option>
                    <option value="createdAt">Created At</option>
                    <option value="city">City</option>
                    <option value="state">State</option>
                    <option value="country">Country</option>
                  </select>
                </div>
                <div className="field small">
                  <label className="field-label">Direction</label>
                  <select
                    className="input"
                    value={sortDir}
                    onChange={(e) => {
                      setSortDir(e.target.value);
                      setPage(0);
                      fetchData({ pageArg: 0 });
                    }}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <button type="submit" className="search-btn" disabled={loading}>
                {loading ? 'Searching…' : 'Search'}
              </button>
              <button type="button" className="clear-btn" onClick={clearFilters}>
                Clear
              </button>

              {error && <div className="tp-error" style={{ marginTop: 10 }}>{error}</div>}
            </form>
          </div>

          {/* Right hero image */}
          <div className="hero-image" aria-hidden />
        </div>
      </section>

      {/* ===== Results header ===== */}
      <div className="results-header">
        <div className="results-text">
          {loading
            ? 'Loading hotels…'
            : `${pageData.totalElements || 0} hotel(s) found`}
        </div>
        <div className="page-size">
          {/* Duplicate page-size control (optional). Kept for consistency; the hero control updates this too. */}
          <label className="label-small">Per page</label>
          <select
            className="input-small"
            value={size}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSize(val);
              setPage(0);
              fetchData({ pageArg: 0 });
            }}
          >
            <option value={6}>6</option>
            <option value={10}>10</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
          </select>
        </div>
      </div>

      {/* ===== Grid ===== */}
      {loading ? (
        <div className="tp-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tp-card tp-skeleton">
              <div className="tp-skel-line tp-skel-long" />
              <div className="tp-skel-line" />
              <div className="tp-skel-line" />
              <div className="tp-skel-line tp-skel-short" />
            </div>
          ))}
        </div>
      ) : pageData.content?.length ? (
        <div className="tp-grid">
          {pageData.content.map((h) => (
            <div key={h.id} className="tp-card tp-card--elevated">
              {/* Image */}
              <div className="tp-imageWrap">
                <img
                  className="tp-image"
                  src={h.bannerImage}
                  alt={h.name ? `${h.name} image` : 'Hotel image'}
                  loading="lazy"
                  onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                />
                <div className="tp-badge tp-badge--image">
                  {h.destination || h.city || '—'}
                </div>
              </div>

              {/* Content */}
              <h3 className="tp-title">{h.name || 'Unnamed Hotel'}</h3>
              <p className="tp-desc" title={h.description}>
                {h.description?.length && h.description.length > 160
                  ? h.description.slice(0, 160) + '…'
                  : h.description || 'No description provided.'}
              </p>

              {/* Meta */}
              <div className="tp-metaRow tp-metaRow--split">
                <div className="tp-metaItem">
                  <span className="tp-metaLabel">Location</span>
                  <span className="tp-metaValue">
                    {[h.city, h.state, h.country].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
                <div className="tp-metaItem">
                  <span className="tp-metaLabel">Rating</span>
                  <span className="tp-metaValue">
                    {typeof h.rating === 'number' ? h.rating.toFixed(1) : '—'}
                  </span>
                </div>
              </div>

              {/* Amenities (lazy fetch) */}
              <div className="tp-amenities">
                <button
                  type="button"
                  className="tp-chip"
                  onClick={() => fetchAmenities(h.id)}
                  title="Show amenities"
                >
                  Amenities
                </button>
                {h.amenities?.length ? (
                  <div className="tp-amenitiesList">
                    {h.amenities.slice(0, 8).map((a, i) => (
                      <span key={i} className="tp-pill">
                        {a}
                      </span>
                    ))}
                    {h.amenities.length > 8 && (
                      <span className="tp-pill">+{h.amenities.length - 8} more</span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Rate */}
              <div className="tp-ratingRow">
                <span className="tp-metaLabel">Rate this:</span>
                <div className="tp-stars">
                  {STARS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="tp-starBtn"
                      aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                      onClick={() => rateHotel(h.id, s)}
                      title={`Rate ${s}`}
                    >
                      {s <= Math.round(h.rating || 0) ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="tp-footer">
                <div className="tp-createdBy">
                  <span className="tp-metaLabel">Created by </span>
                  <span className="tp-metaValue tp-metaValue--muted">
                    {h.createdByUsername || '—'}
                  </span>
                </div>
                <div className="tp-actionsRight">
                  <button
                    type="button"
                    className="tp-cta"
                    onClick={() => navigate(`/hotel/${h.id}`)}
                    title="View property"
                  >
                    View Property
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tp-empty">No hotels match your filters.</div>
      )}

      {/*      {/* ===== Pagination ===== */}
      <div className="tp-pagination">
        <button className="tp-btnSecondary" disabled={page <= 0} onClick={prevPage}>
          ← Prev
        </button>
        <span className="tp-pageInfo">
          Page {pageData.totalPages ? page + 1 : 0} of {pageData.totalPages || 0}
        </span>
        <button
          className="tp-btnSecondary"
          disabled={page + 1 >= (pageData.totalPages || 0)}
          onClick={nextPage}
        >
          Next →
        </button>
      </div>
    </div>
  );
}