const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating value is required"],
    },
    description: {
      type: String,
      required: false,
      match: [
        /^[A-Za-z\s'-0-9!]+$/,
        "Description can only contain alphabets, spaces, hyphens, numbers and apostrophes",
      ],
      maxlength: 400,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
