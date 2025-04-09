const mongoose = require("mongoose");
const { Schema } = mongoose;

const listingSchema = new Schema(
  {
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    category: {
      type: String,
      required: [true, "Please select category"],
    },
    company: String,
    jobDetail: {
      jobTitle: {
        type: String,
        trim: true,
        match: [
          /^[A-Za-z\s'-1-9]+$/,
          "Title can only contain alphabets, spaces, hyphens, numbers and apostrophes",
        ],
        required: [true, "Title is required"],
      },
      description: {
        type: String,
        trim: true,
        maxlength: 300,
        match: [
          /^[A-Za-z\s'-1-9]+$/,
          "Description can only contain alphabets, spaces, hyphens, numbers and apostrophes",
        ],
        required: [true, "Description is required"],
      },
      requirements: {
        type: Array,
        required: [true, "Requirements are required"],
      },
      isFeatured: {
        type: Boolean,
        default: false,
      },
      locationType: {
        type: String,
        enum: {
          values: ["Remote", "On-site", "Hybrid"],
          message: "Invalid location type",
        },
        required: [true, "Location type is required"],
      },
      location: {
        type: String,
        trim: true,
      },
      experience: {
        type: Number,
        required: [true, "Experience is required"],
      },
      vacancy: {
        type: Number,
        required: [true, "Vacancy count is required"],
      },
      salary: {
        type: Number,
        required: [true, "Salary is required"],
      },
      avgRating: {
        type: Number,
        default: 0,
        ref: "Review",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", listingSchema);
