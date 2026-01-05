
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api/authApi';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('USER');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Call backend register API
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
      });

      // ✅ Do NOT redirect and do NOT auto-login
      setSuccess('Registered Successfully. Please return to login page.');
      // Optionally clear the form
      // setUsername(''); setEmail(''); setPassword(''); setRole('USER');
    } catch (err) {
      // Show server-provided message if available (e.g., from ApiError.message)
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !username.trim() || !email.trim() || !password;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create an account</h2>
        <p style={styles.subtitle}>Join to list properties, book stays and write reviews.</p>

        {error && <div style={styles.error}>{error}</div>}
        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Name
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Your name"
            />
          </label>

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
            <input
              style={styles.input}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
            />
            <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={styles.showBtn}
                aria-label="Toggle password visibility"
              >
                {showPassword ? 'Hide' : 'Show'}
            </button>
          </label>
          

          <label style={{ ...styles.label, marginBottom: 4 }}>
            I want to
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ ...styles.input, padding: '8px 10px' }}
            >
              <option value="USER">Book stays</option>
              <option value="AGENT">Host a property</option>
            </select>
          </label>

          <button type="submit" style={styles.submit} disabled={isDisabled}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account? <Link to="/login">Log in</Link>
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
  showBtn: {
    position: 'relative',
    left: 180,
    bottom: 28,
    background: 'transparent',
    border: 'none',
    color: '#0071c2',
    cursor: 'pointer',
    fontWeight: 600,
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
  error: {
    background: '#ffe6e6',
    color: '#b00020',
    padding: '8px 10px',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  success: {
    background: '#e6ffea',
    color: '#0f5132',
    padding: '8px 10px',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
};
