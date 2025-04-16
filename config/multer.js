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
    const uniqueName = `${file.fieldname}-${req.user.firstName.toLowerCase()}-${Date.now()}${ext}`
    cb(null, uniqueName);
  },
});

// File filter
const allowedFileTypes = [
  "application/pdf",
  // "application/msword", //.doc
  // "application/vnd.openxmlformats-officedocument.wordprocessingml.document" //.docx,
];
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "profilePhoto") {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Only images allowed"), false);
  } else if (file.fieldname === "resume") {
    if (!allowedFileTypes.includes(file.mimetype))
      return cb(new Error("Only PDFs are allowed"), false);
  }
  cb(null, true);
};

module.exports = multer({ storage, fileFilter });
