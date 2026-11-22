const multer = require("multer");

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
    files: 5                    // Maximum 5 images
  },

  fileFilter(req, file, callback) {
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG and WEBP images are allowed.")
      );
    }

    callback(null, true);
  }
});

// Multiple images for one product
const uploadProductImages = upload.array("images", 5);

module.exports = {
  upload,
  uploadProductImages
};