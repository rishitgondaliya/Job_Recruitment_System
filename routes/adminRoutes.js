const express = require("express");

const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/home", adminController.getAdminHome);

router.get("/jobSeekers", adminController.getJobSeekers);

router.get("/recruiters", adminController.getRecruiters);

router.get("/jobCategories", adminController.getJobCategories);

router.get("/addCategory", adminController.getAddCategory);

router.post("/addCategory", adminController.postAddCategory);

router.get("/editCategory/:categoryId", adminController.getEditCategory);

router.post("/editCategory/:categoryId", adminController.postEditCategory);

router.post("/deleteCategory", adminController.deleteCategory);

router.post("/deactivate/:role", adminController.deactivateUser);

router.post("/activate/:role", adminController.activateUser);

router.post("/delete/:role", adminController.deleteUser);

router.get("/viewUserProfile/:userId", adminController.viewUserProfile)

module.exports = router;
