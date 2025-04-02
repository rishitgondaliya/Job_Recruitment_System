const express = require("express");

const authController = require("../controllers/authController");
const authenticateJWT = require("../middlewares/authMiddleware");
const User = require('../models/user')

const router = express.Router();

router.get("/register", authController.getRegister);

router.post("/register", authController.postRegister);

router.get("/login", authController.getLogin);

router.post("/login", authController.postLogin);

router.get("/profile", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', authController.logout)

module.exports = router;
