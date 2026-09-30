import { useState, useEffect } from 'react';
import { usersApi } from '../../api';

export default function UserManagementPage() {
  const [searchNic, setSearchNic] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (user, newStatus) => {
    const action = newStatus === 'DEACTIVATED' ? 'deactivate' : 'reactivate';
    
    if (!window.confirm(`Are you sure you want to ${action} user ${user.nic}?`)) {
      return;
    }

    try {
      if (newStatus === 'DEACTIVATED') {
        await usersApi.deactivate(user.nic);
      } else {
        await usersApi.reactivate(user.nic);
      }
      fetchUsers();
    } catch (err) {
      alert(err.message || `Failed to ${action} user.`);
    }
  };

  const filteredUsers = users.filter(u => u.nic.toLowerCase().includes(searchNic.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-on-surface">User Management</h1>
        <p className="text-sm text-secondary">Manage and view all registered users</p>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30">
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by NIC..."
            value={searchNic}
            onChange={(e) => setSearchNic(e.target.value)}
            className="flex-1 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        {error && <p className="mb-4 text-sm text-error">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface">
            <thead className="bg-surface-container text-xs uppercase text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">NIC</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-secondary">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-secondary">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.nic} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 font-medium">{user.nic}</td>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block rounded-md bg-secondary-container px-2 py-1 text-xs font-semibold text-on-secondary-container">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${
                        user.accountStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        user.accountStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.accountStatus === 'ACTIVE' && (
                        <button
                          onClick={() => handleStatusChange(user, 'DEACTIVATED')}
                          className="rounded-lg bg-error px-4 py-2 text-xs font-semibold text-on-error hover:bg-error/90"
                        >
                          Deactivate
                        </button>
                      )}
                      {user.accountStatus === 'DEACTIVATED' && (
                        <button
                          onClick={() => handleStatusChange(user, 'ACTIVE')}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90"
                        >
                          Reactivate
                        </button>
                      )}
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
