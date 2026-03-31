import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';

const classificationConfig = {
  safe:    { label: 'Safe Content',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✓' },
  flagged: { label: 'Flagged Content', color: 'bg-red-500/20 text-red-400 border-red-500/30',             icon: '⚠' },
  pending: { label: 'Pending Review',  color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       icon: '…' },
};

const formatDuration = (secs) => {
  if (!secs) return '--:--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
};

const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  useEffect(() => {
    const socket = getSocket();

    const handleProgress = ({ videoId, progress, stage }) => {
      if (videoId === id) setProcessing({ progress, stage });
    };

    const handleCompleted = ({ videoId, video: updatedVideo }) => {
      if (videoId === id) {
        setVideo(updatedVideo);
        setProcessing(null);
      }
    };

    const handleFailed = ({ videoId }) => {
      if (videoId === id) {
        setProcessing(null);
        fetchVideo();
      }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-400 font-medium">{error}</p>
        <Link to="/library" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">
          ← Back to Library
        </Link>
      </div>
    );
  }

  const classification = classificationConfig[video?.sensitivityResult?.classification || 'pending'];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/library" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-6">
        ← Back to Library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video player */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            {video?.status === 'completed' ? (
              <video
                controls
                className="w-full aspect-video"
                src={`/api/videos/${id}/stream?token=${localStorage.getItem('token')}`}
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-slate-900">
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
          </div>

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
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-xl font-bold text-white">{video?.title}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-slate-400 hover:text-white text-sm flex-shrink-0"
                  >
                    Edit
                  </button>
                </div>
                {video?.description && (
                  <p className="text-slate-400 text-sm mt-2">{video.description}</p>
                )}
                {video?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {video.tags.map((tag) => (
                      <span key={tag} className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Sensitivity result */}
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
                    className={`h-full rounded-full ${
                      video.sensitivityResult.classification === 'flagged' ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
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

          {/* Video details */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-white font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Status</dt>
                <dd className="text-white capitalize">{video?.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Duration</dt>
                <dd className="text-white">{formatDuration(video?.duration)}</dd>
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
