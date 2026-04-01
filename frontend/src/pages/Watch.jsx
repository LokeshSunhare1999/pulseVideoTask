import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';

const classificationConfig = {
  safe:    { label: 'Safe Content',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✓' },
  flagged: { label: 'Flagged Content', color: 'bg-red-500/20 text-red-400 border-red-500/30',             icon: '⚠' },
  pending: { label: 'Pending Review',  color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       icon: '…' },
};

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
};

const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

// ── Custom Video Player ──────────────────────────────────────────────────────
function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current?.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.currentTime = val;
    setCurrentTime(val);
  };

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (muted) {
      const restored = volume === 0 ? 0.5 : volume;
      v.volume = restored;
      v.muted = false;
      setVolume(restored);
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
  };

  const handleEnded = () => setPlaying(false);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const displayVolume = muted ? 0 : volume;

  const VolumeIcon = () => {
    if (muted || displayVolume === 0)
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      );
    if (displayVolume < 0.5)
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
        </svg>
      );
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video cursor-pointer"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={togglePlay}
        preload="metadata"
      />

      {/* Play/pause overlay */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 pt-8 pb-3 transition-opacity duration-300 ${
          showControls || !playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Seek bar */}
        <div className="mb-3 relative group/seek">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
            }}
          />
        </div>

        {/* Bottom row */}
        <div className="flex items-center gap-3">
          {/* Play/pause */}
          <button onClick={togglePlay} className="text-white hover:text-indigo-300 transition-colors flex-shrink-0">
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
            )}
          </button>

          {/* Volume control */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleMute} className="text-white hover:text-indigo-300 transition-colors">
              <VolumeIcon />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={displayVolume}
              onChange={handleVolume}
              className="w-20 h-1 appearance-none bg-white/30 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6366f1 ${displayVolume * 100}%, rgba(255,255,255,0.3) ${displayVolume * 100}%)`,
              }}
            />
            <span className="text-white/60 text-xs w-7 text-right">
              {Math.round(displayVolume * 100)}%
            </span>
          </div>

          {/* Time */}
          <span className="text-white/70 text-xs ml-auto flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white hover:text-indigo-300 transition-colors flex-shrink-0" title="Fullscreen">
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Watch Page ───────────────────────────────────────────────────────────────
export default function Watch() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVideo(); }, [id]);

  useEffect(() => {
    const socket = getSocket();
    const handleProgress = ({ videoId, progress, stage }) => {
      if (videoId === id) setProcessing({ progress, stage });
    };
    const handleCompleted = ({ videoId, video: v }) => {
      if (videoId === id) { setVideo(v); setProcessing(null); }
    };
    const handleFailed = ({ videoId }) => {
      if (videoId === id) { setProcessing(null); fetchVideo(); }
    };
    socket.on('video:progress', handleProgress);
    socket.on('video:completed', handleCompleted);
    socket.on('video:failed', handleFailed);
    return () => {
      socket.off('video:progress', handleProgress);
      socket.off('video:completed', handleCompleted);
      socket.off('video:failed', handleFailed);
    };
  }, [id]);

  const fetchVideo = async () => {
    try {
      const res = await api.get(`/videos/${id}`);
      setVideo(res.data.video);
      setEditForm({
        title: res.data.video.title,
        description: res.data.video.description,
        category: res.data.video.category,
        tags: res.data.video.tags?.join(', ') || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/videos/${id}`, {
        ...editForm,
        tags: editForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setVideo(res.data.video);
      setEditing(false);
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <p className="text-red-400 font-medium">{error}</p>
      <Link to="/library" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">← Back to Library</Link>
    </div>
  );

  const classification = classificationConfig[video?.sensitivityResult?.classification || 'pending'];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/library" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-6">
        ← Back to Library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video player */}
        <div className="lg:col-span-2">
          {video?.status === 'completed' ? (
            <VideoPlayer
              src={
                video.storageType === 'cloudinary' || video.filePath?.startsWith('http')
                  ? video.filePath
                  : `${import.meta.env.VITE_BACKEND_URL || ''}/api/videos/${id}/stream?token=${localStorage.getItem('token')}`
              }
            />
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center bg-slate-900 rounded-xl">
              {video?.status === 'processing' || processing ? (
                <div className="text-center w-full px-8">
                  <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white font-medium mb-1">Processing video...</p>
                  <p className="text-slate-400 text-sm mb-4">{processing?.stage || 'Please wait'}</p>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${processing?.progress || video?.processingProgress || 0}%` }}
                    />
                  </div>
                  <p className="text-indigo-400 text-sm mt-2 font-mono">
                    {processing?.progress || video?.processingProgress || 0}%
                  </p>
                </div>
              ) : video?.status === 'failed' ? (
                <div className="text-center">
                  <div className="text-5xl mb-3">❌</div>
                  <p className="text-red-400 font-medium">Processing failed</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-3">⏳</div>
                  <p className="text-slate-400">Waiting to process...</p>
                </div>
              )}
            </div>
          )}

          {/* Video info */}
          <div className="mt-4">
            {editing ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Title"
                />
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Description"
                />
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Tags (comma separated)"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-xl font-bold text-white">{video?.title}</h1>
                  <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-white text-sm flex-shrink-0">
                    Edit
                  </button>
                </div>
                {video?.description && <p className="text-slate-400 text-sm mt-2">{video.description}</p>}
                {video?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {video.tags.map((tag) => (
                      <span key={tag} className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-white font-semibold mb-3">Content Analysis</h3>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${classification.color} mb-3`}>
              <span className="text-lg">{classification.icon}</span>
              <span className="font-medium text-sm">{classification.label}</span>
            </div>
            {video?.sensitivityResult?.score !== undefined && video?.status === 'completed' && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Sensitivity Score</span>
                  <span>{(video.sensitivityResult.score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${video.sensitivityResult.classification === 'flagged' ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${video.sensitivityResult.score * 100}%` }}
                  />
                </div>
              </div>
            )}
            {video?.sensitivityResult?.reasons?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">Reasons:</p>
                {video.sensitivityResult.reasons.map((r, i) => (
                  <p key={i} className="text-xs text-red-400">• {r}</p>
                ))}
              </div>
            )}
            {video?.sensitivityResult?.analyzedAt && (
              <p className="text-xs text-slate-500 mt-2">
                Analyzed: {new Date(video.sensitivityResult.analyzedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-white font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Status</dt>
                <dd className="text-white capitalize">{video?.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Duration</dt>
                <dd className="text-white">{formatTime(video?.duration)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Size</dt>
                <dd className="text-white">{formatSize(video?.size || 0)}</dd>
              </div>
              {video?.resolution?.width > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Resolution</dt>
                  <dd className="text-white">{video.resolution.width}×{video.resolution.height}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-400">Category</dt>
                <dd className="text-white">{video?.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Uploaded</dt>
                <dd className="text-white">{new Date(video?.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Owner</dt>
                <dd className="text-white">{video?.owner?.username}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
