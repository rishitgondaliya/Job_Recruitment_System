const User = require("../models/user");
const Profile = require("../models/profile");
const Category = require("../models/jobCategory");
const Application = require("../models/application");
const savedJobs = require("../models/savedJobs");
const Interview = require("../models/interview");

exports.getAdminHome = (req, res, next) => {
  return res.render("admin/home", {
    pageTitle: "Home | Admin",
    path: "/home",
  });
};

exports.getJobSeekers = async (req, res) => {
  const { search, status } = req.query;
  try {
    const filter = { role: "jobSeeker" };
    // Pagination query parameters
    const jobSeekerPage = parseInt(req.query.jobSeekerPage) || 1; // Default to page 1 if not provided
    let userLimit = parseInt(req.query.userLimit) || 5; // Default to 5 users per page if not provided
    let jobSeekerSkip = (jobSeekerPage - 1) * userLimit;

    // Check if the limit is set to "All"
    if (req.query.userLimit === "All") {
      userLimit = Number.MAX_SAFE_INTEGER; // This ensures you fetch all items (or you could set another large number if you want).
      jobSeekerSkip = 0; // No need to skip any items when there's no pagination.
    }

    // Skip calculation for pagination

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      if (status === "active") {
        filter.isActive = true; // status for active users
      } else if (status === "inactive") {
        filter.isActive = false; // status for inactive users
      }
    }

    // Fetch Job Seekers and Recruiters with pagination
    const jobSeekers = await User.find(filter)
      .skip(jobSeekerSkip)
      .limit(userLimit);

    // Fetch the total count for both roles
    const totalJobSeekers = await User.countDocuments(filter);

    // Calculate total pages for Job Seekers and Recruiters
    const totalJobSeekerPages =
      userLimit === Number.MAX_SAFE_INTEGER
        ? 1
        : Math.ceil(totalJobSeekers / userLimit); // Only 1 page if "All";

    // Render the page with necessary data
    res.render("admin/jobSeekers", {
      pageTitle: "View Job Seekers",
      path: "/jobSeekers",
      jobSeekers,
      userLimit,
      jobSeekerPage,
      totalJobSeekerPages,
      searchQuery: search || "",
      status: status ? status : ''
    });
  } catch (err) {
    // Log error and render the page with error message
    console.error("Error fetching jobSeekers:", err);

    // Render with error message if there's an issue
    return res.render("admin/jobSeekers", {
      pageTitle: "View Job Seekers",
      path: "/jobSeekers",
      jobSeekers: [], // Empty arrays in case of error to avoid sending incomplete data
      userLimit: req.query.userLimit || 5,
      jobSeekerPage: req.query.jobSeekerPage || 1,
      totalJobSeekerPages: 0,
      searchQuery: search || "",
      status: status ? status : '',
      errorMessage: "Cannot fetch job seekers, please try again",
    });
  }
};

exports.getRecruiters = async (req, res) => {
  const { search, status } = req.query;
  try {
    const filter = { role: "recruiter" };
    // Pagination query parameters
    let recruiterPage = parseInt(req.query.recruiterPage) || 1; // Default to page 1 if not provided
    let userLimit = parseInt(req.query.userLimit) || 5; // Default to 5 users per page if not provided

    // Skip calculation for pagination
    let recruiterSkip = (recruiterPage - 1) * userLimit;

    if (req.query.userLimit === "All") {
      recruiterSkip = 0;
      userLimit = Number.MAX_SAFE_INTEGER;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    
    if(status){
      if (status.toLowerCase() === "active") {
        filter.isActive = true;
      } else if (status.toLowerCase() === "inactive") {
        filter.isActive = false;
      }
    }

    // Fetch Recruiters with pagination
    const recruiters = await User.find(filter)
      .skip(recruiterSkip)
      .limit(userLimit);

    // Fetch the total count for recruiters
    const totalRecruiters = await User.countDocuments(filter);

    // Calculate total pages for Recruiters
    const totalRecruiterPages =
      userLimit === "All" ? 1 : Math.ceil(totalRecruiters / userLimit);

    // Render the page with necessary data
    res.render("admin/recruiters", {
      pageTitle: "View Recruiters",
      path: "/recruiters",
      recruiters,
      userLimit,
      recruiterPage,
      totalRecruiterPages,
      searchQuery: search || "",
      status: status ? status.toLowerCase() : ''
    });
  } catch (err) {
    // Log error and render the page with error message
    console.error("Error fetching recruiters:", err);

    // Render with error message if there's an issue
    return res.render("admin/recruiters", {
      pageTitle: "View Recruiters",
      path: "/recruiters",
      recruiters: [],
      userLimit: req.query.userLimit || 5,
      recruiterPage: req.query.recruiterPage || 1,
      totalRecruiterPages: 0,
      searchQuery: search || "",
      status: status ? status.toLowerCase() : '',
      errorMessage: "Cannot fetch recruiters, please try again",
    });
  }
};

exports.getAddCategory = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
  const limit = parseInt(req.query.limit) || 5; // Default limit is 5 if not provided
  const skip = (page - 1) * limit;
  let categories;
  let totalCategories;
  let totalPages;

  try {
    // Fetching categories for pagination
    categories = await Category.find().select("name").skip(skip).limit(limit);

    // Fetching the total number of categories for pagination
    totalCategories = await Category.countDocuments();
    totalPages = Math.ceil(totalCategories / limit); // Total pages calculation

    return res.render("admin/jobCategories", {
      pageTitle: "Add Category",
      path: "/jobCategories",
      categories,
      currentPage: page,
      totalPages,
      limit,
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

    // console.error("Formatted error:", errors);
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
  let limit = parseInt(req.query.limit) || 5;
  let skip = (page - 1) * limit;

  // Check if the limit is set to "All"
  if (req.query.limit === "All") {
    limit = Number.MAX_SAFE_INTEGER; // This ensures you fetch all items (or you could set another large number if you want).
    skip = 0; // No need to skip any items when there's no pagination.
  }

  try {
    const categories = await Category.find()
      .select("name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCategories = await Category.countDocuments();
    const totalPages =
      limit === Number.MAX_SAFE_INTEGER
        ? 1
        : Math.ceil(totalCategories / limit); // Only 1 page if "All"

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
  let totalPages;

  try {
    categories = await Category.find().select("name").skip(skip).limit(limit);

    const totalCategories = await Category.countDocuments();
    totalPages = Math.ceil(totalCategories / limit);

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

exports.toggleUserStatus = async (req, res, next) => {
  const {userId, isActive} = req.body;
  const role = req.params.role; // 'jobSeeker' or 'recruiter'
  let user;
  try {
    // update user
    user = await User.findOneAndUpdate(
      { _id: userId, role },
      { isActive: isActive }
    );

    if (!user) {
      return res.render(`admin/${role}s`, {
        pageTitle: `${role}s`,
        path: `/${role}s`,
        errorMessage: "User not found or role mismatch",
      });
    }

    res.cookie("successMessage", `User has been ${isActive === 'true' ? 'activated' : 'deactivated'} successfully.`, {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect(`/admin/${role}s`);
  } catch (err) {
    console.error(`Error deactivating ${role}:`, err);

    return res.render(`admin/${role}s`, {
      pageTitle: `${role}s`,
      path: `/${role}s`,
      errorMessage: `An error occurred while ${isActive ? 'activating' : 'deactivating'} the user.`,
    });
  }
};

exports.deleteUser = async (req, res, next) => {
  const userId = req.body.userId;
  const role = req.params.role;
  let user;

  try {
    // delete user
    user = await User.findByIdAndDelete(userId);

    await Profile.findOneAndDelete({ userId: userId });

    if (!user) {
      return res.render(`admin/viewUserProfile/${userId}`, {
        pageTitle: `View Profile | ${user.firstName} ${user.lastName}`,
        path: `/${role}s`,
        errorMessage: "User not found",
      });
    }

    res.cookie("successMessage", "User deleted successfully!", {
      maxAge: 3000,
      httpOnly: false,
    });

    if (role === "jobSeeker") {
      return res.redirect(`/admin/jobSeekers`);
    } else if (role === "recruiter") {
      return res.redirect(`/admin/recruiters`);
    }
  } catch (err) {
    console.error("Error deleting user:", err);

    return res.render(`admin/viewUserProfile/${userId}`, {
      pageTitle: `View Profile | ${user.firstName} ${user.lastName}`,
      path: `/${role}s`,
      errorMessage: "An error occurred while deleting the user.",
    });
  }
};

exports.viewUserProfile = async (req, res, next) => {
  const userId = req.params.userId;
  try {
    const user = await User.findById(userId);
    const userProfile = await Profile.findById(user.profileId);
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
    if (user.role === "jobSeeker") {
      res.render("admin/jobSeekerProfile", {
        pageTitle: `View Profile | ${user.firstName} ${user.lastName}`,
        path: "/jobSeekers",
        profile: userProfile,
        user: user,
        savedJobs: savedJobsArray,
        applications,
        interviews,
      });
    } else if (user.role === "recruiter") {
      res.render("admin/recruiterProfile", {
        pageTitle: `View Profile | ${user.firstName} ${user.lastName}`,
        path: "/recruiters",
        profile: userProfile,
        user: user,
      });
    }
  } catch (error) {
    next(error);
  }
};
