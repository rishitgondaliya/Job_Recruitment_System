const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: {
        values: ["jobSeeker", "recruiter"],
        message: "Role must be either 'jobSeeker' or 'recruiter'.",
      },
      required: [true, "Role is required."],
    },
    firstName: {
      type: String,
      trim: true,
      required: [true, "First Name is required"],
      minlength: [2, "firstname must be at least 2 characters long"],
      maxlength: [15, "firstname must not be longer than 15 characters"],
      match: [
        /^[A-Za-z\s'-]+$/,
        "Name can only contain alphabets, spaces, hyphens, and apostrophes",
      ],
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, "Last Name is required"],
      minlength: [2, "lastname must be at least 2 characters long"],
      maxlength: [15, "lastname must not be longer than 15 characters"],
      match: [
        /^[A-Za-z\s'-]+$/,
        "Name can only contain alphabets, spaces, hyphens, and apostrophes",
      ],
      validate: {
        validator: function (value) {
          return value !== this.firstName;
        },
        message: "Last Name must be different from First Name",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
        },
        message: "Please enter a valid email",
      },
      unique: [true, "User with same email already exists"],
      required: [true, "Email is required"],
    },
    phone: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{9}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
      required: [true, "User phone number is required"],
    },
    password: {
      type: String,
      minlength: [8, "Password must have at least 8 characters long"],
      required: [true, "User password is required"],
      validate: [
        {
          validator: function (v) {
            return v !== this.email;
          },
          message: "Email & Password can not be the same",
        },
      ],
    },
    profileImage: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
    },
    company: {
      type: String,
      default: undefined,
    },
    // jwt: {
    //   type: String,
    //   required: true,
    // },
    // resetPasswordToken: String,
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (this.firstName) {
    this.firstName = this.firstName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  if (this.lastName) {
    this.lastName = this.lastName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  if (this.company) {
    this.company = this.company
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
