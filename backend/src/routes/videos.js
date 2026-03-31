const express = require('express');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');
const { processVideo } = require('../services/videoProcessor');

const router = express.Router();

// Inject io instance via middleware
router.use((req, res, next) => {
  req.io = req.app.get('io');
  next();
});

// POST /api/videos/upload - Upload a video (editor/admin only)
router.post(
  '/upload',
  authenticate,
  authorize('editor', 'admin'),
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No video file provided' });
      }

      const { title, description, tags, category } = req.body;

      if (!title) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Title is required' });
      }

      const video = await Video.create({
        title,
        description: description || '',
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filePath: req.file.path,
        status: 'uploaded',
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        category: category || 'Uncategorized',
        owner: req.user._id,
        organization: req.user.organization,
      });

      // Start async processing pipeline
      processVideo(video._id.toString(), req.io).catch((err) =>
        console.error('Processing pipeline error:', err)
      );

      res.status(201).json({
        message: 'Video uploaded successfully. Processing started.',
        video: {
          id: video._id,
          title: video.title,
          status: video.status,
          filename: video.filename,
        },
      });
    } catch (err) {
      // Clean up on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Upload error:', err);
      res.status(500).json({ message: err.message || 'Upload failed' });
    }
  }
);

// GET /api/videos - List videos with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      classification,
      category,
      search,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query - multi-tenant: users see only their org's videos
    const query = {};

    if (req.user.role === 'admin') {
      // Admins see all videos
    } else {
      // Others see only their own videos
      query.owner = req.user._id;
    }

    if (status) query.status = status;
    if (classification) query['sensitivityResult.classification'] = classification;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('owner', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Video.countDocuments(query),
    ]);

    res.json({
      videos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
});

// GET /api/videos/:id - Get single video
router.get('/:id', authenticate, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('owner', 'username email');

    if (!video) return res.status(404).json({ message: 'Video not found' });

    // Access control: owner or admin
    if (req.user.role !== 'admin' && video.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ video });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch video' });
  }
});

// PATCH /api/videos/:id - Update video metadata (editor/admin)
router.patch('/:id', authenticate, authorize('editor', 'admin'), async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (req.user.role !== 'admin' && video.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, tags, category, isPublic } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    if (category !== undefined) updates.category = category;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const updated = await Video.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ message: 'Video updated', video: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update video' });
  }
});

// DELETE /api/videos/:id - Delete video (editor/admin)
router.delete('/:id', authenticate, authorize('editor', 'admin'), async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (req.user.role !== 'admin' && video.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete file from disk
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }
    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      fs.unlinkSync(video.thumbnailPath);
    }

    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete video' });
  }
});

// GET /api/videos/:id/stream - Stream video with HTTP range requests
router.get('/:id/stream', authenticate, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    // Access control
    if (req.user.role !== 'admin' && video.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (video.status !== 'completed') {
      return res.status(400).json({ message: 'Video is not ready for streaming' });
    }

    if (!fs.existsSync(video.filePath)) {
      return res.status(404).json({ message: 'Video file not found' });
    }

    const stat = fs.statSync(video.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header: "bytes=start-end"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(video.filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimetype,
      });

      fileStream.pipe(res);
    } else {
      // No range: send full file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimetype,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(video.filePath).pipe(res);
    }
  } catch (err) {
    console.error('Streaming error:', err);
    res.status(500).json({ message: 'Streaming failed' });
  }
});

// GET /api/videos/:id/thumbnail - Serve thumbnail
router.get('/:id/thumbnail', authenticate, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (req.user.role !== 'admin' && video.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!video.thumbnailPath || !fs.existsSync(video.thumbnailPath)) {
      return res.status(404).json({ message: 'Thumbnail not available' });
    }

    res.sendFile(video.thumbnailPath);
  } catch (err) {
    res.status(500).json({ message: 'Failed to serve thumbnail' });
  }
});

// POST /api/videos/:id/reprocess - Reprocess a failed video (admin only)
router.post('/:id/reprocess', authenticate, authorize('admin'), async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    await Video.findByIdAndUpdate(req.params.id, {
      status: 'uploaded',
      processingProgress: 0,
      'sensitivityResult.classification': 'pending',
    });

    processVideo(req.params.id, req.io).catch(console.error);

    res.json({ message: 'Reprocessing started' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to start reprocessing' });
  }
});

module.exports = router;
