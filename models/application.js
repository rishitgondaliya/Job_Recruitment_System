const mongoose = require("mongoose");
const { Schema } = mongoose;

const applicationSchema = new Schema(
  {
    user: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },
    jobDetail: {
      jobId: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
      recruiterId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    resumeLink: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "shortlisted"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
