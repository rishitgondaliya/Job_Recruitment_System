const Job = require("../models/jobListing");
const Category = require("../models/jobCategory");
const jobListing = require("../models/jobListing");

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
  let categories;

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
        errors: { categoryName: "Plese select category." },
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
    };

    // Create new Job
    const newJob = new Job({
      recruiterId: req.user._id,
      categoryId: category._id,
      category: categoryName,
      jobDetail: jobDetail,
    });

    await newJob.save();

    res.cookie("successMessage", "Job posted successfully", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.redirect("/recruiter/jobPosts");
  } catch (err) {
    let errors = {};

    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        // Use short field names if needed, or use full path
        const shortKey = field.split(".").pop();
        errors[shortKey] = err.errors[field].message;
      }
    } else {
      console.log("Unexpected error:", err);
      errors.general = "Something went wrong, please try again.";
    }

    return res.render("recruiter/addNewJob", {
      pageTitle: "Add new job",
      path: "/addNewJob",
      errors,
      formData: req.body,
      categories,
    });
  }
};

exports.getJobPosts = async (req, res) => {
  let jobListings = {};
  try {
    if (!req.user || req.user.role !== "recruiter") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }
    jobListings = await jobListing.find({ recruiterId: req.user._id });
    return res.render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings,
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error("Error fetching jobPosts:", err);
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
  try {
    const jobPostId = req.body.jobPostId;

    const jobPost = await jobListing.findById(jobPostId);

    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings: await jobListing.find({ recruiterId: req.user._id }),
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
      jobListings: await jobListing.find({ recruiterId: req.user._id }),
      errors: {},
      successMessage: "Job post deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting job post:", err);
    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings: await jobListing.find({ recruiterId: req.user._id }),
      errors: {},
      errorMessage: "An error occurred while deleting the job post.",
    });
  }
};

exports.getEditJobPost = async (req, res, next) => {
  try {
    const jobPostId = req.params.jobPostId
    const jobPost = await jobListing.findById(jobPostId)
    // console.log(jobPost)
    if (!jobPost) {
      return res.status(404).render("recruiter/jobPosts", {
        pageTitle: "Job Posts",
        path: "/jobPosts",
        jobListings: await jobListing.find({ recruiterId: req.user._id }),
        errors: {},
        errorMessage: "Job post not found.",
      })
    }
    if (!req.user || String(req.user._id) !== String(jobPost.recruiterId)){
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage: "Access denied! You are not authorized to edit this job post."
      })
    }
    return res.render("recruiter/editJobPost", {
      pageTitle: "Edit Job Post",
      path: '/jobPosts',
      jobPost: jobPost.jobDetail,
      errors: {},
      categories: await Category.find().select("name")
    })
  } catch(err){
    console.error("Error getting edit job post:", err)
    return res.status(500).render("recruiter/jobPosts", {
      pageTitle: "Job Posts",
      path: "/jobPosts",
      jobListings: await jobListing.find({ recruiterId: req.user._id }),
      errors: {},
      errorMessage: "An error occurred while getting the job post."
    })
  }
}
