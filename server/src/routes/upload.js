const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { auth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const router = express.Router();
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, WEBP, or GIF images are allowed', 400));
    }
    cb(null, true);
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
router.post(
  '/',
  auth,
  uploadLimiter,
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No images provided', 400);
    }

    const folder = `pgdrisya/${req.user.role}/${req.user._id}`;
    const results = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, folder))
    );

    const urls = results.map((r) => r.secure_url);
    res.json({ urls });
  })
);

// POST /api/upload/avatar — upload avatar
router.post(
  '/avatar',
  auth,
  uploadLimiter,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No image provided', 400);

    const result = await uploadToCloudinary(req.file.buffer, `pgdrisya/avatars`);
    res.json({ url: result.secure_url });
  })
);

module.exports = router;
