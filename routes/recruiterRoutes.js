const express = require("express");

const recruiterController = require("../controllers/recruiterController");
const upload = require('../config/multer')

const router = express.Router();

router.get("/home", recruiterController.getRecruiterHome);

router.get('/addNewJob', recruiterController.getAddNewJob)

router.post("/addNewJob", recruiterController.postAddNewJob);

router.get("/jobPosts", recruiterController.getJobPosts);

router.post("/deleteJobPost", recruiterController.deleteJobPost);

router.get("/editJobPost/:jobPostId", recruiterController.getEditJobPost);

router.post("/editJobPost", recruiterController.postEditJobPost);

router.get("/profile", recruiterController.getRecruiterProfile);

router.get("/editProfile", recruiterController.getEditProfile);

router.post(
  "/editProfile",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    // { name: "resume", maxCount: 1 },
  ]),
  recruiterController.postEditProfile
);

router.get('/viewJobSeekers', recruiterController.viewJobSeekers)

router.get('/viewApplications', recruiterController.viewApplications)

router.get('/viewInterviews', recruiterController.viewInterviews)

router.get('/shortlist/:applicationId', recruiterController.getShortlistUser)

router.post('/shortlist/:applicationId', recruiterController.postShortlistUser)

router.get('/select/:applicationId', recruiterController.getResultForm)

router.post('/select/:applicationId', recruiterController.postInterviewResult)

module.exports = router;
