
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createTravelPackage, updateTravelPackage, deleteTravelPackage, getMyTravelPackages } from '../api/travelPackagesApi';
import '../style/addTravelPackages.css';
import { compressImageFile } from '../util/imageCompress';

export default function AddTravelPackages() {
  
  const photo1InputRef = useRef(null);
  const photo2InputRef = useRef(null)


  /** Create form state */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [price, setPrice] = useState('');

  const [photo1File, setPhoto1File] = useState(null);
  const [photo2File, setPhoto2File] = useState(null);
  const [photo1Preview, setPhoto1Preview] = useState('');
  const [photo2Preview, setPhoto2Preview] = useState('');

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createOk, setCreateOk] = useState(null);

  /** List state */
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });

  /** Edit state */
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', destination: '', durationDays: '', price: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const canSubmitCreate = useMemo(() => {
    if (!title.trim() || !destination.trim() || !durationDays || !price) return false;
    if (!photo1File || !photo2File) return false;
    return true;
  }, [title, destination, durationDays, price, photo1File, photo2File]);

  useEffect(() => {
    // Initial load (first page)
    fetchMine({ pageArg: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


async function fetchMine({ pageArg = pageData?.number ?? 0, sizeArg = pageData?.size ?? 20 } = {}) {
  setLoading(true);
  setListError(null);
  try {
    const data = await getMyTravelPackages({
      page: pageArg,
      size: sizeArg,
      sortBy: 'updatedAt', // or 'createdAt'
      sortDir: 'desc',
    });
    setPageData(data); // trust server pagination; no client-side filtering
  } catch (e) {
    setListError(e.message || 'Failed to load your packages');
  } finally {
    setLoading(false);
  }
} 
const onPhoto1Change = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  // Compress and convert to base64 dataURL now
  const { dataUrl, mimeType } = await compressImageFile(f, {
    maxWidth: 1024,     
    quality: 0.72,        
    mimeType: 'image/jpeg'
  });
  setPhoto1Preview(dataUrl);             
  setPhoto1File({ type: mimeType });      
};
const onPhoto2Change = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const { dataUrl, mimeType } = await compressImageFile(f, {
    maxWidth: 1024,
    quality: 0.72,
    mimeType: 'image/jpeg'
  });
  setPhoto2Preview(dataUrl);
  setPhoto2File({ type: mimeType });
};
const handleCreate = async (e) => {
  e.preventDefault();
  if (!canSubmitCreate) return;

  setCreateError(null);
  setCreateOk(null);
  setCreating(true);
  try {
    const dto = {
      title: title.trim(),
      description: description.trim(),
      destination: destination.trim(),
      durationDays: Number(durationDays),
      price: Number(price),
      photo1: photo1Preview,                           
      photo2: photo2Preview,                           
      photo1contentType: photo1File?.type || 'image/jpeg',   
      photo2contentType: photo2File?.type || 'image/jpeg',
    };

    await createTravelPackage(dto);
    setCreateOk('Package created successfully');

    // Clear form
    setTitle(''); setDescription(''); setDestination('');
    setDurationDays(''); setPrice('');
    setPhoto1File(null); setPhoto2File(null);
    setPhoto1Preview(''); setPhoto2Preview('');

    
    if (photo1InputRef.current) photo1InputRef.current.value = '';
    if (photo2InputRef.current) photo2InputRef.current.value = '';


    // Reload list
    fetchMine({ pageArg: 0 });
  } catch (err) {
    setCreateError(err.message || 'Failed to create package');
  } finally {
    setCreating(false);
  }
};


  const startEdit = (pkg) => {
    setEditingId(pkg.id);
    setEditForm({
      title: pkg.title || '',
      description: pkg.description || '',
      destination: pkg.destination || '',
      durationDays: String(pkg.durationDays ?? ''),
      price: String(pkg.price ?? ''),
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', description: '', destination: '', durationDays: '', price: '' });
  };


const saveEdit = async () => {
  if (!editingId) return;

  // Basic validation
  const title = editForm.title.trim();
  const description = editForm.description.trim();
  const destination = editForm.destination.trim();

  const durationDays =
    editForm.durationDays === '' ? undefined : Number(editForm.durationDays);
  const price =
    editForm.price === '' ? undefined : Number(editForm.price);

  if (!title) {
    setEditError('Title is required');
    return;
  }
  if (!destination) {
    setEditError('Destination is required');
    return;
  }
  if (durationDays === undefined || Number.isNaN(durationDays) || durationDays < 1) {
    setEditError('Duration must be a positive number');
    return;
  }
  if (price === undefined || Number.isNaN(price) || price < 0) {
    setEditError('Price must be a number ≥ 0');
    return;
  }

  setEditLoading(true);
  setEditError(null);

  try {
    const dto = {
      title,
      description,
      destination,
      durationDays,
      price,
      // If supporting photo updates, include photo1/photo1contentType/photo2/photo2contentType here.
    };

    await updateTravelPackage(editingId, dto);
    await fetchMine({ pageArg: pageData?.number ?? 0, sizeArg: pageData?.size ?? 20 });

    cancelEdit();
  } catch (err) {
    setEditError(err.message || 'Failed to update package');
  } finally {
    setEditLoading(false);
  }
};



const removePkg = async (id) => {
  if (!window.confirm('Delete this package?')) return;
  try {
    await deleteTravelPackage(id);
    const currentPage = pageData?.number ?? 0;
    const pageSize = pageData?.size ?? 20;
    const remainingItems = (pageData?.content?.length ?? 1) - 1;
    const nextPage = remainingItems === 0 && currentPage > 0 ? currentPage - 1 : currentPage;

    await fetchMine({ pageArg: nextPage, sizeArg: pageSize });
  } catch (err) {
    alert(err.message || 'Failed to delete package');
  }
};


  



return (
  <div className="ap-page">
    {/* ===== Create section (TOP) ===== */}
    <div className="ap-container">
      <h2 className="ap-heading">Add Travel Package</h2>
      <p className="ap-subheading">Create a new package with two photos.</p>

      {/* Create form */}
      <form className="ap-card ap-form" onSubmit={handleCreate}>
        <div className="ap-row">
          <label className="ap-field">
            <span className="ap-label">Title</span>
            <input
              className="ap-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goa(2N/3D)"
              required
            />
          </label>
          <label className="ap-field">
            <span className="ap-label">Destination</span>
            <input
              className="ap-input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Goa"
              required
            />
          </label>
        </div>

        <label className="ap-field">
          <span className="ap-label">Description</span>
          <textarea
            className="ap-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Goa Tour: Dolphin Spotting and beach walks"
          />
        </label>

        <div className="ap-row">
          <label className="ap-field">
            <span className="ap-label">Duration (days)</span>
            <input
              className="ap-input"
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="3"
              required
            />
          </label>
          <label className="ap-field">
            <span className="ap-label">Price (₹)</span>
            <input
              className="ap-input"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="8999"
              required
            />
          </label>
        </div>

        <div className="ap-row">
          <div className="ap-field">
            <span className="ap-label">Banner Photo</span>
            <input
              ref={photo1InputRef}
              className="ap-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhoto1Change}
              required
            />
            {photo1Preview && (
              <img src={photo1Preview} alt="Preview 1" className="ap-preview" />
            )}
          </div>
          <div className="ap-field">
            <span className="ap-label">Photo</span>
            <input
              ref={photo2InputRef}
              className="ap-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhoto2Change}
              required
            />
            {photo2Preview && (
              <img src={photo2Preview} alt="Preview 2" className="ap-preview" />
            )}
          </div>
        </div>

        {createError && <div className="ap-error">{createError}</div>}
        {createOk && <div className="ap-ok">{createOk}</div>}

        <div className="ap-actions">
          <button
            type="submit"
            className="ap-btnPrimary"
            disabled={!canSubmitCreate || creating}
          >
            {creating ? 'Creating…' : 'Create package'}
          </button>
        </div>
      </form>
    </div>

    {/* ===== Spacer between create & list ===== */}
    <div style={{ height: 20 }} />

    {/* ===== List section (BELOW) ===== */}
    <div className="ap-container">
      <h3 className="ap-sectionTitle">My Packages</h3>

      <div className="ap-card">
        {/* List toolbar */}
        <div className="ap-footer">
          <div className="ap-creator">
            <span className="ap-creatorLabel">Viewing</span>
            <span className="ap-creatorName">Your created packages</span>
          </div>
          <div className="ap-actions">
            <button
              type="button"
              className="ap-btnSecondary"
              onClick={() => fetchMine({ pageArg: 0, sizeArg: pageData?.size ?? 10 })}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error / loading / empty */}
        {listError && <div className="ap-error">{listError}</div>}

        {loading && !listError && (
          <div className="ap-skeleton" role="status" aria-live="polite">
            <div className="ap-skel-line ap-skel-long" />
            <div className="ap-skel-line ap-skel-short" />
            <div className="ap-skel-line ap-skel-long" />
          </div>
        )}

        {!loading && !listError && (pageData?.content?.length ?? 0) === 0 && (
          <div className="ap-empty ap-emptyTight">
            You haven’t created any packages yet. Create your first one above!
          </div>
        )}

        {/* Cards grid */}
        {!loading && !listError && (pageData?.content?.length ?? 0) > 0 && (
          <ul className="ap-grid">
            {pageData.content.map((pkg) => {
              const isEditing = editingId === pkg.id;

              return (
                <li key={pkg.id}>
                  {/* VIEW MODE */}
                  {!isEditing && (
                    <article className="ap-card-1" style={{ position: 'relative' }}>
                      {/* Optional badge — e.g., status */}
                      {/* <span className="ap-badge">Active</span> */}

                      {/* Title */}
                      <h4 className="ap-title">{pkg.title}</h4>

                      {/* Image (hero) if provided */}
                      <div style={{ marginTop: 8 }}>
                        {pkg.photo1Url ? (
                          <img
                            src={pkg.photo1Url}
                            alt={`${pkg.title} banner`}
                            className="ap-preview"
                            loading="lazy"
                          />
                        ) : null}
                      </div>

                      {/* Description */}
                      {!!pkg.description && (
                        <p className="ap-desc">
                          {pkg.description.length > 140
                            ? `${pkg.description.slice(0, 140)}…`
                            : pkg.description}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="ap-metaRow">
                        <div className="ap-metaItem">
                          <span className="ap-metaLabel">Destination</span>
                          <span className="ap-metaValue">{pkg.destination ?? '-'}</span>
                        </div>
                        <div className="ap-metaItem">
                          <span className="ap-metaLabel">Duration</span>
                          <span className="ap-metaValue">
                            {typeof pkg.durationDays === 'number' ? `${pkg.durationDays} days` : '-'}
                          </span>
                        </div>
                        <div className="ap-metaItem">
                          <span className="ap-metaLabel">Price</span>
                          <span className="ap-metaValue">
                            {new Intl.NumberFormat('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                              maximumFractionDigits: 0,
                            }).format(pkg.price ?? 0)}
                          </span>
                        </div>
                      </div>

                      {/* Secondary image (optional) */}
                      {pkg.photo2Url && (
                        <img
                          src={pkg.photo2Url}
                          alt={`${pkg.title} photo`}
                          className="ap-preview"
                          style={{ marginTop: 8 }}
                          loading="lazy"
                        />
                      )}

                      {/* Footer actions */}
                      <div className="ap-footer">
                        <div className="ap-creator">
                          <span className="ap-creatorLabel">Updated</span>
                          <span className="ap-creatorName">
                            {pkg.updatedAt
                              ? new Date(pkg.updatedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                        <div className="ap-actions">
                          <button
                            type="button"
                            className="ap-btnSecondary"
                            onClick={() => startEdit(pkg)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ap-btnDanger"
                            onClick={() => removePkg(pkg.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  )}

                  {/* EDIT MODE */}
                  {isEditing && (
                    <form
                      className="ap-card-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit();
                      }}
                    >
                      <h4 className="ap-title">Edit Package</h4>

                      <div className="ap-row">
                        <label className="ap-field">
                          <span className="ap-label">Title</span>
                          <input
                            className="ap-input"
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, title: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label className="ap-field">
                          <span className="ap-label">Destination</span>
                          <input
                            className="ap-input"
                            value={editForm.destination}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, destination: e.target.value }))
                            }
                            required
                          />
                        </label>
                      </div>

                      <label className="ap-field">
                        <span className="ap-label">Description</span>
                        <textarea
                          className="ap-input-1"
                          rows={3}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, description: e.target.value }))
                          }
                        />
                      </label>

                      <div className="ap-row">
                        <label className="ap-field">
                          <span className="ap-label">Duration (days)</span>
                          <input
                            className="ap-input"
                            type="number"
                            min={1}
                            value={editForm.durationDays}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                durationDays: e.target.value,
                              }))
                            }
                            required
                          />
                        </label>
                        <label className="ap-field">
                          <span className="ap-label">Price (₹)</span>
                          <input
                            className="ap-input"
                            type="number"
                            min={0}
                            value={editForm.price}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                price: e.target.value,
                              }))
                            }
                            required
                          />
                        </label>
                      </div>

                      {editError && <div className="ap-error">{editError}</div>}

                      <div className="ap-actions-1" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="ap-btnSecondary"
                          onClick={cancelEdit}
                          disabled={editLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="ap-btnPrimary"
                          disabled={editLoading}
                        >
                          {editLoading ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        <div className="ap-footer" style={{ marginTop: 12 }}>
          <div>
            {(() => {
              const page = pageData?.number ?? 0;
              const size = pageData?.size ?? 10;
              const count = pageData?.content?.length ?? 0;
              const start = count ? page * size + 1 : 0;
              const end = page * size + count;
              const total = pageData?.totalElements ?? 0;
              return (
                <span className="ap-metaLabel">
                  Showing <strong>{start}-{end}</strong> of <strong>{total}</strong>
                </span>
              );
            })()}
          </div>
          <div className="ap-actions">
            <button
              type="button"
              className="ap-btnSecondary"
              onClick={() =>
                fetchMine({
                  pageArg: Math.max(0, (pageData?.number ?? 0) - 1),
                  sizeArg: pageData?.size ?? 10,
                })
              }
              disabled={(pageData?.number ?? 0) <= 0 || loading}
            >
              ‹ Previous
            </button>
            <button
              type="button"
              className="ap-btnSecondary"
              onClick={() =>
                fetchMine({
                  pageArg: Math.min(
                    (pageData?.totalPages ?? 1) - 1,
                    (pageData?.number ?? 0) + 1
                  ),
                  sizeArg: pageData?.size ?? 10,
                })
              }
              disabled={
                (pageData?.number ?? 0) >= (pageData?.totalPages ?? 1) - 1 ||
                loading
              }
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

}
