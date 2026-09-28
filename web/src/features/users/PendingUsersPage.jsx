import { useState, useEffect } from 'react';
import { usersApi } from '../../api';

export default function PendingUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getPending();
      // Ensure data is array
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPending();
  }, []);

  const handleActivate = async (nic) => {
    if (!window.confirm(`Are you sure you want to activate user ${nic}?`)) {
      return;
    }
    
    try {
      await usersApi.activate(nic);
      alert('User activated successfully.');
      fetchPending();
    } catch (err) {
      alert(err.message || 'Failed to activate user.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-on-surface">Pending Activations</h1>
        <p className="text-sm text-secondary">Review and activate pending prosumer accounts</p>
      </div>

      {error && <p className="text-sm text-error bg-error-container p-4 rounded-lg">{error}</p>}

      <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface">
            <thead className="bg-surface-container text-xs uppercase text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">NIC</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Address</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-secondary">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-secondary">No pending users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.nic} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 font-medium">{user.nic}</td>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email || '-'}</td>
                    <td className="px-6 py-4">{user.phone || '-'}</td>
                    <td className="px-6 py-4 truncate max-w-[150px]">{user.address || '-'}</td>
                    <td className="px-6 py-4">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleActivate(user.nic)}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90"
                      >
                        Activate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
