import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getSocket, connectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const VideoContext = createContext(null);

export const VideoProvider = ({ children }) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    classification: '',
    category: '',
    search: '',
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  // Track per-video processing progress
  const [processingMap, setProcessingMap] = useState({});

  const fetchVideos = useCallback(async (overrideFilters = {}) => {
    if (!user) return;
    setLoading(true);
    try {
      const params = { ...filters, ...overrideFilters };
      // Remove empty params
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const res = await api.get('/videos', { params });
      setVideos(res.data.videos);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();

    const handleProgress = ({ videoId, progress, stage }) => {
      setProcessingMap((prev) => ({ ...prev, [videoId]: { progress, stage } }));
      // Update video status in list
      setVideos((prev) =>
        prev.map((v) =>
          v._id === videoId ? { ...v, status: 'processing', processingProgress: progress } : v
        )
      );
    };

    const handleCompleted = ({ videoId, video }) => {
      setProcessingMap((prev) => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
      setVideos((prev) =>
        prev.map((v) => (v._id === videoId ? { ...v, ...video } : v))
      );
    };

    const handleFailed = ({ videoId }) => {
      setProcessingMap((prev) => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
      setVideos((prev) =>
        prev.map((v) => (v._id === videoId ? { ...v, status: 'failed' } : v))
      );
    };

    socket.on('video:progress', handleProgress);
    socket.on('video:completed', handleCompleted);
    socket.on('video:failed', handleFailed);

    return () => {
      socket.off('video:progress', handleProgress);
      socket.off('video:completed', handleCompleted);
      socket.off('video:failed', handleFailed);
    };
  }, [user]);

  const uploadVideo = async (formData, onUploadProgress) => {
    const res = await api.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 0, // No timeout for uploads
    });
    // Add new video to list
    await fetchVideos();
    return res.data;
  };

  const deleteVideo = async (id) => {
    await api.delete(`/videos/${id}`);
    setVideos((prev) => prev.filter((v) => v._id !== id));
  };

  const updateVideo = async (id, data) => {
    const res = await api.patch(`/videos/${id}`, data);
    setVideos((prev) => prev.map((v) => (v._id === id ? res.data.video : v)));
    return res.data.video;
  };

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <VideoContext.Provider
      value={{
        videos,
        pagination,
        loading,
        filters,
        processingMap,
        fetchVideos,
        uploadVideo,
        deleteVideo,
        updateVideo,
        updateFilters,
        setFilters,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};

export const useVideos = () => {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error('useVideos must be used within VideoProvider');
  return ctx;
};
