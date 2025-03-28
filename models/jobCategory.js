const mongoose = require("mongoose");
const { Schema } = mongoose;

const jobCategorySchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 2,
      required: [true, "Category Name is required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", jobCategorySchema);
