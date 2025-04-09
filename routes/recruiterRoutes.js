const express = require("express");

const isAuthenticated = require("../middlewares/authMiddleware");
const recruiterController = require("../controllers/recruiterController");

const router = express.Router();

router.get("/home", isAuthenticated, (req, res, next) => {
  res.render("recruiter/home", {
    pageTitle: "Home | Recruiter",
    path: "/home",
  });
});

router.get("/addNewJob", isAuthenticated, recruiterController.getAddNewJob);

router.post("/addNewJob", isAuthenticated, recruiterController.postAddNewJob);

router.get("/jobPosts", isAuthenticated, recruiterController.getJobPosts);

router.post('/deleteJobPost', isAuthenticated, recruiterController.deleteJobPost)

router.get("/editJobPost/:jobPostId", isAuthenticated, recruiterController.getEditJobPost);

router.post("/editJobPost", isAuthenticated, recruiterController.postEditJobPost);

module.exports = router;
