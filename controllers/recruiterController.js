const path = require("path");
const fs = require("fs");

const Category = require("../models/jobCategory");
const jobListing = require("../models/jobListing");
const Profile = require("../models/profile");
const User = require("../models/user");
const Application = require("../models/application");
const Interview = require("../models/interview");
const Savedjobs = require("../models/savedJobs");

exports.getRecruiterHome = (req, res, next) => {
  res.render("recruiter/home", {
    pageTitle: "Home | Recruiter",
    path: "/home",
  });
};

exports.getAddNewJob = async (req, res, next) => {
  try {
    res.render("recruiter/editJobPost", {
      pageTitle: "Add New Job",
      path: "/jobPosts",
      categories: await Category.find(),
      isEditing: false,
      errors: {},
      formData: {},
      showForm: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.postAddNewJob = async (req, res, next) => {
  let categories = {};
  let errors = {};

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
      return res.render("recruiter/editJobPost", {
        pageTitle: "Add new job",
        path: "/jobPosts",
        errors: { categoryName: "Please select category." },
        formData: req.body,
        categories,
        isEditing: false,
        showForm: true,
      });
    }

    if (status === "Yes") {
      if (!startDate) {
        errors["jobDetail.isFeatured.startDate"] = "Start date is required!";
      } else if (!endDate) {
        errors["jobDetail.isFeatured.endDate"] = "End date is required!";
      } else if (new Date(startDate) <= new Date()) {
        errors["jobDetail.isFeatured.startDate"] =
          "Start date must be future date";
      } else if (new Date(endDate) <= new Date(startDate)) {
        errors["jobDetail.isFeatured.endDate"] =
          "End date must be after start date";
      }
    }

    // stop early if any error
    if (Object.keys(errors).length > 0) {
      return res.render("recruiter/editJobPost", {
        pageTitle: "Add new job",
        path: "/jobPosts",
        errors,
        formData: req.body,
        categories,
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
    // extract error messages
    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message;
      }
    } else {
      // console.log("Unexpected error:", err);
      errorMessage = "Something went wrong, please try again.";
    }
    console.log("errors", errors);

    // render with errors
    return res.render("recruiter/editJobPost", {
      pageTitle: "Add new job",
      path: "/jobPosts",
      errors,
      errorMessage,
      formData: req.body,
      categories,
      isEditing: false,
      showForm: true,
    });
  }
};

exports.getJobPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  let jobListings;
  let totalPages;

  try {
    const totalJobPosts = await jobListing.countDocuments({
      recruiterId: req.user._id,
    });

    jobListings = await jobListing
      .find({ recruiterId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    totalPages = Math.ceil(totalJobPosts / limit);

    return res.render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      currentPage: page,
      limit,
      totalPages,
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
      currentpage: page,
      limit,
      totalPages,
    });
  }
};

exports.deleteJobPost = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5; // jobs per page
  const skip = (page - 1) * limit;
  const jobPostId = req.body.jobPostId;
  let jobListings;
  let totalPages;

  try {
    const totalJobPosts = await jobListing.countDocuments({
      recruiterId: req.user._id,
    });
    jobListings = await jobListing
      .find({ recruiterId: req.user._id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    totalPages = Math.ceil(totalJobPosts / limit);

    const jobPost = await jobListing.findById(jobPostId);

    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings,
        currentPage: page,
        limit,
        totalPages,
        errorMessage: "Job post not found.",
      });
    }
    // delete saved jobs with same jobId
    await Savedjobs.deleteMany({ "jobDetail.jobId": jobPostId });

    // delete job post
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
      errorMessage: "An error occurred while deleting the job post.",
    });
  }
};

exports.getEditJobPost = async (req, res, next) => {
  let categories;
  let totalPages;

  try {
    categories = await Category.find().select("name");

    const jobPostId = req.params.jobPostId;
    const jobPost = await jobListing.findById(jobPostId);

    if (!jobPost) {
      return res.status(404).render("recruiter/editJobPost", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        categories,
        isEditing: false,
        showForm: true,
        errors: {},
        jobPost,
        formData: {},
        errorMessage: "Job post not found.",
      });
    }

    return res.render("recruiter/editJobPost", {
      pageTitle: "Edit Job Post",
      path: "/jobPosts",
      jobPost,
      errors: {},
      categories,
      formData: {},
      isEditing: true,
      showForm: true,
    });
  } catch (err) {
    console.error("Error getting edit job post:", err);

    return res.status(500).render("recruiter/editJobPost", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      categories,
      isEditing: true,
      showForm: true,
      errors: {},
      jobPost,
      errorMessage: "An error occurred while getting the job post.",
    });
  }
};

exports.postEditJobPost = async (req, res, next) => {
  let errors = {};
  const jobPostId = req.body.jobPostId;
  let jobPost;
  let categories;

  try {
    categories = await Category.find().select("name");

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

    // stop early if any error
    if (Object.keys(errors).length > 0) {
      jobPost = await jobListing.findById(jobPostId);

      return res.status(422).render("recruiter/editJobPost", {
        pageTitle: "Edit job post",
        path: "/jobPosts",
        jobPost: jobPost,
        categories,
        isEditing: true,
        showForm: true,
        errors,
        formData: req.body,
      });
    }

    // updated job
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

    // find existing job post
    jobPost = await jobListing.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).render("recruiter/editJobPost", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        categories,
        isEditing: false,
        showForm: true,
        formData: req.body,
        errors: {},
        errorMessage: "Job post not found.",
      });
    }

    // save updated job post
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

      return res.status(422).render("recruiter/editJobPost", {
        pageTitle: "Edit job post",
        path: "/jobPosts",
        jobPost: jobPost,
        categories,
        isEditing: true,
        showForm: true,
        formData: req.body,
        errors,
      });
    }

    return res.status(500).render("recruiter/editJobPost", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      categories,
      isEditing: false,
      showForm: true,
      formData: req.body,
      errorMessage: "An error occurred while updating the job post.",
      errors: {},
    });
  }
};

exports.getRecruiterProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const userProfile = await Profile.findById(user.profileId);

    res.render("recruiter/profile", {
      pageTitle: "Profile",
      path: "/profile",
      profile: userProfile,
      user: user,
    });
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong." });
  }
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
  let errors = {};
  let profile;
  try {
    const profileId = req.user.profileId;
    profile = await Profile.findById(profileId);
    if (!profile) {
      next({ message: "Profile not found !" });
    }

    // stop early if any error
    if (
      req.fileValidationError &&
      Object.keys(req.fileValidationError).length > 0
    ) {
      errors = { ...req.fileValidationError };
      return res.status(422).render("recruiter/editProfile", {
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

    // Update Experience (array of objects)
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

    // Update skills as array
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

    await profile.save();

    res.cookie("successMessage", "Profile updated successfully!");
    res.redirect("/recruiter/profile");
  } catch (err) {
    // if any error occurs do not upload image
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

    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    }
    res.status(422).render("recruiter/editProfile", {
      pageTitle: "Edit Profile",
      path: "/profile",
      user: req.user,
      profile,
      errors,
      formData: req.body,
    });
  }
};

exports.viewJobSeekers = async (req, res, next) => {
  try {
    const { search } = req.query;

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let skip = (page - 1) * limit;

    if (req.query.limit === "All") {
      skip = 0;
      limit = Number.MAX_SAFE_INTEGER;
    }

    // Always fetch all job seekers and their profiles
    let jobSeekers = await User.find({ role: "jobSeeker" }).populate(
      "profileId"
    );

    // Filter in-memory based on search
    if (search) {
      const lowerSearch = search.toLowerCase();

      jobSeekers = jobSeekers.filter((jobSeeker) => {
        const profile = jobSeeker.profileId;
        if (!profile) return false;

        const skillsMatch = profile.skills?.some((skill) =>
          skill.toLowerCase().includes(lowerSearch)
        );

        const experienceMatch = profile.totalExperience
          ?.toString()
          .includes(search);

        const nameOrEmailMatch =
          jobSeeker.firstName?.toLowerCase().includes(lowerSearch) ||
          jobSeeker.lastName?.toLowerCase().includes(lowerSearch) ||
          jobSeeker.email?.toLowerCase().includes(lowerSearch);

        return skillsMatch || experienceMatch || nameOrEmailMatch;
      });
    }

    // Query job seekers with filters, pagination, and population of profileId
    const totalJobSeekers = jobSeekers.length;
    const totalPages = limit === "All" ? 1 : Math.ceil(totalJobSeekers / limit);
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
        searchQuery: search || "",
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
      searchQuery: search || "",
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
  let appLimit = parseInt(req.query.applicationLimit) || 5;
  let appSkip = (appPage - 1) * appLimit;

  if (req.query.applicationLimit === "All") {
    appSkip = 0;
    appLimit = Number.MAX_SAFE_INTEGER;
  }

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
      .populate("user")
      .sort({ createdAt: -1 });

    const totalApplicationPage =
      appLimit === "All" ? 1 : Math.ceil(totalApplications / appLimit);

    res.render("recruiter/viewApplications", {
      pageTitle: "Applications",
      path: "/viewApplications",
      applications,
      currentPage: appPage,
      limit: appLimit,
      appLimit,
      totalPages: totalApplicationPage,
      user: req.user,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.viewInterviews = async (req, res, next) => {
  const interviewPage = parseInt(req.query.interviewPage) || 1;
  let interviewLimit = parseInt(req.query.interviewLimit) || 5;
  let interviewSkip = (interviewPage - 1) * interviewLimit;

  if (req.query.interviewLimit === "All") {
    interviewSkip = 0;
    interviewLimit = Number.MAX_SAFE_INTEGER;
  }

  try {
    const totalInterviews = await Interview.countDocuments({
      recruiterId: req.user._id,
    });

    const interviews = await Interview.find({
      recruiterId: req.user._id,
    })
      .skip(interviewSkip)
      .limit(interviewLimit)
      .populate("user")
      .sort({ createdAt: -1 });

    const totalInterviewPage =
      interviewLimit === "All"
        ? 1
        : Math.ceil(totalInterviews / interviewLimit);

    // display scheduled interviews on top
    interviews.sort((a, b) => {
      const order = { Scheduled: 0, Completed: 1, Rejected: 2 };
      return order[a.status] - order[b.status];
    });

    res.render("recruiter/viewInterviews", {
      pageTitle: "Interviews",
      path: "/viewInterviews",
      interviews,
      currentPage: interviewPage,
      limit: interviewLimit,
      interviewLimit,
      totalPages: totalInterviewPage,
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
    const user = await User.findById(userId);

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
  let user;
  const applicationId = req.params.applicationId;

  try {
    const application = await Application.findById(applicationId);
    const userId = application.user.userId;
    user = await User.findById(userId);

    application.applicationStatus = "Shortlisted";
    await application.save();

    // schedule interview
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

    // save interview details
    await newInterview.save();
    res.cookie("successMessage", "User shortlisted successfully", {
      maxAge: 3000,
      httpOnly: false,
    });

    res.redirect("/recruiter/viewApplications");
  } catch (err) {
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
  try {
    const applicationId = req.params.applicationId;
    const application = await Application.findById(applicationId);
    res.render("recruiter/resultForm", {
      pageTitle: "application.jobDetail.jobTitle",
      path: "/application",
      application,
      user: req.user,
    });
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong." });
  }
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

    if (action === "select") {
      application.applicationStatus = "Selected";
      interview.result = "Selected"; // update interview result
      interview.status = "Completed"; // update status
      totalVacancy = totalVacancy > 0 ? (totalVacancy -= 1) : 0; // update vacancy
      jobPost.jobDetail.vacancy = totalVacancy;
    } else if (action === "reject") {
      application.applicationStatus = "Not selected";
      interview.result = "Not selected";
      interview.status = "Completed";
    }

    await jobPost.save({ validateBeforeSave: false });
    await interview.save({ validateBeforeSave: false });
    await application.save({ validateBeforeSave: false });

    res.cookie("successMessage", `Candidate ${action}ed successfully`, {
      maxAge: 3000,
      httpOnly: false,
    });

    res.redirect("/recruiter/viewInterviews");
  } catch (err) {
    console.log(err);
    next(err);
  }
};
