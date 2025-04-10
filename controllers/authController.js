const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Profile = require("../models/profile");

exports.getRegister = async (req, res) => {
  try {
    res.status(422).render("auth/register", {
      pageTitle: "Register",
      path: "/register",
      errors: {},
      formData: {},
    });
  } catch (err) {
    console.error(err);
    next({ message: "Internal Server Error" });
  }
};

exports.postRegister = async (req, res, next) => {
  let errors = {};
  try {
    const { firstName, lastName, email, phone, password, role, company } =
      req.body;

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
          path: "/register",
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
        company: company ? company : undefined,
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
          companyName: company,
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

      res.cookie(
        "successMessage",
        "You have registered successfully, Login now.",
        {
          maxAge: 3000,
          httpOnly: true,
        }
      );
      res.redirect("/auth/login");
    }
  } catch (err) {
    console.log(err);

    if (err.name === "ValidationError") {
      for (let field in err.errors) {
        errors[field] = err.errors[field].message; // Extract validation error messages
      }
    }

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
      } else if (userRole === "admin") {
        return res.redirect("/admin/users");
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
    return res.status(500).send("Internal Server Error");
  }
};

exports.postLogin = async (req, res, next) => {
  let errors = {};

  try {
    const { email, password } = req.body;

    // Step 1: Basic manual checks
    if (!email) {
      errors.email = "Email is required";
    }
    if (!password) {
      errors.password = "Password is required";
    }

    // Step 2: If basic checks fail, stop early
    if (Object.keys(errors).length > 0) {
      return res.status(401).render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

    // Step 3: Create a temporary user instance to validate schema rules
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

    // Step 4: Proceed with login logic
    const user = await User.findOne({ email });

    if (!user) {
      errors.email = "User not found!";
      return res.status(401).render("auth/login", {
        pageTitle: "Login",
        path: "/login",
        errors,
        formData: req.body,
      });
    }

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

    // Step 5: Set token and success message
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 15 * 60 * 1000,
    });

    const userRole = user.role;
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
    } else if (userRole === "admin") {
      res.cookie("successMessage", "Admin login successfull.", {
        maxAge: 3000,
        httpOnly: false,
      });
      return res.redirect("/admin/users");
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
    res.redirect("/auth/login");
  }
};

exports.logout = (req, res, next) => {
  try {
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

    res.redirect("/auth/login");
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).send("Error while logging out");
  }
};
