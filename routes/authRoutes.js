const express = require("express");

const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/register", authController.getRegister);

router.post("/register", authController.postRegister);

router.get("/login", authController.getLogin);

router.get('/admin/login', authController.getAdminLogin)

router.post("/login", authController.postLogin);

router.post('/admin/login', authController.adminLogin)

router.post("/logout", verifyToken, authController.logout);

router.get('/forgotPassword', authController.getForgotPassword)

router.post('/forgotPassword', authController.postForgotPassword)

router.get('/resetPassword/:resetToken', authController.createNewPassword)

router.post('/newPassword', authController.postNewPassword)

module.exports = router;
