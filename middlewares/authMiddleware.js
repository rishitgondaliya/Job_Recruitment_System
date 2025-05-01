const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Admin = require("../models/admin");

// Verify token
exports.verifyToken = async (req, res, next) => {
  const token = req.cookies.token; // Extract token from cookies

  if (!token) {
    return res.redirect("/auth/login");
  }

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user or admin based on the decoded role
    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id).select("-password -adminSecret");
      if (!user) {
        res.clearCookie("token");
        return res.redirect("/auth/admin/login");
      }
    } else {
      user = await User.findById(decoded.id).select("-password");
      if (!user || !user.isActive) {
        res.clearCookie("token");
        return res.redirect("/auth/login");
      }
    }

    // Attach user to the request object
    req.user = user;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
};

// General function to verify role
exports.verifyRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    return res.status(403).render("500", {
      pageTitle: "Forbidden",
      path: "/500",
      errorMessage: `Access denied! Only ${role}s can access this page.`,
    });
  };
};

// Verify admin role
exports.isAdmin = exports.verifyRole("admin");

// Verify jobSeeker role
exports.isJobSeeker = exports.verifyRole("jobSeeker");

// Verify recruiter role
exports.isRecruiter = exports.verifyRole("recruiter");
