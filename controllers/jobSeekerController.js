const User = require("../models/user");
const jobListing = require("../models/jobListing");
const Category = require("../models/jobCategory");
const savedJobs = require('../models/savedJobs')

exports.getJobSeekerHome = (req, res, next) => {
  res.render("jobSeeker/home", {
    pageTitle: "Home | Job Seeker",
    path: "/home",
  });
};

exports.getJobCategories = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "jobSeeker") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const categories = await Category.find().select("name");
    // res.cookie("successMessage", "Job categories fetched successfully", {
    //   maxAge: 3000,
    //   httpOnly: false
    // })
    res.render("jobSeeker/jobCategories", {
      pageTitle: "Job Categories",
      path: "/jobCategories",
      categories,
      successMessage: "Job categories fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    // res.status(500).render("/500", {
    //   pageTitle: "Internal server error",
    //   path: "/500",
    //   errorMessage: "Internal server error, please try again later",
    // });
    next({ message: "Internal server error, please try again later" });
  }
};

exports.getAllJobs = async (req, res, next) => {
  try {
    const { category, locationType, experience } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (locationType) filter['jobDetail.locationType'] = locationType;
  if (experience) filter['jobDetail.experience'] = { $lte: experience };

  const jobPosts = await jobListing.find(filter);
  const categories = await Category.find();
    // const jobPosts = await jobListing.find();
    if (!jobPosts) {
      return res.status(404).render("500", {
        pageTitle: "No Jobs Found",
        path: "/500",
        errorMessage: "No jobs found. Please try again later.",
      });
    }
    res.render("jobSeeker/allJobs", {
      pageTitle: "All Jobs",
      path: "/allJobs",
      jobPosts,
      categories,
      selectedCategory: category || '',
    selectedLocationType: locationType || '',
    selectedExperience: experience || '',
      // successMessage: "All jobs fetched successfully",
    });
  } catch (error) {
    console.log(error);
    // res.status(500).render("500", {
    //   pageTitle: "Internal Server Error",
    //   path: "/500",
    //   errorMessage: "Internal server error. Please try again later.",
    // });
    next({ message: "Internal server error, please try again later" });
  }
};

exports.postSaveJobPost = async (req, res, next) => {
  const jobPostId = req.body.jobPostId;
  const jobPost = await jobListing.findById(jobPostId);
  const jobPosts = await jobListing.find();
  if (!jobPost) {
    return res.status(404).render("jobSeeker/allJobs", {
      pageTitle: "All jobs",
      path: "/allJobs",
      errorMessage: "Job post not found.",
    });
  }

  const alreadySaved = await savedJobs.findOne({
    "user.userId": user._id,
    "jobDetail.jobId": jobId,
  });

  let user = {
    userId: req.user._id,
    name: req.user.firstName + ' ' + req.user.lastName,
  }  
  let jobDetail = {
    jobId: jobPost._id,
    jobTitle: jobPost.jobDetail.jobTitle,
    company: jobPost.company
  }

  const newSavedJob = new savedJobs({
    user,
    jobDetail
  })

  await newSavedJob.save()
  res.cookie('successMessage', "Job saved successfully", {
    maxAge: 3000,
    httpOnly: false,
  })
  res.redirect('/jobSeeker/allJobs')
  // res.render('jobSeeker/allJobs', {
  //   pageTitle: "All Jobs",
  //   path: '/allJObs',
  //   jobPosts,
  //   errors: {},
  //   successMessage: "Job saved successfully."
  // })
};

exports.getJobDetails = async (req, res, next) => {
  const jobPostId = req.params.jobPostId;
  const jobPost = await jobListing.findById(jobPostId);
  if (!jobPost) {
    res.render('/jobSeeker/allJobs', {
      pageTitle: "All jobs",
      path: "/allJobs",
      errorMessage: "Job post not found.",
      jobPosts: await jobListing.find()
    })
  }
  // console.log("jobPost",jobPost)
  res.render('jobSeeker/jobDetail', {
    pageTitle: jobPost.jobDetail.jobTitle,
    jobPost,
    path: '/allJobs',
    errors: {}
  })
}