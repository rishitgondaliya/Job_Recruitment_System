const User = require("../models/user");
const Profile = require("../models/profile");
const Category = require("../models/jobCategory");

exports.getAdminHome = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).render("500", {
      pageTitle: "Unauthorized",
      path: '/500',
      errorMessage: "Access denied ! You are not authorized to view this page.",
    });
  }

  return res.render("admin/home", {
    pageTitle: "Home | Admin",
    path: '/home'
  });
};

exports.getUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
        errorMessage: "Access  ! You are not authorized to view this page.",
      });
    }

    const users = await User.find({ role: { $ne: "admin" } });
    let successMessage = "Fetched users successfully";
    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
      users,
      successMessage,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    let errorMessage = "can not fetched users, please try again";
    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
      errorMessage,
    });
  }
};

exports.getAddCategory = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
        errorMessage: "Access  ! You are not authorized to view this page.",
      });
    }

    return res.render("admin/addCategory", {
      pageTitle: "Add Category",
      path: '/addCategory',
      errors: {},
      isEditing: false,
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
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
        errorMessage: "Access  ! You are not authorized to view this page.",
      });
    }

    const category = new Category({ name: req.body.name });
    await category.save();
    let successMessage = "Job category added successfully";
    return res.render("admin/addCategory", {
      pageTitle: "Add Category",
      path: '/addCategory',
      errors,
      successMessage,
      isEditing: false,
      oldInput: {},
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
    return res.render("admin/addCategory", {
      pageTitle: "Add Category",
      errors: errors,
      isEditing: false,
      oldInput: {},
    });
  }
};

exports.getJobCategories = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const categories = await Category.find();
    let successMessage = "Job categories fetched successfully";
    res.render("admin/jobCategories", {
      pageTitle: "Job Categories",
      path: '/jobCategories',
      categories,
      successMessage,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).render("admin/jobCategories", {
      pageTitle: "Job Categories",
      path: '/jobCategories',
      errorMessage: "Error while fetching job categories",
    });
  }
};

exports.getEditCategory = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const category = await Category.findById(req.params.categoryId);
    // console.log("id", req.params.categoryId);
    if (!category) {
      return res.status(404).render("admin/jobCategories", {
        pageTitle: "Job Categories",
        path: '/jobCategories',
        errorMessage: "Category not found",
        oldInput: {},
      });
    }
    return res.render("admin/addCategory", {
      pageTitle: "Edit Category",
      path: '/addCategory',
      category,
      errors: {},
      isEditing: true,
      oldInput: { name: category.name },
    });
  } catch (err) {
    console.error("Error fetching category:", err);
    next({ message: "Internal Server Error" });
  }
};

exports.postEditCategory = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const categoryId = req.params.categoryId;
    // console.log(categoryId, "categoryId");
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).render("admin/jobCategories", {
        pageTitle: "Job Categories",
        path: '/jobCategories',
        errorMessage: "Category not found",
        oldInput: {},
      });
    }
    category.name = req.body.name;
    await category.save();

    return res.render("admin/jobCategories", {
      pageTitle: "Job Categories",
      path: '/jobCategories',
      categories: await Category.find(),
      successMessage: "Category updated successfully",
    });
  } catch (err) {
    console.error("Error updating category:", err);

    return res.render("admin/addCategory", {
      pageTitle: "Edit Category",
      errorMessage: "Error updating category",
      errors: {},
      isEditing: true,
      oldInput: {},
    });
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
        errorMessage:
          "Access denied ! You are not authorized to view this page.",
      });
    }

    const categoryId = req.body.categoryId;
    await Category.findByIdAndDelete(categoryId);

    res.render("admin/jobCategories", {
      pageTitle: "Job categories",
      path: '/jobCategories',
      categories: await Category.find(),
      successMessage: "Job Category deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting category:", err);

    res.render("admin/jobCategories", {
      pageTitle: "Job categories",
      path: '/jobCategories',
      categories: await Category.find(),
      errorMessage: "Error deleting job category",
    });
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).render("500", {
        pageTitle: "Unauthorized",
        path: '/500',
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
        path: '/users',
        users: await User.find(),
        errorMessage: "User not found",
      });
    }

    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
      users: await User.find(),
      successMessage: "User deactivated successfully!",
    });
  } catch (err) {
    console.error("Error deactivating user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
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
        path: '/500',
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
        path: '/users',
        users: await User.find(),
        errorMessage: "User not found",
      });
    }

    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
      users: await User.find(),
      successMessage: "User activated successfully!",
    });
  } catch (err) {
    console.error("Error activating user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
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
        path: '/500',
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
        path: '/users',
        users: await User.find(),
        errorMessage: "User not found",
      });
    }

    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
      users: await User.find(),
      successMessage: "User deleted successfully!",
    });
  } catch (err) {
    console.error("Error deleting user:", err);

    return res.render("admin/users", {
      pageTitle: "Users",
      path: '/users',
      users: await User.find(),
      errorMessage: "An error occurred while deleting the user.",
    });
  }
};
