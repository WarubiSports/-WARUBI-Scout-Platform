import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

type AuthMode = 'magic' | 'password' | 'signup';

const Login: React.FC = () => {
  const { signInWithMagicLink, signInWithPassword, signUp } = useAuthContext();

  const [mode, setMode] = useState<AuthMode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    const result = await signInWithMagicLink(email);

    if (result.success) {
      setMagicLinkSent(true);
    } else {
      setError(result.error || 'Failed to send magic link');
    }
    setLoading(false);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    const result = await signInWithPassword(email, password);

    if (!result.success) {
      setError(result.error || 'Invalid email or password');
    }
    // If successful, AuthContext will update and App will redirect
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    const result = await signUp(email, password);

    if (result.success) {
      setMagicLinkSent(true); // Show confirmation (Supabase sends verification email)
    } else {
      setError(result.error || 'Failed to create account');
    }
    setLoading(false);
  };

  // Magic link sent confirmation
  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#05080f]">
        <div className="max-w-md w-full bg-scout-800 border border-scout-700 rounded-[2.5rem] shadow-2xl p-10 text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto border-2 border-scout-accent/30">
            <CheckCircle size={40} className="text-scout-accent" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Check Your Email</h2>
          <p className="text-gray-400 text-sm">
            We sent a {mode === 'signup' ? 'verification' : 'login'} link to <span className="text-white font-bold">{email}</span>
          </p>
          <p className="text-gray-500 text-xs">Click the link in the email to continue. Check your spam folder if you don't see it.</p>
          <button
            onClick={() => { setMagicLinkSent(false); setEmail(''); }}
            className="text-scout-accent text-sm font-bold hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#05080f]">
      <div className="max-w-md w-full bg-scout-800 border border-scout-700 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            Warubi<span className="text-scout-accent">Scout</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Sign in to access your scouting dashboard</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-fade-in">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Magic Link Form (Default) */}
        {mode === 'magic' && (
          <form onSubmit={handleMagicLink} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scout@example.com"
                  className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-glow hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              Send Magic Link
            </button>
          </form>
        )}

        {/* Password Login Form */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scout@example.com"
                  className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-glow hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
              Sign In
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scout@example.com"
                  className="w-full bg-scout-900 border border-scout-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Create Password</label>
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

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-glow hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
              Create Account
            </button>
          </form>
        )}

        {/* Mode Toggle */}
        <div className="mt-8 text-center space-y-3">
          {mode === 'magic' && (
            <>
              <button
                onClick={() => setMode('password')}
                className="text-gray-500 text-sm hover:text-white transition-colors"
              >
                Sign in with password instead
              </button>
              <div className="text-gray-600 text-xs">or</div>
              <button
                onClick={() => setMode('signup')}
                className="text-scout-accent text-sm font-bold hover:underline"
              >
                Create new account
              </button>
            </>
          )}

          {mode === 'password' && (
            <>
              <button
                onClick={() => setMode('magic')}
                className="text-gray-500 text-sm hover:text-white transition-colors"
              >
                Use magic link instead
              </button>
              <div className="text-gray-600 text-xs">or</div>
              <button
                onClick={() => setMode('signup')}
                className="text-scout-accent text-sm font-bold hover:underline"
              >
                Create new account
              </button>
            </>
          )}

          {mode === 'signup' && (
            <button
              onClick={() => setMode('magic')}
              className="text-gray-500 text-sm hover:text-white transition-colors"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>

      </div>

      {/* Footer */}
      <p className="mt-6 text-gray-600 text-xs">Powered by Warubi Sports</p>
    </div>
  );
};

export default Login;
