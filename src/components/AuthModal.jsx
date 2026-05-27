import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign In</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Register</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          {mode === 'register' && (
            <input type="text" placeholder="Username" value={form.username} onChange={set('username')} required minLength={3} maxLength={50} />
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required minLength={6} />
          {error && <p className="modal-error">{error}</p>}
          <button type="submit" className="modal-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
