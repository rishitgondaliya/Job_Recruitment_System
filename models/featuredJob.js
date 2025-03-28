const mongoose = require("mongoose");
const { Schema } = mongoose;

const featuredJobSchema = new Schema(
  {
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobDetail: {
      jobId: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
      },
      jobTitle: {
        type: String,
        required: true,
        trim: true,
      },
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now(),
      validate: {
        validator: function (value) {
          return value >= new Date();
        },
        message: "Start date must be future date",
      },
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "End date must be future date",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Featured", featuredJobSchema);
