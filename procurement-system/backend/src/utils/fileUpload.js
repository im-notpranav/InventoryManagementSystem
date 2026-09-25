const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
  
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Only .pdf, .jpg, .jpeg, .png files are allowed'), false);
  }

  if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
    console.warn(`[UPLOAD] File received — production should scan: ${file.originalname}`);
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
