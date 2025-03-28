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
    jobDetail: {
      title: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
      },
      requirements: {
        type: Array,
        default: [],
        required: true,
      },
      isFeatured: {
        type: Boolean,
        default: false,
      },
      location: String,
      locationType: {
        type: String,
        enum: ["On-site", "Remote", "Hybrid"],
        required: true,
      },
      vacancy: {
        type: Number,
        required: true,
      },
      salary: {
        type: Number,
        required: true,
      },
      experience: {
        type: Number,
        required: true,
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
