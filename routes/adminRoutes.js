const express = require("express");

const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/home", adminController.getAdminHome);

router.get("/users", adminController.getUsers);

router.get("/jobCategories", adminController.getJobCategories);

router.get("/addCategory", adminController.getAddCategory);

router.post("/addCategory", adminController.postAddCategory);

router.get("/editCategory/:categoryId", adminController.getEditCategory);

router.post("/editCategory/:categoryId", adminController.postEditCategory);

router.post("/deleteCategory", adminController.deleteCategory);

router.post("/deactivate", adminController.deactivateUser);

router.post("/activate", adminController.activateUser);

router.post("/delete", adminController.deleteUser);

module.exports = router;
