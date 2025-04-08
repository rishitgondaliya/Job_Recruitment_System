const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyToken = async (req, res, next) => {
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

module.exports = verifyToken;
