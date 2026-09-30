import { useState, useEffect } from 'react';
import { usersApi } from '../../api';

export default function PendingUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNic, setRejectNic] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getPending();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleViewNIC = async (nic) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${encodeURIComponent(nic)}/nic-document`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load NIC document.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAiValidate = async (nic) => {
    setAiLoading(true);
    try {
      const response = await usersApi.validateNicAi(nic);
      setAiResult(response.aiResponse || 'No response from OCR.');
      setAiModalOpen(true);
    } catch (err) {
      setAiResult(`Error: ${err.message}`);
      setAiModalOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleActivate = async (nic) => {
    if (!window.confirm(`Are you sure you want to activate user ${nic}?`)) return;
    try {
      await usersApi.activate(nic);
      alert('User activated successfully.');
      fetchPending();
    } catch (err) {
      alert(err.message || 'Failed to activate user.');
    }
  };

  const openRejectModal = (nic) => {
    setRejectNic(nic);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (rejectReason.trim() === '') {
      alert('You must provide a rejection reason.');
      return;
    }
    setIsRejecting(true);
    try {
      await usersApi.reject(rejectNic, rejectReason);
      alert('User registration rejected. An email has been sent.');
      setRejectModalOpen(false);
      fetchPending();
    } catch (err) {
      alert(err.message || 'Failed to reject user.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
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
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-secondary">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-secondary">No pending users found.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.nic} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 font-medium">{user.nic}</td>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email || '-'}</td>
                    <td className="px-6 py-4">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewNIC(user.nic)}
                          className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-on-secondary hover:bg-secondary/90"
                        >
                          View NIC
                        </button>
                        <button
                          onClick={() => handleAiValidate(user.nic)}
                          disabled={aiLoading}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-on-tertiary ${aiLoading ? 'bg-tertiary/50 cursor-not-allowed' : 'bg-tertiary hover:bg-tertiary/90'}`}
                        >
                          {aiLoading ? 'Scanning...' : 'AI Verify'}
                        </button>
                        <button
                          onClick={() => handleActivate(user.nic)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary/90"
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => openRejectModal(user.nic)}
                          className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-on-error hover:bg-error/90"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Result Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-outline-variant/30 flex flex-col max-h-[80vh]">
            <h2 className="text-xl font-bold text-on-surface mb-4">AI Validation Result</h2>
            <div className="flex-1 overflow-y-auto mb-6 bg-surface p-4 rounded-xl border border-outline-variant/50 text-sm whitespace-pre-wrap font-mono text-on-surface">
              {aiResult}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setAiModalOpen(false)}
                className="rounded-lg bg-primary px-6 py-2 font-semibold text-on-primary hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-outline-variant/30">
            <h2 className="text-xl font-bold text-on-surface mb-2">Reject Registration</h2>
            <p className="text-sm text-secondary mb-4">
              Please provide a reason for rejecting the registration of <strong>{rejectNic}</strong>. This will be emailed directly to the applicant.
            </p>
            <textarea
              className="w-full h-32 p-3 rounded-xl border border-outline-variant bg-surface text-on-surface focus:border-error focus:ring-1 focus:ring-error mb-6 resize-none"
              placeholder="e.g., The uploaded NIC image is too blurry. Please upload a clearer picture."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={isRejecting}
                className="rounded-lg px-4 py-2 font-semibold text-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={isRejecting}
                className="rounded-lg bg-error px-6 py-2 font-semibold text-on-error hover:bg-error/90 disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
