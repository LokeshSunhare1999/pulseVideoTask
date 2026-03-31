import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVideos } from '../context/VideoContext';
import VideoCard from '../components/VideoCard';

const StatCard = ({ label, value, color, icon }) => (
  <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`text-2xl`}>{icon}</span>
    </div>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { videos, loading, fetchVideos, processingMap } = useVideos();
  const [stats, setStats] = useState({ total: 0, processing: 0, safe: 0, flagged: 0 });

  useEffect(() => {
    fetchVideos({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' });
  }, []);

  useEffect(() => {
    setStats({
      total: videos.length,
      processing: videos.filter((v) => v.status === 'processing' || v.status === 'uploaded').length,
      safe: videos.filter((v) => v.sensitivityResult?.classification === 'safe').length,
      flagged: videos.filter((v) => v.sensitivityResult?.classification === 'flagged').length,
    });
  }, [videos]);

  const activeProcessing = Object.entries(processingMap);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Welcome back, <span className="text-indigo-400">{user?.username}</span>
          </p>
        </div>
        {(user?.role === 'editor' || user?.role === 'admin') && (
          <Link
            to="/upload"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Video
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Videos" value={stats.total} color="text-white" icon="🎬" />
        <StatCard label="Processing" value={stats.processing} color="text-blue-400" icon="⚙️" />
        <StatCard label="Safe" value={stats.safe} color="text-emerald-400" icon="✅" />
        <StatCard label="Flagged" value={stats.flagged} color="text-red-400" icon="⚠️" />
      </div>

      {/* Active processing */}
      {activeProcessing.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-8">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Processing Queue ({activeProcessing.length})
          </h2>
          <div className="space-y-3">
            {activeProcessing.map(([videoId, { progress, stage }]) => {
              const video = videos.find((v) => v._id === videoId);
              return (
                <div key={videoId} className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{video?.title || 'Processing...'}</span>
                    <span className="text-indigo-400 text-sm font-mono">{progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs">{stage}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent Videos</h2>
          <Link to="/library" className="text-indigo-400 hover:text-indigo-300 text-sm">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-pulse">
                <div className="aspect-video bg-slate-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-slate-300 font-medium">No videos yet</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">Upload your first video to get started</p>
            {(user?.role === 'editor' || user?.role === 'admin') && (
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Upload Video
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
