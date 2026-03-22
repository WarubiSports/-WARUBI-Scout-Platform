import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, Send, User, Mail, Phone, MapPin, Video, FileText } from 'lucide-react';
import { lookupScout, submitProspect, PublicSubmissionData } from '../../services/publicSubmissionService';
import { POSITIONS } from '../submission/FormComponents';

type PageState = 'loading' | 'not-found' | 'form' | 'submitting' | 'success';

interface FormState {
  name: string;
  position: string;
  age: string;
  email: string;
  phone: string;
  club: string;
  videoLink: string;
  notes: string;
}

const initialForm: FormState = {
  name: '',
  position: '',
  age: '',
  email: '',
  phone: '',
  club: '',
  videoLink: '',
  notes: '',
};

const PublicSubmissionPage: React.FC = () => {
  const { scoutId } = useParams<{ scoutId: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [scoutName, setScoutName] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [addAnother, setAddAnother] = useState(false);

  useEffect(() => {
    if (!scoutId) {
      setPageState('not-found');
      return;
    }
    lookupScout(scoutId).then(scout => {
      if (scout) {
        setScoutName(scout.name);
        setPageState('form');
      } else {
        setPageState('not-found');
      }
    });
  }, [scoutId]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.position) return;

    setPageState('submitting');
    setError(null);

    const data: PublicSubmissionData = {
      name: form.name.trim(),
      position: form.position,
      age: form.age ? parseInt(form.age) : undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      club: form.club.trim() || undefined,
      video_link: form.videoLink.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    const result = await submitProspect(scoutId!, data);

    if (result.success) {
      setPageState('success');
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
      setPageState('form');
    }
  };

  const handleAddAnother = () => {
    setForm(initialForm);
    setPageState('form');
    setAddAnother(false);
  };

  // Loading
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f]">
        <Loader2 size={32} className="text-scout-accent animate-spin" />
      </div>
    );
  }

  // Not found
  if (pageState === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f] p-4">
        <div className="max-w-md w-full bg-scout-800 border border-scout-700 rounded-2xl p-10 text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-black text-white uppercase mb-2">Invalid Link</h1>
          <p className="text-gray-400 text-sm">This submission link is not valid or has expired.</p>
        </div>
      </div>
    );
  }

  // Success
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f] p-4">
        <div className="max-w-md w-full bg-scout-800 border border-scout-700 rounded-2xl p-10 text-center space-y-5">
          <div className="w-16 h-16 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto border-2 border-scout-accent/30">
            <CheckCircle size={32} className="text-scout-accent" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase">You're In</h1>
          <p className="text-gray-400 text-sm">
            <strong className="text-white">{form.name}</strong> is now in {scoutName}'s scouting pipeline. Expect a follow-up within a few days if there's a match.
          </p>
          <button
            onClick={handleAddAnother}
            className="w-full py-3 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm"
          >
            Submit Another Player
          </button>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-[#05080f] flex flex-col items-center p-4 py-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            Scout<span className="text-scout-accent">Buddy</span>
          </h1>
          <p className="text-white font-bold text-lg mt-3">
            Get on {scoutName}'s radar
          </p>
          <p className="text-gray-400 text-sm mt-1">
            US college soccer recruiting pipeline
          </p>
        </div>

        {/* Value Proposition */}
        <div className="bg-scout-800/50 border border-scout-700/50 rounded-2xl p-5 mb-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-scout-accent/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle size={16} className="text-scout-accent" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Direct scout evaluation</p>
              <p className="text-gray-500 text-xs">Your profile goes straight to an active recruiter — no algorithms, no waiting.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-scout-accent/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle size={16} className="text-scout-accent" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">College program matching</p>
              <p className="text-gray-500 text-xs">Get matched to D1, D2, NAIA, or NJCAA programs that fit your level and goals.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-scout-accent/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle size={16} className="text-scout-accent" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Trial & showcase invitations</p>
              <p className="text-gray-500 text-xs">Qualified players get invited to ID camps, showcases, and trial sessions with college coaches.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-scout-800 border border-scout-700 rounded-2xl p-6 md:p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Name — required */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <User size={12} /> Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Player's full name"
              required
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
            />
          </div>

          {/* Position — required */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Position *</label>
            <select
              value={form.position}
              onChange={e => handleChange('position', e.target.value)}
              required
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-scout-accent transition-colors appearance-none"
            >
              <option value="" className="text-gray-600">Select position</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Age */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={e => handleChange('age', e.target.value)}
                placeholder="17"
                min={10}
                max={35}
                className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
              />
            </div>

            {/* Club */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin size={12} /> Club
              </label>
              <input
                type="text"
                value={form.club}
                onChange={e => handleChange('club', e.target.value)}
                placeholder="Current club"
                className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="player@email.com"
                className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Phone size={12} /> Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+49 151 ..."
                className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
              />
            </div>
          </div>

          {/* Video Link */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Video size={12} /> Video Link
            </label>
            <input
              type="url"
              value={form.videoLink}
              onChange={e => handleChange('videoLink', e.target.value)}
              placeholder="YouTube or Vimeo link"
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={12} /> Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Anything else the scout should know..."
              rows={3}
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={pageState === 'submitting' || !form.name.trim() || !form.position}
            className="w-full py-4 bg-scout-accent text-scout-900 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-glow hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pageState === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            Submit Player
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">Powered by Scout Buddy</p>
      </div>
    </div>
  );
};

export default PublicSubmissionPage;
