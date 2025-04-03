const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require('connect-flash')

const User = require("./models/user");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
const recruiterRoutes = require("./routes/recruiterRoutes");

const app = express();
dotenv.config();

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set up View Engine
app.set("view engine", "ejs");
app.set("views", "views");

// Session Configuration
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);
app.use(flash())

app.use((req, res, next) => {
  // console.log("session", req.session)
  if (!req.session.user) {
    // req.session.isLoggedIn = false;
    // req.user = null;
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      // console.log(user);
      // console.log("isLoggedIn", req.session.isLoggedIn);
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn || 'false';
  res.locals.userRole = req.session.user ? req.session.user.role : "";
  res.locals.successMessage = req.flash("success")[0] || "";
  res.locals.errorMessage = req.flash("error")[0] || "";
  console.log("isAuthenticated =", res.locals.isAuthenticated);
  next();
});

// Routes
app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use("/jobSeeker", jobSeekerRoutes);
app.use("/recruiter", recruiterRoutes);
app.get("/", (req, res) => {
  res.render("home", { pageTitle: "Home" });
});

// Error Handling
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(500).render("500", { pageTitle: "Error", errorMessage: message });
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_DRIVER_URL)
  .then(() => {
    console.log("Database connected successfully.");
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000/");
    });
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });
