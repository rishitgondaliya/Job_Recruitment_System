const jwt = require("jsonwebtoken");

const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    // console.log(token)
    return res.status(401).json({ message: "Unauthorized ! Access denied" });
  }

  try {
    // console.log(token)
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticateJWT;
