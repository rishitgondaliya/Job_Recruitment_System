const Job = require("../models/jobListing");
const Category = require("../models/jobCategory");

exports.getJobListing = async (req, res) => {
  let categories = {};
  try {
    categories = await Category.find().select("name");
    return res.render("recruiter/jobListing", {
      pageTitle: "Job Listing",
      categories,
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error("Error fetching jobListing:", err);
    return res.render("recruiter/jobListing", {
      pageTitle: "Job Listing",
      categories,
      errors: {},
      formData: {},
    });
  }
};

exports.postAddJobListing = async (req, res, next) => {
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
      return res.render("recruiter/jobListing", {
        pageTitle: "Job Listing",
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

    return res.render("recruiter/jobListing", {
      pageTitle: "Job Listing",
      errors: {},
      formData: {},
      successMessage: "Job posted successfully",
      categories,
    });

  } catch (err) {
    let errors = {};

    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        // Use short field names if needed, or use full path
        const shortKey = field.split('.').pop();
        errors[shortKey] = err.errors[field].message;
      }
    } else {
      console.log("Unexpected error:", err);
      errors.general = "Something went wrong, please try again.";
    }

    return res.render("recruiter/jobListing", {
      pageTitle: "Job Listing",
      errors,
      formData: req.body,
      categories,
    });
  }
};