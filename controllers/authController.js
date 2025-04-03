const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// const flash = require("connect-flash");
// const session = require("express-session");

const User = require("../models/user");
const Profile = require("../models/profile");

exports.getRegister = async (req, res) => {
  try {
    res.status(422).render("auth/register", {
      pageTitle: "Register",
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error(err);
  }
};

exports.postRegister = async (req, res, next) => {
  let errors = {};
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      errors["email"] = "User with same email already exists";
      return res.status(422).render("auth/register", {
        pageTitle: "Register",
        errors,
        formData: req.body,
      });
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/;

      if (!password) {
        errors.password = "Password is required";
      } else if (!passwordRegex.test(password)) {
        errors.password =
          "Password must be at least 8 characters long, including an uppercase letter, a lowercase letter, a number, and a special character.";
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).render("auth/register", {
          pageTitle: "Register",
          errors,
          formData: req.body,
        });
      }
      const hashedPassword = await bcrypt.hash(password.toString(), 12);

      const newUser = new User({
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role,
      });

      await newUser.save();

      let profileData = {
        userId: newUser._id,
        profileType: role,
      };

      if (role === "jobSeeker") {
        profileData = {
          ...profileData,
          about: "",
          education: {
            college: "",
            degree: "",
            branch: "",
            grade: null,
            yearOfPassing: null,
          },
          resume: null,
          skills: [],
          savedJobs: [],
          experience: [],
        };
      } else if (role === "recruiter") {
        profileData = {
          ...profileData,
          experience: [],
          companyName: "",
          companyWebsite: "",
          industryType: "",
          position: "",
          jobListing: [],
        };
      } else {
        profileData = {
          ...profileData,
          experience: undefined,
        };
      }

      const emptyProfile = new Profile(profileData);
      await emptyProfile.save();

      newUser.profileId = emptyProfile._id;
      await newUser.save();

      req.flash("success", "User registered successfully");
      res.redirect("/auth/login");
    }
  } catch (err) {
    console.log(err);

    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    }

    res.status(422).render("auth/register", {
      pageTitle: "Register",
      errors: errors,
      formData: req.body,
    });
  }
};

exports.getLogin = async (req, res) => {
  try {
    res.status(422).render("auth/login", {
      pageTitle: "Login",
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error(err);
  }
};

exports.postLogin = async (req, res, next) => {
  let errors = {};
  try {
    const { email, password } = req.body;
    if (!email) {
      errors.email = "Email is required";
      return res.status(401).render("auth/login", {
        pageTitle: "Login",
        errors,
        formData: req.body,
      });
    } else if (!password) {
      errors.password = "Password is required";
      return res.status(401).render("auth/login", {
        pageTitle: "Login",
        errors,
        formData: req.body,
      });
    } else {
      const user = await User.findOne({ email });

      if (!user) {
        errors.email = "User not found!";
        return res.status(401).render("auth/login", {
          pageTitle: "Login",
          errors,
          formData: req.body,
        });
      }

      if (!user.isActive) {
        errors.email =
          "You can not login right now beacuse admin has deactivated you!";
        return res.status(401).render("auth/login", {
          pageTitle: "Login",
          errors,
          formData: req.body,
        });
      }
      const isMatched = await bcrypt.compare(password, user.password);
      if (!isMatched) {
        errors.password = "Incorrect password!";
        return res.status(401).render("auth/login", {
          pageTitle: "Login",
          errors,
          formData: req.body,
        });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, {
        httpOnly: true, // The cookie cannot be accessed via JavaScript, only server can access
        // secure: true, // The cookie will only be sent over HTTPS connections
        sameSite: "Strict", // The cookie will not be sent along with requests from external sites, reducing CSRF (Cross-Site Request Forgery) risks.
      });

      // Set authentication status
      req.session.isLoggedIn = true;
      req.session.user = user;

      // console.log("Session after login:", req.session)

      req.flash("success", "Logged in successfully");

      req.session.save(() => {
        const userRole = req.session.user.role;
        if (userRole === "jobSeeker") {
          return res.redirect("/jobSeeker/home");
        } else if (userRole === "recruiter") {
          return res.redirect("/recruiter/home");
        } else if (userRole === "admin") {
          return res.redirect("/admin/home");
        } else {
          return res.status(401).render("auth/login", {
            pageTitle: "Login",
            errors,
            formData: req.body,
          });
        }
      });
    }
  } catch (error) {
    console.error("Error while logging in:", error);
    req.flash("error", "An error occurred while logging in. Please try again.");
    req.session.save(() => res.redirect("/auth/login"));
  }
};

exports.logout = (req, res, next) => {
  req.flash("success", "Logged out successfully");
  // console.log("Flash messages before session destroy:", req.flash());
  req.session.destroy((error) => {
    // console.log("flash:", req.flash())
    if (error) {
      console.log("error", "Error while logging out user:");
      next({ message: "Error while logging out user" });
    }
    res.redirect("/");
  });
};
