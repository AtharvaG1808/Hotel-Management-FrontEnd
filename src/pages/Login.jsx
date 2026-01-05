
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { getRoleFromToken } from '../util/jwt';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login({ email, password }); 
      // console.log('Login successful, token stored: ' + token);

      onLoginSuccess?.(token);
      
      const role = getRoleFromToken(token);

      if (role === 'AGENT') {
        navigate('/hotels', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
      // navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Log in to continue to HotelApp.</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>

          <label style={styles.label}>
            Password
            <div style={{ position: 'relative' }}>
              <input
                style={styles.input}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={styles.showBtn}
                aria-label="Toggle password visibility"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button type="submit" style={styles.submit} disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div style={styles.footer}>
          New to HotelApp? <button type="button" onClick={() => navigate('/register')} style={styles.signupBtn}>Create an account</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)',
    padding: 20,
  },
  card: {
    width: 420,
    maxWidth: '95%',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    padding: 28,
  },
  title: {
    margin: 0,
    marginBottom: 6,
    fontSize: 22,
    fontWeight: 600,
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 18,
    color: '#666',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: 13,
    color: '#333',
    marginBottom: 12,
  },
  input: {
    marginTop: 8,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e6e6e6',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  },
  showBtn: {
    position: 'absolute',
    right: 8,
    top: 19,
    background: 'transparent',
    border: 'none',
    color: '#0071c2',
    cursor: 'pointer',
    fontWeight: 600,
  },
  submit: {
    marginTop: 8,
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#FF5A5F',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
  },
  footer: {
    marginTop: 14,
    fontSize: 13,
    color: '#444',
  },
  signupBtn: {
    marginLeft: 8,
    background: '#FF5A5F',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: {
    background: '#ffe6e6',
    color: '#b00020',
    padding: '8px 10px',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
};
