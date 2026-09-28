import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { usersApi } from '../../api';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await usersApi.getProfile(authUser.nic);
        setProfile(data);
      } catch (err) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    if (authUser?.nic) {
      fetchProfile();
    }
  }, [authUser?.nic]);

  if (loading) {
    return <div className="p-8 text-center text-secondary">Loading profile...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-error bg-error-container rounded-lg">{error}</div>;
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-on-surface">My Profile</h1>
        <p className="text-sm text-secondary">View your account details</p>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-6 mb-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-container shadow-sm">
            <span className="material-symbols-outlined text-[40px] text-on-primary-container">person</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">{profile.name}</h2>
            <p className="text-secondary">{profile.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 border-t border-outline-variant/20 pt-8">
          <div>
            <span className="block text-xs font-medium text-secondary uppercase tracking-wider">NIC</span>
            <span className="mt-1 block text-sm font-semibold text-on-surface">{profile.nic}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Status</span>
            <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-semibold ${
              profile.accountStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              profile.accountStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {profile.accountStatus}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Email</span>
            <span className="mt-1 block text-sm font-semibold text-on-surface">{profile.email || '-'}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Phone</span>
            <span className="mt-1 block text-sm font-semibold text-on-surface">{profile.phone || '-'}</span>
          </div>
          <div className="md:col-span-2">
            <span className="block text-xs font-medium text-secondary uppercase tracking-wider">Address</span>
            <span className="mt-1 block text-sm font-semibold text-on-surface">{profile.address || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
