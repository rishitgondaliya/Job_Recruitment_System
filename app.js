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

// Load environment variables from .env file
dotenv.config();

// Middleware to handle CORS and cookies
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(cookieParser());

// Middleware to parse incoming request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", "views");

// Global Middleware to Set req.user from JWT Token in Cookies
app.use(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return next(); // No token, skip the user lookup

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user;

    // Find user based on the role in the token (either Admin or User)
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id).select("-password -adminSecret");
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (user) {
      req.user = user; // Attach user to the request object
    }
  } catch (err) {
    console.error("Token verification failed:", err.message); // Log any token verification errors
  }

  next(); // Proceed to the next middleware or route handler
});

// Middleware to Set Local Variables for EJS Templates
app.use((req, res, next) => {
  // Set values for EJS templates
  res.locals.isAuthenticated = !!req.user;
  res.locals.userRole = req.user ? req.user.role : "";
  res.locals.successMessage = req.cookies.successMessage || "";
  res.locals.editSuccess = req.cookies.editSuccess || "";
  res.locals.errorMessage = req.cookies.errorMessage || "";

  // Clear cookies after they are used
  res.clearCookie("successMessage");
  res.clearCookie("errorMessage");
  res.clearCookie("editSuccess");

  next();
});

// Prevent Caching for Sensitive Pages
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

  // Clear token cookie if user is not logged in
  res.clearCookie("token", {
    path: "/", // Cookie path
    httpOnly: true,
    secure: false,
    sameSite: "Lax", // Controls cross-site cookie sharing
  });

  res.render("home", { pageTitle: "Home" });
});

app.use("/auth", authRoutes); // authentication routes
app.use("/admin", verifyToken, isAdmin, adminRoutes); // Admin routes
app.use("/jobSeeker", verifyToken, isJobSeeker, jobSeekerRoutes); // Job Seeker routes
app.use("/recruiter", verifyToken, isRecruiter, recruiterRoutes); // Recruiter routes

// Global Error Handler - Catches unhandled errors and renders an error page
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  const errorMessage = error.message || "Something went wrong";
  const statusCode = error.statusCode || 500;

  res.status(statusCode).render("500", {
    pageTitle: "Error",
    path: "/",
    errorMessage: errorMessage,
  });
});

// Database Connection & Server Startup
if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("✅ Database connected successfully.");

      // Check if the admin exists, create one if necessary
      const existingAdmin = await Admin.findOne();
      if (!existingAdmin) {
        await Admin.create({
          firstName: "Super",
          lastName: "Admin",
          email: process.env.ADMIN_EMAIL,
          phone: "9879876543",
          password: process.env.ADMIN_PASSWORD,
          role: "admin",
          adminSecret: process.env.ADMIN_SECRET || "supersecret",
        });

        console.log("✅ Default admin created: Super Admin");
        console.log("Admin email:", process.env.ADMIN_EMAIL);
        console.log("Admin password:", process.env.ADMIN_PASSWORD);
        console.log("Admin secret:", process.env.ADMIN_SECRET);
      }

      // Start the server
      const PORT = process.env.PORT || 3006;
      app.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}/`);
      });
    })
    .catch((err) => {
      console.error("❌ Error connecting to database:", err);
    });
}

// Graceful Shutdown on SIGINT and SIGTERM (for clean server shutdown)
process.on("SIGINT", async () => {
  console.log("Stopping server...");
  await mongoose.disconnect();
  process.exit(0); // Exit the process successfully
});

process.on("SIGTERM", async () => {
  console.log("Process terminated.");
  await mongoose.disconnect();
  process.exit(0); // Exit the process successfully
});
