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

// The browser-supplied MIME type can be anything; check the file's real signature.
function looksLikeImage(buf) {
  if (!buf || buf.length < 4) return false;
  const hex = buf.subarray(0, 12).toString('hex');
  return (
    hex.startsWith('ffd8ff') || // JPEG
    hex.startsWith('89504e470d0a1a0a') || // PNG
    hex.startsWith('474946383761') || hex.startsWith('474946383961') || // GIF87a / GIF89a
    (hex.startsWith('52494646') && buf.length >= 12 && buf.subarray(8, 12).toString('ascii') === 'WEBP') // RIFF....WEBP
  );
}

function assertImages(files) {
  for (const f of files) {
    if (!looksLikeImage(f.buffer)) throw new AppError('One of the files is not a valid image', 400);
  }
}

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
    assertImages(req.files);

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
    assertImages([req.file]);

    const result = await uploadToCloudinary(req.file.buffer, `pgdrisya/avatars`);
    res.json({ url: result.secure_url });
  })
);

module.exports = router;
module.exports.looksLikeImage = looksLikeImage;
