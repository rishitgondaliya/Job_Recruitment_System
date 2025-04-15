const path = require("path");
const fs = require("fs");

const jobListing = require("../models/jobListing");
const Category = require("../models/jobCategory");
const savedJobs = require("../models/savedJobs");
const Profile = require("../models/profile");

exports.getJobSeekerHome = async (req, res, next) => {
  // const featuredJobs = await featuredJob.find()
  const featuredJobs = await jobListing.find({
    "jobDetail.isFeatured.status": "Yes",
    "jobDetail.isFeatured.endDate": { $gte: new Date() },
  });
  // console.log('featuredJobs',featuredJobs)

  res.render("jobSeeker/home", {
    pageTitle: "Home | Job Seeker",
    path: "/home",
    featuredJobs: featuredJobs,
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
    const { category, locationType, experience, salary } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (locationType) filter["jobDetail.locationType"] = locationType;
    if (experience) filter["jobDetail.experience"] = { $lte: experience };
    if (salary) filter["jobDetail.salary"] = { $gte: Number(salary) };

    // console.log("filter", filter);
    const jobPosts = await jobListing.find(filter).sort({ updatedAt: -1 });
    const categories = await Category.find();
    // const jobPosts = await jobListing.find();
    // console.log("jobPosts", jobPosts);
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
      selectedCategory: category || "",
      selectedLocationType: locationType || "",
      selectedExperience: experience || "",
      selectedSalary: salary || "",
      // successMessage: "All jobs fetched successfully",
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
  const jobPost = await jobListing.findById(jobPostId);

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
    prevJobId,
    nextJobId,
    errors: {},
  });
};

exports.getJobSeekerProfile = async (req, res, next) => {
  const user = req.user;
  const userProfile = await Profile.findById(user.profileId);
  const savedJobsArray = await savedJobs.find({ "user.userId": user._id });
  // console.log("userProfile",userProfile)

  res.render("jobSeeker/profile", {
    pageTitle: "Profile",
    path: "/profile",
    profile: userProfile,
    user: user,
    savedJobs: savedJobsArray,
  });
};

exports.getEditProfile = async (req, res, next) => {
  const user = req.user;
  const userProfile = await Profile.findById(user.profileId);
  // console.log("userProfile",userProfile)
  res.render("jobSeeker/editProfile", {
    pageTitle: "Edit Profile",
    path: "/profile",
    user,
    profile: userProfile,
    errors: {},
  });
};

exports.postEditProfile = async (req, res, next) => {
  const errors = {};
  const profileId = req.user.profileId;
  const profile = await Profile.findById(profileId);
  try {
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
    if (req.body.experience) {
      const expArray = Array.isArray(req.body.experience)
        ? req.body.experience
        : Object.values(req.body.experience);

      // Check if at least one field is filled in any entry
      const filteredExp = expArray
        .map((exp) => ({
          company: exp.company?.trim() || undefined,
          position: exp.position?.trim() || undefined,
          startDate: exp.startDate || undefined,
          endDate: exp.endDate || undefined,
          description: exp.description?.trim() || undefined,
        }))
        .filter(
          (exp) =>
            exp.company ||
            exp.position ||
            exp.startDate ||
            exp.endDate ||
            exp.description
        );

      profile.experience = filteredExp.length > 0 ? filteredExp : undefined;
    } else {
      profile.experience = undefined;
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
    // console.log("Error updating profile:", err);

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
    // res.cookie("errorMessage", "Something went wrong while updating profile.");
    // res.redirect("/jobSeeker/profile");
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
    console.log("jobPostId", jobPost._id);
    res.render("jobSeeker/savedJobDetail", {
      pageTitle: savedJob.jobDetail.jobTitle,
      path: "/profile",
      savedJob,
      jobPost,
    });
  } catch (err) {
    console.error("Error fetching saved job:", err);
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
