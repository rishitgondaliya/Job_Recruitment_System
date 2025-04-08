// const express = require("express");
// const dotenv = require("dotenv");
// const bodyParser = require("body-parser");
// const mongoose = require("mongoose");
// const path = require("path");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");

// const User = require("./models/user");
// const authRoutes = require("./routes/authRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
// const recruiterRoutes = require("./routes/recruiterRoutes");
// const verifyToken = require('./middlewares/authMiddleware')

// const app = express();
// dotenv.config();

// // Middleware
// app.use(cors({ origin: "http://localhost:3000", credentials: true }));
// app.use(bodyParser.json());
// app.use(cookieParser());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, "public")));

// // Set up View Engine
// app.set("view engine", "ejs");
// app.set("views", "views");

// app.use((req, res, next) => {
//   // console.log("session", req.session)
//   if (!req.user) {
//     // req.session.isLoggedIn = false;
//     // req.user = null;
//     return next();
//   }
//   User.findById(req.user._id)
//     .then((user) => {
//       // console.log(user);
//       // console.log("isLoggedIn", req.session.isLoggedIn);
//       if (!user) {
//         return next();
//       }
//       req.user = user;
//       next();
//     })
//     .catch((err) => {
//       next(new Error(err));
//     });
// });

// app.use((req, res, next) => {
//   console.log(req.isLoggedIn)
//   res.locals.isAuthenticated = req.isLoggedIn || "false";
//   res.locals.userRole = req.user ? req.user.role : "";
//   res.locals.successMessage =  "";
//   res.locals.errorMessage =  "";
//   console.log("isAuthenticated =", res.locals.isAuthenticated);
//   next();
// });

// app.use((req, res, next) => {
//   if (!req.user) {
//     res.clearCookie("connect.sid", { path: "/" });
//     res.clearCookie("token", { path: "/" })
//     // console.log("session:", req.session)
//   }
//   // console.log("user:", req.session.user)
//   next();
// });

// app.use((req, res, next) => {
//   res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
//   // res.set("Pragma", "no-cache");
//   // res.set("Expires", "-1");
//   next();
// });

// // Routes
// app.use(authRoutes);
// app.use("/admin", verifyToken, adminRoutes);
// app.use("/jobSeeker", verifyToken, jobSeekerRoutes);
// app.use("/recruiter", verifyToken, recruiterRoutes);
// app.get("/", (req, res) => {
//   res.render("home", { pageTitle: "Home" });
// });

// // Error Handling
// app.use((error, req, res, next) => {
//   console.error("Server Error:", error);
//   const status = error.statusCode || 500;
//   const message = error.message;
//   res.status(500).render("500", { pageTitle: "Error", errorMessage: message });
// });

// // MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_DRIVER_URL)
//   .then(() => {
//     console.log("Database connected successfully.");
//     app.listen(3000, () => {
//       console.log("Server is running on http://localhost:3000/");
//     });
//   })
//   .catch((err) => {
//     console.error("Error connecting to database:", err);
//   });

const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const User = require("./models/user");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
const recruiterRoutes = require("./routes/recruiterRoutes");
const verifyToken = require("./middlewares/authMiddleware");

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
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
  res.locals.errorMessage = req.cookies.errorMessage || "";

  res.clearCookie("successMessage");
  res.clearCookie("errorMessage");

  console.log("isAuthenticated = ", res.locals.isAuthenticated);

  next();
});

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// Routes
app.use(authRoutes);
app.use("/admin", verifyToken, adminRoutes);
app.use("/jobSeeker", verifyToken, jobSeekerRoutes);
app.use("/recruiter", verifyToken, recruiterRoutes);

app.get("/", (req, res) => {
  res.clearCookie("token", {
    path: "/", // it's the same path where you set the cookie
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  });
  res.render("home", { pageTitle: "Home" });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  const message = error.message || "Something went wrong";
  res.status(500).render("500", { pageTitle: "Error", path: '/', errorMessage: message });
});

// DB Connect & Start
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
