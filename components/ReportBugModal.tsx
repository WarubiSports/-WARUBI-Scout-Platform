import React, { useState, useRef } from 'react';
import { Bug, X, Loader2, CheckCircle, Upload, Image, AlertTriangle, MapPin, Lightbulb, Sparkles, MessageSquare, Send } from 'lucide-react';
import { createBugReport, uploadScreenshot } from '../services/bugReportService';
import type { BugReportPriority } from '../types';

interface ReportBugModalProps {
  onClose: () => void;
}

type FeedbackType = 'bug' | 'feature' | 'idea' | 'other';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { value: 'bug', label: 'Bug', icon: <Bug size={16} />, color: 'bg-red-500', description: 'Something broken' },
  { value: 'feature', label: 'Feature', icon: <Sparkles size={16} />, color: 'bg-blue-500', description: 'New capability' },
  { value: 'idea', label: 'Idea', icon: <Lightbulb size={16} />, color: 'bg-yellow-500', description: 'Improvement' },
  { value: 'other', label: 'Other', icon: <MessageSquare size={16} />, color: 'bg-gray-500', description: 'General feedback' },
];

const PRIORITY_OPTIONS: { value: BugReportPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Nice to have', color: 'bg-gray-500' },
  { value: 'medium', label: 'Helpful', color: 'bg-yellow-500' },
  { value: 'high', label: 'Important', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' }
];

const ReportBugModal: React.FC<ReportBugModalProps> = ({ onClose }) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<BugReportPriority>('medium');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      setScreenshot(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a title for your feedback');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshot) {
        setUploading(true);
        screenshotUrl = await uploadScreenshot(screenshot);
        setUploading(false);

        if (!screenshotUrl) {
          console.warn('Screenshot upload failed, submitting without screenshot');
        }
      }

      // Create the bug report with feedback type prefix
      const feedbackTypeLabel = FEEDBACK_TYPES.find(t => t.value === feedbackType)?.label || 'Feedback';
      const result = await createBugReport(
        `[${feedbackTypeLabel}] ${title.trim()}`,
        description.trim() || undefined,
        pageUrl || undefined,
        screenshotUrl || undefined,
        priority
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit bug report');
      }
    } catch (err) {
      setError('An unexpected error occurred');
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
          <h2 className="text-2xl font-black text-white uppercase mb-2">Feedback Sent!</h2>
          <p className="text-gray-400">Thanks for helping us improve the platform. We review all feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-scout-accent/20 rounded-lg flex items-center justify-center">
              <Lightbulb size={20} className="text-scout-accent" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase">Feedback & Ideas</h2>
              <p className="text-xs text-gray-500">Help us build what you need</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-scout-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              What type of feedback?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FEEDBACK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFeedbackType(type.value)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    feedbackType === type.value
                      ? `${type.color} text-white ring-2 ring-white/30`
                      : 'bg-scout-700 text-gray-400 hover:bg-scout-600'
                  }`}
                >
                  {type.icon}
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {feedbackType === 'bug' ? 'What went wrong?' : feedbackType === 'feature' ? 'What feature do you need?' : 'Your idea'} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={feedbackType === 'bug' ? 'Brief description of the issue' : feedbackType === 'feature' ? 'e.g. Export players to CSV' : 'Share your idea...'}
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Tell us more (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={feedbackType === 'bug' ? 'What happened? What did you expect to happen?' : 'Why would this be helpful? How would you use it?'}
              rows={3}
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              How important is this to you?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    priority === option.value
                      ? `${option.color} text-white ring-2 ring-white/30`
                      : 'bg-scout-700 text-gray-400 hover:bg-scout-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page URL (auto-captured) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <MapPin size={10} />
              Current Page
            </label>
            <div className="bg-scout-900/50 border border-scout-700 rounded-xl px-4 py-2 text-xs text-gray-500 truncate">
              {pageUrl || 'Unknown'}
            </div>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Screenshot (Optional)
            </label>

            {screenshotPreview ? (
              <div className="relative">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="w-full h-40 object-cover rounded-xl border border-scout-700"
                />
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-scout-700 rounded-xl hover:border-scout-500 transition-colors flex flex-col items-center gap-2 text-gray-500 hover:text-gray-400"
              >
                <Upload size={24} />
                <span className="text-sm">Click to upload a screenshot</span>
                <span className="text-xs text-gray-600">PNG, JPG up to 5MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-scout-700 text-white rounded-xl font-bold text-sm hover:bg-scout-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-3 bg-scout-accent text-scout-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {uploading ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Feedback
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          All feedback is reviewed by the team. We build what scouts need!
        </p>
      </div>
    </div>
  );
};

export default ReportBugModal;
