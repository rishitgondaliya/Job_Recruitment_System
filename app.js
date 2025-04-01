const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const cookieParser = require('cookie-parser')

const authRoutes = require('./routes/authRoutes')

const app = express();
dotenv.config();

app.use(bodyParser.json());
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", "views");

app.use('/auth', authRoutes)

app.use('/', (req, res, next) => {
  res.render("home", { pageTitle: "Home" });
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_DRIVER_URL)
  .then((result) => {
    console.log("Connected established.!");
    app.listen(3000, () => {
      console.log("server is running on http://localhost:3000/");
    });
  })
  .catch((err) => {
    console.log("error while connecting with database", err);
  });
