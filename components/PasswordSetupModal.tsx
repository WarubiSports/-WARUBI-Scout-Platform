import React, { useState } from 'react';
import { Lock, X, Loader2, CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

interface PasswordSetupModalProps {
  onClose: () => void;
}

const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({ onClose }) => {
  const { setupPassword, user } = useAuthContext();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordStrength = React.useMemo(() => {
    if (password.length === 0) return { score: 0, label: '', color: '' };
    if (password.length < 6) return { score: 1, label: 'Too short', color: 'text-red-400' };
    if (password.length < 8) return { score: 2, label: 'Weak', color: 'text-orange-400' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return { score: 3, label: 'Moderate', color: 'text-yellow-400' };
    }
    if (password.length >= 12 && /[!@#$%^&*]/.test(password)) {
      return { score: 5, label: 'Strong', color: 'text-green-400' };
    }
    return { score: 4, label: 'Good', color: 'text-scout-accent' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await setupPassword(password);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(result.error || 'Failed to set password');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-scout-800 border border-scout-700 rounded-2xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-scout-accent/30">
            <CheckCircle size={40} className="text-scout-accent" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase mb-2">Password Set!</h2>
          <p className="text-gray-400">You can now sign in faster with your email and password.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl p-6 max-w-md w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-scout-accent/20 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-scout-accent" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase">Secure Your Account</h2>
              <p className="text-xs text-gray-500">Set a password for faster logins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-scout-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info */}
        <div className="bg-scout-900/50 rounded-xl p-4 mb-6 border border-scout-700">
          <p className="text-sm text-gray-400">
            <span className="text-white font-medium">{user?.email}</span>
            <br />
            <span className="text-xs">Create a password to sign in quickly without waiting for email links.</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-12 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 h-1 bg-scout-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength.score <= 2 ? 'bg-red-400' :
                      passwordStrength.score === 3 ? 'bg-yellow-400' :
                      'bg-scout-accent'
                    }`}
                    style={{ width: `${passwordStrength.score * 20}%` }}
                  />
                </div>
                <span className={passwordStrength.color}>{passwordStrength.label}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                required
              />
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-scout-700 text-white rounded-xl font-bold text-sm hover:bg-scout-600 transition-colors"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              className="flex-1 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              Set Password
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          You can always change this later in your profile settings.
        </p>
      </div>
    </div>
  );
};

export default PasswordSetupModal;
