const express = require("express");

const adminController = require("../controllers/adminController");
const isAuthenticated = require('../middlewares/authMiddleware')

const router = express.Router();

router.get("/home", isAuthenticated, adminController.getAdminHome);

router.get("/users", isAuthenticated, adminController.getUsers);

router.get("/jobCategories", isAuthenticated, adminController.getJobCategories);

router.get("/addCategory", isAuthenticated, adminController.getAddCategory);

router.post("/addCategory", isAuthenticated, adminController.postAddCategory);

router.get("/editCategory/:categoryId", isAuthenticated, adminController.getEditCategory);

router.post("/editCategory/:categoryId", isAuthenticated, adminController.postEditCategory);

router.post('/deleteCategory', isAuthenticated, adminController.deleteCategory)

router.post('/deactivate', isAuthenticated, adminController.deactivateUser)

router.post('/activate', isAuthenticated, adminController.activateUser)

router.post('/delete', isAuthenticated, adminController.deleteUser)

module.exports = router