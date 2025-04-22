const express = require("express");

const jobSeekerController = require("../controllers/jobSeekerController");
const upload = require("../config/multer");

const router = express.Router();

router.get("/home", jobSeekerController.getJobSeekerHome);

router.get("/jobCategories", jobSeekerController.getJobCategories);

router.get("/allJobs", jobSeekerController.getAllJobs);

router.post("/saveJobPost", jobSeekerController.postSaveJobPost);

router.get("/allJobs/:jobPostId", jobSeekerController.getJobDetails);

router.get("/profile", jobSeekerController.getJobSeekerProfile);

router.get("/editProfile", jobSeekerController.getEditProfile);

router.post(
  "/editProfile",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  jobSeekerController.postEditProfile
);

router.get(
  "/profile/savedJobs/:savedJobId",
  jobSeekerController.viewSavedJobDetail
);

router.post("/profile/savedJobs/:savedJobId", jobSeekerController.unSaveJob);

router.get("/applyForjob/:jobPostId", jobSeekerController.getApplicationForm);

router.post(
  "/applyForJob/:jobPostId",
  upload.fields([{ name: "resume", maxCount: 1 }]),
  jobSeekerController.applyForJob
);

router.post('/withdraw/:applicationId', jobSeekerController.withdrawApplication)

router.get('/reviewJob/:jobId', jobSeekerController.getReviewForm)

router.post('/reviewJob/:jobId', jobSeekerController.postJobReview)

module.exports = router;
