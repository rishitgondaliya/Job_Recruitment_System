const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminSchema = new Schema(
  {
    role: {
      type: String,
      immutable: true,
      default: "admin",
    },
    firstName: {
      type: String,
      trim: true,
      required: [true, "First Name is required"],
      minlength: 2,
      maxlength: 15,
      match: [
        /^[A-Za-z\s'-]+$/,
        "First Name can only contain alphabets, spaces, hyphens, and apostrophes",
      ],
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, "Last Name is required"],
      minlength: 2,
      maxlength: 15,
      match: [
        /^[A-Za-z\s'-]+$/,
        "Last Name can only contain alphabets, spaces, hyphens, and apostrophes",
      ],
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
      unique: [true, "Email already exists"],
      required: [true, "Email is required"],
    },
    phone: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{9,14}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
      required: [true, "User phone number is required"],
    },
    password: {
      type: String,
      required: [true, "User password is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    adminSecret: {
      type: String,
      required: [true, "Admin secret key is required!"],
    },
    resetPasswordToken: String,
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const passwordValidationPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordValidationPattern.test(this.password)) {
    const err = new Error("Password must have at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a special character.");
    return next(err);
  }

  const bcrypt = require("bcryptjs");
  this.password = await bcrypt.hash(this.password, 12);
  this.adminSecret = await bcrypt.hash(this.adminSecret, 12);
  next();
});


module.exports = mongoose.model("Admin", adminSchema);
