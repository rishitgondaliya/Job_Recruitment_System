const express = require("express");

const isAuthenticated = require('../middlewares/authMiddleware')
const recruiterController = require('../controllers/recruiterController')

const router = express.Router();

router.get("/home", isAuthenticated, (req, res, next) => {
  res.render("recruiter/home", { pageTitle: "Home | Recruiter" });
});

router.get('/jobListing', isAuthenticated, recruiterController.getJobListing)

router.post('/addJobListing', isAuthenticated, recruiterController.postAddJobListing)

module.exports = router;
