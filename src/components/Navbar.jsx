
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getRoleFromToken } from '../util/jwt';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = token ? getRoleFromToken(token) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // USER / ADMIN behavior: same toggle as before
  const isOnPackages = location.pathname.startsWith('/packages');
  const toggleLinkLabel = isOnPackages ? 'Book hotels' : 'Book Travel Packages';
  const toggleLinkTarget = isOnPackages ? '/home' : '/packages';

  // AGENT dropdown state
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Close the dropdown if route changes
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // Brand target by role
  const brandTo =
    role === 'AGENT' ? '/hostHome' :
    token ? '/home' : '/login';

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <Link to={brandTo} style={styles.brand}>HotelApp</Link>
      </div>

      <div style={styles.right}>
        {token ? (
          role === 'AGENT' ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  style={styles.exploreBtn}
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  Add ▾
                </button>

                {open && (
                  <div role="menu" aria-label="Explore" style={styles.menu}>
                    <button
                      role="menuitem"
                      type="button"
                      style={styles.menuItem}
                      onClick={() => {
                        setOpen(false);
                        navigate('/addTravelPackage');
                      }}
                    >
                      Travel package
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      style={styles.menuItem}
                      onClick={() => {
                        setOpen(false);
                        navigate('/hotels'); // ensure this route exists
                      }}
                    >
                      Hotel
                    </button>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} style={styles.logout}>Log out</button>
            </div>
          ) : (
            // USER / ADMIN view: toggle link + Logout
            <>
              <Link to={toggleLinkTarget} style={styles.link}>
                {toggleLinkLabel}
              </Link>
              <button onClick={handleLogout} style={styles.logout}>Log out</button>
            </>
          )
        ) : (
          // Not logged in
          <>
            <Link to="/login" style={styles.link}>Log in</Link>
            <Link to="/register" style={styles.cta}>Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #eee',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  left: {},
  brand: {
    fontWeight: 700,
    color: '#FF5A5F',
    textDecoration: 'none',
    fontSize: 18,
  },
  right: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    position: 'relative',
  },
  link: {
    color: '#333',
    textDecoration: 'none',
    padding: '6px 8px',
    borderRadius: 6,
  },
  cta: {
    background: '#FF5A5F',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
  },
  logout: {
    background: 'transparent',
    border: '1px solid #ddd',
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
  },

  // AGENT: Explore dropdown styles
  exploreBtn: {
    background: 'transparent',
    color: '#333',
    border: '1px solid #e6e6e6',
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: 180,
    background: '#fff',
    border: '1px solid #e6e6e6',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    borderRadius: 10,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
  },
  menuItem: {
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#333',
    fontSize: 14,
  },
};
