import React, { useState, useRef } from 'react';
import { X, Loader2, CheckCircle, Upload, AlertTriangle, Send, Bug } from 'lucide-react';
import { createBugReport, uploadScreenshot } from '../services/bugReportService';

interface ReportBugModalProps {
  onClose: () => void;
}

const ReportBugModal: React.FC<ReportBugModalProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      setScreenshot(file);
      setError(null);

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
      setError('Please describe the issue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        setUploading(true);
        screenshotUrl = await uploadScreenshot(screenshot);
        setUploading(false);
      }

      const result = await createBugReport(
        title.trim(),
        description.trim() || undefined,
        pageUrl || undefined,
        screenshotUrl || undefined,
        'medium'
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || 'Failed to submit');
      }
    } catch {
      setError('An unexpected error occurred');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
        <div className="bg-scout-800 border border-scout-700 rounded-2xl p-8 max-w-sm w-full text-center animate-fade-in">
          <div className="w-16 h-16 bg-scout-accent/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-scout-accent/30">
            <CheckCircle size={32} className="text-scout-accent" />
          </div>
          <h2 className="text-lg font-black text-white uppercase mb-1">Sent!</h2>
          <p className="text-sm text-gray-400">We'll look into it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <div className="bg-scout-800 border border-scout-700 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-white uppercase">Report a Bug</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-scout-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hint */}
        <div className="mb-4 p-3 bg-scout-accent/10 border border-scout-accent/20 rounded-xl text-scout-accent text-sm flex items-center gap-2">
          <Bug size={16} className="shrink-0" />
          Describe what went wrong or what you expected to happen.
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
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-300">
              What's the issue? <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Events page not loading"
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-300">
              More details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you trying to do? What happened instead?"
              rows={3}
              className="w-full bg-scout-900 border border-scout-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-scout-accent transition-colors resize-none"
            />
          </div>

          {/* Screenshot */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-300">
              Screenshot (optional)
            </label>

            {screenshotPreview ? (
              <div className="relative">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="w-full h-36 object-cover rounded-xl border border-scout-700"
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
                className="w-full py-6 border-2 border-dashed border-scout-700 rounded-xl hover:border-scout-500 transition-colors flex flex-col items-center gap-1.5 text-gray-500 hover:text-gray-400"
              >
                <Upload size={20} />
                <span className="text-sm">Click to add a screenshot</span>
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

          {/* Page URL */}
          {pageUrl && (
            <p className="text-xs text-gray-600 truncate">
              Page: {pageUrl.replace(/^https?:\/\//, '')}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
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
                  <Loader2 size={16} className="animate-spin" />
                  {uploading ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportBugModal;
