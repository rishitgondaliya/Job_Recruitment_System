const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.verifyToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect("/auth/login");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.redirect("/auth/login");
    }
    
    req.user = user;
    // console.log("req.user", req.user)
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).render("500", {
    pageTitle: "Forbidden",
    path: "/500",
    errorMessage: "Access denied! Only admin can access this page.",
  });
};

exports.isJobSeeker = (req, res, next) => {
  if (req.user && req.user.role === 'jobSeeker') return next();
  return res.status(403).render("500", {
    pageTitle: "Forbidden",
    path: "/500",
    errorMessage: "Access denied! Only job seeker can access this page.",
  });
};

exports.isRecruiter = (req, res, next) => {
  if (req.user && req.user.role === 'recruiter') return next();
  return res.status(403).render("500", {
    pageTitle: "Forbidden",
    path: "/500",
    errorMessage: "Access denied! Only recruiters can access this page.",
  });
};

// exports.isLoggedIn = (req, res, next) => {
//   if (req.user) return next();
// }