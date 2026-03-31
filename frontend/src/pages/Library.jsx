import { useEffect, useState } from 'react';
import { useVideos } from '../context/VideoContext';
import VideoCard from '../components/VideoCard';

const CATEGORIES = ['', 'Uncategorized', 'Education', 'Entertainment', 'Sports', 'News', 'Technology', 'Music', 'Other'];

export default function Library() {
  const { videos, pagination, loading, filters, fetchVideos, updateFilters } = useVideos();
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchVideos();
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    updateFilters({ [key]: value, page: 1 });
  };

  const handlePage = (page) => {
    updateFilters({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Video Library</h1>
        <p className="text-slate-400 mt-1">{pagination.total} video{pagination.total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search videos..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Search
            </button>
          </form>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="uploaded">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          {/* Classification filter */}
          <select
            value={filters.classification}
            onChange={(e) => handleFilterChange('classification', e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Content</option>
            <option value="safe">Safe</option>
            <option value="flagged">Flagged</option>
            <option value="pending">Pending</option>
          </select>

          {/* Category filter */}
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Sort */}
          <select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split(':');
              updateFilters({ sortBy, sortOrder });
            }}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="title:asc">Title A-Z</option>
            <option value="size:desc">Largest First</option>
          </select>
        </div>

        {/* Active filters */}
        {(filters.search || filters.status || filters.classification || filters.category) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700">
            <span className="text-slate-400 text-xs">Active filters:</span>
            {filters.search && (
              <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                Search: {filters.search}
                <button onClick={() => { setSearchInput(''); updateFilters({ search: '' }); }}>×</button>
              </span>
            )}
            {filters.status && (
              <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                Status: {filters.status}
                <button onClick={() => handleFilterChange('status', '')}>×</button>
              </span>
            )}
            {filters.classification && (
              <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                Content: {filters.classification}
                <button onClick={() => handleFilterChange('classification', '')}>×</button>
              </span>
            )}
            {filters.category && (
              <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                Category: {filters.category}
                <button onClick={() => handleFilterChange('category', '')}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Video grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
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
        <div className="text-center py-20 bg-slate-800 rounded-xl border border-slate-700">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-300 font-medium">No videos found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                ← Prev
              </button>
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    pagination.page === i + 1
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePage(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
