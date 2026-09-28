import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const [nic, setNic] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(nic, password);
      
      // Redirect based on role
      if (user.role === 'BACKOFFICE') {
        navigate('/dashboard/account');
      } else {
        // Both GRID_OPERATOR and PROSUMER will go to their profile area
        navigate('/profile');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-8 shadow-lg border border-outline-variant/30">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container shadow-sm">
            <span className="material-symbols-outlined text-[28px] text-on-primary-container">sunny</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Smart Solar Microgrid</h1>
          <p className="mt-2 text-sm text-secondary">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-error-container p-4 text-sm text-on-error-container">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">NIC</label>
            <input
              type="text"
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
