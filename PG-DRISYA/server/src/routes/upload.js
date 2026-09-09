const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Only allow real image MIME types
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed'));
  },
});

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// POST /api/upload — upload one or more images
router.post('/', auth, upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const folder = `pgdrisya/${req.user.role}/${req.user._id}`;
    const results = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, folder))
    );

    const urls = results.map((r) => r.secure_url);
    res.json({ urls });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/avatar — upload avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image provided' });

    const result = await uploadToCloudinary(req.file.buffer, `pgdrisya/avatars`);
    res.json({ url: result.secure_url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
