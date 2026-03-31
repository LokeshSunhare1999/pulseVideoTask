import { Link } from 'react-router-dom';
import { useVideos } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  uploading:   { label: 'Uploading',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  uploaded:    { label: 'Queued',      color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  processing:  { label: 'Processing',  color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed:   { label: 'Completed',   color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  failed:      { label: 'Failed',      color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const classificationConfig = {
  safe:    { label: 'Safe',    color: 'bg-emerald-500/20 text-emerald-400', icon: '✓' },
  flagged: { label: 'Flagged', color: 'bg-red-500/20 text-red-400',         icon: '⚠' },
  pending: { label: 'Pending', color: 'bg-slate-500/20 text-slate-400',     icon: '…' },
};

const formatSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDuration = (secs) => {
  if (!secs) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function VideoCard({ video }) {
  const { deleteVideo, processingMap } = useVideos();
  const { user } = useAuth();
  const processing = processingMap[video._id];

  const status = statusConfig[video.status] || statusConfig.uploaded;
  const classification = classificationConfig[video.sensitivityResult?.classification || 'pending'];

  const canDelete = user?.role === 'admin' || (user?.role === 'editor' && video.owner?._id === user?.id);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!confirm(`Delete "${video.title}"?`)) return;
    try {
      await deleteVideo(video._id);
    } catch (err) {
      alert('Failed to delete video');
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-indigo-500/50 transition-all group">
      {/* Thumbnail / Preview */}
      <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
        {video.thumbnailPath ? (
          <img
            src={`/api/videos/${video._id}/thumbnail?token=${localStorage.getItem('token')}`}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div
          className="text-slate-600 absolute inset-0 flex items-center justify-center"
          style={{ display: video.thumbnailPath ? 'none' : 'flex' }}
        >
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        </div>

        {/* Duration badge */}
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        )}

        {/* Play overlay for completed videos */}
        {video.status === 'completed' && (
          <Link
            to={`/watch/${video._id}`}
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all"
          >
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </Link>
        )}
      </div>

      {/* Processing progress bar */}
      {(video.status === 'processing' || processing) && (
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-indigo-500 transition-all duration-500 progress-animate"
            style={{ width: `${processing?.progress || video.processingProgress || 0}%` }}
          />
        </div>
      )}

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-white font-medium text-sm leading-tight line-clamp-2 flex-1">
            {video.title}
          </h3>
          {canDelete && (
            <button
              onClick={handleDelete}
              className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
              title="Delete video"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
            {processing ? `${processing.progress}%` : status.label}
          </span>
          {video.status === 'completed' && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${classification.color}`}>
              {classification.icon} {classification.label}
            </span>
          )}
        </div>

        {/* Processing stage */}
        {processing?.stage && (
          <p className="text-xs text-slate-400 mb-2 truncate">{processing.stage}</p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{formatSize(video.size)}</span>
          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Category */}
        {video.category && video.category !== 'Uncategorized' && (
          <div className="mt-2">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {video.category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
