import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideos } from '../context/VideoContext';

const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export default function Upload() {
  const { uploadVideo } = useVideos();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', tags: '', category: 'Uncategorized' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const CATEGORIES = ['Uncategorized', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Music', 'Other'];

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('File size exceeds 500MB limit');
      return;
    }
    setError('');
    setFile(f);
    if (!form.title) {
      setForm((prev) => ({ ...prev, title: f.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a video file'); return; }
    if (!form.title.trim()) { setError('Title is required'); return; }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('tags', form.tags.trim());
    formData.append('category', form.category);

    try {
      await uploadVideo(formData, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });
      navigate('/library');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Video</h1>
        <p className="text-slate-400 mt-1">Upload a video for sensitivity analysis and streaming</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-indigo-400 bg-indigo-500/10'
              : file
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
          } ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
            disabled={uploading}
          />

          {file ? (
            <div>
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm mt-1">{formatSize(file.size)}</p>
              {!uploading && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setUploadProgress(0); }}
                  className="mt-3 text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📁</div>
              <p className="text-white font-medium">Drop your video here</p>
              <p className="text-slate-400 text-sm mt-1">or click to browse</p>
              <p className="text-slate-500 text-xs mt-2">MP4, MOV, AVI, MKV, WebM — max 500MB</p>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-medium">Uploading...</span>
              <span className="text-indigo-400 text-sm font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs mt-2">
              {uploadProgress < 100 ? 'Uploading file...' : 'Processing started, redirecting...'}
            </p>
          </div>
        )}

        {/* Metadata form */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={uploading}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              placeholder="Enter video title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={uploading}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={uploading}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Tags</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                disabled={uploading}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload & Process
            </>
          )}
        </button>
      </form>
    </div>
  );
}
