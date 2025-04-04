const mongoose = require("mongoose");
const { Schema } = mongoose;

const jobCategorySchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 2,
      match: [
        /^[A-Za-z0-9][A-Za-z0-9\s'&\-]+$/,
        "Category can only contain alphabets, spaces, -, &, numbers, and apostrophes",
      ],
      unique: [true, "Job category already exists!"],
      required: [true, "Category Name is required"],
    },
  },
  { timestamps: true }
);

// Middleware to capitalize the first letter of each word before saving
jobCategorySchema.pre("save", function (next) {
  if (this.name) {
    this.name = this.name
      .split(" ") // Split the name into words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(" "); // Join words back into a string
  }
  next();
});

module.exports = mongoose.model("Category", jobCategorySchema);
