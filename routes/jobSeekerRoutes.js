const express = require("express");

const isAuthenticated = require("../middlewares/authMiddleware");
const jobSeekerController = require('../controllers/jobSeekerController')

const router = express.Router();

router.get("/home", isAuthenticated, jobSeekerController.getJobSeekerHome);

router.get('/jobCategories', isAuthenticated, jobSeekerController.getJobCategories)

router.get('/allJobs', isAuthenticated, jobSeekerController.getAllJobs)

router.post('/saveJobPost', isAuthenticated, jobSeekerController.postSaveJobPost)

router.get('/allJobs/:jobPostId', isAuthenticated, jobSeekerController.getJobDetails)

module.exports = router;
