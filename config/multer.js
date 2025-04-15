const multer = require("multer");
const path = require("path");

// Storage settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "profilePhoto") {
      cb(null, "public/uploads/profilePhoto/");
    } else if (file.fieldname === "resume") {
      cb(null, "public/uploads/resume/");
    }
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

// File filter (optional)
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "profilePhoto") {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Only images allowed"), false);
  } else if (file.fieldname === "resume") {
    if (!file.mimetype.includes("pdf"))
      return cb(new Error("Only PDFs allowed"), false);
  }
  cb(null, true);
};

module.exports = multer({ storage, fileFilter });
