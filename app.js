const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const User = require("./models/user");
const Admin = require("./models/admin");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
const recruiterRoutes = require("./routes/recruiterRoutes");
const {
  verifyToken,
  isAdmin,
  isJobSeeker,
  isRecruiter,
} = require("./middlewares/authMiddleware");

const app = express();
dotenv.config();

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// View Engine
app.set("view engine", "ejs");
app.set("views", "views");

// Set req.user via token for all routes (global use)
app.use(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next();
  }

  try {
    let user;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id).select("-password -adminSecret");
    } else {
      user = await User.findById(decoded.id).select("-password");
    }
    if (user) {
      req.user = user;
    }
    // console.log("user", user)
  } catch (err) {
    console.error("Token verification failed:", err.message);
  }
  next();
});

// Set local variables for EJS
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.user;
  res.locals.userRole = req.user ? req.user.role : "";
  res.locals.successMessage = req.cookies.successMessage || "";
  res.locals.editSuccess = req.cookies.editSuccess || "";
  res.locals.errorMessage = req.cookies.errorMessage || "";

  res.clearCookie("successMessage");
  res.clearCookie("errorMessage");
  res.clearCookie("editSuccess");

  console.log("isAuthenticated = ", res.locals.isAuthenticated);

  next();
});

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

app.get("/", (req, res) => {
  if (req.user) {
    // Redirect based on user role
    if (req.user.role === "admin") {
      return res.redirect("/admin/users");
    } else if (req.user.role === "recruiter") {
      return res.redirect("/recruiter/jobPosts");
    } else if (req.user.role === "jobSeeker") {
      return res.redirect("/jobSeeker/home");
    }
  }
  res.clearCookie("token", {
    path: "/", // it's the same path where you set the cookie
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  });
  res.render("home", { pageTitle: "Home" });
});

// Routes
app.use("/auth", authRoutes);
app.use("/admin", verifyToken, isAdmin, adminRoutes);
app.use("/jobSeeker", verifyToken, isJobSeeker, jobSeekerRoutes);
app.use("/recruiter", verifyToken, isRecruiter, recruiterRoutes);

// Error Handler
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  const message = error.message || "Something went wrong";
  res
    .status(500)
    .render("500", { pageTitle: "Error", path: "/", errorMessage: message });
});

// DB Connect & Start
if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_DRIVER_URL)
    .then(() => {
      console.log("Database connected successfully.");
      app.listen(3000, () => {
        console.log("✅ Server is running on http://localhost:3000/");
      });
    })
    .catch((err) => {
      console.error("❌ Error connecting to database:", err);
    });
}

process.on("SIGINT", async () => {
  console.log("Stopping server...");
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Process terminated.");
  await mongoose.disconnect();
  process.exit(0);
});
