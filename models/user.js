const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

// Utility to format names to Title Case
function toTitleCase(str) {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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
      minlength: [2, "First name must be at least 2 characters long"],
      maxlength: [15, "First name must not be longer than 15 characters"],
      match: [
        /^[A-Za-z\s'-]+$/,
        "Name can only contain alphabets, spaces, hyphens, and apostrophes",
      ],
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, "Last Name is required"],
      minlength: [2, "Last name must be at least 2 characters long"],
      maxlength: [15, "Last name must not be longer than 15 characters"],
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
      unique: [true, "User with the same email already exists"],
      required: [true, "Email is required"],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
        },
        message: "Please enter a valid email",
      },
    },
    phone: {
      type: String,
      required: [true, "User phone number is required"],
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{9}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`,
      },
    },
    password: {
      type: String,
      required: [true, "User password is required"],
    },
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
    resetPasswordToken: String,
    resetTokenExpiry: Date,
  },
  { timestamps: true }
);

// Pre-save hook to format names, validate & hash password
userSchema.pre("save", async function (next) {
  if (this.firstName) this.firstName = toTitleCase(this.firstName);
  if (this.lastName) this.lastName = toTitleCase(this.lastName);
  if (this.company) this.company = toTitleCase(this.company);

  if (!this.isModified("password")) return next();

  const passwordValidationPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordValidationPattern.test(this.password)) {
    return next(
      new Error(
        "Password must have at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a special character."
      )
    );
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model("User", userSchema);
