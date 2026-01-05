





// File: src/components/TravelPackages.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { searchTravelPackages /*, createPaymentLink */ } from '../api/travelPackagesApi';
import { createPaymentOrder, verifyPaymentOnServer, createPaymentLink } from '../api/paymentsApi';

import '../style/travelPackages.css';

// ...existing component code...

// Add this function inside the component:





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

async function onBookPackage(pkg) {
  try {
    if (typeof pkg?.price !== 'number' || pkg.price <= 0) {
      alert('This package has no valid price.');
      return;
    }
    const amountPaise = Math.round(pkg.price * 100);

    await ensureRazorpayScript();
    const data = await createPaymentOrder(amountPaise); // { orderId, amount, currency, key }

    if (window.Razorpay && data?.orderId && data?.key) {
      const rzp = new window.Razorpay({
        key: data.key,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: 'Hotel & Travel Booking',
        description: pkg.title ?? 'Travel Package',
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

/** Optional: if you want to mimic your HTML QR flow directly from React */
async function onGeneratePaymentLink(pkg) {
  try {
    const amountPaise = Math.round(pkg.price * 100);
    const link = await createPaymentLink(amountPaise, pkg.title ?? 'Travel Package');
    window.open(link?.url, '_blank'); // open Razorpay payment link in new tab
  } catch (e) {
    console.error(e);
    alert(e?.message || 'Failed to create payment link');
  }
}





export default function TravelPackages() {
  const location = useLocation();

  // Filters (prefill from TravelpackHome via location.state)
  const [destination, setDestination] = useState('');
  const [minDurationDays, setMinDurationDays] = useState('');
  const [maxDurationDays, setMaxDurationDays] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [keyword, setKeyword] = useState('');

  // Pagination and sorting
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('price');
  const [sortDir, setSortDir] = useState('asc');

  // Data & UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 10,
  });

  // Prefill filters when navigated from TravelpackHome
  useEffect(() => {
    const f = location.state?.filters;
    if (f) {
      if (f.destination) setDestination(f.destination);
      if (typeof f.maxDurationDays === 'number') setMaxDurationDays(String(f.maxDurationDays));
      if (typeof f.minPrice === 'number') setMinPrice(String(f.minPrice));
      fetchData({ pageArg: 0 });
    } else {
      fetchData({ pageArg: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  async function fetchData({ pageArg = page } = {}) {
    setLoading(true);
    setError(null);
    try {
      const data = await searchTravelPackages({
        destination: destination.trim() || undefined,
        keyword: keyword.trim() || undefined,
        minDurationDays: minDurationDays !== '' ? Number(minDurationDays) : undefined,
        maxDurationDays: maxDurationDays !== '' ? Number(maxDurationDays) : undefined,
        minPrice: minPrice !== '' ? Number(minPrice) : undefined,
        maxPrice: maxPrice !== '' ? Number(maxPrice) : undefined,
        page: pageArg,
        size,
        sortBy,
        sortDir,
      });
      setPageData(data);
      console.log(data);
      setPage(data.number ?? pageArg);
    } catch (e) {
      setError(e.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e) => {
    e.preventDefault();
    fetchData({ pageArg: 0 });
  };

  const clearFilters = () => {
    setDestination('');
    setKeyword('');
    setMinDurationDays('');
    setMaxDurationDays('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('price');
    setSortDir('asc');
    setPage(0);
    fetchData({ pageArg: 0 });
  };

  const gotoPrev = () => {
    if (page > 0) fetchData({ pageArg: page - 1 });
  };
  const gotoNext = () => {
    if (page + 1 < (pageData.totalPages || 0)) fetchData({ pageArg: page + 1 });
  };

  return (
    <div className="tp-page">
      <div className="tp-container">
        <h2 className="tp-heading">Travel packages</h2>
        <p className="tp-subheading">Filter and explore packages that match your trip.</p>

        {/* Filter Bar */}
        <form className="tp-filterBar" onSubmit={onSubmit}>
          <div className="tp-field">
            <label className="tp-label">Destination</label>
            <input
              className="tp-input"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Gokarna"
            />
          </div>

          <div className="tp-field">
            <label className="tp-label">Keyword</label>
            <input
              className="tp-input"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., beach, hills"
            />
          </div>

          <div className="tp-group">
            <div className="tp-field">
              <label className="tp-label">Min duration (days)</label>
              <input
                className="tp-input"
                type="number"
                min={0}
                value={minDurationDays}
                onChange={(e) => setMinDurationDays(e.target.value)}
                placeholder="e.g., 2"
              />
            </div>
            <div className="tp-field">
              <label className="tp-label">Max duration (days)</label>
              <input
                className="tp-input"
                type="number"
                min={0}
                value={maxDurationDays}
                onChange={(e) => setMaxDurationDays(e.target.value)}
                placeholder="e.g., 7"
              />
            </div>
          </div>

          <div className="tp-group">
            <div className="tp-field">
              <label className="tp-label">Min price (₹)</label>
              <input
                className="tp-input"
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="e.g., 10000"
              />
            </div>
            <div className="tp-field">
              <label className="tp-label">Max price (₹)</label>
              <input
                className="tp-input"
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g., 25000"
              />
            </div>
          </div>

          <div className="tp-group">
            <div className="tp-field">
              <label className="tp-label">Sort by</label>
              <select
                className="tp-input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="price">Price</option>
                <option value="durationDays">Duration</option>
                <option value="title">Title</option>
                <option value="destination">Destination</option>
                <option value="createdAt">Created At</option>
              </select>
            </div>
            <div className="tp-field">
              <label className="tp-label">Direction</label>
              <select
                className="tp-input"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          <div className="tp-actions">
            <button type="submit" className="tp-btnPrimary" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
            <button type="button" className="tp-btnSecondary" onClick={clearFilters}>
              Clear
            </button>
          </div>

          {error && <div className="tp-error">{error}</div>}
        </form>

        {/* Results Header */}
        <div className="tp-resultsHeader">
          <div className="tp-resultsText">
            {loading ? 'Loading packages…' : `${pageData.totalElements || 0} package(s) found`}
          </div>
          <div className="tp-pageSize">
            <label className="tp-labelSmall">Per page</label>
            <select
              className="tp-inputSmall"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
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

        {/* Grid */}
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
        ) : 
        
pageData.content?.length ? (
  <div className="tp-grid">
    {pageData.content.map((pkg) => (
      <div key={pkg.id} className="tp-card tp-card--elevated">
        {/* Image */}
        <div className="tp-imageWrap">
          <img
            className="tp-image"
            src={
              typeof pkg.photo1 === 'string' && pkg.photo1.startsWith('data:')
                ? pkg.photo1
                : pkg.photo1 || '/images/placeholder-16x9.jpg'
            }
            alt={pkg.title ? `${pkg.title} image` : 'Package image'}
            loading="lazy"
            onError={(e) => (e.currentTarget.src = '/images/placeholder-16x9.jpg')}
          />

          {/* Destination badge */}
          <div className="tp-badge tp-badge--image">{pkg.destination || '—'}</div>
        </div>

        {/* Content */}
        <h3 className="tp-title">{pkg.title || 'Untitled Package'}</h3>
        <p className="tp-desc" title={pkg.description}>
          {pkg.description?.length > 140 ? pkg.description.slice(0, 140) + '…' : pkg.description || 'No description provided.'}
        </p>

        <div className="tp-metaRow tp-metaRow--split">
          <div className="tp-metaItem">
            <span className="tp-metaLabel">Duration</span>
            <span className="tp-metaValue">
              {typeof pkg.durationDays === 'number'
                ? `${pkg.durationDays} day${pkg.durationDays === 1 ? '' : 's'}`
                : '—'}
            </span>
          </div>
          <div className="tp-metaItem">
            <span className="tp-metaLabel">Created by</span>
            <span className="tp-metaValue tp-metaValue--muted">
              {pkg.createdByUsername || '—'}
            </span>
          </div>
        </div>

        <div className="tp-footer">
          <div className="tp-price">
            {typeof pkg.price === 'number'
              ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pkg.price)
              : '—'}
            <span className="tp-priceUnit"></span>
          </div>
          
      
        <button type="button" className="tp-cta" onClick={() => onBookPackage(pkg)}>
          Book Package
        </button>


        </div>
      </div>
    ))}
  </div>
) : (
          <div className="tp-empty">
            <div className="tp-emptyIcon">🧳</div>
            <div className="tp-emptyTitle">No packages match these filters</div>
            <div className="tp-emptyText">
              Try adjusting your destination, duration, or price range.
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="tp-pagination">
          <button className="tp-pageBtn" onClick={gotoPrev} disabled={page <= 0 || loading}>
            ← Prev
          </button>
          <span className="tp-pageInfo">
            Page <strong>{(page || 0) + 1}</strong> of <strong>{pageData.totalPages || 1}</strong>
          </span>
          <button
            className="tp-pageBtn"
            onClick={gotoNext}
            disabled={loading || (page + 1 >= (pageData.totalPages || 0))}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
