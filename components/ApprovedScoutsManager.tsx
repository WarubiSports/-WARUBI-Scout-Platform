import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Trash2,
  Mail,
  MapPin,
  Check,
  X,
  Loader2,
  AlertCircle,
  Search,
  Shield,
  Clock,
  RefreshCw,
  Copy,
  Send
} from 'lucide-react';
import {
  getAllApprovedScouts,
  addApprovedScout,
  removeApprovedScout,
  sendScoutInvite,
  ApprovedScout
} from '../services/accessControlService';
import { toast } from 'sonner';

const ApprovedScoutsManager: React.FC = () => {
  const [scouts, setScouts] = useState<ApprovedScout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add new scout form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addingScout, setAddingScout] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Invite sending
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

  const loadScouts = async () => {
    setLoading(true);
    setError(null);
    const { scouts: data, error: err } = await getAllApprovedScouts();
    if (err) {
      setError(err);
    } else {
      setScouts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadScouts();
  }, []);

  const handleAddScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setAddingScout(true);
    const result = await addApprovedScout(
      newEmail,
      newName || undefined,
      newRegion || undefined,
      newNotes || undefined
    );

    if (result.success) {
      setShowAddForm(false);
      setNewEmail('');
      setNewName('');
      setNewRegion('');
      setNewNotes('');
      loadScouts();
    } else {
      setError(result.error || 'Failed to add scout');
    }
    setAddingScout(false);
  };

  const handleRemoveScout = async (id: string) => {
    setDeletingId(id);
    const result = await removeApprovedScout(id);
    if (result.success) {
      setScouts(prev => prev.filter(s => s.id !== id));
    } else {
      setError(result.error || 'Failed to remove scout');
    }
    setDeletingId(null);
  };

  const handleSendInvite = async (scout: ApprovedScout) => {
    setSendingInviteId(scout.id);
    const result = await sendScoutInvite(scout.email);
    if (result.success) {
      toast.success(`Invitation sent to ${scout.email}`, {
        description: 'They will receive a magic link to sign in',
        duration: 4000,
      });
    } else {
      toast.error('Failed to send invitation', {
        description: result.error,
      });
    }
    setSendingInviteId(null);
  };

  const handleCopyInvite = (scout: ApprovedScout) => {
    // Always use production URL for invites, not current preview URL
    const appUrl = 'https://warubi-scout-platform.vercel.app';
    const message = `Hi${scout.name ? ` ${scout.name.split(' ')[0]}` : ''}! 👋

You've been approved to join WARUBI Scout Platform.

Sign up here: ${appUrl}

Use this email to register: ${scout.email}

See you on the platform! ⚽`;

    navigator.clipboard.writeText(message);
    toast.success('Invite copied to clipboard!', {
      description: 'Paste it in WhatsApp or any messenger',
      duration: 3000,
    });
  };

  const filteredScouts = scouts.filter(
    (scout) =>
      scout.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scout.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scout.region?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const registeredCount = scouts.filter(s => s.has_registered).length;
  const pendingCount = scouts.filter(s => !s.has_registered).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-scout-800 border border-scout-700 rounded-xl p-4">
          <div className="text-2xl font-black text-white">{scouts.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Total Approved</div>
        </div>
        <div className="bg-scout-800 border border-scout-700 rounded-xl p-4">
          <div className="text-2xl font-black text-scout-accent">{registeredCount}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Registered</div>
        </div>
        <div className="bg-scout-800 border border-scout-700 rounded-xl p-4">
          <div className="text-2xl font-black text-yellow-400">{pendingCount}</div>
          <div className="text-xs text-gray-500 uppercase tracking-widest">Pending</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, name, or region..."
            className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent"
          />
        </div>
        <button
          onClick={() => loadScouts()}
          className="p-3 bg-scout-800 border border-scout-700 rounded-xl hover:bg-scout-700 transition-colors text-gray-400"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-emerald-400 transition-colors"
        >
          <UserPlus size={18} />
          Add Scout
        </button>
      </div>

      {/* Add Scout Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddScout}
          className="bg-scout-800 border border-scout-700 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-lg font-black text-white uppercase">Approve New Scout</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Email (Required)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="scout@example.com"
                  className="w-full bg-scout-900 border border-scout-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Scout name"
                className="w-full bg-scout-900 border border-scout-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Region
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  placeholder="e.g. Texas, Bavaria"
                  className="w-full bg-scout-900 border border-scout-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Notes
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full bg-scout-900 border border-scout-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-scout-700 text-white rounded-lg text-sm hover:bg-scout-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingScout || !newEmail}
              className="px-4 py-2 bg-scout-accent text-scout-900 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {addingScout ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Approve Scout
            </button>
          </div>
        </form>
      )}

      {/* Scouts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 size={24} className="animate-spin mr-3" />
          Loading approved scouts...
        </div>
      ) : filteredScouts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Shield size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-bold">No approved scouts found</p>
          <p className="text-sm">Add scouts to the approved list to grant them access.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredScouts.map((scout) => (
            <div
              key={scout.id}
              className="bg-scout-800 border border-scout-700 rounded-xl p-4 flex items-center gap-4 group hover:border-scout-600 transition-colors"
            >
              {/* Status indicator */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  scout.has_registered
                    ? 'bg-scout-accent/20 border border-scout-accent/30'
                    : 'bg-yellow-500/20 border border-yellow-500/30'
                }`}
              >
                {scout.has_registered ? (
                  <Check size={18} className="text-scout-accent" />
                ) : (
                  <Clock size={18} className="text-yellow-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white truncate">
                    {scout.name || scout.email}
                  </span>
                  {scout.has_registered && (
                    <span className="px-2 py-0.5 bg-scout-accent/20 text-scout-accent text-[10px] font-black uppercase rounded">
                      Registered
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {scout.email}
                  </span>
                  {scout.region && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {scout.region}
                    </span>
                  )}
                </div>
                {scout.notes && (
                  <p className="text-xs text-gray-600 mt-1 truncate">{scout.notes}</p>
                )}
              </div>

              {/* Meta */}
              <div className="text-right text-xs text-gray-500 hidden md:block">
                <div>Approved {new Date(scout.approved_at).toLocaleDateString()}</div>
                {scout.registered_at && (
                  <div className="text-scout-accent">
                    Registered {new Date(scout.registered_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!scout.has_registered && (
                  <>
                    <button
                      onClick={() => handleCopyInvite(scout)}
                      className="px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-1.5 text-xs font-bold"
                      title="Copy invite message for WhatsApp"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                    <button
                      onClick={() => handleSendInvite(scout)}
                      disabled={sendingInviteId === scout.id}
                      className="px-3 py-2 bg-scout-accent/10 text-scout-accent rounded-lg hover:bg-scout-accent/20 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
                      title="Send magic link via email"
                    >
                      {sendingInviteId === scout.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Email
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleRemoveScout(scout.id)}
                  disabled={deletingId === scout.id}
                  className="p-2 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all disabled:opacity-50"
                  title="Remove from approved list"
                >
                  {deletingId === scout.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovedScoutsManager;
