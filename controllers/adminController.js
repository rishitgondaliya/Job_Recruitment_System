const User = require("../models/user");
const Profile = require("../models/profile");
const Category = require("../models/jobCategory");

exports.getAdminHome = (req, res, next) => {
  return res.render("admin/home", {
    pageTitle: "Home | Admin",
    path: "/home",
  });
};

exports.getUsers = async (req, res) => {
  try {
    // Pagination query parameters
    const jobSeekerPage = parseInt(req.query.jobSeekerPage) || 1; // Default to page 1 if not provided
    const recruiterPage = parseInt(req.query.recruiterPage) || 1; // Default to page 1 if not provided
    const userLimit = parseInt(req.query.userLimit) || 5; // Default to 5 users per page if not provided

    // Skip calculation for pagination
    const jobSeekerSkip = (jobSeekerPage - 1) * userLimit;
    const recruiterSkip = (recruiterPage - 1) * userLimit;

    // Fetch Job Seekers and Recruiters with pagination
    const jobSeekers = await User.find({ role: "jobSeeker" })
      .skip(jobSeekerSkip)
      .limit(userLimit);

    const recruiters = await User.find({ role: "recruiter" })
      .skip(recruiterSkip)
      .limit(userLimit);

    // Fetch the total count for both roles
    const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
    const totalRecruiters = await User.countDocuments({ role: "recruiter" });

    // Calculate total pages for Job Seekers and Recruiters
    const totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
    const totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

    // Render the page with necessary data
    res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      jobSeekers,
      recruiters,
      userLimit,
      jobSeekerPage,
      recruiterPage,
      totalJobSeekerPages,
      totalRecruiterPages,
    });
  } catch (err) {
    // Log error and render the page with error message
    console.error("Error fetching users:", err);

    // Render with error message if there's an issue
    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      jobSeekers: [], // Empty arrays in case of error to avoid sending incomplete data
      recruiters: [],
      userLimit: req.query.userLimit || 5,
      jobSeekerPage: req.query.jobSeekerPage || 1,
      recruiterPage: req.query.recruiterPage || 1,
      totalJobSeekerPages: 0,
      totalRecruiterPages: 0,
      errorMessage: "Cannot fetch users, please try again",
    });
  }
};

exports.getAddCategory = async (req, res) => {
  try {
    const categories = await Category.find().select("name");

    return res.render("admin/jobCategories", {
      pageTitle: "Add Category",
      path: "/jobCategories",
      categories,
      errors: {},
      isEditing: false,
      showForm: true,
      oldInput: {},
    });
  } catch (err) {
    console.log(err);
    next({ message: "something went wrong, please try again" });
  }
};

exports.postAddCategory = async (req, res) => {
  const errors = {}; // Object to hold any validation or error messages
  const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
  const limit = parseInt(req.query.limit) || 5; // Default limit is 5 if not provided
  const skip = (page - 1) * limit; // Skip value for pagination
  let categories;
  let totalCategories;
  let totalPages;

  try {
    // Fetching categories for pagination
    categories = await Category.find().select("name").skip(skip).limit(limit);

    // Fetching the total number of categories for pagination
    totalCategories = await Category.countDocuments();
    totalPages = Math.ceil(totalCategories / limit); // Total pages calculation

    // Creating a new category
    const category = new Category({ name: req.body.name });
    await category.save(); // Save category to the database

    res.cookie("successMessage", "Job category added successfully", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/admin/jobCategories");
  } catch (err) {
    // Check for duplicate entry error (MongoDB specific)
    if (err.code === 11000) {
      errors.name = "Job category already exists!";
    }
    // Check for validation errors
    else if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    }

    console.error("Formatted error:", errors);
    // Re-render the page with error messages and previous data
    return res.render("admin/jobCategories", {
      pageTitle: "Add Category",
      path: "/jobCategories",
      categories,
      currentPage: page,
      limit,
      totalPages,
      errors,
      isEditing: false,
      showForm: true,
      oldInput: req.body, // Re-populate the form with old input
    });
  }
};

exports.getJobCategories = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  try {
    const categories = await Category.find()
      .select("name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("admin/jobCategories", {
      pageTitle: "Job Categories",
      path: "/jobCategories",
      isEditing: false,
      showForm: false,
      oldInput: {},
      errors: {},
      categories,
      currentPage: page,
      limit,
      totalPages,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.getEditCategory = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  try {
    const categories = await Category.find()
      .select("name")
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    const category = await Category.findById(req.params.categoryId);

    if (!category) {
      return res.status(404).render("admin/jobCategories", {
        pageTitle: "Job Categories",
        path: "/jobCategories",
        categories,
        currentPage: page,
        limit,
        totalPages,
        errorMessage: "Category not found",
        isEditing: true,
        showForm: true,
        oldInput: {},
        errors: {},
      });
    }
    return res.render("admin/jobCategories", {
      pageTitle: "Edit Category",
      path: "/jobCategories",
      category,
      categories,
      currentPage: page,
      limit,
      totalPages,
      errors: {},
      isEditing: true,
      showForm: true,
      oldInput: { name: category.name },
    });
  } catch (err) {
    console.error("Error fetching category:", err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.postEditCategory = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const categoryId = req.params.categoryId;
  let categories;
  let category;

  try {
    categories = await Category.find().select("name").skip(skip).limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).render("admin/jobCategories", {
        pageTitle: "Job Categories",
        path: "/jobCategories",
        categories,
        currentPage: page,
        limit,
        totalPages,
        errorMessage: "Category not found",
        isEditing: false,
        showForm: false,
        oldInput: {},
        errors: {},
      });
    }

    // update and save category
    category.name = req.body.name;
    await category.save();

    res.cookie("editSuccess", "Job Category updated successfully", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/admin/jobCategories");
  } catch (err) {
    let errors = {};
    console.error("Error updating category:", err);
    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    }

    return res.render("admin/jobCategories", {
      pageTitle: "Edit Category",
      path: "/jobCategories",
      category,
      categories,
      currentPage: page,
      limit,
      totalPages,
      errors,
      isEditing: true,
      showForm: true,
      oldInput: { name: req.body.name },
    });
  }
};

exports.deleteCategory = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const categoryId = req.body.categoryId;
  let categories;
  let totalPages;

  try {
    categories = await Category.find().select("name").skip(skip).limit(limit);

    const totalCategories = await Category.countDocuments();
    totalPages = Math.ceil(totalCategories / limit);

    // delete category from database
    await Category.findByIdAndDelete(categoryId);

    res.cookie("successMessage", "Job Category deleted successfully", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/admin/jobCategories");
  } catch (err) {
    console.error("Error deleting category:", err);

    res.render("admin/jobCategories", {
      pageTitle: "Job categories",
      path: "/jobCategories",
      categories,
      currentPage: page,
      limit,
      totalPages,
      errorMessage: "Error deleting job category",
      isEditing: false,
      showForm: false,
      oldInput: {},
      errors: {},
    });
  }
};

exports.deactivateUser = async (req, res, next) => {
  const jobSeekerPage = parseInt(req.query.jobSeekerPage) || 1;
  const recruiterPage = parseInt(req.query.recruiterPage) || 1;
  const userLimit = parseInt(req.query.userLimit) || 5;

  const jobSeekerSkip = (jobSeekerPage - 1) * userLimit;
  const recruiterSkip = (recruiterPage - 1) * userLimit;

  const userId = req.body.userId;

  let jobSeekers;
  let recruiters;
  let totalJobSeekerPages;
  let totalRecruiterPages;

  try {
    jobSeekers = await User.find({ role: "jobSeeker" })
      .skip(jobSeekerSkip)
      .limit(userLimit);

    recruiters = await User.find({ role: "recruiter" })
      .skip(recruiterSkip)
      .limit(userLimit);

    const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
    const totalRecruiters = await User.countDocuments({ role: "recruiter" });

    totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
    totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

    // update user
    const user = await User.findByIdAndUpdate(userId, { isActive: false });

    if (!user) {
      return res.render("admin/users", {
        pageTitle: "Users",
        path: "/users",
        jobSeekers,
        recruiters,
        userLimit,
        jobSeekerPage,
        recruiterPage,
        totalJobSeekerPages,
        totalRecruiterPages,
        errorMessage: "User not found",
      });
    }

    res.cookie("successMessage", "User deactivated successfully!", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/admin/users");
  } catch (err) {
    console.error("Error deactivating user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      jobSeekers,
      recruiters,
      userLimit,
      jobSeekerPage,
      recruiterPage,
      totalJobSeekerPages,
      totalRecruiterPages,
      errorMessage: "An error occurred while deactivating the user.",
    });
  }
};

exports.activateUser = async (req, res, next) => {
  const jobSeekerPage = parseInt(req.query.jobSeekerPage) || 1;
  const recruiterPage = parseInt(req.query.recruiterPage) || 1;
  const userLimit = parseInt(req.query.userLimit) || 5;

  const jobSeekerSkip = (jobSeekerPage - 1) * userLimit;
  const recruiterSkip = (recruiterPage - 1) * userLimit;

  const userId = req.body.userId;

  let jobSeekers;
  let recruiters;
  let totalJobSeekerPages;
  let totalRecruiterPages;

  try {
    jobSeekers = await User.find({ role: "jobSeeker" })
      .skip(jobSeekerSkip)
      .limit(userLimit);

    recruiters = await User.find({ role: "recruiter" })
      .skip(recruiterSkip)
      .limit(userLimit);

    const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
    const totalRecruiters = await User.countDocuments({ role: "recruiter" });

    totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
    totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

    // update user
    const user = await User.findByIdAndUpdate(userId, { isActive: true });

    if (!user) {
      return res.render("admin/users", {
        pageTitle: "Users",
        path: "/users",
        jobSeekers,
        recruiters,
        userLimit,
        jobSeekerPage,
        recruiterPage,
        totalJobSeekerPages,
        totalRecruiterPages,
        errorMessage: "User not found",
      });
    }

    res.cookie("successMessage", "User activated successfully!", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/admin/users");
  } catch (err) {
    console.error("Error activating user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      jobSeekers,
      recruiters,
      userLimit,
      jobSeekerPage,
      recruiterPage,
      totalJobSeekerPages,
      totalRecruiterPages,
      errorMessage: "An error occurred while activating the user.",
    });
  }
};

exports.deleteUser = async (req, res, next) => {
  const jobSeekerPage = parseInt(req.query.jobSeekerPage) || 1;
  const recruiterPage = parseInt(req.query.recruiterPage) || 1;
  const userLimit = parseInt(req.query.userLimit) || 5;

  const jobSeekerSkip = (jobSeekerPage - 1) * userLimit;
  const recruiterSkip = (recruiterPage - 1) * userLimit;

  const userId = req.body.userId;

  let jobSeekers;
  let recruiters;
  let totalJobSeekerPages;
  let totalRecruiterPages;

  try {
    jobSeekers = await User.find({ role: "jobSeeker" })
      .skip(jobSeekerSkip)
      .limit(userLimit);

    recruiters = await User.find({ role: "recruiter" })
      .skip(recruiterSkip)
      .limit(userLimit);

    const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
    const totalRecruiters = await User.countDocuments({ role: "recruiter" });

    totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
    totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

    // delete user
    const user = await User.findByIdAndDelete(userId);

    await Profile.findOneAndDelete({ userId: userId });

    if (!user) {
      return res.render("admin/users", {
        pageTitle: "Users",
        path: "/users",
        jobSeekers,
        recruiters,
        userLimit,
        jobSeekerPage,
        recruiterPage,
        totalJobSeekerPages,
        totalRecruiterPages,
        errorMessage: "User not found",
      });
    }

    res.cookie("successMessage", "User deleted successfully!", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/admin/users");
  } catch (err) {
    console.error("Error deleting user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      jobSeekers,
      recruiters,
      userLimit,
      jobSeekerPage,
      recruiterPage,
      totalJobSeekerPages,
      totalRecruiterPages,
      errorMessage: "An error occurred while deleting the user.",
    });
  }
};
