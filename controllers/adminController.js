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
    const users = await User.find({ role: { $ne: "admin" } });
    let successMessage = "Fetched users successfully";
    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      users,
      successMessage,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    let errorMessage = "can not fetched users, please try again";
    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      errorMessage,
    });
  }
};

exports.getAddCategory = async (req, res) => {
  try {
    return res.render("admin/jobCategories", {
      pageTitle: "Add Category",
      path: "/jobCategories",
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
  try {
    const category = new Category({ name: req.body.name });
    await category.save();
    let successMessage = "Job category added successfully";
    return res.render("admin/jobCategories", {
      pageTitle: "Job Categories",
      path: "/jobCategories",
      categories: await Category.find().select("name"),
      isEditing: false,
      showForm: false,
      successMessage,
      oldInput: {},
      errors: {},
    });
  } catch (err) {
    console.error("Raw error:", err); // Log full error object first

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
      categories: await Category.find().select("name"),
      errors: errors,
      isEditing: false,
      showForm: true,
      oldInput: req.body,
    });
  }
};

exports.getJobCategories = async (req, res) => {
  try {
    const categories = await Category.find().select("name");
    res.render("admin/jobCategories", {
      pageTitle: "Job Categories",
      path: "/jobCategories",
      isEditing: false,
      showForm: false,
      oldInput: {},
      errors: {},
      categories,
      // successMessage: "Job categories fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.cookie("errorMessage", "Error while fetching job categories", {
      maxAge: 3000,
      httpOnly: false,
    });
    res.status(500).render("admin/jobCategories", {
      pageTitle: "Job Categories",
      path: "/jobCategories",
      isEditing: false,
      showForm: false,
      oldInput: {},
      errors: {},
    });
  }
};

exports.getEditCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    // console.log("id", req.params.categoryId);
    if (!category) {
      return res.status(404).render("admin/jobCategories", {
        pageTitle: "Job Categories",
        path: "/jobCategories",
        categories: await Category.find().select("name"),
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
      categories: await Category.find().select("name"),
      errors: {},
      isEditing: true,
      showForm: true,
      oldInput: { name: category.name },
    });
  } catch (err) {
    console.error("Error fetching category:", err);
    next({ message: "Internal Server Error" });
  }
};

exports.postEditCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId;
  const category = await Category.findById(categoryId);
  const categories = await Category.find().select("name");
  try {
    // console.log(categoryId, "categoryId");
    if (!category) {
      return res.status(404).render("admin/jobCategories", {
        pageTitle: "Job Categories",
        path: "/jobCategories",
        categories,
        errorMessage: "Category not found",
        isEditing: false,
        showForm: false,
        oldInput: {},
        errors: {},
      });
    }
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
      errors,
      isEditing: true,
      showForm: true,
      oldInput: { name: req.body.name },
    });
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const categoryId = req.body.categoryId;
    await Category.findByIdAndDelete(categoryId);

    res.render("admin/jobCategories", {
      pageTitle: "Job categories",
      path: "/jobCategories",
      categories: await Category.find(),
      successMessage: "Job Category deleted successfully",
      isEditing: false,
      showForm: false,
      oldInput: {},
      errors: {},
    });
  } catch (err) {
    console.error("Error deleting category:", err);

    res.render("admin/jobCategories", {
      pageTitle: "Job categories",
      path: "/jobCategories",
      categories: await Category.find(),
      errorMessage: "Error deleting job category",
      isEditing: false,
      showForm: false,
      oldInput: {},
      errors: {},
    });
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const userId = req.body.userId;
    // console.log(userId);
    const user = await User.findByIdAndUpdate(userId, { isActive: false });

    if (!user) {
      return res.render("admin/users", {
        pageTitle: "Users",
        path: "/users",
        users: await User.find(),
        errorMessage: "User not found",
      });
    }

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      users: await User.find(),
      successMessage: "User deactivated successfully!",
    });
  } catch (err) {
    console.error("Error deactivating user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      users: await User.find(),
      errorMessage: "An error occurred while deactivating the user.",
    });
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const userId = req.body.userId;
    // console.log(userId);
    const user = await User.findByIdAndUpdate(userId, { isActive: true });

    if (!user) {
      return res.render("admin/users", {
        pageTitle: "Users",
        path: "/users",
        users: await User.find(),
        errorMessage: "User not found",
      });
    }

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      users: await User.find(),
      successMessage: "User activated successfully!",
    });
  } catch (err) {
    console.error("Error activating user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      users: await User.find(),
      errorMessage: "An error occurred while activating the user.",
    });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: "/500",
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const userId = req.body.userId;
    const user = await User.findByIdAndDelete(userId);

    await Profile.findOneAndDelete({ userId: userId });

    if (!user) {
      return res.render("admin/users", {
        pageTitle: "Users",
        path: "/users",
        users: await User.find(),
        errorMessage: "User not found",
      });
    }

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      users: await User.find(),
      successMessage: "User deleted successfully!",
    });
  } catch (err) {
    console.error("Error deleting user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: "/users",
      users: await User.find(),
      errorMessage: "An error occurred while deleting the user.",
    });
  }
};
