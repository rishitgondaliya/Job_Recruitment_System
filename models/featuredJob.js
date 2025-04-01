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
      default: Date.now(),
      validate: {
        validator: function (value) {
          return value >= new Date();
        },
        message: "Start date must be future date",
      },
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
      required: [true, "End date is required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Featured", featuredJobSchema);
