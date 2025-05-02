const path = require("path");
const fs = require("fs");

const jobListing = require("../models/jobListing");
const Category = require("../models/jobCategory");
const savedJobs = require("../models/savedJobs");
const Profile = require("../models/profile");
const Application = require("../models/application");
const Interview = require("../models/interview");
const Review = require("../models/review");

exports.getJobSeekerHome = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;

  try {
    const totalFeaturedJobs = await jobListing.countDocuments({
      "jobDetail.isFeatured.status": "Yes",
      "jobDetail.isFeatured.endDate": { $gte: new Date() },
    });

    const featuredJobs = await jobListing
      .find({
        "jobDetail.isFeatured.status": "Yes",
        "jobDetail.isFeatured.endDate": { $gte: new Date() },
      })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalFeaturedJobs / limit);

    res.render("jobSeeker/home", {
      pageTitle: "Home | Job Seeker",
      path: "/home",
      featuredJobs: featuredJobs,
      currentPage: page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.log("error",error);
    next(error);
  }
};

exports.getJobCategories = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;

  try {
    const totalCategories = await Category.countDocuments();

    const categories = await Category.find()
      .select("name")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCategories / limit);

    res.render("jobSeeker/jobCategories", {
      pageTitle: "Job Categories",
      path: "/jobCategories",
      categories,
      currentPage: page,
      limit,
      totalPages,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    next({ message: "Internal server error. Please try again later." });
  }
};

exports.getAllJobs = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  try {
    const { category, locationType, experience, salary, search } = req.query;

    // apply filters
    const filter = {};
    if (category) filter.category = category;
    if (locationType) filter["jobDetail.locationType"] = locationType;
    if (experience) filter["jobDetail.experience"] = { $lte: experience };
    if (salary) filter["jobDetail.salary"] = { $gte: Number(salary) };

    // if user search from search bar
    if (search) {
      filter.$or = [
        { "jobDetail.jobTitle": { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    // check if user having any saved jobs
    const savedJobsId = await savedJobs
      .find({ "user.userId": req.user._id })
      .select("jobDetail.jobId");

    const totalJobs = await jobListing.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limit);

    const jobPosts = await jobListing
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const categories = await Category.find();

    res.render("jobSeeker/allJobs", {
      pageTitle: "All Jobs",
      path: "/allJobs",
      jobPosts,
      categories,
      savedJobsId,
      currentPage: page,
      limit,
      totalPages,
      selectedCategory: category || "",
      selectedLocationType: locationType || "",
      selectedExperience: experience || "",
      selectedSalary: salary || "",
      searchQuery: search || "",
      errorMessage:
        jobPosts.length === 0
          ? "No jobs found matching your search criteria."
          : null,
    });
  } catch (error) {
    console.log(error);
    next({ message: "Internal server error, please try again later" });
  }
};

exports.postSaveJobPost = async (req, res, next) => {
  try {
    const jobPostId = req.body.jobPostId;
    const jobPost = await jobListing.findById(jobPostId);
    const categories = await Category.find().select("name");

    if (!jobPost) {
      return res.status(404).render("jobSeeker/allJobs", {
        pageTitle: "All jobs",
        path: "/allJobs",
        categories,
        selectedCategory: "",
        selectedLocationType: "",
        selectedExperience: "",
        selectedSalary: "",
        errorMessage: "Job post not found.",
      });
    }

    // check if already saved
    const alreadySaved = await savedJobs.findOne({
      "user.userId": req.user._id,
      "jobDetail.jobId": jobPostId,
    });

    if (alreadySaved) {
      res.cookie("errorMessage", "You have already saved this job post.", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/jobSeeker/allJobs"); //
    }

    // create user detail object
    const user = {
      userId: req.user._id,
      name: req.user.firstName + " " + req.user.lastName,
    };

    // job detail
    const jobDetail = {
      jobId: jobPost._id,
      jobTitle: jobPost.jobDetail.jobTitle,
      company: jobPost.company,
    };

    // save savedJob to database
    const newSavedJob = new savedJobs({
      user,
      jobDetail,
    });

    await newSavedJob.save();

    res.cookie("successMessage", "Job saved successfully", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/jobSeeker/allJobs");
  } catch (error) {
    console.error("Error saving job:", error);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.getJobDetails = async (req, res, next) => {
  try {
    const jobPostId = req.params.jobPostId;
    // find jobpost
    const jobPost = await jobListing.findById(jobPostId);

    const savedJob = await savedJobs.findOne({
      "user.userId": req.user._id,
      "jobDetail.jobId": jobPostId,
    });

    const allJobs = await jobListing.find({}, "_id").sort({ createdAt: -1 });
    const jobIndex = allJobs.findIndex((j) => j._id.toString() === jobPostId);
    const prevJobId = jobIndex > 0 ? allJobs[jobIndex - 1]._id : null;
    const nextJobId =
      jobIndex < allJobs.length - 1 ? allJobs[jobIndex + 1]._id : null;

    if (!jobPost) {
      return res.render("/jobSeeker/allJobs", {
        pageTitle: "All jobs",
        path: "/allJobs",
        errorMessage: "Job post not found.",
        jobPosts: await jobListing.find(),
      });
    }

    // display jobDetails
    res.render("jobSeeker/jobDetail", {
      pageTitle: jobPost.jobDetail.jobTitle,
      path: "/allJobs",
      jobPost,
      savedJob,
      prevJobId,
      nextJobId,
      errors: {},
    });
  } catch (error) {
    console.log(error);
    next({ message: "Internal server error. Please try again later." });
  }
};

exports.getJobSeekerProfile = async (req, res, next) => {
  try {
    const user = req.user;
    // find userProfile
    const userProfile = await Profile.findById(user.profileId);

    // find is user having savedjobs
    const savedJobsArray = await savedJobs.find({ "user.userId": user._id });

    // find any applications
    const applications = await Application.find({
      "user.userId": user._id,
    }).sort({ createdAt: -1 });

    // find any interviews scheduled
    const interviews = await Interview.find({
      "user.userId": user._id,
      status: "Scheduled",
    });

    // display profile with all data
    res.render("jobSeeker/profile", {
      pageTitle: "Profile",
      path: "/profile",
      profile: userProfile,
      user: user,
      savedJobs: savedJobsArray,
      applications,
      interviews,
    });
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.getEditProfile = async (req, res, next) => {
  const user = req.user;
  try {
    const userProfile = await Profile.findById(user.profileId);
    // console.log("userProfile",userProfile)
    res.render("jobSeeker/editProfile", {
      pageTitle: "Edit Profile",
      path: "/profile",
      user,
      profile: userProfile,
      errors: {},
      formData: {},
    });
  } catch (error) {
    console.log(error);
    next({ message: "Internal server error. Please try again later." });
  }
};

exports.postEditProfile = async (req, res, next) => {
  let errors = {};
  let profile;
  try {
    const profileId = req.user.profileId;

    // Find user profile
    profile = await Profile.findById(profileId);
    if (!profile) return next({ message: "Profile not found!" });

    // Check for file validation errors first
    if (
      req.fileValidationError &&
      Object.keys(req.fileValidationError).length > 0
    ) {
      errors = { ...req.fileValidationError };

      return res.status(422).render("jobSeeker/editProfile", {
        pageTitle: "Edit Profile",
        path: "/profile",
        user: req.user,
        profile,
        errors,
        formData: req.body,
      });
    }

    // Update About
    profile.about = req.body.about?.trim() || "";

    // Update Education
    const { startYear, passingYear } = req.body;

    if (startYear && !passingYear) {
      errors["education.passingYear"] = "Passing date is required";
    } else if (startYear && passingYear) {
      const start = new Date(startYear);
      const passing = new Date(passingYear);

      const difference = (passing - start) / (1000 * 3600 * 24);

      if (start >= new Date()) {
        errors["education.startYear"] = "Start date can not be future date.";
      }

      if (difference < 300) {
        errors["education.passingYear"] =
          "Difference between starting and passing dates must be at least 10 months.";
      }
      if (Object.keys(errors).length > 0) {
        return res.status(422).render("jobSeeker/editProfile", {
          pageTitle: "Edit Profile",
          path: "/profile",
          user: req.user,
          profile, // Passing the form data to retain input values
          errors,
          formData: req.body,
        });
      }
    }

    // Update Education
    profile.education = {
      college: req.body.college?.trim() || undefined,
      degree: req.body.degree?.trim() || undefined,
      branch: req.body.branch?.trim() || undefined,
      grade: req.body.grade || undefined,
      startYear: req.body.startYear || undefined,
      passingYear: req.body.passingYear || undefined,
    };

    // Update Experience
    let totalMonths = 0;
    if (req.body.experience) {
      // Ensure 'experience' is always treated as an array
      const expArray = Array.isArray(req.body.experience)
        ? req.body.experience
        : Object.values(req.body.experience);

      // Process the experience data and calculate total experience in months
      const filteredExp = expArray
        .map((exp, index) => {
          // Parse start and end dates
          const startDate = exp.startDate ? new Date(exp.startDate) : null;
          const endDate = exp.endDate ? new Date(exp.endDate) : new Date(); // Default to current date if no end date

          // Validate Start Date
          if (!startDate || isNaN(startDate)) {
            errors[`experience.${index}.startDate`] =
              "Start date is required and must be valid.";
          }
          // Calculate months of experience if startDate and endDate are valid
          if (startDate && endDate && startDate < endDate) {
            const years = endDate.getFullYear() - startDate.getFullYear();
            const months = endDate.getMonth() - startDate.getMonth();
            totalMonths += years * 12 + months; // Add calculated months to totalMonths
          }

          // Return the filtered and sanitized experience object
          return {
            company: exp.company?.trim() || undefined,
            position: exp.position?.trim() || undefined,
            startDate: exp.startDate || undefined,
            endDate: exp.endDate || undefined,
            description: exp.description?.trim() || undefined,
          };
        })
        .filter((exp) => {
          // Only keep the experience entries with at least one non-empty field
          return (
            exp &&
            (exp.company ||
              exp.position ||
              exp.startDate ||
              exp.endDate ||
              exp.description)
          );
        });
      if (Object.keys(errors).length > 0) {
        return res.status(422).render("jobSeeker/editProfile", {
          pageTitle: "Edit Profile",
          path: "/profile",
          user: req.user,
          profile, // Passing the form data to retain input values
          errors,
          formData: req.body,
        });
      }

      // If there are valid experience entries, update profile.experience and totalExperience
      profile.experience = filteredExp.length > 0 ? filteredExp : undefined;
      profile.totalExperience = totalMonths; // Set total experience in months
    } else {
      // If no experience provided, clear the experience and totalExperience fields
      profile.experience = undefined;
      profile.totalExperience = undefined;
    }

    // Update Skills
    if (req.body.skills) {
      profile.skills = req.body.skills
        .split(",") // Split the input string by commas
        .map((skill) => skill.trim()) // Trim each skill to remove leading/trailing spaces
        .filter((skill) => skill.length > 0); // Filter out empty strings (if any)
    }

    // Helper function to delete old files
    const deleteOldFile = (filePath) => {
      if (filePath) {
        const fullPath = path.join(__dirname, "..", "public", filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath); // Remove the old file
        }
      }
    };

    // Upload Profile Photo
    if (req.files?.profilePhoto?.length) {
      // Delete the old profile photo if it exists
      deleteOldFile(profile.profilePhoto);

      // Save the new profile photo path
      const photoPath = `/uploads/profilePhoto/${req.files.profilePhoto[0].filename}`;
      profile.profilePhoto = photoPath;
    }

    // Upload Resume
    if (req.files?.resume?.length) {
      // Delete the old resume if it exists
      deleteOldFile(profile.resume);

      // Save the new resume path
      const resumePath = `/uploads/resume/${req.files.resume[0].filename}`;
      profile.resume = resumePath;
    }

    await profile.save();

    res.cookie("successMessage", "Profile updated successfully!", {
      maxAge: 3000,
      httpOnly: false,
    });
    res.redirect("/jobSeeker/profile");
  } catch (err) {
    console.log("Error updating profile:", err);

    // Cleanup newly uploaded files if something fails
    if (req.files?.profilePhoto?.length) {
      const newPhoto = path.join(
        __dirname,
        "..",
        "public",
        "/uploads/profilePhoto/",
        req.files.profilePhoto[0].filename
      );
      if (fs.existsSync(newPhoto)) fs.unlinkSync(newPhoto);
    }

    if (req.files?.resume?.length) {
      const newResume = path.join(
        __dirname,
        "..",
        "public",
        "/uploads/resume/",
        req.files.resume[0].filename
      );
      if (fs.existsSync(newResume)) fs.unlinkSync(newResume);
    }

    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message;
      }
    }

    return res.status(422).render("jobSeeker/editProfile", {
      pageTitle: "Edit Profile",
      path: "/profile",
      user: req.user,
      profile,
      errors,
      formData: req.body,
    });
  }
};

exports.viewSavedJobDetail = async (req, res, next) => {
  try {
    const savedJobId = req.params.savedJobId;
    // find saved job
    const savedJob = await savedJobs
      .findById(savedJobId)
      .populate("jobDetail.jobId");

    if (!savedJob) {
      res.cookie("errorMessage", "Job not found", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/jobSeeker/profile");
    }

    const jobPost = savedJob.jobDetail.jobId;

    // display savedjob details
    res.render("jobSeeker/savedJobDetail", {
      pageTitle: savedJob.jobDetail.jobTitle,
      path: "/profile",
      savedJob,
      jobPost,
    });
  } catch (err) {
    console.error("Error fetching saved job:", err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.unSaveJob = async (req, res, next) => {
  try {
    const savedJobId = req.params.savedJobId;
    // find savedjob
    const savedJob = await savedJobs.findById(savedJobId);
    if (!savedJob) {
      res.cookie("errorMessage", "Job not found", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/jobSeeker/profile");
    }

    // remove from saved jobs
    await savedJob.deleteOne();
    res.cookie("successMessage", "Job removed from saved jobs", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/jobSeeker/profile");
  } catch (error) {
    console.log(error);
    next({
      message: "An error occured while unsaving job. Please try again later...",
    });
  }
};

exports.getApplicationForm = async (req, res, next) => {
  try {
    const jobPostId = req.params.jobPostId;
    // find jobdetails
    const jobPost = await jobListing.findById(jobPostId);

    res.render("jobSeeker/applicationForm", {
      pageTitle: jobPost.jobDetail.jobTitle,
      path: "/applyForJob",
      job: jobPost,
      user: req.user,
    });
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.applyForJob = async (req, res, next) => {
  let resume;
  try {
    const jobPostId = req.params.jobPostId;
    const user = req.user;

    // find jobpost
    const jobPost = await jobListing.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Check for existing application
    const existing = await Application.findOne({
      "user.userId": user._id,
      "jobDetail.jobId": jobPost._id,
      applicationStatus: { $ne: "Withdrawn" },
    });

    if (existing) {
      res.cookie("errorMessage", "You have already applied for this job.", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/jobSeeker/allJobs");
    }

    // upload resume
    if (
      req.fileValidationError &&
      Object.keys(req.fileValidationError).length > 0
    ) {
      return res
        .cookie("errorMessage", req.fileValidationError.resume, {
          maxAge: 3000,
          httpOnly: false,
        })
        .redirect(`/jobSeeker/applyForJob/${jobPostId}`);
    }

    // Check if file exists
    if (!req.file) {
      return res
        .cookie(
          "errorMessage",
          "Please upload your resume to apply for this job.",
          {
            maxAge: 3000,
            httpOnly: false,
          }
        )
        .redirect(`/jobSeeker/applyForJob/${jobPostId}`);
    }

    // Set resume path if file was uploaded successfully
    resume = `/uploads/resume/${req.file.filename}`;

    // Create a new application
    const newApplication = new Application({
      user: {
        userId: user._id,
        name: user.firstName + " " + user.lastName,
        email: user.email,
      },
      jobDetail: {
        jobId: jobPostId,
        jobTitle: jobPost.jobDetail.jobTitle,
        recruiterId: jobPost.recruiterId,
        company: jobPost.company,
      },
      resumeLink: resume,
      applicationStatus: "Applied",
    });

    // save application
    await newApplication.save();

    res.cookie("successMessage", "Application submitted successfully.", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/jobSeeker/profile");
  } catch (err) {
    console.log(err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.withdrawApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.applicationId;
    const application = await Application.findById(applicationId);

    // update application status
    application.applicationStatus = "Withdrawn";
    const resumePath = application.resumeLink;
    if (resumePath) {
      const fullPath = path.join(__dirname, "..", "public", resumePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath); // Remove the old file
      }
    }

    await application.save();

    res.cookie("successMessage", "Application withdrawn successfully.", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/jobSeeker/profile");
  } catch (err) {
    console.log(err);
    res.cookie(
      "errorMessage",
      "Something went wrong, please try again later.",
      {
        maxAge: 3000,
        httpOnly: false,
      }
    );
    return res.redirect("/jobSeeker/profile");
  }
};

exports.getReviewForm = async (req, res, next) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.user._id;
    // find jobPost
    const jobPost = await jobListing.findById(jobId);

    // check if already reviewd
    const existing = await Review.findOne({ userId, jobId });
    if (existing) {
      res.cookie("errorMessage", "You have already rated this job!", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect(`/jobSeeker/allJobs/${jobId}`);
    }

    res.render("jobSeeker/reviewJob", {
      pageTitle: "Review job",
      path: "/reviewJob",
      jobPost: jobPost,
      userId,
      errors: {},
    });
  } catch (err) {
    console.log(err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.postJobReview = async (req, res, next) => {
  let jobPost;
  let userId;
  try {
    const jobId = req.params.jobId;
    userId = req.user._id;

    jobPost = await jobListing.findById(jobId);
    const newReview = new Review({
      userId: userId,
      jobId: jobId,
      rating: req.body.rating,
      description: req.body.description,
    });

    // save to database
    await newReview.save();

    // calculate average rating
    const reviews = await Review.find({ jobId: jobId });
    const avgRating = parseFloat(
      (
        reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1)
      ).toFixed(1)
    );

    await jobListing.updateOne(
      { _id: jobId },
      { "jobDetail.avgRating": avgRating }
    );
    // jobPost.jobDetail.avgRating = avgRating;
    // await jobPost.save({ validateBeforeSave: false });

    return res.redirect(`/jobSeeker/allJobs/${jobId}`);
  } catch (err) {
    let errors = {};
    for (let field in err.errors) {
      errors[field] = err.errors[field].message;
    }

    res.render("jobSeeker/reviewJob", {
      pageTitle: "Review job",
      path: "/reviewJob",
      jobPost: jobPost,
      userId,
      errors,
    });
  }
};

exports.viewJobReviews = async (req, res, next) => {
  try {
    const jobId = req.params.jobId;

    // find all reviews for thi job post
    const reviews = await Review.find({ jobId: jobId })
      .populate("userId")
      .sort({ createdAt: -1 });

    // display reviews
    return res.render("jobSeeker/viewReviews", {
      pageTitle: "Reviews",
      path: "/reviews",
      reviews,
      jobId,
    });
  } catch (error) {
    console.log(error);
    next({ message: "something went wrong." });
  }
};
