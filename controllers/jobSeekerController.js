const path = require("path");
const fs = require("fs");

const jobListing = require("../models/jobListing");
const Category = require("../models/jobCategory");
const savedJobs = require("../models/savedJobs");
const Profile = require("../models/profile");
const Application = require("../models/application");
const Review = require("../models/review");

exports.getJobSeekerHome = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  // const featuredJobs = await featuredJob.find()
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
    // console.log('featuredJobs',featuredJobs)

    res.render("jobSeeker/home", {
      pageTitle: "Home | Job Seeker",
      path: "/home",
      featuredJobs: featuredJobs,
      currentPage: page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong. Please try again later." });
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

    const filter = {};
    if (category) filter.category = category;
    if (locationType) filter["jobDetail.locationType"] = locationType;
    if (experience) filter["jobDetail.experience"] = { $lte: experience };
    if (salary) filter["jobDetail.salary"] = { $gte: Number(salary) };

    if (search) {
      filter.$or = [
        { "jobDetail.jobTitle": { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    // console.log("filter",filter)
    const savedJobsId = await savedJobs
      .find({ "user.userId": req.user._id })
      .select("jobDetail.jobId");

    const totalJobs = await jobListing.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limit);

    // console.log("totalJobs",totalJobs,"totalPages",totalPages)
    const jobPosts = await jobListing
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // console.log("jobPosts",jobPosts)
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
  const jobPostId = req.body.jobPostId;

  try {
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

    const user = {
      userId: req.user._id,
      name: req.user.firstName + " " + req.user.lastName,
    };

    const jobDetail = {
      jobId: jobPost._id,
      jobTitle: jobPost.jobDetail.jobTitle,
      company: jobPost.company,
    };

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
  const jobPostId = req.params.jobPostId;
  try {
    const jobPost = await jobListing.findById(jobPostId);
    const savedJob = await savedJobs.findOne({
      "user.userId": req.user._id,
      "jobDetail.jobId": jobPostId,
    });

    const allJobs = await jobListing.find({}, "_id").sort({ updatedAt: -1 });
    const jobIndex = allJobs.findIndex((j) => j._id.toString() === jobPostId);
    const prevJobId = jobIndex > 0 ? allJobs[jobIndex - 1]._id : null;
    const nextJobId =
      jobIndex < allJobs.length - 1 ? allJobs[jobIndex + 1]._id : null;

    if (!jobPost) {
      res.render("/jobSeeker/allJobs", {
        pageTitle: "All jobs",
        path: "/allJobs",
        errorMessage: "Job post not found.",
        jobPosts: await jobListing.find(),
      });
    }
    // console.log("jobPost",jobPost)
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
  const user = req.user;
  try {
    const userProfile = await Profile.findById(user.profileId);
    const savedJobsArray = await savedJobs.find({ "user.userId": user._id });
    const applications = await Application.find({
      "user.userId": user._id,
    }).sort({ createdAt: -1 });
    // console.log("userProfile",userProfile)

    res.render("jobSeeker/profile", {
      pageTitle: "Profile",
      path: "/profile",
      profile: userProfile,
      user: user,
      savedJobs: savedJobsArray,
      applications,
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
    });
  } catch (error) {
    console.log(error);
    next({ message: "Internal server error. Please try again later." });
  }
};

exports.postEditProfile = async (req, res, next) => {
  const errors = {};
  const profileId = req.user.profileId;
  let profile;
  try {
    profile = await Profile.findById(profileId);
    // console.log("profileId",profileId)
    // console.log("req.body",req.body)

    if (!profile) {
      next({ message: "Profile not found !" });
    }

    // console.log("profile",profile)
    // Update About
    profile.about = req.body.about?.trim() || "";

    // Update Education
    profile.education = {
      college: req.body.college?.trim() || undefined,
      degree: req.body.degree?.trim() || undefined,
      branch: req.body.branch?.trim() || undefined,
      grade: req.body.grade || undefined,
      startYear: req.body.startYear || undefined,
      passingYear: req.body.passingYear || undefined,
    };

    // Update Experience (array of objects)
    let totalMonths = 0;

    if (req.body.experience) {
      const expArray = Array.isArray(req.body.experience)
        ? req.body.experience
        : Object.values(req.body.experience);

      // console.log("expArray",expArray)

      const filteredExp = expArray
        .map((exp) => {
          const startDate = exp.startDate ? new Date(exp.startDate) : null;
          const endDate = exp.endDate ? new Date(exp.endDate) : new Date(); // assume present if not provided

          // Calculate duration in months
          if (startDate && endDate && startDate < endDate) {
            const years = endDate.getFullYear() - startDate.getFullYear();
            const months = endDate.getMonth() - startDate.getMonth();
            totalMonths += years * 12 + months;
          }

          return {
            company: exp.company?.trim() || undefined,
            position: exp.position?.trim() || undefined,
            startDate: exp.startDate || undefined,
            endDate: exp.endDate || undefined,
            description: exp.description?.trim() || undefined,
          };
        })
        .filter(
          (exp) =>
            exp.company ||
            exp.position ||
            exp.startDate ||
            exp.endDate ||
            exp.description
        );

      // console.log("filteredExp",filteredExp)
      profile.experience = filteredExp.length > 0 ? filteredExp : undefined;

      profile.totalExperience = totalMonths;
    } else {
      profile.experience = undefined;
      profile.totalExperience = undefined;
    }

    // Update skills as array
    if (req.body.skills) {
      profile.skills = req.body.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill);
    }

    // Handle profile photo upload
    if (req.files?.profilePhoto?.length) {
      // Delete old photo if exists
      if (profile.profilePhoto) {
        const oldPhotoPath = path.join(
          __dirname,
          "..",
          "public",
          profile.profilePhoto
        );
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      const photoPath = `/uploads/profilePhoto/${req.files.profilePhoto[0].filename}`;
      profile.profilePhoto = photoPath;
    }

    // Handle resume upload
    if (req.files?.resume?.length) {
      // Delete old resume if exists
      if (profile.resume) {
        const oldResumePath = path.join(
          __dirname,
          "..",
          "public",
          profile.resume
        );
        if (fs.existsSync(oldResumePath)) {
          fs.unlinkSync(oldResumePath);
        }
      }

      const resumePath = `/uploads/resume/${req.files.resume[0].filename}`;
      profile.resume = resumePath;
    }

    // console.log("updatedProfile",profile)
    await profile.save();

    res.cookie("successMessage", "Profile updated successfully!");
    res.redirect("/jobSeeker/profile");
  } catch (err) {
    console.log("Error updating profile:", err);

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
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    }
    console.log("errors", errors);
    res.status(422).render("jobSeeker/editProfile", {
      pageTitle: "Edit Profile",
      path: "/profile",
      user: req.user,
      profile,
      errors,
    });
  }
};

exports.viewSavedJobDetail = async (req, res, next) => {
  const savedJobId = req.params.savedJobId;
  console.log("savedJobId", savedJobId);
  try {
    const savedJob = await savedJobs
      .findById(savedJobId)
      .populate("jobDetail.jobId");
    // console.log("savedJob",savedJob)
    if (!savedJob) {
      res.cookie("errorMessage", "Job not found", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/jobSeeker/profile");
    }
    const jobPost = savedJob.jobDetail.jobId;
    // console.log("jobPost", jobPost);
    // console.log("jobPostId", jobPost._id);
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
  const savedJobId = req.params.savedJobId;
  console.log("savedJobId", savedJobId);
  try {
    const savedJob = await savedJobs.findById(savedJobId);
    // console.log("savedJob", savedJob);
    if (!savedJob) {
      res.cookie("errorMessage", "Job not found", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/jobSeeker/profile");
    }
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
  const jobPostId = req.params.jobPostId;
  try {
    const jobPost = await jobListing.findById(jobPostId);
    res.render("jobSeeker/applicationform", {
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
  const jobPostId = req.params.jobPostId;
  const user = req.user;
  let resume;
  try {
    // console.log("jobPostId",jobPostId)
    // console.log("user",user)
    const jobPost = await jobListing.findById(jobPostId);
    // console.log("jobPost",jobPost)
    if (!jobPost) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Check for existing application
    const existing = await Application.findOne({
      "user.userId": user._id,
      "jobDetail.jobId": jobPost._id,
    });

    if (existing) {
      return res
        .cookie("errorMessage", "You have already applied for this job.", {
          maxAge: 3000,
          httpOnly: false,
        })
        .redirect("/jobSeeker/allJobs");
    }

    if (req.files?.resume?.length) {
      const resumePath = `/uploads/resume/${req.files.resume[0].filename}`;
      resume = resumePath;
    }

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

    await newApplication.save();

    res.cookie("successMessage", "Application submitted successfully.", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/jobSeeker/profile");
  } catch (err) {
    console.error(err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.withdrawApplication = async (req, res, next) => {
  const applicationId = req.params.applicationId;
  try {
    await Application.findByIdAndUpdate(
      {
        _id: applicationId,
      },
      {
        $set: {
          applicationStatus: "Withdrawn",
        },
      },
      {
        new: true,
      }
    );
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
  const jobId = req.params.jobId;
  const userId = req.user._id;
  try {
    const jobPost = await jobListing.findById(jobId);
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
  const jobId = req.params.jobId;
  const userId = req.user._id;
  let jobPost;
  // console.log("jobPostId",jobId)
  try {
    jobPost = await jobListing.findById(jobId);
    const newReview = new Review({
      userId: userId,
      jobId: jobId,
      rating: req.body.rating,
      description: req.body.description,
    });
    await newReview.save();
    const reviews = await Review.find({ jobId: jobId });
    const avgRating = parseFloat(
      (
        reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1)
      ).toFixed(1)
    );

    console.log("avgRating", avgRating);
    await jobListing.updateOne(
      { _id: jobId },
      { "jobDetail.avgRating": avgRating }
    );
    // jobPost.jobDetail.avgRating = avgRating;
    // await jobPost.save({ validateBeforeSave: false });

    // console.log("newReview",newReview)
    return res.redirect(`/jobSeeker/allJobs/${jobId}`);
  } catch (err) {
    // console.log(err);
    let errors = {};
    for (let field in err.errors) {
      errors[field] = err.errors[field].message;
    }
    console.log("errors", errors);
    res.render("jobSeeker/reviewJob", {
      pageTitle: "Review job",
      path: "/reviewJob",
      jobPost: jobPost,
      userId,
      errors,
    });
  }
};
