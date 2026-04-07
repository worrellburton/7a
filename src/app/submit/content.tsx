'use client';

import { useRef, useState } from 'react';

const locations = ['Lodge', 'Barn', 'Admin Building', 'Grounds', 'Other'] as const;

type Priority = 'High' | 'Medium' | 'Low';

export default function SubmitContent() {
  const [form, setForm] = useState({ name: '', location: '', issue: '', priority: 'Medium' as Priority, notes: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!form.location || !form.issue.trim()) return;
    // In production this would POST to an API
    setSubmitted(true);
  };

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
            Thank you, {form.name || 'your submission'} has been received. Our team will review it shortly.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ name: '', location: '', issue: '', priority: 'Medium', notes: '' }); setPhotos([]); }}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#1a1a1a]/80 transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-[#a0522d] tracking-tighter">7A</span>
          <h1 className="text-xl font-bold text-[#1a1a1a] mt-3 mb-1">Report a Facility Issue</h1>
          <p className="text-sm text-[#1a1a1a]/50">
            Help us keep our facilities in great shape.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-[#f5f0eb]/50 focus:outline-none focus:border-[#a0522d]"
            />

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
              {photos.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img src={photo} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                      <button
                        onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
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
            disabled={!form.location || !form.issue.trim()}
            className="w-full mt-6 px-4 py-3 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#1a1a1a]/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Submit Issue
          </button>
        </div>

        <p className="text-center text-xs text-[#1a1a1a]/30 mt-4">
          Seven Arrows Recovery
        </p>
      </div>
    </div>
  );
}
