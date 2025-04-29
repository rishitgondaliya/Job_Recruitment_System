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
  // pagination
  const jobSeekerPage = parseInt(req.query.jobSeekerPage) || 1;
  const recruiterPage = parseInt(req.query.recruiterPage) || 1;
  const userLimit = parseInt(req.query.userLimit) || 5;

  const jobSeekerSkip = (jobSeekerPage - 1) * userLimit;
  const recruiterSkip = (recruiterPage - 1) * userLimit;

  const jobSeekers = await User.find({ role: "jobSeeker" })
    .skip(jobSeekerSkip)
    .limit(userLimit);

  const recruiters = await User.find({ role: "recruiter" })
    .skip(recruiterSkip)
    .limit(userLimit);

  const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
  const totalRecruiters = await User.countDocuments({ role: "recruiter" });

  const totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
  const totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

  try {
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
    console.error("Error fetching users:", err);
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
      errorMessage: "Cannot fetch users, please try again",
    });
  }
};

exports.getAddCategory = async (req, res) => {
  const categories = await Category.find().select("name");
  try {
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
  let errors = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const categories = await Category.find()
    .select("name")
    .skip(skip)
    .limit(limit);
  const totalCategories = await Category.countDocuments();
  const totalPages = Math.ceil(totalCategories / limit);
  try {
    const category = new Category({ name: req.body.name });
    await category.save();
    res.cookie("successMessage", "Job category added successfully", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.redirect("/admin/jobCategories");
  } catch (err) {
    console.error("Raw error:", err); // Log full error object first

    // prevent duplicate entry
    if (err.cause && err.cause.code === 11000) {
      errors.name = "Job category already exists!";
    } else if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    }

    console.error("Formatted error:", errors);
    return res.render("admin/jobCategories", {
      pageTitle: "Add Category",
      path: "/jobCategories",
      categories,
      currentPage: page,
      limit,
      totalPages,
      errors: errors,
      isEditing: false,
      showForm: true,
      oldInput: req.body,
    });
  }
};

exports.getJobCategories = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const categories = await Category.find()
    .select("name")
    .skip(skip)
    .limit(limit);
  const totalCategories = await Category.countDocuments();
  const totalPages = Math.ceil(totalCategories / limit);
  try {
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

  const categories = await Category.find()
    .select("name")
    .skip(skip)
    .limit(limit);

  const totalCategories = await Category.countDocuments();
  const totalPages = Math.ceil(totalCategories / limit);

  try {
    const category = await Category.findById(req.params.categoryId);
    // console.log("id", req.params.categoryId);
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

  const categories = await Category.find()
    .select("name")
    .skip(skip)
    .limit(limit);

  const totalCategories = await Category.countDocuments();
  const totalPages = Math.ceil(totalCategories / limit);

  const categoryId = req.params.categoryId;
  const category = await Category.findById(categoryId);

  try {
    // console.log(categoryId, "categoryId");
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

  const categories = await Category.find()
    .select("name")
    .skip(skip)
    .limit(limit);

  const totalCategories = await Category.countDocuments();
  const totalPages = Math.ceil(totalCategories / limit);

  try {
    // delete category
    const categoryId = req.body.categoryId;
    await Category.findByIdAndDelete(categoryId);

    res.cookie("successMessage", "Job Category deleted successfully", {
      maxAge: 3000,
      httpOnly: false,
    });
    res.redirect("/admin/jobCategories");
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

  const jobSeekers = await User.find({ role: "jobSeeker" })
    .skip(jobSeekerSkip)
    .limit(userLimit);

  const recruiters = await User.find({ role: "recruiter" })
    .skip(recruiterSkip)
    .limit(userLimit);

  const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
  const totalRecruiters = await User.countDocuments({ role: "recruiter" });

  const totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
  const totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

  try {
    const userId = req.body.userId;
    // console.log(userId);

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

  const jobSeekers = await User.find({ role: "jobSeeker" })
    .skip(jobSeekerSkip)
    .limit(userLimit);

  const recruiters = await User.find({ role: "recruiter" })
    .skip(recruiterSkip)
    .limit(userLimit);

  const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
  const totalRecruiters = await User.countDocuments({ role: "recruiter" });

  const totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
  const totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

  try {
    const userId = req.body.userId;
    // console.log(userId);

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

  const jobSeekers = await User.find({ role: "jobSeeker" })
    .skip(jobSeekerSkip)
    .limit(userLimit);

  const recruiters = await User.find({ role: "recruiter" })
    .skip(recruiterSkip)
    .limit(userLimit);

  const totalJobSeekers = await User.countDocuments({ role: "jobSeeker" });
  const totalRecruiters = await User.countDocuments({ role: "recruiter" });

  const totalJobSeekerPages = Math.ceil(totalJobSeekers / userLimit);
  const totalRecruiterPages = Math.ceil(totalRecruiters / userLimit);

  try {
    const userId = req.body.userId;

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
