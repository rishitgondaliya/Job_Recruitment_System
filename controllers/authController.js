const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const dotenv = require("dotenv");

const User = require("../models/user");
const Profile = require("../models/profile");
const Admin = require("../models/admin");

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.getRegister = async (req, res, next) => {
  try {
    res.status(422).render("auth/register", {
      pageTitle: "Register",
      path: "/register",
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error(err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.postRegister = async (req, res, next) => {
  let errors = {};
  const { firstName, lastName, email, phone, password, role, company } =
    req.body; // extract form data

  try {
    // check for existing user
    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      errors["email"] = "User with same email already exists";
      return res.status(422).render("auth/register", {
        pageTitle: "Register",
        path: "/register",
        errors,
        formData: req.body,
      });
    } else {
      // cretae new user
      const newUser = new User({
        firstName,
        lastName,
        email,
        phone,
        password,
        role,
        company: company ? company : undefined,
      });

      // save new user
      await newUser.save();

      // create empty profile
      let profileData = {
        userId: newUser._id,
        profileType: role,
        profilePhoto: "",
      };

      const emptyProfile = new Profile(profileData);

      // save profile
      await emptyProfile.save();

      newUser.profileId = emptyProfile._id;

      // save profileId in user
      await newUser.save();

      res.cookie(
        "successMessage",
        "You have registered successfully, Login now.",
        {
          maxAge: 3000,
          httpOnly: true,
        }
      );
      return res.redirect("/auth/login");
    }
  } catch (err) {
    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    } else if (err.message?.includes("Password must have at least")) {
      errors["password"] = err.message;
    }
    // console.log("errors", errors);
    return res.status(422).render("auth/register", {
      pageTitle: "Register",
      path: "/register",
      errors: errors,
      formData: req.body,
    });
  }
};

exports.getLogin = async (req, res) => {
  try {
    // If user is already logged in
    if (req.user) {
      const userRole = req.user.role;
      console.log("Logged-in user role:", userRole);

      // Redirect based on role
      if (userRole === "jobSeeker") {
        return res.redirect("/jobSeeker/home");
      } else if (userRole === "recruiter") {
        return res.redirect("/recruiter/jobPosts");
      }
    }

    // If not logged in, show login page
    return res.status(200).render("auth/login", {
      pageTitle: "Login",
      path: "/login",
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error(err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.getAdminLogin = async (req, res) => {
  try {
    // If user is already logged in
    if (req.user) {
      const userRole = req.user.role;
      return res.redirect("/admin/users");
    }

    // If not logged in, show login page
    return res.status(200).render("auth/adminLogin", {
      pageTitle: "Admin Login",
      path: "/login",
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error(err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.postLogin = async (req, res, next) => {
  let errors = {}; // errors object

  try {
    const { email, password } = req.body; // extract form data

    // Create a temporary user instance to validate schema rules
    const tempUser = new User({ email, password });

    try {
      // Validate only email and password (without saving)
      await tempUser.validate(["email", "password"]);
    } catch (validationErr) {
      for (const field in validationErr.errors) {
        errors[field] = validationErr.errors[field].message;
      }
      return res.status(400).render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // Proceed with login logic
    const user = await User.findOne({ email });

    if (!user) {
      errors.email = "User not found!";
      return res.status(404).render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // check if user is deActivated by admin
    if (!user.isActive) {
      errors.email =
        "You cannot login right now because admin has deactivated you!";
      return res.status(401).render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // match password
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      errors.password = "Incorrect password!";
      return res.status(401).render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // Set token and success message
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 60 * 60 * 1000,
    });

    const userRole = user.role;
    // redirect based on role
    if (userRole === "jobSeeker") {
      res.cookie("successMessage", "Job seeker login successfull.", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/jobSeeker/home");
    } else if (userRole === "recruiter") {
      res.cookie("successMessage", "Recruiter login successfull.", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/recruiter/jobPosts");
    } else {
      errors.email = "User role is invalid";
      return res.status(401).render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }
  } catch (error) {
    console.error("Error while logging in:", error);
    res.cookie("errorMessage", "Error while logging in", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.redirect("/auth/login");
  }
};

exports.adminLogin = async (req, res, next) => {
  let errors = {}; /// errors object

  try {
    const { email, password, adminSecret } = req.body; // extract form data

    // Create a temporary admin instance to validate schema rules
    const tempUser = new Admin({ email, password, adminSecret });

    try {
      // Validate only email, password and adminSecret (without saving)
      await tempUser.validate(["email", "password", "adminSecret"]);
    } catch (validationErr) {
      for (const field in validationErr.errors) {
        errors[field] = validationErr.errors[field].message;
      }
      // console.log("errors",errors)
      return res.status(400).render("auth/adminLogin", {
        pageTitle: "Admin Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // Proceed with login logic
    const user = await Admin.findOne({ email });

    if (!user) {
      errors.email = "Admin not found!";
      return res.status(401).render("auth/adminLogin", {
        pageTitle: "Admin Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // match password
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      errors.password = "Incorrect password!";
      return res.status(401).render("auth/adminLogin", {
        pageTitle: "Admin Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // match adminSecret
    const matchedAdminSecret = await bcrypt.compare(
      adminSecret,
      user.adminSecret
    );
    if (!matchedAdminSecret) {
      errors.adminSecret = "Incorrect adminSecret!";
      return res.status(401).render("auth/adminLogin", {
        pageTitle: "Admin Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // console.log("secretKey", secretKey);
    // console.log("adminSecret", user.adminSecret);

    // Set token and success message
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // console.log("token",token)

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("successMessage", "Admin login successfull.", {
      maxAge: 3000,
      httpOnly: false,
    });
    // console.log("user", req.user);
    return res.redirect("/admin/users");
  } catch (error) {
    console.error("Error while logging in:", error);
    res.cookie("errorMessage", "Error while logging in", {
      maxAge: 3000,
      httpOnly: false,
    });
    return res.redirect("/auth/admin/login");
  }
};

exports.logout = (req, res, next) => {
  try {
    // clear cookie on logout
    res.clearCookie("token", {
      path: "/", // it's the same path where you set the cookie
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    res.cookie("successMessage", "You have logged out successfully", {
      maxAge: 3000,
      httpOnly: false,
    });

    return res.redirect("/");
  } catch (err) {
    console.error("Logout error:", err);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.getForgotPassword = async (req, res, next) => {
  try {
    res.render("auth/resetPassword", {
      pageTitle: "Forgot Password",
      path: "/forgot-password",
      errors: {},
      formData: {},
    });
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.postForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // check for valid email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).render("auth/resetPassword", {
        pageTitle: "Forgot Password",
        path: "/forgot-password",
        errors: { email: "Enter a valid email address!" },
        formData: req.body,
      });
    }

    // find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).render("auth/resetPassword", {
        pageTitle: "Forgot Password",
        path: "/forgot-password",
        errors: { email: "User not found!" },
        formData: req.body,
      });
    }

    // set resetToken if user found
    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // save resetToken and resetTokenExpiry in database
    user.resetPasswordToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // set reset url
    const resetUrl = `http://localhost:3000/auth/resetPassword/${resetToken}`;

    // send email with reset link
    const msg = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset Password",
      text: "Click the link below to reset your password.",
      html: `<a href="${resetUrl}">Click here</a> to reset your password.`,
    };

    try {
      await sgMail.send(msg);
      return res.render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        formData: {},
        errors: {},
        successMessage: "Reset password email sent! Please check your inbox.",
      });
    } catch (error) {
      console.error("SendGrid Error:", error);
      return res.status(500).render("auth/resetPassword", {
        pageTitle: "Forgot Password",
        path: "/forgot-password",
        errors: { email: "Error sending reset email. Try again later." },
        formData: req.body,
      });
    }
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong. Please try again later." });
  }
};

exports.createNewPassword = async (req, res, next) => {
  try {
    // verify token and find user with valid token
    const resetToken = req.params.resetToken;
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.render("500", {
        pageTitle: "Error",
        path: "/",
        errorMessage: "Invalid or expired token!",
      });
    }

    return res.render("auth/createNewPassword", {
      pageTitle: "Create New Password",
      path: "/createNewPassword",
      errors: {},
      userId: user._id,
      resetToken,
      newPassword: "",
      confirmPassword: "",
    });
  } catch (error) {
    console.error("Error while creating new password:", error);
    next({ message: "Something went wrong! please try again later." });
  }
};

exports.postNewPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword, userId, resetToken } = req.body; // extract form data
    const errors = {}; // errors object

    // verify token
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetTokenExpiry: { $gt: Date.now() },
      _id: userId,
    });

    if (!user) {
      return res.render("500", {
        pageTitle: "Error",
        path: "/",
        errorMessage: "Invalid or expired token!",
      });
    }

    // validate password
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      errors.newPassword =
        "Password must be at least 8 characters long and include uppercase letters, numbers, and special characters!";

      return res.render("auth/createNewPassword", {
        pageTitle: "Create New Password",
        path: "/createNewPassword",
        errors: errors,
        userId: user._id,
        resetToken,
        newPassword,
        confirmPassword,
      });
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match!";
      return res.render("auth/createNewPassword", {
        pageTitle: "Create New Password",
        path: "/createNewPassword",
        errors: errors,
        userId: user._id,
        resetToken,
        newPassword,
        confirmPassword,
      });
    }

    // save hashedPassword
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    // delete resetToken and resetTokenExpiry
    user.resetPasswordToken = undefined;
    user.resetTokenExpiry = undefined;

    // save updated user
    await user.save({ validateBeforeSave: false });
    res.cookie(
      "successMessage",
      "Password updated successfully! Please log in with your new password.",
      {
        maxAge: 3000,
        httpOnly: false,
      }
    );
    return res.redirect("/auth/login");
  } catch (error) {
    console.log(error);
    next({ message: "Something went wrong! Please try again later." });
  }
};
