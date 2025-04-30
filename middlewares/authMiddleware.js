const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Admin = require("../models/admin");

exports.verifyToken = async (req, res, next) => {
  const token = req.cookies.token; // extract token from cookies

  if (!token) {
    return res.redirect("/auth/login");
  }

  try {
    // decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("decoded", decoded);
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

    // attatch user in req
    req.user = user;
    // console.log("req.user", req.user)
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.clearCookie("token");
    return res.redirect("/auth/login");
  }
};

// verify admin role
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).render("500", {
    pageTitle: "Forbidden",
    path: "/500",
    errorMessage: "Access denied! Only admin can access this page.",
  });
};

// verify jobSeeker role
exports.isJobSeeker = (req, res, next) => {
  if (req.user && req.user.role === "jobSeeker") return next();
  return res.status(403).render("500", {
    pageTitle: "Forbidden",
    path: "/500",
    errorMessage: "Access denied! Only job seeker can access this page.",
  });
};

// verify recruiter role
exports.isRecruiter = (req, res, next) => {
  if (req.user && req.user.role === "recruiter") return next();
  return res.status(403).render("500", {
    pageTitle: "Forbidden",
    path: "/500",
    errorMessage: "Access denied! Only recruiters can access this page.",
  });
};
