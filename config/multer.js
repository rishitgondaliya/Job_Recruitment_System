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
    const uniqueName = `${
      file.fieldname
    }-${req.user.firstName.toLowerCase()}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
const allowedFileTypes = {
  resume: ["application/pdf"],
  profilePhoto: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
};

const fileFilter = (req, file, cb) => {
  if (!req.fileValidationError) {
    req.fileValidationError = {};
  }

  if (file.fieldname === "profilePhoto") {
    if (!allowedFileTypes.profilePhoto.includes(file.mimetype)) {
      req.fileValidationError.profilePhoto =
        "Only image files (JPEG, PNG, JPEG, WEBP) are allowed for profile photos.";
      return cb(null, false);
    }
    return cb(null, true);
  }

  // For resumes, check if it's a PDF
  if (file.fieldname === "resume") {
    if (!allowedFileTypes.resume.includes(file.mimetype)) {
      req.fileValidationError.resume =
        "Only PDF files are allowed for resumes.";
      return cb(null, false);
    }
    return cb(null, true);
  }
};

module.exports = multer({ storage, fileFilter });
