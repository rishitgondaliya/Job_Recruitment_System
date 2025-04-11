const express = require("express");

const recruiterController = require("../controllers/recruiterController");

const router = express.Router();

router.get("/home", recruiterController.getRecruiterHome);

router.get("/addNewJob", recruiterController.getAddNewJob);

router.post("/addNewJob", recruiterController.postAddNewJob);

router.get("/jobPosts", recruiterController.getJobPosts);

router.post("/deleteJobPost", recruiterController.deleteJobPost);

router.get("/editJobPost/:jobPostId", recruiterController.getEditJobPost);

router.post("/editJobPost", recruiterController.postEditJobPost);

module.exports = router;
