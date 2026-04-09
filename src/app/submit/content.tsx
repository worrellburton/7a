'use client';

import { useRef, useState } from 'react';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import { useAuth } from '@/lib/AuthProvider';

const locations = ['Lodge', 'Barn', 'Admin Building', 'Grounds', 'Other'] as const;

type Priority = 'High' | 'Medium' | 'Low';

export default function SubmitContent() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [form, setForm] = useState({ location: '', issue: '', priority: 'Medium' as Priority, notes: '' });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userName = user?.user_metadata?.full_name || user?.email || 'Unknown';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => [...prev, ...newFiles]);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoPreviews((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!form.location || !form.issue.trim()) return;
    setSubmitting(true);

    let photoUrls: string[] = [];
    for (const file of photos) {
      const url = await uploadFile(file);
      if (url) photoUrls.push(url);
    }

    const result = await db({
      action: 'insert',
      table: 'facilities_issues',
      data: {
        location: form.location,
        issue: form.issue.trim(),
        priority: form.priority,
        status: 'Open',
        reported: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }),
        submitted_by: userName,
        notes: form.notes.trim(),
        photo_urls: photoUrls,
      },
    });

    setSubmitting(false);

    if (result && result.id) {
      setSubmitted(true);
    } else {
      alert('Failed to submit. Please try again.');
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#a0522d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in — show login
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <span className="text-3xl font-black text-[#a0522d] tracking-tighter">7A</span>
          <h1 className="text-xl font-bold text-[#1a1a1a] mt-3 mb-1">Report a Facility Issue</h1>
          <p className="text-sm text-[#1a1a1a]/50 mb-8">
            Sign in to submit an issue report.
          </p>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] hover:bg-[#1a1a1a]/80 text-white rounded-full py-3.5 px-6 text-sm font-semibold transition-all shadow-sm hover:shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Issue Submitted</h1>
          <p className="text-sm text-[#1a1a1a]/50">
            Thank you {userName.split(' ')[0]}, your submission has been received. Our team will review it shortly.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ location: '', issue: '', priority: 'Medium', notes: '' }); setPhotos([]); setPhotoPreviews([]); }}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#1a1a1a]/80 transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // Submit form (authenticated)
  return (
    <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-[#a0522d] tracking-tighter">7A</span>
          <h1 className="text-xl font-bold text-[#1a1a1a] mt-3 mb-1">Report a Facility Issue</h1>
          <p className="text-sm text-[#1a1a1a]/50">
            Submitting as <span className="font-medium text-[#1a1a1a]/70">{userName}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-[#f5f0eb]/50 focus:outline-none focus:border-[#a0522d]"
              >
                <option value="">Select location...</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-[#f5f0eb]/50 focus:outline-none focus:border-[#a0522d]"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Describe the issue..."
              value={form.issue}
              onChange={(e) => setForm({ ...form, issue: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-[#f5f0eb]/50 focus:outline-none focus:border-[#a0522d]"
            />

            <textarea
              placeholder="Additional notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-[#f5f0eb]/50 focus:outline-none focus:border-[#a0522d] resize-none"
            />

            {/* Photo upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-[#1a1a1a]/50 hover:border-[#a0522d] hover:text-[#a0522d] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Add Photos
              </button>
              {photoPreviews.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {photoPreviews.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img src={photo} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                      <button
                        onClick={() => {
                          setPhotos((prev) => prev.filter((_, j) => j !== i));
                          setPhotoPreviews((prev) => prev.filter((_, j) => j !== i));
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.location || !form.issue.trim() || submitting}
            className="w-full mt-6 px-4 py-3 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#1a1a1a]/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Issue'}
          </button>
        </div>

        <p className="text-center text-xs text-[#1a1a1a]/30 mt-4">
          Seven Arrows Recovery
        </p>
      </div>
    </div>
  );
}
