import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResetPasswordProps {
  onComplete: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#05080f]">
        <div className="max-w-md w-full bg-scout-800 border border-scout-700 rounded-[2.5rem] shadow-2xl p-10 text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto border-2 border-scout-accent/30">
            <CheckCircle size={40} className="text-scout-accent" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Password Updated</h2>
          <p className="text-gray-400 text-sm">
            Your password has been successfully reset. Redirecting you now...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#05080f]">
      <div className="max-w-md w-full bg-scout-800 border border-scout-700 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            Warubi<span className="text-scout-accent">Scout</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Set your new password</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-fade-in">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter password again"
                className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-glow hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
            Reset Password
          </button>
        </form>

      </div>

      {/* Footer */}
      <p className="mt-6 text-gray-600 text-xs">Powered by Warubi Sports</p>
    </div>
  );
};

export default ResetPassword;
