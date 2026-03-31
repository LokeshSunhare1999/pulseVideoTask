const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');

/**
 * Simulated sensitivity analysis
 * In production, integrate with a real content moderation API
 * (e.g., AWS Rekognition, Google Video Intelligence, Azure Content Moderator)
 */
const analyzeSensitivity = (metadata) => {
  // Simulate analysis based on video properties
  // Real implementation would sample frames and run ML inference
  const random = Math.random();

  // ~20% chance of being flagged for demo purposes
  if (random < 0.2) {
    return {
      classification: 'flagged',
      score: 0.6 + Math.random() * 0.4,
      reasons: ['Simulated: Potentially sensitive content detected', 'Manual review recommended'],
    };
  }

  return {
    classification: 'safe',
    score: Math.random() * 0.3,
    reasons: [],
  };
};

/**
 * Extract video metadata using ffprobe
 */
const extractMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        // If ffprobe not available, return defaults
        console.warn('ffprobe not available, using default metadata:', err.message);
        return resolve({ duration: 0, width: 0, height: 0 });
      }

      const videoStream = metadata.streams?.find((s) => s.codec_type === 'video');
      resolve({
        duration: metadata.format?.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
      });
    });
  });
};

/**
 * Generate thumbnail from video
 */
const generateThumbnail = (filePath, outputDir, filename) => {
  return new Promise((resolve) => {
    const thumbName = `thumb_${filename}.jpg`;
    const thumbPath = path.join(outputDir, thumbName);

    ffmpeg(filePath)
      .screenshots({
        count: 1,
        folder: outputDir,
        filename: thumbName,
        timemarks: ['10%'],
      })
      .on('end', () => resolve(thumbPath))
      .on('error', (err) => {
        console.warn('Thumbnail generation failed:', err.message);
        resolve(null);
      });
  });
};

/**
 * Main video processing pipeline
 * Emits real-time progress via Socket.io
 */
const processVideo = async (videoId, io) => {
  const emitProgress = (progress, stage) => {
    io.emit(`video:progress:${videoId}`, { videoId, progress, stage });
    io.emit('video:progress', { videoId, progress, stage });
  };

  try {
    // Stage 1: Start processing
    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 0,
    });
    emitProgress(0, 'Starting processing...');

    const video = await Video.findById(videoId);
    if (!video) throw new Error('Video not found');

    // Stage 2: Validate file
    await sleep(500);
    emitProgress(10, 'Validating file...');

    if (!fs.existsSync(video.filePath)) {
      throw new Error('Video file not found on disk');
    }

    // Stage 3: Extract metadata
    await sleep(500);
    emitProgress(25, 'Extracting metadata...');

    const metadata = await extractMetadata(video.filePath);

    await Video.findByIdAndUpdate(videoId, {
      duration: Math.round(metadata.duration),
      resolution: { width: metadata.width, height: metadata.height },
      processingProgress: 35,
    });
    emitProgress(35, 'Metadata extracted');

    // Stage 4: Generate thumbnail
    await sleep(800);
    emitProgress(50, 'Generating thumbnail...');

    const outputDir = path.dirname(video.filePath);
    const thumbPath = await generateThumbnail(video.filePath, outputDir, video.filename);

    await Video.findByIdAndUpdate(videoId, {
      thumbnailPath: thumbPath,
      processingProgress: 60,
    });
    emitProgress(60, 'Thumbnail generated');

    // Stage 5: Sensitivity analysis
    await sleep(1000);
    emitProgress(75, 'Running sensitivity analysis...');

    const sensitivityResult = analyzeSensitivity(metadata);

    await Video.findByIdAndUpdate(videoId, {
      'sensitivityResult.classification': sensitivityResult.classification,
      'sensitivityResult.score': sensitivityResult.score,
      'sensitivityResult.reasons': sensitivityResult.reasons,
      'sensitivityResult.analyzedAt': new Date(),
      processingProgress: 90,
    });
    emitProgress(90, `Sensitivity analysis complete: ${sensitivityResult.classification}`);

    // Stage 6: Finalize
    await sleep(500);
    emitProgress(100, 'Processing complete');

    const finalVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        status: 'completed',
        processingProgress: 100,
      },
      { new: true }
    ).populate('owner', 'username email');

    // Emit completion event
    io.emit(`video:completed:${videoId}`, { videoId, video: finalVideo });
    io.emit('video:completed', { videoId, video: finalVideo });

    return finalVideo;
  } catch (err) {
    console.error('Video processing error:', err);

    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      processingProgress: 0,
    });

    io.emit(`video:failed:${videoId}`, { videoId, error: err.message });
    io.emit('video:failed', { videoId, error: err.message });

    throw err;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { processVideo, extractMetadata };
