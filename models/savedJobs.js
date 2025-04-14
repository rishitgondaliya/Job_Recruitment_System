const mongoose = require("mongoose");
const { Schema } = mongoose;

const savedJobSchema = new Schema(
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
      jobTitle: {
        type: String,
        required: true,
        trim: true,
      },
      company: {
        type: String,
        required: true
      }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("savedJobs", savedJobSchema);
