const { FiFilter } = require("react-icons/fi");
const Category = require("../models/jobCategory");
const jobListing = require("../models/jobListing");
const Profile = require("../models/profile");
const User = require("../models/user");

exports.getRecruiterHome = (req, res, next) => {
  res.render("recruiter/home", {
    pageTitle: "Home | Recruiter",
    path: "/home",
  });
};

exports.getAddNewJob = async (req, res) => {
  let categories = {};
  try {
    if (!req.user || req.user.role !== "recruiter") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }
    categories = await Category.find().select("name");
    return res.render("recruiter/addNewJob", {
      pageTitle: "Add new job",
      path: "/addNewJob",
      categories,
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error("Error fetching jobListing:", err);
    return res.render("recruiter/addNewJob", {
      pageTitle: "Add new job",
      path: "/addNewJob",
      categories,
      errors: {},
      formData: {},
    });
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
      return res.render("recruiter/addNewJob", {
        pageTitle: "Add new job",
        path: "/addNewJob",
        errors: { categoryName: "Please select category." },
        formData: req.body,
        categories,
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
      return res.render("recruiter/addNewJob", {
        pageTitle: "Add new job",
        path: "/addNewJob",
        errors,
        formData: req.body,
        categories,
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
    const newJob = new Job({
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
    console.log("formData", req.body);

    return res.render("recruiter/addNewJob", {
      pageTitle: "Add new job",
      path: "/addNewJob",
      errors,
      errorMessage,
      formData: req.body,
      categories,
    });
  }
};

exports.getJobPosts = async (req, res) => {
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 });
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
      // successMessage: "Job posts fetched successfully",
      errors: {},
      formData: {},
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
      errors: {},
      formData: {},
    });
  }
};

exports.deleteJobPost = async (req, res, next) => {
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 });
  try {
    const jobPostId = req.body.jobPostId;

    const jobPost = await jobListing.findById(jobPostId);

    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings,
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

    return res.render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      errors: {},
      successMessage: "Job post deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting job post:", err);
    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      errors: {},
      errorMessage: "An error occurred while deleting the job post.",
    });
  }
};

exports.getEditJobPost = async (req, res, next) => {
  let categories = await Category.find().select("name");
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 });
  try {
    const jobPostId = req.params.jobPostId;
    const jobPost = await jobListing.findById(jobPostId);
    // console.log("getJobPost", jobPost);
    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings,
        errors: {},
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
    return res.render("recruiter/editJobPost", {
      pageTitle: "Edit Job Post",
      path: "/jobPosts",
      jobPost: jobPost,
      errors: {},
      categories,
    });
  } catch (err) {
    console.error("Error getting edit job post:", err);
    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      errors: {},
      errorMessage: "An error occurred while getting the job post.",
    });
  }
};

exports.postEditJobPost = async (req, res, next) => {
  const jobPostId = req.body.jobPostId;
  let jobPost;
  let categories = await Category.find().select("name");
  const jobListings = await jobListing
    .find({ recruiterId: req.user._id })
    .sort({ updatedAt: -1 });
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
        errors,
        errorMessage: "Validation failed. Please correct the fields.",
      });
    }

    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
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
    const { experience, skills } = req.query;
    const targetExperience = experience ? parseInt(experience) * 12 : null;
    const skillsArray = skills ? skills.split(",").map((s) => s.trim()) : [];

    const jobSeekers = await User.find({ role: "jobSeeker" }).populate(
      "profileId"
    );

    const filteredJobSeekers = jobSeekers.filter((jobSeeker) => {
      const profile = jobSeeker.profileId;

      if (!profile) return false;

      const matchExperience = targetExperience
        ? profile.totalExperience >= targetExperience
        : true;

      const matchSkills =
        skillsArray.length > 0
          ? skillsArray.every((skill) => profile.skills?.includes(skill))
          : true;

      return matchExperience && matchSkills;
    });
    // console.log("jobseekeres", filteredJobSeekers);
    // console.log("experience and skills", experience, skills)
    if (filteredJobSeekers.length === 0) {
      res.status(404).render("recruiter/viewJobSeekers", {
        pageTitle: "Job Seekers",
        path: "/viewJobSeekers",
        errorMessage: "No job seekers found with the provided criteria.",
        jobSeekers,
        experience: req.query.experience || "",
        skills: req.query.skills || "",
      });
    } else {
      res.render("recruiter/viewJobSeekers", {
        pageTitle: "Job Seekers",
        path: "/viewJobSeekers",
        jobSeekers: filteredJobSeekers,
        experience: req.query.experience || "",
        skills: req.query.skills || "",
      });
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};
