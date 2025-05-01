const multer = require("multer");
const path = require("path");

// Allowed MIME types for file validation
const allowedFileTypes = {
  resume: ["application/pdf"],
  profilePhoto: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
};

// Storage configuration for multer
const storage = multer.diskStorage({
  // Define the upload destination based on the file's fieldname
  destination: function (req, file, cb) {
    // Handle the destination paths for profilePhoto and resume fields
    if (file.fieldname === "profilePhoto") {
      cb(null, "public/uploads/profilePhoto/"); // Profile photo folder
    } else if (file.fieldname === "resume") {
      cb(null, "public/uploads/resume/"); // Resume folder
    } else {
      // If the fieldname doesn't match any known field, reject the file
      cb(new Error("Invalid file field name."), false);
    }
  },
  
  // Define the filename for the uploaded file
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // Get file extension
    const uniqueName = `${file.fieldname}-${req.user.firstName.toLowerCase()}-${Date.now()}${ext}`; // Generate unique file name
    cb(null, uniqueName); // Use unique name for the file
  },
});

// File filter to validate the file type for each field
const fileFilter = (req, file, cb) => {
  if (!req.fileValidationError) {
    req.fileValidationError = {}; // Initialize fileValidationError object if it doesn't exist
  }

  // Handle profile photo validation
  if (file.fieldname === "profilePhoto") {
    if (!allowedFileTypes.profilePhoto.includes(file.mimetype)) {
      req.fileValidationError.profilePhoto =
        "Only image files (JPEG, PNG, JPEG, WEBP) are allowed for profile photo.";
      return cb(null, false); // Reject the file
    }
    return cb(null, true); // Accept the file
  }

  // Handle resume validation
  if (file.fieldname === "resume") {
    if (!allowedFileTypes.resume.includes(file.mimetype)) {
      req.fileValidationError.resume = "Only PDF files are allowed for resumes.";
      return cb(null, false); // Reject the file
    }
    return cb(null, true); // Accept the file
  }

  // Reject file if it does not match any allowed field
  return cb(new Error("Invalid file fieldname"), false);
};

// Multer middleware setup with storage and file filter
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // file size limit
});
