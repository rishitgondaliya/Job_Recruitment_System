const User = require("../models/user");
const Profile = require("../models/profile");
const Category = require("../models/jobCategory");

exports.getAdminHome = (req, res, next) => {
  return res.render("admin/home", {
    pageTitle: "Home | Admin",
  });
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } });
    req.flash("success", "Fetched users successfully");
    let successMessage = req.flash("success")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      users,
      successMessage,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    req.flash("error", "can not fetched users");
    let errorMessage = req.flash("success")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      errorMessage,
    });
  }
};

exports.getAddCategory = async (req, res) => {
  try {
    return res.render("admin/addCategory", {
      pageTitle: "Add Category",
      errors: {},
      isEditing: false,
      oldInput: {},
    });
  } catch (err) {
    console.error("Error while adding job category:", err);
    next({ message: "Error while adding job category" });
  }
};

exports.postAddCategory = async (req, res) => {
  let errors = {};
  try {
    const category = new Category({ name: req.body.name });
    await category.save();
    req.flash("success", "Job category added successfully.");
    let successMessage = req.flash("success")[0];
    return res.render("admin/addCategory", {
      pageTitle: "Add Category",
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
    const categories = await Category.find();
    // console.log("categories:", categories);
    req.flash("success", "Job categories fetched successfully.");
    let successMessage = req.flash("success")[0];
    res.render("admin/jobCategories", {
      pageTitle: "Job Categories",
      categories,
      successMessage,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    req.flash("error", "error fetching job categories.");
    res.status(500).send("Internal Server Error");
  }
};

exports.getEditCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    console.log("id", req.params.categoryId);
    if (!category) {
      req.flash("error", "Category not found.");
      return res.redirect("/admin/jobCategories");
    }
    return res.render("admin/addCategory", {
      pageTitle: "Edit Category",
      category,
      errors: {},
      isEditing: true,
      oldInput: { name: category.name },
    });
  } catch (err) {
    console.error("Error fetching category:", err);
    req.flash("error", "Error fetching category.");
    res.status(500).send("Internal Server Error");
  }
};

exports.postEditCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId;
    // console.log(categoryId, "categoryId");
    const category = await Category.findById(categoryId);
    if (!category) {
      req.flash("error", "Category not found.");
      return res.redirect("/admin/jobCategories");
    }
    category.name = req.body.name;
    await category.save();
    req.flash("success", "Category updated successfully.");
    return res.render("admin/jobCategories", {
      pageTitle: "Job Categories",
      categories: await Category.find(),
      successMessage: req.flash("success")[0],
    });
    // return res.redirect('/admin/jobCategories')
  } catch (err) {
    console.error("Error updating category:", err);
    req.flash("error", "Error updating category.");
    return res.render("admin/addCategory", {
      pageTitle: "Edit Category",
      errorMessage: req.flash("error")[0],
      errors: {},
      isEditing: true,
      oldInput: {},
    });
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.body.categoryId;
    await Category.findByIdAndDelete(categoryId);
    req.flash("success", "Job Category deleted successfully");
    let successMessage = req.flash("success")[0];
    res.render("admin/jobCategories", {
      pageTitle: "Job categories",
      categories: await Category.find(),
      successMessage,
    });
  } catch (err) {
    console.error("Error deleting category:", err);
    req.flash("error", "Error deleting job category");
    let errorMessage = req.flash("error")[0];
    res.render("admin/jobCategories", {
      pageTitle: "Job categories",
      categories: await Category.find(),
      errorMessage,
    });
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    console.log(userId);
    const user = await User.findByIdAndUpdate(userId, { isActive: false });

    if (!user) {
      //   console.log("user not found");
      req.flash("error", "User not found");
      let errorMessage = req.flash("error")[0];
      return res.render("admin/users", {
        pageTitle: "Users",
        users: await User.find(),
        errorMessage,
      });
    }

    req.flash("success", "User deactivated successfully!");
    let successMessage = req.flash("success")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      users: await User.find(),
      successMessage,
    });
  } catch (err) {
    // console.error("Error deactivating user:", err);
    req.flash("error", "An error occurred while deactivating the user.");
    let errorMessage = req.flash("error")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      users: await User.find(),
      errorMessage,
    });
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    console.log(userId);
    const user = await User.findByIdAndUpdate(userId, { isActive: true });

    if (!user) {
      //   console.log("user not found");
      req.flash("error", "User not found.");
      let errorMessage = req.flash("error")[0];
      return res.render("admin/users", {
        pageTitle: "Users",
        users: await User.find(),
        errorMessage,
      });
    }

    req.flash("success", "User activated successfully!");
    let successMessage = req.flash("success")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      users: await User.find(),
      successMessage,
    });
  } catch (err) {
    // console.error("Error deactivating user:", err);
    req.flash("error", "An error occurred while deactivating the user.");
    let errorMessage = req.flash("error")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      users: await User.find(),
      errorMessage,
    });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const user = await User.findByIdAndDelete(userId);

    await Profile.findOneAndDelete({ userId: userId });

    if (!user) {
      req.flash("error", "User not found!");
      let errorMessage = req.flash("error")[0];
      return res.render("admin/users", {
        pageTitle: "Users",
        users: await User.find(),
        errorMessage,
      });
    }

    req.flash("success", "User deleted successfully!");
    let successMessage = req.flash("success")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      users: await User.find(),
      successMessage,
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    req.flash("error", "An error occurred while deleting the user.");
    let errorMessage = req.flash("error")[0];
    return res.render("admin/users", {
      pageTitle: "Users",
      users: await User.find(),
      errorMessage,
    });
  }
};
