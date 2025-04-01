const mongoose = require("mongoose");
const { Schema } = mongoose;

const jobCategorySchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 2,
      match: [
        /^[A-Za-z\s'-1-9)]+$/,
        "Category can only contain alphabets, spaces, hyphens, numbers, and apostrophes",
      ],
      required: [true, "Category Name is required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", jobCategorySchema);
