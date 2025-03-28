const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    reviewText: {
      type: String,
      required: false,
      maxlength: 400,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
