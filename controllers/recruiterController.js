const path = require("path");
const fs = require("fs");

const Category = require("../models/jobCategory");
const jobListing = require("../models/jobListing");
const Profile = require("../models/profile");
const User = require("../models/user");
const Application = require("../models/application");
const Interview = require("../models/interview");

exports.getRecruiterHome = (req, res, next) => {
  res.render("recruiter/home", {
    pageTitle: "Home | Recruiter",
    path: "/home",
  });
};

exports.postAddNewJob = async (req, res, next) => {
  let categories = {};
  let errors = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  const totalJobPosts = await jobListing.countDocuments({
    recruiterId: req.user._id,
  });
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalJobPosts / limit);
  try {
    const {
      jobTitle,
      categoryName,
      description,
      requirements,
      locType,
      location,
      experience,
      vacancy,
      salary,
      status,
      startDate,
      endDate,
    } = req.body;

    // Fetch categories to re-render the form
    categories = await Category.find();

    // Find the matching category
    const category = categories.find(
      (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    // If category is not found
    if (!category) {
      return res.render("recruiter/jobPosts", {
        pageTitle: "Add new job",
        path: "/addNewJob",
        errors: { categoryName: "Please select category." },
        formData: req.body,
        categories,
        jobListings,
        currentPage: page,
        limit,
        totalPages,
        isEditing: false,
        showForm: true,
      });
    }

    if (status === "Yes") {
      if (!startDate) {
        errors["jobDetail.isFeatured.startDate"] = "Start date is required!";
      } else if (!endDate) {
        errors["jobDetail.isFeatured.endDate"] = "End date is required!";
      } else if (new Date(endDate) <= new Date(startDate)) {
        errors["jobDetail.isFeatured.endDate"] =
          "End date must be after start date";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.render("recruiter/jobPosts", {
        pageTitle: "Add new job",
        path: "/addNewJob",
        errors,
        formData: req.body,
        categories,
        jobListings,
        currentPage: page,
        limit,
        totalPages,
        isEditing: false,
        showForm: true,
      });
    }

    // Build job detail
    const jobDetail = {
      jobTitle,
      description,
      requirements: Array.isArray(requirements)
        ? requirements
        : requirements.split(",").map((r) => r.trim()),
      locationType: locType,
      location,
      experience,
      vacancy,
      salary,
      isFeatured:
        status === "Yes"
          ? {
              status: "Yes",
              startDate: startDate,
              endDate: endDate,
            }
          : {
              status: "No",
            },
    };

    // Create new Job
    const newJob = new jobListing({
      recruiterId: req.user._id,
      categoryId: category._id,
      category: categoryName,
      company: req.user.company,
      jobDetail: jobDetail,
    });

    await newJob.save();

    res.cookie("successMessage", "Job posted successfully", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.redirect("/recruiter/jobPosts");
  } catch (err) {
    let errorMessage;
    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        // Use short field names if needed, or use full path
        // const shortKey = field.split(".").pop();
        errors[field] = err.errors[field].message;
      }
    } else {
      console.log("Unexpected error:", err);
      errorMessage = "Something went wrong, please try again.";
    }
    console.log("errors", errors);
    // console.log("formData", req.body);

    return res.render("recruiter/jobPosts", {
      pageTitle: "Add new job",
      path: "/addNewJob",
      errors,
      errorMessage,
      formData: req.body,
      categories,
      jobListings,
      currentPage: page,
      limit,
      totalPages,
      isEditing: false,
      showForm: true,
    });
  }
};

exports.getJobPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  const totalJobPosts = await jobListing.countDocuments({
    recruiterId: req.user._id,
  });
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalJobPosts / limit);
  const categories = await Category.find().select("name");
  try {
    if (!req.user || req.user.role !== "recruiter") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    return res.render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      categories,
      currentPage: page,
      limit,
      totalPages,
      errors: {},
      formData: {},
      isEditing: false,
      showForm: false,
    });
  } catch (err) {
    console.error("Error fetching jobPosts:", err);
    res.cookie("errorMessage", "Error fetching jobPosts", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      categories,
      currentpage: page,
      limit,
      totalPages,
      errors: {},
      formData: {},
      isEditing: false,
      showForm: false,
    });
  }
};

exports.deleteJobPost = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  const totalJobPosts = await jobListing.countDocuments({
    recruiterId: req.user._id,
  });
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalJobPosts / limit);

  try {
    const jobPostId = req.body.jobPostId;

    const jobPost = await jobListing.findById(jobPostId);

    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings,
        currentPage: page,
        limit,
        totalPages,
        errors: {},
        errorMessage: "Job post not found.",
      });
    }

    // Compare string values of IDs (as Mongoose ObjectId !== String directly)
    if (!req.user || String(req.user._id) !== String(jobPost.recruiterId)) {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied! You are not authorized to delete this job post.",
      });
    }

    await jobPost.deleteOne();

    res.cookie("successMessage", "Job post deleted successfully.", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.redirect("/recruiter/jobPosts");
  } catch (err) {
    console.error("Error deleting job post:", err);
    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      currentPage: page,
      limit,
      totalPages,
      errors: {},
      errorMessage: "An error occurred while deleting the job post.",
    });
  }
};

exports.getEditJobPost = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  const totalJobPosts = await jobListing.countDocuments({
    recruiterId: req.user._id,
  });
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalJobPosts / limit);
  let categories = await Category.find().select("name");

  const jobPostId = req.params.jobPostId;
  const jobPost = await jobListing.findById(jobPostId);
  try {
    // console.log("getJobPost", jobPost);
    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings,
        categories,
        currentPage: page,
        limit,
        totalPages,
        isEditing: true,
        showForm: true,
        errors: {},
        jobPost,
        errorMessage: "Job post not found.",
      });
    }
    if (!req.user || String(req.user._id) !== String(jobPost.recruiterId)) {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied! You are not authorized to edit this job post.",
      });
    }
    // console.log("categories", categories)
    return res.render("recruiter/jobPosts", {
      pageTitle: "Edit Job Post",
      path: "/jobPosts",
      jobPost,
      errors: {},
      categories,
      jobListings,
      currentPage: page,
      limit,
      totalPages,
      isEditing: true,
      showForm: true,
    });
  } catch (err) {
    console.error("Error getting edit job post:", err);
    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      categories,
      currentPage: page,
      limit,
      totalPages,
      isEditing: true,
      showForm: true,
      errors: {},
      jobPost,
      errorMessage: "An error occurred while getting the job post.",
    });
  }
};

exports.postEditJobPost = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  const totalJobPosts = await jobListing.countDocuments({
    recruiterId: req.user._id,
  });
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalJobPosts / limit);
  const jobPostId = req.body.jobPostId;
  let jobPost;
  let categories = await Category.find().select("name");
  try {
    console.log("jobPostId:", jobPostId);
    if (req.body.status === "Yes") {
      if (!req.body.startDate) {
        errors["jobDetail.isFeatured.startDate"] = "Start date is required!";
      } else if (!req.body.endDate) {
        errors["jobDetail.isFeatured.endDate"] = "End date is required!";
      } else if (new Date(req.body.endDate) <= new Date(req.body.startDate)) {
        errors["jobDetail.isFeatured.endDate"] =
          "End date must be after start date";
      }
    }
    const updatedJobPost = {
      category: req.body.categoryName,
      jobDetail: {
        jobTitle: req.body.jobTitle,
        description: req.body.description,
        requirements: Array.isArray(req.body.requirements)
          ? req.body.requirements
          : req.body.requirements.split(",").map((r) => r.trim()),
        salary: req.body.salary,
        locationType: req.body.locType,
        location: req.body.location,
        vacancy: req.body.vacancy,
        experience: req.body.experience,
        isFeatured:
          req.body.status === "Yes"
            ? {
                status: "Yes",
                startDate: req.body.startDate,
                endDate: req.body.endDate,
              }
            : {
                status: "No",
              },
      },
    };
    jobPost = await jobListing.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings,
        categories,
        currentPage: page,
        limit,
        totalPages,
        isEditing: true,
        showForm: true,
        errors: {},
        errorMessage: "Job post not found.",
      });
    }

    // console.log("jobPost:", jobPost);
    // console.log("updatedJobPost:", updatedJobPost);
    await jobListing.findByIdAndUpdate(
      jobPostId,
      { $set: updatedJobPost },
      {
        new: true,
        runValidators: true,
      }
    );

    res.cookie("editSuccess", "Job post updated successfully.", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.redirect("/recruiter/jobPosts");
  } catch (error) {
    console.error("Update Error:", error);

    if (error.name === "ValidationError") {
      const errors = {};
      for (let field in error.errors) {
        errors[field] = error.errors[field].message;
      }

      console.log("errors:", errors);

      return res.status(422).render("recruiter/editJobPost", {
        pageTitle: "Edit job post",
        path: "/jobPosts",
        jobPost: jobPost,
        categories,
        jobListings,
        currentPage: page,
        limit,
        totalPages,
        isEditing: true,
        showForm: true,
        errors,
        errorMessage: "Validation failed. Please correct the fields.",
      });
    }

    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      categories,
      currentPage: page,
      limit,
      totalPages,
      isEditing: false,
      showForm: false,
      errorMessage: "An error occurred while updating the job post.",
      errors: {},
    });
  }
};

exports.getRecruiterProfile = async (req, res, next) => {
  const user = req.user;
  const userProfile = await Profile.findById(user.profileId);
  // console.log("userProfile",userProfile)

  res.render("recruiter/profile", {
    pageTitle: "Profile",
    path: "/profile",
    profile: userProfile,
    user: user,
  });
};

exports.getEditProfile = async (req, res, next) => {
  const user = req.user;
  const userProfile = await Profile.findById(user.profileId);
  // console.log("userProfile",userProfile)
  res.render("recruiter/editProfile", {
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
    let totalMonths = 0;

    if (req.body.experience) {
      const expArray = Array.isArray(req.body.experience)
        ? req.body.experience
        : Object.values(req.body.experience);

      const filteredExp = expArray
        .map((exp) => {
          const startDate = exp.startDate ? new Date(exp.startDate) : null;
          const endDate = exp.endDate ? new Date(exp.endDate) : new Date(); // assume present if not provided

          // Calculate duration in months
          if (startDate && endDate && startDate < endDate) {
            const years = endDate.getFullYear() - startDate.getFullYear();
            const months = endDate.getMonth() - startDate.getMonth();
            const days = endDate.getDate() - startDate.getDate();
            totalMonths += years * 12 + months + (days >= 15 ? 1 : 0);
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

    if (req.body.companyName) {
      profile.companyName = req.body.companyName.trim();
    }

    if (req.body.companyWebsite) {
      profile.companyWebsite = req.body.companyWebsite.trim();
    }

    if (req.body.industryType) {
      profile.industryType = req.body.industryType.trim();
    }

    if (req.body.position) {
      profile.position = req.body.position.trim();
    }

    // console.log("updatedProfile",profile)
    await profile.save();

    res.cookie("successMessage", "Profile updated successfully!");
    res.redirect("/recruiter/profile");
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
    res.status(422).render("recruiter/editProfile", {
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

exports.viewJobSeekers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const { experience, skills } = req.query;
    const targetExperience = experience ? parseInt(experience) * 12 : null;
    const skillsArray = skills ? skills.split(",").map((s) => s.trim()) : [];

    // base filter
    const filter = { role: "jobSeeker" };

    // Get all job seekers with profiles
    let jobSeekers = await User.find(filter).populate("profileId");

    // Apply filtering in memory (because experience and skills are in profileId)
    jobSeekers = jobSeekers.filter((jobSeeker) => {
      const profile = jobSeeker.profileId;
      if (!profile) return false;

      const matchExperience = targetExperience
        ? profile.totalExperience >= targetExperience
        : true;

      const matchSkills = skillsArray.length
        ? skillsArray.every((skill) => profile.skills?.includes(skill))
        : true;

      return matchExperience && matchSkills;
    });

    // Pagination after filtering
    const totalJobSeekers = jobSeekers.length;
    const totalPages = Math.ceil(totalJobSeekers / limit);
    const paginatedJobSeekers = jobSeekers.slice(skip, skip + limit);

    if (paginatedJobSeekers.length === 0) {
      return res.status(404).render("recruiter/viewJobSeekers", {
        pageTitle: "Job Seekers",
        path: "/viewJobSeekers",
        errorMessage: "No job seekers found with the provided criteria.",
        jobSeekers: [],
        currentPage: page,
        limit,
        totalPages,
        experience: req.query.experience || "",
        skills: req.query.skills || "",
      });
    }

    res.render("recruiter/viewJobSeekers", {
      pageTitle: "Job Seekers",
      path: "/viewJobSeekers",
      jobSeekers: paginatedJobSeekers,
      currentPage: page,
      limit,
      totalPages,
      experience: req.query.experience || "",
      skills: req.query.skills || "",
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.viewApplications = async (req, res, next) => {
  const appPage = parseInt(req.query.applicationPage) || 1;
  const appLimit = parseInt(req.query.applicationLimit) || 5;
  const appSkip = (appPage - 1) * appLimit;

  const interviewPage = parseInt(req.query.interviewPage) || 1;
  const interviewLimit = parseInt(req.query.interviewLimit) || 5;
  const interviewSkip = (interviewPage - 1) * interviewLimit;

  try {
    const totalApplications = await Application.countDocuments({
      "jobDetail.recruiterId": req.user._id,
      applicationStatus: { $in: ["Applied", "Shortlisted"] },
    });

    const applications = await Application.find({
      "jobDetail.recruiterId": req.user._id,
      applicationStatus: { $in: ["Applied", "Shortlisted"] },
    })
      .skip(appSkip)
      .limit(appLimit)
      .populate("user");

    const totalApplicationPage = Math.ceil(totalApplications / appLimit);

    const totalInterviews = await Interview.countDocuments({
      recruiterId: req.user._id,
    });

    const interviews = await Interview.find({
      recruiterId: req.user._id,
    })
      .skip(interviewSkip)
      .limit(interviewLimit)
      .populate("user");

    const totalInterviewPage = Math.ceil(totalInterviews / interviewLimit);

    interviews.sort((a, b) => {
      const order = { Scheduled: 0, Completed: 1, Rejected: 2 };
      return order[a.status] - order[b.status];
    });

    res.render("recruiter/viewApplications", {
      pageTitle: "Applications",
      path: "/viewApplications",
      applications,
      interviews,
      appPage,
      appLimit,
      totalApplicationPage,
      interviewPage,
      interviewLimit,
      totalInterviewPage,
      user: req.user,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getShortlistUser = async (req, res, next) => {
  try {
    const applicationId = req.params.applicationId;
    const application = await Application.findById(applicationId);
    const userId = application.user.userId;
    // console.log("userId", userId);
    const user = await User.findById(userId);
    // console.log("application", application);
    res.render("recruiter/shortlistUser", {
      pageTitle: "Shortlist User",
      path: "/shortlistUser",
      errors: {},
      job: {},
      user,
      application,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.postShortlistUser = async (req, res, next) => {
  let errors = {};
  const applicationId = req.params.applicationId;
  const application = await Application.findById(applicationId);
  // console.log("application", application);
  const userId = application.user.userId;
  const user = await User.findById(userId);
  try {
    application.applicationStatus = "Shortlisted";
    await application.save();

    const newInterview = new Interview({
      user: {
        userId: userId,
        name: user.firstName + " " + user.lastName,
        email: user.email,
      },
      recruiterId: req.user._id,
      applicationId: application._id,
      interviewDate: req.body.interviewDate,
      status: "Scheduled",
      result: undefined,
    });
    await newInterview.save();
    res.cookie("successMessage", "User shortlisted successfully", {
      maxAge: 3000,
      httpOnly: false,
    });
    res.redirect("/recruiter/viewApplications");
  } catch (err) {
    console.log("err", err);
    for (let field in err.errors) {
      errors[field] = err.errors[field].message;
    }
    console.log("errors", errors);
    return res.render("recruiter/shortlistUser", {
      pageTitle: "Shortlist User",
      path: "/recruiter/shortlistUser",
      errors,
      user,
    });
  }
};

exports.getResultForm = async (req, res, next) => {
  const applicationId = req.params.applicationId;
  const application = await Application.findById(applicationId);
  // console.log("application", application);
  res.render("recruiter/resultForm", {
    pageTitle: "application.jobDetail.jobTitle",
    path: "/application",
    application,
    user: req.user,
  });
};

exports.postInterviewResult = async (req, res, next) => {
  const applicationId = req.params.applicationId;
  const { action } = req.body;

  try {
    const interview = await Interview.findOne({ applicationId: applicationId });
    const application = await Application.findById(applicationId);
    const jobPost = await jobListing.findById(application.jobDetail.jobId);
    let totalVacancy = jobPost.jobDetail.vacancy;
    if (!application) {
      return res.status(404).send("Application not found");
    }

    // console.log("action",action)
    if (action === "select") {
      application.applicationStatus = "Selected";
      interview.result = "Selected";
      interview.status = "Completed";
      totalVacancy = totalVacancy > 0 ? (totalVacancy -= 1) : 0;
      jobPost.jobDetail.vacancy = totalVacancy;
    } else if (action === "reject") {
      application.applicationStatus = "Not selected";
      interview.result = "Not selected";
      interview.status = "Completed";
    }

    await jobPost.save({ validateBeforeSave: false });
    await interview.save();
    await application.save();

    res.cookie("successMessage", `Candidate ${action}ed successfully`, {
      maxAge: 3000,
      httpOnly: false,
    });

    res.redirect("/recruiter/viewApplications");
  } catch (err) {
    console.log(err);
    next(err);
  }
};
