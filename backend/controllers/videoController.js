const User = require('../models/user');
const { cloudinary } = require('../config/cloudinary');

// Upload a demo video
exports.uploadDemoVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const { path, filename } = req.file;
    // If using CloudinaryStorage, 'path' is the secure_url and 'filename' is the public_id
    
    const newVideo = {
      url: path,
      publicId: filename,
      title: req.body.title || 'Untitled Video',
      uploadedAt: new Date()
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { demoVideos: newVideo } },
      { new: true }
    ).select('demoVideos');

    res.status(201).json(newVideo);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

// Get all demo videos for the current user
exports.getDemoVideos = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('demoVideos');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json(user.demoVideos);
  } catch (err) {
    console.error('Get videos error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a demo video
exports.deleteDemoVideo = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // 1. Remove from Cloudinary
    // Note: resource_type: 'video' is required for deleting videos
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });

    // 2. Remove from DB
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { demoVideos: { publicId: publicId } } },
      { new: true }
    ).select('demoVideos');

    res.json({ message: 'Video deleted', videos: user.demoVideos });
  } catch (err) {
    console.error('Delete video error:', err);
    res.status(500).json({ message: 'Server error during deletion' });
  }
};
