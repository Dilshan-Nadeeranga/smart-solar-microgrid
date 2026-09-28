import { useState } from 'react';
import { usersApi } from '../../api';

export default function UserManagementPage() {
  const [searchNic, setSearchNic] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchNic) return;
    
    setLoading(true);
    setError('');
    setUser(null);
    try {
      const data = await usersApi.getProfile(searchNic);
      setUser(data);
    } catch (err) {
      setError(err.message || 'Failed to search user.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!user) return;
    const action = newStatus === 'DEACTIVATED' ? 'deactivate' : 'reactivate';
    
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      if (newStatus === 'DEACTIVATED') {
        await usersApi.deactivate(user.nic);
      } else {
        await usersApi.reactivate(user.nic);
      }
      
      // Refresh user data
      const data = await usersApi.getProfile(user.nic);
      setUser(data);
    } catch (err) {
      alert(err.message || `Failed to ${action} user.`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-on-surface">User Management</h1>
        <p className="text-sm text-secondary">Search and manage user accounts</p>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            placeholder="Search by NIC..."
            value={searchNic}
            onChange={(e) => setSearchNic(e.target.value)}
            className="flex-1 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-error">{error}</p>}
      </div>

      {user && (
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30">
          <h2 className="mb-6 text-lg font-bold text-on-surface">User Profile</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">NIC</span>
              <span className="mt-1 block text-sm font-semibold text-on-surface">{user.nic}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Name</span>
              <span className="mt-1 block text-sm font-semibold text-on-surface">{user.name}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Email</span>
              <span className="mt-1 block text-sm font-semibold text-on-surface">{user.email || '-'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Phone</span>
              <span className="mt-1 block text-sm font-semibold text-on-surface">{user.phone || '-'}</span>
            </div>
            <div className="md:col-span-2">
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Address</span>
              <span className="mt-1 block text-sm font-semibold text-on-surface">{user.address || '-'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Role</span>
              <span className="mt-1 inline-block rounded-md bg-secondary-container px-2 py-1 text-xs font-semibold text-on-secondary-container">
                {user.role}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Status</span>
              <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-semibold ${
                user.accountStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                user.accountStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {user.accountStatus}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Created Date</span>
              <span className="mt-1 block text-sm font-semibold text-on-surface">
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Updated Date</span>
              <span className="mt-1 block text-sm font-semibold text-on-surface">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '-'}
              </span>
            </div>
          </div>

          <div className="mt-8 flex gap-4 pt-6 border-t border-outline-variant/20">
            {user.accountStatus === 'ACTIVE' && (
              <button
                onClick={() => handleStatusChange('DEACTIVATED')}
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-on-error hover:bg-error/90"
              >
                Deactivate User
              </button>
            )}
            {user.accountStatus === 'DEACTIVATED' && (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90"
              >
                Reactivate User
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
