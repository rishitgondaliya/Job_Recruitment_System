const express = require("express");

const jobSeekerController = require('../controllers/jobSeekerController')

const router = express.Router();

router.get("/home", jobSeekerController.getJobSeekerHome);

router.get('/jobCategories', jobSeekerController.getJobCategories)

router.get('/allJobs', jobSeekerController.getAllJobs)

router.post('/saveJobPost', jobSeekerController.postSaveJobPost)

router.get('/allJobs/:jobPostId', jobSeekerController.getJobDetails)

module.exports = router;
