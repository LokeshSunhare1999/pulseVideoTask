const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    resolution: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    // Processing pipeline status
    status: {
      type: String,
      enum: ['uploading', 'uploaded', 'processing', 'completed', 'failed'],
      default: 'uploaded',
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Sensitivity analysis result
    sensitivityResult: {
      classification: {
        type: String,
        enum: ['safe', 'flagged', 'pending'],
        default: 'pending',
      },
      score: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      reasons: [{ type: String }],
      analyzedAt: { type: Date },
    },
    // Tags / categories
    tags: [{ type: String, trim: true }],
    category: {
      type: String,
      trim: true,
      default: 'Uncategorized',
    },
    // Multi-tenant: owner and organization
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: String,
      required: true,
    },
    // Streaming path
    filePath: {
      type: String,
      required: true,
    },
    thumbnailPath: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for filtering
videoSchema.index({ owner: 1, status: 1 });
videoSchema.index({ organization: 1 });
videoSchema.index({ 'sensitivityResult.classification': 1 });

module.exports = mongoose.model('Video', videoSchema);
