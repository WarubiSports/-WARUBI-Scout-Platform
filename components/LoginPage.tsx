import React, { useState } from 'react';
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type LoginMode = 'password' | 'signup' | 'forgot';

// Check if email is approved
async function checkEmailApproved(email: string) {
  if (!supabase) return { approved: true };
  try {
    const { data, error } = await supabase.rpc('check_email_approved', {
      email_to_check: email.toLowerCase().trim()
    });
    if (error) {
      console.error('Error checking approved scouts:', error);
      return { approved: false, error: error.message };
    }
    const result = data?.[0];
    if (!result || !result.is_approved) {
      return { approved: false };
    }
    return {
      approved: true,
      scout: {
        email: email.toLowerCase().trim(),
        name: result.scout_name,
        region: result.scout_region,
        role: result.scout_role
      }
    };
  } catch (e) {
    console.error('Error in checkEmailApproved:', e);
    return { approved: false, error: 'Failed to check approval status' };
  }
}

// Mark scout as registered
async function markScoutRegistered(email: string) {
  if (!supabase) return true;
  try {
    const { data, error } = await supabase.rpc('mark_scout_registered', {
      p_email: email.toLowerCase().trim()
    });
    if (error) {
      console.error('Error marking scout registered:', error);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error('Error in markScoutRegistered:', e);
    return false;
  }
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      // Check if email is approved
      const { approved, error: approvalError } = await checkEmailApproved(email);
      if (!approved) {
        setError(approvalError || 'Access restricted. Contact your administrator to request access.');
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError('Authentication not configured');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        onLoginSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      // Check if email is approved
      const { approved, error: approvalError } = await checkEmailApproved(email);
      if (!approved) {
        setError(approvalError || 'Access restricted. Contact your administrator to request access.');
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError('Authentication not configured');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined
        }
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        await markScoutRegistered(email);
        onLoginSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        setError('Authentication not configured');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#05080f]">
      <div className="max-w-md w-full bg-scout-800 border border-scout-700 rounded-[2rem] shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            Warubi<span className="text-scout-accent">Scout</span>
          </h1>
          <p className="text-gray-400 mt-2">Sign in to access your scouting dashboard</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="bg-scout-900 border-2 border-scout-700 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-scout-accent transition-all">
                <Mail className="text-scout-accent" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent w-full text-white font-medium outline-none placeholder-gray-600"
                  placeholder="Email Address"
                  required
                />
              </div>
              <div className="bg-scout-900 border-2 border-scout-700 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-scout-accent transition-all">
                <Lock className="text-scout-accent" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent w-full text-white font-medium outline-none placeholder-gray-600"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-scout-900 font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
            </button>

            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-gray-500 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-scout-accent font-bold hover:underline"
              >
                Create new account
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="space-y-4">
              <div className="bg-scout-900 border-2 border-scout-700 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-scout-accent transition-all">
                <Mail className="text-scout-accent" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent w-full text-white font-medium outline-none placeholder-gray-600"
                  placeholder="Email Address"
                  required
                />
              </div>
              <div className="bg-scout-900 border-2 border-scout-700 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-scout-accent transition-all">
                <Lock className="text-scout-accent" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent w-full text-white font-medium outline-none placeholder-gray-600"
                  placeholder="Create Password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-scout-900 font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>
                <User size={20} />
                Create Account
              </>}
            </button>

            <button
              type="button"
              onClick={() => setMode('password')}
              className="w-full text-gray-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="text-scout-accent" size={32} />
                </div>
                <h3 className="text-white font-bold mb-2">Check your email</h3>
                <p className="text-gray-400 text-sm">
                  We've sent a password reset link to {email}
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-400 text-sm text-center">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <div className="bg-scout-900 border-2 border-scout-700 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-scout-accent transition-all">
                  <Mail className="text-scout-accent" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent w-full text-white font-medium outline-none placeholder-gray-600"
                    placeholder="Email Address"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-scout-accent hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-scout-900 font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'Send Reset Link'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => { setMode('password'); setResetSent(false); }}
              className="w-full text-gray-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 text-xs mt-8">
          Powered by Warubi Sports
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
