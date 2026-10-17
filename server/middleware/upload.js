const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hyperlocal_artisans',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  },
});

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.includes(file.mimetype)) {
      const error = new Error('Only JPG, PNG, and WebP images are allowed');
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

module.exports = upload;

